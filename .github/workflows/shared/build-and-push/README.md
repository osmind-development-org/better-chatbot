# Build and Push Action

**Purpose**: Build and push Docker images to Amazon ECR with caching support.

## Description

This action builds a Docker image from the specified context, tags it with both the commit SHA and semantic version, and pushes it to ECR. It includes registry caching for faster subsequent builds and supports multi-platform builds.

## Inputs

| Input               | Required | Description                                              | Default       |
| ------------------- | -------- | -------------------------------------------------------- | ------------- |
| `env`               | ✅       | Target environment                                       |               |
| `aws_account_id`    | ✅       | AWS account ID for ECR access                            |               |
| `ecr_registry`      | ✅       | ECR registry URL                                         |               |
| `ecr_repo_name`     | ✅       | ECR repository name                                      |               |
| `working_directory` | ✅       | Directory containing package.json for version extraction |               |
| `build_context`     | ✅       | Docker build context path                                |               |
| `platforms`         | ❌       | Target build platforms                                   | `linux/arm64` |
| `aws_region`        | ❌       | AWS region for ECR access                                | `us-west-2`   |

## Outputs

| Output           | Description                                          |
| ---------------- | ---------------------------------------------------- |
| `ECR_IMAGE_NAME` | Full ECR image name with registry                    |
| `IMAGE_TAG`      | Generated image tag combining version and commit SHA |

## Process

1. **Generate Short SHA**: Creates a short commit hash for tagging
2. **Set ECR Image Name**: Constructs the full ECR image name
3. **Extract Version**: Reads version from package.json in working directory
4. **Create Image Tag**: Combines version and SHA (e.g., `1.2.3-abc123`)
5. **Configure AWS**: Sets up AWS credentials using OIDC
6. **Login to ECR**: Authenticates with the ECR registry
7. **Setup Docker Buildx**: Configures Docker for advanced building
8. **Build and Push**: Builds image with caching and pushes to ECR

## Example Usage

```yaml
- name: Build and push application
  id: build-and-push
  uses: ./.github/workflows/shared/build-and-push
  with:
    env: preview
    aws_account_id: "778812951288"
    ecr_registry: "778812951288.dkr.ecr.us-west-2.amazonaws.com"
    ecr_repo_name: "my-app"
    working_directory: packages/backend
    build_context: packages/backend
    platforms: linux/arm64,linux/amd64
    aws_region: us-west-2

# Use outputs in subsequent steps
- name: Display build results
  run: |
    echo "Built image: ${{ steps.build-and-push.outputs.ECR_IMAGE_NAME }}"
    echo "Image tag: ${{ steps.build-and-push.outputs.IMAGE_TAG }}"
```

## Prerequisites

- Repository must be checked out with `actions/checkout@v4`
- Job must have `id-token: write` permission for AWS OIDC
- ECR repository must exist in the specified AWS account
- Working directory must contain a valid `package.json` with version field
