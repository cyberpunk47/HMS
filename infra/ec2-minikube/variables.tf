variable "region" {
  type    = string
  default = "ap-south-1"
}

variable "project" {
  type    = string
  default = "hms"
}

variable "my_ip_cidr" {
  description = <<-EOT
    YOUR public IPv4 with /32. Jenkins, Grafana and SSH accept only this address.

    Get it with:  curl -4 ifconfig.me
    The -4 matters: plain curl often answers with IPv6, and an AWS security group
    only accepts IPv4 here.

    Put it in terraform.tfvars once, so no command has to pass it again.
    If your address changes (hotspots and most home broadband do), edit that file
    and run terraform apply - only the firewall rule updates, the machine keeps
    running.
  EOT
  type        = string

  validation {
    condition     = can(cidrhost(var.my_ip_cidr, 0)) && length(regexall(":", var.my_ip_cidr)) == 0
    error_message = "my_ip_cidr must be IPv4 with a prefix, e.g. 117.99.234.29/32. Get it with: curl -4 ifconfig.me"
  }
}

###############################################################################
# Sizing - one machine, deliberately oversized so nothing starves anything else.
#
# Everything shares this box, so the generator must never be fighting the
# application for CPU. Budget at the demo rate of 1000 req/s, from the measured
# numbers (1.9 ms of CPU per request for HMS, 0.57 ms for k6):
#
#   HMS application        1000 x 1.9ms = 1.9 CPU
#   Prometheus + ingress + kubelet + KEDA  ~0.8 CPU
#   k6 generator           1000 x 0.57ms = 0.6 CPU
#   Jenkins (idle during the run)          ~0.1 CPU
#   ------------------------------------------------
#   total                                  ~3.4 of 8 CPU
#
# That leaves more than half the machine free, which is the point: a generator
# that is nowhere near saturated cannot be mistaken for the bottleneck.
#
# c6i, not t3: t-series instances are BURSTABLE. A t3.xlarge sustains only 40%
# CPU (1.6 vCPU) before it starts burning credits, and once those run out it is
# throttled - and you cannot tell throttling apart from a slow application. c6i
# runs at full speed indefinitely for roughly the same price.
#
# After the pending quota increase to 32 vCPU: c6i.4xlarge (16 vCPU) and
# minikube_cpus = 12 takes the same demo to 3000+ req/s.
###############################################################################
variable "instance_type" {
  type    = string
  default = "c6i.2xlarge" # 8 vCPU / 16 GB — about $0.34/hr in ap-south-1
}

variable "minikube_cpus" {
  # 6 of the 8 cores go to Kubernetes; 2 stay free for Jenkins and k6.
  type    = number
  default = 6
}

variable "minikube_memory_mb" {
  type    = number
  default = 12288
}

variable "app_open_to_world" {
  description = "true: anyone can open the HMS site (it is a public web app). false: only your IP."
  type        = bool
  default     = true
}

variable "repo_url" {
  description = "Public HTTPS URL of the git repository Jenkins builds."
  type        = string
  default     = "https://github.com/cyberpunk47/HMS.git"
}

variable "key_pair_name" {
  description = "Optional EC2 key pair for SSH. Leave empty to use EC2 Instance Connect instead."
  type        = string
  default     = ""
}
