output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "region" {
  value = var.region
}

output "ecr_registry" {
  description = "Registry host that image tags are prefixed with."
  value       = split("/", values(aws_ecr_repository.svc)[0].repository_url)[0]
}

output "kubeconfig_command" {
  value = "aws eks update-kubeconfig --region ${var.region} --name ${module.eks.cluster_name}"
}
