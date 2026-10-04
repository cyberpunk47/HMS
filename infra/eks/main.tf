###############################################################################
# THE APPLICATION CLUSTER  —  created and destroyed by the Jenkins job
# 'hms-platform'. You never run this by hand.
#
# Two separate groups of worker machines, and that separation is the whole point:
#
#   nodegroup "app"      -> HMS runs here
#   nodegroup "loadgen"  -> ONLY k6 runs here (it carries a taint, so no app pod
#                           can land on it)
#
# Without that split, the load generator and the system under test would fight
# for the same CPU and every latency number would be a lie.
###############################################################################

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = var.region
}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs  = slice(data.aws_availability_zones.available.names, 0, 2)
  tags = { Project = var.project, ManagedBy = "terraform" }
}

###############################################################################
# Network. Public subnets only, on purpose: a NAT Gateway costs about $0.045/hour
# plus data charges, and this cluster lives for hours, not months. Nodes get
# public IPs but their security group accepts inbound traffic only from the load
# balancer. Production would use private subnets + NAT; that trade-off is in the
# report.
###############################################################################
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.8"

  name = "${var.project}-vpc"
  cidr = "10.20.0.0/16"
  azs  = local.azs

  public_subnets      = ["10.20.1.0/24", "10.20.2.0/24"]
  map_public_ip_on_launch = true
  enable_nat_gateway  = false
  enable_dns_hostnames = true

  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }

  tags = local.tags
}

###############################################################################
# The cluster.
###############################################################################
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.24"

  cluster_name    = var.cluster_name
  cluster_version = var.kubernetes_version

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.public_subnets

  cluster_endpoint_public_access = true

  # Whoever runs terraform (the Jenkins instance role) becomes cluster admin.
  enable_cluster_creator_admin_permissions = true

  cluster_addons = {
    coredns    = {}
    kube-proxy = {}
    vpc-cni    = {}
    # metrics-server is what lets Kubernetes see pod CPU; HPA/KEDA need it.
    metrics-server = {}
  }

  eks_managed_node_groups = {
    app = {
      instance_types = [var.app_instance_type]
      min_size       = 2
      max_size       = var.app_nodes_max
      desired_size   = var.app_nodes_desired
      subnet_ids     = module.vpc.public_subnets
      labels         = { role = "app" }
    }

    loadgen = {
      instance_types = [var.loadgen_instance_type]
      min_size       = 1
      max_size       = 2
      desired_size   = 1
      subnet_ids     = module.vpc.public_subnets
      labels         = { role = "loadgen" }

      # The taint is the fence: only pods that explicitly tolerate it (k6) run here.
      taints = {
        loadgen = {
          key    = "role"
          value  = "loadgen"
          effect = "NO_SCHEDULE"
        }
      }
    }
  }

  tags = local.tags
}

###############################################################################
# One image repository per service. Jenkins pushes here, the cluster pulls.
###############################################################################
resource "aws_ecr_repository" "svc" {
  for_each = toset([
    "gateway", "user-ms", "profile-ms", "appointment-ms",
    "pharmacy-ms", "notification-ms", "eureka-server", "frontend",
  ])

  name                 = "${var.project}/${each.value}"
  image_tag_mutability = "MUTABLE"
  force_delete         = true # so 'terraform destroy' does not get stuck on stored images

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = local.tags
}
