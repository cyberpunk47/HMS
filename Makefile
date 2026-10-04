# HMS DevOps shortcuts.
#
# Day-to-day you only need two of these:
#   make bootstrap   -> creates the Jenkins machine (run once, from your laptop)
#   make destroy-all -> deletes everything so the bill stops
#
# Everything in between happens in the Jenkins UI. The urls target is here for
# when you want an address quickly without opening the browser.

REGION       ?= ap-south-1
CLUSTER_NAME ?= hms-eks
RATE         ?= 5000
DURATION     ?= 3m

.PHONY: help bootstrap bootstrap-info kubeconfig urls pods watch load destroy-cluster destroy-all cost

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

bootstrap: ## Create the Jenkins controller (the only manual step)
	cd infra/bootstrap && terraform init && terraform apply

bootstrap-info: ## Print the Jenkins URL and admin password
	@cd infra/bootstrap && terraform output jenkins_url && \
	 echo -n "admin / " && terraform output -raw jenkins_password && echo

kubeconfig: ## Point your local kubectl at the cluster
	aws eks update-kubeconfig --region $(REGION) --name $(CLUSTER_NAME)

urls: ## Print the application and Grafana addresses
	@echo "Application : http://$$(kubectl -n ingress-nginx get svc ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
	@echo "Grafana     : http://$$(kubectl -n monitoring get svc kube-prometheus-stack-grafana -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
	@echo -n "Grafana pw  : " && kubectl -n monitoring get secret kube-prometheus-stack-grafana -o jsonpath='{.data.admin-password}' | base64 -d && echo

pods: ## Show what is running
	kubectl -n hms get pods -o wide
	kubectl -n hms get hpa,scaledobject

watch: ## Live view of the gateway scaling (second screen during the demo)
	watch -n 5 'kubectl -n hms get deploy gateway; kubectl -n hms get hpa'

load: ## Fire traffic without Jenkins:  make load RATE=5000 DURATION=3m
	BASE_URL="http://$$(kubectl -n ingress-nginx get svc ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')/api" \
	RUN_ID=manual PARALLELISM=4 RPS_PER_RUNNER=$$(( $(RATE) / 4 )) DURATION=$(DURATION) \
	envsubst < k8s/loadtest/k6-testrun.yaml | kubectl apply -f -

destroy-cluster: ## Delete the EKS cluster and its load balancers (keeps Jenkins)
	-kubectl -n ingress-nginx delete svc ingress-nginx-controller --ignore-not-found=true
	-kubectl -n monitoring delete svc kube-prometheus-stack-grafana --ignore-not-found=true
	sleep 30
	cd infra/eks && terraform destroy -auto-approve -var="region=$(REGION)" -var="cluster_name=$(CLUSTER_NAME)"

destroy-all: destroy-cluster ## Delete everything including Jenkins - the bill stops here
	cd infra/bootstrap && terraform destroy

cost: ## Rough running cost per hour
	@echo "EKS control plane      \$$0.10/hr"
	@echo "4 x c6i.xlarge (app)   \$$0.68/hr"
	@echo "1 x c6i.2xlarge (k6)   \$$0.34/hr"
	@echo "2 x NLB + Jenkins box  \$$0.13/hr"
	@echo "-------------------------------"
	@echo "while running          ~\$$1.25/hr  (about Rs 110/hr)"
	@echo "Run 'make destroy-all' when you are done."
