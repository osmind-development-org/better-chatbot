#!/bin/bash

set -euo pipefail

# Usage documentation
function usage() {
  echo "Usage: $0 --env ENV --database-url URL --migration-cmd CMD [--options OPTS]"
  echo "Options:"
  echo "  --env ENV              Environment name (required)"
  echo "  --database-url URL     Database URL (required)"
  echo "  --migration-cmd CMD    Migration command to run (required)"
  echo "  --options OPTS         Additional options to pass to the migration command"
  echo "  --help                 Display this help message"
}

# Default values
ADDITIONAL_OPTS=""
ENV=""
DATABASE_URL=""
MIGRATION_CMD=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --env)
      ENV="$2"
      shift; shift
      ;;
    --database-url)
      DATABASE_URL="$2"
      shift; shift
      ;;
    --migration-cmd)
      MIGRATION_CMD="$2"
      shift; shift
      ;;
    --options)
      ADDITIONAL_OPTS="$2"
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
if [ -z "$ENV" ] || [ -z "$DATABASE_URL" ] || [ -z "$MIGRATION_CMD" ]; then
  echo "Error: --env, --database-url, and --migration-cmd are required"
  usage
  exit 1
fi

export DATABASE_URL

# Inline documentation for each step
echo -e "\nRunning database migrations for ${ENV}\n"

# Run migration command with additional options
set +e
$MIGRATION_CMD $ADDITIONAL_OPTS
EXIT_CODE=$?
set -e
if [ $EXIT_CODE -ne 0 ]; then
  echo "Migration command failed with exit code $EXIT_CODE"
  exit $EXIT_CODE
fi

echo -e "\nDatabase migrations completed successfully\n"
