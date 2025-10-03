#!/bin/bash

set -euo pipefail

# Usage documentation
function usage() {
  echo "Usage: $0 --ecs-config-path PATH --env ENV [--keep-recent N] [--dry-run]"
  echo "Options:"
  echo "  --ecs-config-path PATH    Path to ECS config directory (required)"
  echo "  --env ENV                 Deployment environment (required)"
  echo "  --keep-recent N           Number of revisions to keep (default: 10)"
  echo "  --dry-run                 Show what would be deleted without deleting"
  echo "  --help                    Display this help message"
}

# Default values
ECS_CONFIG_PATH=""
ENV=""
KEEP_RECENT=10
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --ecs-config-path)
      ECS_CONFIG_PATH="$2"
      shift; shift
      ;;
    --env)
      ENV="$2"
      shift; shift
      ;;
    --keep-recent)
      KEEP_RECENT="$2"
      shift; shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
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
if [ -z "$ECS_CONFIG_PATH" ] || [ -z "$ENV" ]; then
  echo "Error: --ecs-config-path and --env are required"
  usage
  exit 1
fi

# Directory of task definition files for the current environment
TASK_DEF_DIR="${ECS_CONFIG_PATH%/}/${ENV}/"

shopt -s nullglob
TASK_DEF_FILES=("${TASK_DEF_DIR}"*.json)
if [ ${#TASK_DEF_FILES[@]} -eq 0 ]; then
  echo "No task definition files found in ${TASK_DEF_DIR}"
  exit 1
fi

for TASK_DEF_FILE in "${TASK_DEF_FILES[@]}"; do

  TASK_FAMILY=$(basename "$TASK_DEF_FILE" .json)
  echo -e "\nDeregistering older task definition revisions for family: ${TASK_FAMILY}\n"

  # Get all task definition revisions for this family
  ALL_REVISIONS_JSON=$(aws ecs list-task-definitions \
    --family-prefix "${TASK_FAMILY}" \
    --status ACTIVE \
    --sort DESC \
    --output json)

  # Check if any revisions exist
  TOTAL_REVISIONS=$(echo "$ALL_REVISIONS_JSON" | jq -r '.taskDefinitionArns | length')

  if [ "$TOTAL_REVISIONS" -eq 0 ]; then
    echo "No ACTIVE task definitions found for family: ${TASK_FAMILY}"
    continue
  fi

  echo "Found ${TOTAL_REVISIONS} ACTIVE task definition revisions"

  if [ "$TOTAL_REVISIONS" -le "$KEEP_RECENT" ]; then
    echo "There are fewer total revisions than the number of revisions to keep. No deregistration needed."
    continue
  fi

  # Calculate how many to deregister
  TO_DEREGISTER=$((TOTAL_REVISIONS - KEEP_RECENT))
  echo "Deregistering ${TO_DEREGISTER} older revisions."

  # Get task definitions to deregister (skip the most recent ones)
  TASK_DEFS_TO_DEREGISTER=$(echo "$ALL_REVISIONS_JSON" | jq -r ".taskDefinitionArns[${KEEP_RECENT}:] | .[]")

  if [ -z "$TASK_DEFS_TO_DEREGISTER" ]; then
    echo "No task definitions to deregister"
    continue
  fi

  echo -e "\nStarting deregistration process:\n"

  DEREGISTERED_COUNT=0
  FAILED_COUNT=0

  for TASK_DEF_ARN in $TASK_DEFS_TO_DEREGISTER; do
    REVISION_NUMBER=$(echo "$TASK_DEF_ARN" | rev | cut -d':' -f1 | rev)
    echo "Deregistering revision ${REVISION_NUMBER}: ${TASK_DEF_ARN}"
    if [ "$DRY_RUN" = true ]; then
      echo "(dry run) Would deregister revision ${REVISION_NUMBER}"
      continue
    fi
    if OUTPUT=$(aws ecs deregister-task-definition --task-definition "$TASK_DEF_ARN" --output text 2>&1); then
      echo "✓ Successfully deregistered revision ${REVISION_NUMBER}"
      DEREGISTERED_COUNT=$((DEREGISTERED_COUNT + 1))
    else
      echo "✗ Failed to deregister revision ${REVISION_NUMBER}"
      echo "  AWS CLI error: $OUTPUT"
      FAILED_COUNT=$((FAILED_COUNT + 1))
    fi
  done

  echo -e "\nDeregistration complete:"
  echo "Successfully deregistered: ${DEREGISTERED_COUNT}"
  echo "Failed to deregister: ${FAILED_COUNT}"
  echo "Kept current deployment: ${KEEP_RECENT}"

  if [ "$FAILED_COUNT" -gt 0 ]; then
    echo -e "\nWarning: Some task definitions could not be deregistered."
    echo "This does not affect the deployment but may contribute to task definition limits."
    echo "Consider manual cleanup or investigating IAM permissions."
  fi

  echo -e "\nTask definition cleanup completed\n"
done
