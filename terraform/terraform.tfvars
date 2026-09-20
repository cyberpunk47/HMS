aws_region         = "ap-south-1"
project_name       = "hms"
vpc_cidr           = "10.0.0.0/16"
public_subnet_cidr = "10.0.1.0/24"
availability_zone  = "ap-south-1a"

hms_instance_type = "t3.large"
k6_instance_type  = "t3.medium"

key_name = "hms-production"
my_ip    = "152.59.118.205/32"

budget_email = "yasirh9523@gmail.com"