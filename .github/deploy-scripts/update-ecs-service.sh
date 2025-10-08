#!/bin/bash

set -euo pipefail

# Usage documentation
function usage() {
  echo "Usage: $0 --cluster-name NAME --service-name NAME [--task-revision REV] [--timeout-minutes MIN]"
  echo "Options:"
  echo "  --cluster-name NAME     ECS cluster name (required)"
  echo "  --service-name NAME     ECS service name (required)"
  echo "  --task-revision REV     Task definition revision (default: latest ACTIVE revision)"
  echo "  --timeout-minutes MIN   Timeout in minutes for service stability (default: 15)"
  echo "  --help                  Display this help message"
}

# Default values
CLUSTER_NAME=""
SERVICE_NAME=""
TASK_REVISION=""
TIMEOUT_MINUTES=15

# Parse arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --cluster-name)
      CLUSTER_NAME="$2"
      shift; shift
      ;;
    --service-name)
      SERVICE_NAME="$2"
      shift; shift
      ;;
    --task-revision)
      TASK_REVISION="$2"
      shift; shift
      ;;
    --timeout-minutes)
      TIMEOUT_MINUTES="$2"
      if ! [[ "$TIMEOUT_MINUTES" =~ ^[0-9]+$ ]]; then echo "Error: --timeout-minutes must be a positive integer"
        usage
        exit 1
      fi
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

# Check for required flags
if [ -z "$CLUSTER_NAME" ] || [ -z "$SERVICE_NAME" ]; then
  echo "Error: --cluster-name, --service-name are required"
  usage
  exit 1
fi

# The family and revision (family:revision) or full ARN of the task definition to run in your service.
# If a revision is not specified, the latest ACTIVE revision is used.
if [ -n "$TASK_REVISION" ]; then
  TASK_DEF="${SERVICE_NAME}:${TASK_REVISION}"
  echo "Updating ECS service to use task definition: ${TASK_DEF}"
else
  TASK_DEF="$SERVICE_NAME"
  echo "Updating ECS service to use latest ACTIVE task definition: ${TASK_DEF}"
fi

TIMEOUT_SECONDS=$((TIMEOUT_MINUTES * 60))

aws ecs update-service --cluster "$CLUSTER_NAME" --service "$SERVICE_NAME" --task-definition "${TASK_DEF}" --force-new-deployment > /dev/null

echo -e "\nWaiting for ECS service to become stable (${SERVICE_NAME})\n"
echo "Waiting up to ${TIMEOUT_MINUTES} minutes for service stability..."

if timeout "${TIMEOUT_SECONDS}s" aws ecs wait services-stable \
  --cluster "$CLUSTER_NAME" \
  --services "$SERVICE_NAME"; then
  echo "Service is stable."
else
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 124 ]; then
    echo "Error: Timeout after ${TIMEOUT_MINUTES} minutes waiting for service stability."
  else
    echo "Error: Service stability check failed with exit code: $EXIT_CODE"
    echo "If you're running this script locally and you get a 'timeout: command not found' error, you can install it with brew install coreutils"
  fi
  exit 1
fi

echo -e "\nBackend deploy complete\n"
