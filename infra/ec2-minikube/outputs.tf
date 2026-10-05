output "public_ip" {
  value = aws_instance.hms.public_ip
}

output "jenkins_url" {
  description = "Open this once the machine finishes installing (~6 minutes)."
  value       = "http://${aws_instance.hms.public_ip}:8080"
}

output "jenkins_username" {
  value = "admin"
}

output "jenkins_password" {
  description = "Run: terraform output -raw jenkins_password"
  value       = random_password.jenkins_admin.result
  sensitive   = true
}

output "application_url" {
  description = "Available after the hms-platform job has run."
  value       = "http://${aws_instance.hms.public_ip}:30080"
}

output "grafana_url" {
  description = "Login admin / admin. Available after the hms-platform job has run."
  value       = "http://${aws_instance.hms.public_ip}:30030"
}

output "next_step" {
  value = "Open the Jenkins URL, log in, run 'hms-platform'. Then run 'hms-loadtest' with RATE=600 and watch Grafana."
}
