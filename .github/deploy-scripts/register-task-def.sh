#!/bin/bash

set -euo pipefail

# Usage documentation
function usage() {
  echo "Usage: $0 [options]"
  echo "Options:"
  echo "  --aws-region REGION       AWS region (required)"
  echo "  --aws-account-id ID       AWS account ID (required)"
  echo "  --ecr-repo NAME           ECR repository name (required)"
  echo "  --ecs-config-path PATH    Path to ECS config directory (required)"
  echo "  --env ENV                 Deployment environment (required)"
  echo "  --image-tag TAG           Image tag (required)"
  echo "  --help                    Display this help message"
}

# No default values, all must be provided
AWS_ACCOUNT_ID=""
AWS_REGION=""
ECR_REPO=""
ECS_CONFIG_PATH=""
ENV=""
IMAGE_TAG=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --aws-region)
      AWS_REGION="$2"
      shift; shift
      ;;
    --aws-account-id)
      AWS_ACCOUNT_ID="$2"
      shift; shift
      ;;
    --ecr-repo)
      ECR_REPO="$2"
      shift; shift
      ;;
    --ecs-config-path)
      ECS_CONFIG_PATH="$2"
      shift; shift
      ;;
    --env)
      ENV="$2"
      shift; shift
      ;;
    --image-tag)
      IMAGE_TAG="$2"
      shift; shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

# Validate required arguments
if [ -z "$AWS_REGION" ]; then
  echo "Error: --aws-region is required"
  usage
  exit 1
fi
if [ -z "$AWS_ACCOUNT_ID" ]; then
  echo "Error: --aws-account-id is required"
  usage
  exit 1
fi
if [ -z "$ECR_REPO" ]; then
  echo "Error: --ecr-repo is required"
  usage
  exit 1
fi
if [ -z "$ECS_CONFIG_PATH" ]; then
  echo "Error: --ecs-config-path is required"
  usage
  exit 1
fi
if [ -z "$ENV" ]; then
  echo "Error: --env is required"
  usage
  exit 1
fi
if [ -z "$IMAGE_TAG" ]; then
  echo "Error: --image-tag is required"
  usage
  exit 1
fi

# Directory of task definition files for the current environment
TASK_DEF_DIR="${ECS_CONFIG_PATH%/}/${ENV}/"

# Updated image tag to use for all services/tasks in the environment
NEW_IMAGE="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:${IMAGE_TAG}"

shopt -s nullglob
TASK_DEF_FILES=("${TASK_DEF_DIR}"*.json)
if [ ${#TASK_DEF_FILES[@]} -eq 0 ]; then
  echo "No task definition files found in ${TASK_DEF_DIR}"
  exit 1
fi

for TASK_DEF_FILE in "${TASK_DEF_FILES[@]}"; do

  TASK_DEF_NAME=$(basename "$TASK_DEF_FILE" .json)
  echo "Registering task definition: $TASK_DEF_NAME"
  echo "Using image: ${NEW_IMAGE}"

  # Only update the image and add DD_VERSION for containers in the task definition that use the package's ECR repo.
  # For example, this avoids accidentally overwriting the image of DataDog sidecar containers.
  NEW_TASK_DEF=$(jq -c --arg new_image "$NEW_IMAGE" --arg dd_version "$IMAGE_TAG" --arg ecr_repo "$ECR_REPO" '
    .containerDefinitions |= map(
      if .image | test($ecr_repo) then
        .image = $new_image
        | .environment = (
            (.environment // [])
            | map(select(.name != "DD_VERSION"))
            + [{"name":"DD_VERSION","value":$dd_version}]
          )
        | .dockerLabels = (
            (.dockerLabels // {})
            | . + {"com.datadoghq.tags.version": $dd_version}
          )
      else . end
    )
  ' "${TASK_DEF_FILE}")

  TASK_REVISION=$(aws ecs register-task-definition --region "$AWS_REGION" --cli-input-json "$NEW_TASK_DEF" --query 'taskDefinition.revision' --output text)
  echo -e "New revision: ${TASK_REVISION}\n"
done
