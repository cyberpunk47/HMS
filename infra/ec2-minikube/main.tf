###############################################################################
# ONE EC2 INSTANCE THAT HOLDS THE WHOLE PROJECT.
#
#   terraform apply        <- the only command you ever type
#
# Inside that single machine, created automatically by cloud-init:
#
#   Jenkins        the CI/CD server (port 8080)
#   minikube       a real Kubernetes cluster, running in Docker on this host
#   Prometheus     scrapes every service + the ingress controller
#   Grafana        the dashboard (port 30030)
#   HMS            9 containers: gateway, 5 services, Eureka, Postgres, Kafka
#   k6             the load generator
#
# Why one machine instead of EKS: EKS needs a managed control plane ($0.10/hr)
# plus separate worker nodes, and this AWS account's EC2 quota is 8 vCPU total.
# minikube gives the same Kubernetes API, the same manifests, the same KEDA
# autoscaling - on 4 vCPU, in two minutes, for about a third of the price.
# The EKS version of this stack is still in infra/eks/ for comparison.
###############################################################################

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 5.0" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }
}

provider "aws" {
  region = var.region
}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
}

resource "random_password" "jenkins_admin" {
  length  = 20
  special = false
}

###############################################################################
# Who can reach what.
#
#   8080  Jenkins   - you only
#   30030 Grafana   - you only
#   22    SSH       - you only, for emergencies
#   30080 the HMS application - open, because it is a public web app and the
#                     demo is "this is the URL a user types". Narrow it to your
#                     IP by setting app_open_to_world = false.
###############################################################################
resource "aws_security_group" "hms" {
  name        = "${var.project}-minikube"
  description = "Jenkins + minikube host"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "Jenkins UI"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = [var.my_ip_cidr]
  }

  ingress {
    description = "Grafana"
    from_port   = 30030
    to_port     = 30030
    protocol    = "tcp"
    cidr_blocks = [var.my_ip_cidr]
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.my_ip_cidr]
  }

  ingress {
    description = "HMS application"
    from_port   = 30080
    to_port     = 30080
    protocol    = "tcp"
    cidr_blocks = var.app_open_to_world ? ["0.0.0.0/0"] : [var.my_ip_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Project = var.project }
}

###############################################################################
# The machine needs no AWS permissions at all: nothing here calls the AWS API.
# That is a real advantage of this design over the EKS one, where Jenkins needed
# near-admin rights to create clusters.
###############################################################################
resource "aws_instance" "hms" {
  ami                         = data.aws_ami.ubuntu.id
  instance_type               = var.instance_type
  subnet_id                   = data.aws_subnets.default.ids[0]
  vpc_security_group_ids      = [aws_security_group.hms.id]
  associate_public_ip_address = true
  key_name                    = var.key_pair_name != "" ? var.key_pair_name : null

  root_block_device {
    # Docker images for 8 services, plus minikube's own image cache.
    volume_size = 60
    volume_type = "gp3"
  }

  user_data = templatefile("${path.module}/cloud-init.yaml", {
    admin_password  = random_password.jenkins_admin.result
    repo_url        = var.repo_url
    minikube_cpus   = var.minikube_cpus
    minikube_memory = var.minikube_memory_mb
  })

  user_data_replace_on_change = true

  tags = { Name = "${var.project}-minikube", Project = var.project }
}
