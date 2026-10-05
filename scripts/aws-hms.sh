#!/usr/bin/env bash
# What this project creates in AWS, what it costs, and how to remove it.
#
#   ./scripts/aws-hms.sh audit    # read-only: list everything still alive
#   ./scripts/aws-hms.sh nuke     # LAST RESORT: delete by hand (see warning below)
#
# PREFERRED ORDER OF TEARDOWN - do this instead of 'nuke' whenever Jenkins is alive:
#   1. Jenkins -> job 'hms-destroy' (tick I_AM_SURE)        <- removes the cluster properly
#   2. laptop  -> cd infra/bootstrap && terraform destroy    <- removes Jenkins itself
#   3. this script 'audit'                                   <- confirm nothing is left
#
# WHY THAT ORDER: the EKS state file lives ON the Jenkins machine
# (/var/lib/jenkins/workspace/hms-platform/infra/eks/terraform.tfstate).
# Kill Jenkins first and Terraform forgets the cluster exists - then only 'nuke' is left.
set -uo pipefail
REGION=${REGION:-ap-south-1}
CLUSTER=${CLUSTER:-hms-eks}
Q='--output text'

hdr() { printf "\n\033[1m== %s ==\033[0m\n" "$1"; }

audit() {
  echo "Region: $REGION   Cluster: $CLUSTER"

  hdr "EC2 instances (biggest cost: ~\$0.08-0.34/hr each)"
  aws ec2 describe-instances --region "$REGION" \
    --filters "Name=instance-state-name,Values=running,pending" \
    --query "Reservations[].Instances[].[InstanceId,InstanceType,PublicIpAddress,Tags[?Key=='Name'].Value|[0]]" \
    --output table

  hdr "EKS clusters (control plane: \$0.10/hr each, bills even when idle)"
  aws eks list-clusters --region "$REGION" $Q
  aws eks list-nodegroups --region "$REGION" --cluster-name "$CLUSTER" $Q 2>/dev/null

  hdr "Load balancers (~\$0.025/hr each) - created by Kubernetes, NOT by Terraform"
  aws elbv2 describe-load-balancers --region "$REGION" \
    --query "LoadBalancers[].[LoadBalancerName,Type,State.Code]" --output table 2>/dev/null
  aws elb describe-load-balancers --region "$REGION" \
    --query "LoadBalancerDescriptions[].[LoadBalancerName]" --output table 2>/dev/null

  hdr "Unattached EBS volumes (orphans keep billing)"
  aws ec2 describe-volumes --region "$REGION" --filters "Name=status,Values=available" \
    --query "Volumes[].[VolumeId,Size,CreateTime]" --output table

  hdr "Unassociated Elastic IPs (free while attached, charged while not)"
  aws ec2 describe-addresses --region "$REGION" \
    --query "Addresses[?AssociationId==null].[PublicIp,AllocationId]" --output table

  hdr "NAT gateways (\$0.045/hr - this project creates NONE; any here is a surprise)"
  aws ec2 describe-nat-gateways --region "$REGION" \
    --filter "Name=state,Values=available,pending" \
    --query "NatGateways[].[NatGatewayId,State]" --output table

  hdr "VPCs tagged Project=hms"
  aws ec2 describe-vpcs --region "$REGION" --filters "Name=tag:Project,Values=hms" \
    --query "Vpcs[].[VpcId,CidrBlock]" --output table

  hdr "ECR repositories (storage only, pennies)"
  aws ecr describe-repositories --region "$REGION" \
    --query "repositories[?starts_with(repositoryName, 'hms/')].[repositoryName]" --output table 2>/dev/null

  hdr "VERDICT"
  n=$(aws ec2 describe-instances --region "$REGION" --filters "Name=instance-state-name,Values=running,pending" --query "length(Reservations[].Instances[])" $Q)
  c=$(aws eks list-clusters --region "$REGION" --query "length(clusters)" $Q)
  if [ "$n" = "0" ] && [ "$c" = "0" ]; then
    echo "Nothing is running. You are not being charged for compute."
  else
    # No made-up per-hour total here: the rate depends on each instance type, so
    # the types are printed and the one fixed charge is named. Look them up at
    # https://aws.amazon.com/ec2/pricing/on-demand/ for the exact figure.
    echo "$n instance(s) and $c EKS cluster(s) are alive and billing:"
    aws ec2 describe-instances --region "$REGION" \
      --filters "Name=instance-state-name,Values=running,pending" \
      --query "Reservations[].Instances[].InstanceType" $Q | tr '\t' '\n' | sort | uniq -c
    [ "$c" != "0" ] && echo "  plus \$0.10/hr per EKS control plane"
    echo "  plus ~\$0.025/hr per load balancer listed above"
  fi
}

nuke() {
  cat <<'WARN'
WARNING - this deletes by hand, in dependency order, without Terraform.
Use it ONLY if the Jenkins machine (and with it the EKS state file) is gone.
Terraform will afterwards still think these resources exist; if you later run
apply, do it from a clean state.

Order matters: load balancers hold network interfaces inside the VPC, so they
must go before the subnets, or the VPC delete fails with a vague dependency error.
WARN
  read -rp "Type DELETE to continue: " ans
  [ "$ans" = "DELETE" ] || { echo "Nothing done."; exit 0; }

  hdr "1/6 load balancers"
  for arn in $(aws elbv2 describe-load-balancers --region "$REGION" --query "LoadBalancers[].LoadBalancerArn" $Q); do
    echo "deleting $arn"; aws elbv2 delete-load-balancer --region "$REGION" --load-balancer-arn "$arn"
  done
  echo "waiting 90s for AWS to release the network interfaces..."; sleep 90

  hdr "2/6 EKS node groups (slow: ~5 min each)"
  for ng in $(aws eks list-nodegroups --region "$REGION" --cluster-name "$CLUSTER" --query "nodegroups" $Q 2>/dev/null); do
    echo "deleting nodegroup $ng"
    aws eks delete-nodegroup --region "$REGION" --cluster-name "$CLUSTER" --nodegroup-name "$ng"
  done
  for ng in $(aws eks list-nodegroups --region "$REGION" --cluster-name "$CLUSTER" --query "nodegroups" $Q 2>/dev/null); do
    aws eks wait nodegroup-deleted --region "$REGION" --cluster-name "$CLUSTER" --nodegroup-name "$ng"
  done

  hdr "3/6 EKS cluster"
  aws eks delete-cluster --region "$REGION" --name "$CLUSTER" 2>/dev/null
  aws eks wait cluster-deleted --region "$REGION" --name "$CLUSTER" 2>/dev/null

  hdr "4/6 EC2 instances tagged Project=hms"
  ids=$(aws ec2 describe-instances --region "$REGION" \
        --filters "Name=tag:Project,Values=hms" "Name=instance-state-name,Values=running,pending,stopped" \
        --query "Reservations[].Instances[].InstanceId" $Q)
  [ -n "$ids" ] && aws ec2 terminate-instances --region "$REGION" --instance-ids $ids

  hdr "5/6 orphan volumes and addresses"
  for v in $(aws ec2 describe-volumes --region "$REGION" --filters "Name=status,Values=available" --query "Volumes[].VolumeId" $Q); do
    aws ec2 delete-volume --region "$REGION" --volume-id "$v"
  done
  for a in $(aws ec2 describe-addresses --region "$REGION" --query "Addresses[?AssociationId==null].AllocationId" $Q); do
    aws ec2 release-address --region "$REGION" --allocation-id "$a"
  done

  hdr "6/6 ECR repositories"
  for r in $(aws ecr describe-repositories --region "$REGION" --query "repositories[?starts_with(repositoryName,'hms/')].repositoryName" $Q 2>/dev/null); do
    aws ecr delete-repository --region "$REGION" --repository-name "$r" --force
  done

  echo
  echo "VPC, subnets and IAM roles are left behind on purpose: they cost nothing,"
  echo "and deleting them by hand is error-prone. Remove them from the AWS console"
  echo "(VPC -> Your VPCs -> delete, it offers to remove the attached pieces)."
  echo
  audit
}

case "${1:-audit}" in
  audit) audit ;;
  nuke)  nuke ;;
  *) echo "usage: $0 [audit|nuke]"; exit 1 ;;
esac
