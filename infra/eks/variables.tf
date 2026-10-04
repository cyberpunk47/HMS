variable "region" {
  type    = string
  default = "ap-south-1"
}

variable "project" {
  type    = string
  default = "hms"
}

variable "cluster_name" {
  type    = string
  default = "hms-eks"
}

variable "kubernetes_version" {
  type    = string
  default = "1.31"
}

###############################################################################
# Sizing. These defaults are derived from the measured benchmark, not guessed:
#
#   HMS used ~1.9 ms of CPU per request (1.17 cores at 628 req/s on the EC2 run).
#   5000 req/s  ->  ~9.5 cores busy  ->  ~13-16 vCPU with headroom.
#
# 4 x c6i.xlarge = 16 vCPU of application capacity.
# Drop to 2 nodes (and run the demo at 1000-2000 req/s) if you want it cheaper.
###############################################################################
variable "app_instance_type" {
  type    = string
  default = "c6i.xlarge" # 4 vCPU / 8 GB
}

variable "app_nodes_desired" {
  type    = number
  default = 4
}

variable "app_nodes_max" {
  type    = number
  default = 6
}

# k6 itself used ~0.36 cores per 628 req/s, so 5000 req/s needs ~3 cores average
# and more at peak. One 8-vCPU machine covers it with room to spare.
variable "loadgen_instance_type" {
  type    = string
  default = "c6i.2xlarge" # 8 vCPU / 16 GB
}
