variable "region" {
  description = "AWS region for everything (keep the cluster in the same one)."
  type        = string
  default     = "ap-south-1"
}

variable "project" {
  description = "Name prefix on every resource, so you can find and delete them."
  type        = string
  default     = "hms"
}

variable "cluster_name" {
  description = "Name the EKS cluster will get when the platform pipeline creates it."
  type        = string
  default     = "hms-eks"
}

variable "my_ip_cidr" {
  description = <<-EOT
    YOUR public IPv4 address with /32 on the end. Only this address can open Jenkins.

    Get it with:  curl -4 ifconfig.me
    The -4 matters: plain `curl ifconfig.me` often answers with an IPv6 address, and
    an AWS security group's cidr_blocks only accepts IPv4.

    Set it once in terraform.tfvars (next to this file) so no command ever has to
    pass it again - including `terraform destroy`.

    If your connection changes address (mobile hotspots and most home broadband do),
    Jenkins stops opening. Edit terraform.tfvars and run `terraform apply`; that
    updates only the firewall rule, and the machine keeps running.
  EOT
  type        = string

  validation {
    # Catches the three usual mistakes early: an IPv6 address, a missing /32, and a
    # stray word typed at the "Enter a value:" prompt.
    condition     = can(cidrhost(var.my_ip_cidr, 0)) && length(regexall(":", var.my_ip_cidr)) == 0
    error_message = "my_ip_cidr must be an IPv4 address with a prefix, e.g. 117.99.234.29/32. Get yours with: curl -4 ifconfig.me"
  }
}

variable "repo_url" {
  description = "Public HTTPS URL of the HMS git repository Jenkins will build."
  type        = string
  default     = "https://github.com/cyberpunk47/HMS.git"
}

variable "jenkins_instance_type" {
  description = "Jenkins also builds 8 Docker images, so give it 2 vCPU / 8 GB."
  type        = string
  default     = "t3.large"
}

variable "key_pair_name" {
  description = "Optional EC2 key pair for emergency SSH. Leave empty if you do not want SSH at all."
  type        = string
  default     = ""
}
