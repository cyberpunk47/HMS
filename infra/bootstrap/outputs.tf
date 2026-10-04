output "jenkins_url" {
  description = "Open this in your browser once the machine finishes booting (~4 minutes)."
  value       = "http://${aws_instance.jenkins.public_ip}:8080"
}

output "jenkins_username" {
  value = "admin"
}

output "jenkins_password" {
  description = "Run: terraform output -raw jenkins_password"
  value       = random_password.jenkins_admin.result
  sensitive   = true
}

output "jenkins_public_ip" {
  value = aws_instance.jenkins.public_ip
}

output "next_step" {
  value = "Open the Jenkins URL, log in, and run the job 'hms-platform'. Nothing else is manual."
}
