# HMS — one EC2, everything inside it.
#
#   make up        create the machine (the only command you type)
#   make info      Jenkins / app / Grafana URLs and the Jenkins password
#   make down      delete the machine; the bill stops
#   make audit     prove nothing is still running in AWS
#
# Everything between 'up' and 'down' happens in the Jenkins web UI:
#   job 'hms-platform'  builds and deploys HMS onto minikube
#   job 'hms-loadtest'  fires traffic and KEDA adds gateway pods

TF = terraform -chdir=infra/ec2-minikube

.PHONY: help up info ssh down audit cost

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

up: ## Create the EC2 machine (Jenkins + minikube install themselves)
	$(TF) init
	$(TF) apply

info: ## Print every URL and the Jenkins password
	@echo "Jenkins     : $$($(TF) output -raw jenkins_url)"
	@echo -n "  admin / "; $(TF) output -raw jenkins_password; echo
	@echo "Application : $$($(TF) output -raw application_url)"
	@echo "Grafana     : $$($(TF) output -raw grafana_url)   (admin / admin)"
	@echo "Login as    : bench.admin@hmsbench.local / Bench@1234"

ssh: ## Open a shell on the machine (needs EC2 Instance Connect, see docs)
	@echo "ssh ubuntu@$$($(TF) output -raw public_ip)"

down: ## Delete the machine — this is what stops the bill
	$(TF) destroy

audit: ## Check that AWS really has nothing left running
	./scripts/aws-hms.sh audit

cost: ## What it costs while it runs
	@echo "c6i.2xlarge (8 vCPU / 16 GB)  ~\$$0.34/hr  (about Rs 30/hr)"
	@echo "Nothing else bills: no EKS control plane, no load balancers, no NAT."
	@echo "Run 'make down' when you are finished for the day."
