# Deploy to ECS Action

**Purpose**: Deploy applications to Amazon ECS with database migration support.

## Description

This action handles the complete deployment process including AWS authentication, dependency installation, task definition updates, database migrations via Tailscale, and ECS service updates. It provides a one-stop solution for deploying containerized applications to ECS.

## Inputs

| Input               | Required | Default   | Description                               |
| ------------------- | -------- | --------- | ----------------------------------------- |
| `env`               | ✅       |           | Target environment                        |
| `image_name`        | ✅       |           | Docker image name                         |
| `image_tag`         | ✅       |           | Docker image tag to deploy                |
| `working_directory` | ✅       |           | Application working directory             |
| `aws_account_id`    | ✅       |           | AWS account ID for deployment role        |
| `aws_role_name`     | ✅       |           | AWS IAM role name for deployment          |
| `ecs_config_path`   | ✅       |           | Relative path to ECS task def configs     |
| `cluster_name`      | ✅       |           | ECS cluster name                          |
| `service_name`      | ✅       |           | ECS service name                          |
| `aws_region`        | ❌       | us-west-2 | AWS region for deployment                 |
| `database_url`      | ❌       |           | Database connection string for migrations |
| `keep_recent`       | ❌       | "5"       | Number of recent task definitions to keep |
| `migration_cmd`     | ❌       |           | Migration command to execute              |
| `timeout_minutes`   | ❌       | "15"      | Timeout in minutes for ECS service update |

## Process

1. **Configure AWS Credentials**: Sets up AWS authentication using OIDC
2. **Setup Node.js**: Configures Node.js with dependency caching
3. **Set Environment Variables**: Configures deployment environment
4. **Validate Deployment Scripts**: Checks for required deployment scripts
5. **Install Dependencies**: Runs `npm ci --only=production`
6. **Build Task Definition**: Creates and registers new ECS task definition
7. **Run Migrations** (conditional): Executes database migrations if `database_url` provided
8. **Update ECS Service**: Deploys new task definition to ECS
9. **Deregister Old Task Definition** (conditional): Cleans up previous task definitions on main/develop branches only
10. **Update SSM Parameter**: Updates the current image tag in SSM Parameter Store

## Example Usage

### Basic Deployment (No Migrations)

```yaml
- name: Deploy to ECS
  uses: ./.github/workflows/shared/deploy-to-ecs
  with:
    env: staging
    image_name: "backend"
    image_tag: "1.2.3-abc123"
    working_directory: packages/backend
    aws_account_id: "778812951288"
    aws_role_name: github-action-deploy-backend
    ecs_config_path: ./ecs/
    cluster_name: "staging-cluster"
    service_name: "backend"
    aws_region: us-west-2
    timeout_minutes: "20"
```

### Full Deployment with Migrations

```yaml
- name: Deploy to ECS
  uses: ./.github/workflows/shared/deploy-to-ecs
  with:
    env: prod
    image_name: "backend"
    image_tag: "1.2.3-abc123"
    working_directory: packages/backend
    aws_account_id: "778812951288"
    aws_role_name: github-action-deploy-backend
    ecs_config_path: ./ecs/
    cluster_name: "prod-cluster"
    service_name: "backend"
    database_url: ${{ secrets.DATABASE_URL }}
    migration_cmd: "npm run prisma:migrate"
    aws_region: us-west-2
    keep_recent: "10"
    timeout_minutes: "30"
```

## Prerequisites

- Repository must be checked out with `actions/checkout@v4`
- Job must have `id-token: write` permission for AWS OIDC
- Repository must contain:
  - `.github/deploy-scripts/register-task-def.sh`
  - `.github/deploy-scripts/run-migrations.sh` (if using migrations)
  - `.github/deploy-scripts/update-ecs-service.sh`
  - `.github/deploy-scripts/deregister-old-task-def.sh`
- Working directory must contain:
  - `package.json` with dependencies
  - `.nvmrc` file for Node.js version
- AWS IAM role must exist with appropriate permissions (specify role name via `aws_role_name` input)

## Migration Support

The action includes integrated database migration support:

### When Migrations Run

- Migrations only execute if `database_url` is provided
- Requires secure network connectivity (e.g., via Tailscale) to be established before running this action

### Migration Process

1. **Migration Execution**: Runs `./deploy-scripts/run-migrations.sh --env "{env}" --database-url "{database_url}" --migration-cmd "{migration_cmd}"`

### Migration Script Requirements

Your migration script should:

- Accept environment, database URL, and migration command as parameters
- Handle connection errors gracefully
- Provide appropriate logging
- Exit with proper status codes

## Task Definition Cleanup

The action automatically cleans up old task definitions:

- **When**: Only runs on `main` and `develop` branches
- **How Many**: Keeps the number specified by `keep_recent` input (default: 5)
- **Purpose**: Prevents hitting AWS task definition limits and reduces clutter

## SSM Parameter Updates

The action updates an SSM parameter with the current deployed image tag:

- **Parameter Name**: `/{env}/apps/{service_name}/current-image`
- **Value**: The deployed image name and tag (format: `{image_name}:{image_tag}`)
- **Purpose**: Enables other systems to query the currently deployed version

## AWS Permissions

The action assumes an IAM role with the following permissions:

- ECS task definition registration and management
- ECS service updates
- ECR image pulling
- CloudWatch logging
- SSM parameter read/write access
- Any additional permissions required by your application

## Features

- **Conditional Migrations**: Only runs migrations when database URL provided
- **Dependency Caching**: Leverages Node.js cache for faster installs
- **Production Dependencies**: Only installs production packages
- **Environment Flexibility**: Works with any environment configuration
- **Error Handling**: Comprehensive error handling and logging
- **Script Validation**: Validates required deployment scripts exist before execution
- **Branch-Aware Cleanup**: Only cleans up old task definitions on main branches
- **Version Tracking**: Updates SSM parameters with current deployment info

## Script Dependencies

The action expects the following scripts to exist in the repository:

### `.github/deploy-scripts/register-task-def.sh`

- Accepts ECS config directory and environment name
- Creates a new task definition revision for each file found in the environment's ECS config directory
- Overrides the `image` defined in each task definition to use the image from the latest build

### `.github/deploy-scripts/run-migrations.sh`

- Accepts environment, database URL, and migration command parameters
- Executes database migrations
- Should handle migration failures gracefully

### `.github/deploy-scripts/update-ecs-service.sh`

- Updates ECS service with new task definition
- Should accept cluster name, service name, task revision, and timeout parameters
- Should wait for deployment to complete
- Should handle rollback scenarios

### `.github/deploy-scripts/deregister-old-task-def.sh`

- Deregisters stale task definition revisions from past deploys
- Depends on the the same ECS config directory and environment as the register-task-def script
- Should handle cleanup failures gracefully
- Helps maintain ECS task definition limits

## Environment Variables

The action sets the following environment variables for your scripts:

- `ENV`: Target environment
- `IMAGE_TAG`: Docker image tag being deployed
- `GITHUB_WORKSPACE`: GitHub Actions workspace path

## Troubleshooting

Common issues and solutions:

### AWS Authentication Errors

- Verify IAM role exists and has correct trust policy
- Check that `aws_account_id` matches the role's account

### Migration Failures

- Ensure database URL is accessible from GitHub Actions
- Verify Tailscale OAuth credentials are correct
- Check migration script permissions and syntax
- Ensure `migration_cmd` parameter is provided when using migrations

### ECS Deployment Issues

- Verify ECS cluster and service exist
- Check that task definition builds successfully
- Ensure ECR image exists and is accessible
- Verify service name matches expected pattern (`{service_name}-{env}`)

### Script Validation Errors

- Ensure all required deployment scripts exist in the repository
- Check script permissions (should be executable)
- Verify script paths relative to repository root
