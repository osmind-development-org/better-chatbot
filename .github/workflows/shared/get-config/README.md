# Get Environment Configuration Action

**Purpose**: Retrieve AWS and deployment configuration for a specified environment.

## Description

This action provides centralized configuration management for the production deployment environment. It returns AWS account details, ECR registry information, ECS cluster names, and IAM role names needed for deployment.

## Inputs

| Input | Required | Description                   |
| ----- | -------- | ----------------------------- |
| `env` | ✅       | Environment name (production) |

## Outputs

| Output           | Description                        |
| ---------------- | ---------------------------------- |
| `aws_account_id` | AWS account ID for the environment |
| `aws_region`     | AWS region for the environment     |
| `ecr_registry`   | ECR registry URL                   |
| `ecr_repo`       | ECR repository name                |
| `role_name`      | AWS IAM role name for deployment   |
| `cluster_name`   | ECS cluster name                   |
| `service_name`   | ECS service name                   |

## Example Usage

```yaml
- name: Get environment configuration
  id: config
  uses: ./.github/workflows/shared/get-config
  with:
    env: production

- name: Use configuration
  run: |
    echo "AWS Account: ${{ steps.config.outputs.aws_account_id }}"
    echo "ECR Registry: ${{ steps.config.outputs.ecr_registry }}"
    echo "Cluster: ${{ steps.config.outputs.cluster_name }}"
```

## Configuration

The action contains production environment configuration that needs to be customized for your AWS setup. Edit the `action.yml` file and replace these placeholder values:

- `AWS_ACCOUNT_ID`: Your AWS account ID
- `ECR_REPO`: Your ECR repository name (default: "better-chatbot")
- `CLUSTER_NAME`: Your ECS cluster name (default: "production-cluster")
- `SERVICE_NAME`: Your ECS service name (default: "better-chatbot")
- `ROLE_NAME`: Your IAM role name for deployment (default: "github-action-deploy-app")
