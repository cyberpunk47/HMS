variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "project_name" {
  description = "Project name"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR"
  type        = string
}

variable "public_subnet_cidr" {
  description = "Public subnet CIDR"
  type        = string
}

variable "availability_zone" {
  description = "Availability zone"
  type        = string
}

variable "hms_instance_type" {
  description = "EC2 instance type for HMS"
  type        = string
}

variable "k6_instance_type" {
  description = "EC2 instance type for k6"
  type        = string
}

variable "key_name" {
  description = "Existing AWS EC2 key pair name"
  type        = string
}

variable "my_ip" {
  description = "Your public IP address for SSH access, in CIDR format"
  type        = string
}

variable "budget_email" {
  description = "Email address for AWS budget alerts"
  type        = string
}