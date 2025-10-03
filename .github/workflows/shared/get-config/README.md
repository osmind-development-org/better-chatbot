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
