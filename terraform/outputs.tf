output "vpc_id" {
  value = aws_vpc.hms.id
}

output "public_subnet_id" {
  value = aws_subnet.public.id
}

output "hms_public_ip" {
  value = aws_eip.hms.public_ip
}

output "k6_public_ip" {
  value = aws_eip.k6.public_ip
}

output "hms_instance_id" {
  value = aws_instance.hms.id
}

output "k6_instance_id" {
  value = aws_instance.k6.id
}

output "monthly_budget" {
  value = "$20 USD"
}