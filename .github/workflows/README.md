# Build, Push, and Deploy Workflow

This is the main CI/CD pipeline for building and deploying the Better Chatbot application to AWS ECS.

## Overview

The workflow consists of two jobs:

1. **Build and Push** - Builds a Docker image and pushes it to Amazon ECR
2. **Deploy** - Deploys the built image to Amazon ECS (requires manual approval)

## Triggers

### Automatic Build (Push to Main)

```yaml
on:
  push:
    branches:
      - main
```

Every commit to the `main` branch automatically:

1. ✅ Builds the Docker image
2. ✅ Pushes to ECR with multiple tags
3. ⏸️ **Waits for manual approval** before deploying

### Manual Trigger

```yaml
on:
  workflow_dispatch:
```

You can also manually trigger the workflow from the GitHub Actions UI:

1. Go to **Actions** → **Build, Push, and Deploy**
2. Click **Run workflow**
3. Select the `main` branch
4. Click **Run workflow**

The workflow will still wait for approval before deploying.

## Jobs

### 1. Build and Push (`build-and-push`)

**Purpose**: Build the Docker image and push it to Amazon ECR.

**Steps**:

1. Checkout repository
2. Get AWS configuration from `shared/get-config` action
3. Build Docker image using `shared/build-and-push` action
   - Extracts version from `package.json`
   - Creates image tag: `<version>-<short-sha>` (e.g., `1.22.0-abc123d`)
   - Pushes to ECR with three tags:
     - `<short-sha>` - 7-character commit hash
     - `<version>-<short-sha>` - Full semantic version tag
     - `latest` - Latest production image

**Outputs**:

- `IMAGE_TAG` - The semantic version tag (e.g., `1.22.0-abc123d`)
- `IMAGE_NAME` - Full ECR image name with registry URL

**IAM Role Required**: `github-action-ecr-push-image`

### 2. Deploy (`deploy`)

**Purpose**: Deploy the built image to ECS with database migrations.

**Dependencies**:

- Requires `build-and-push` job to complete successfully
- Uses outputs from the build job (`IMAGE_TAG`, `IMAGE_NAME`)

**Environment Protection**:

```yaml
environment: production
```

This job uses a GitHub Environment with protection rules. When the job runs:

1. ⏸️ Workflow pauses and shows "Waiting for review from required reviewers"
2. 👤 Designated reviewers receive a notification
3. 🔍 Reviewers can examine the build logs before approving
4. ✅ Upon approval, deployment proceeds immediately

**Steps**:

1. Checkout repository
2. Get AWS configuration
3. Authenticate to Tailscale (for secure database access)
4. Deploy to ECS using `shared/deploy-to-ecs` action
   - Registers new ECS task definition
   - Runs database migrations (`pnpm db:migrate`)
   - Updates ECS service with new task definition
   - Cleans up old task definitions (on main/develop branches only)

**IAM Role Required**: `github-action-deploy-app`

## Workflow Diagram

```
Push to main
     ↓
┌────────────────────┐
│  Build and Push    │
│  - Build image     │
│  - Push to ECR     │
└────────────────────┘
     ↓
┌────────────────────┐
│  ⏸️  Wait for       │
│  Manual Approval   │
└────────────────────┘
     ↓
    👤 Approve
     ↓
┌────────────────────┐
│  Deploy to ECS     │
│  - Tailscale auth  │
│  - Run migrations  │
│  - Update service  │
└────────────────────┘
```

## Setting Up Manual Approval

To enable the approval gate, create a GitHub Environment:

1. Go to **Settings** → **Environments**
2. Click **New environment**
3. Name it `production`
4. Under **Deployment protection rules**, configure:
   - ✅ **Required reviewers** - Add team members who can approve
   - (Optional) **Wait timer** - Delay before approval is available
   - (Optional) **Deployment branches** - Restrict to `main` only

### Approving a Deployment

When a deployment is waiting for approval:

1. Go to the **Actions** tab
2. Click on the running workflow
3. You'll see a yellow banner: **"Review pending deployments"**
4. Click **Review deployments**
5. Select `production` environment
6. (Optional) Add a comment
7. Click **Approve and deploy**

The deploy job will start immediately with the image that was built in the same workflow run.

## Configuration

### AWS Configuration

Edit `.github/workflows/shared/get-config/action.yml`:

```bash
AWS_ACCOUNT_ID="123456789012"         # Your AWS account ID
ECR_REPO="better-chatbot"             # ECR repository name
CLUSTER_NAME="production-cluster"     # ECS cluster name
SERVICE_NAME="better-chatbot"         # ECS service name
ROLE_NAME="github-action-deploy-app" # IAM role for deployment
```

### GitHub Secrets

Required secrets (set in **Settings** → **Secrets and variables** → **Actions**):

| Secret               | Description                |
| -------------------- | -------------------------- |
| `TS_OAUTH_CLIENT_ID` | Tailscale OAuth client ID  |
| `TS_OAUTH_SECRET`    | Tailscale OAuth secret     |
| `DATABASE_URL`       | Database connection string |

### AWS IAM Roles

Two IAM roles are required with GitHub OIDC trust policies:

#### 1. `github-action-ecr-push-image`

Used by the build job to push images to ECR.

**Permissions needed**:

- `ecr:GetAuthorizationToken`
- `ecr:BatchCheckLayerAvailability`
- `ecr:GetDownloadUrlForLayer`
- `ecr:BatchGetImage`
- `ecr:PutImage`
- `ecr:InitiateLayerUpload`
- `ecr:UploadLayerPart`
- `ecr:CompleteLayerUpload`

#### 2. `github-action-deploy-app`

Used by the deploy job to update ECS services.

**Permissions needed**:

- ECS task definition registration and updates
- ECS service updates
- ECR image pulling
- SSM parameter read/write
- CloudWatch Logs

## Required Files

The workflow expects these to exist in your repository:

### 1. Deployment Scripts (`.github/deploy-scripts/`)

- `register-task-def.sh` - Registers new ECS task definitions
- `update-ecs-service.sh` - Updates ECS service
- `run-migrations.sh` - Runs database migrations
- `deregister-old-task-def.sh` - Cleans up old task definitions

### 2. ECS Configuration (`ecs/production/`)

- `task-definition.json` - ECS task definition template

### 3. Application Files

- `package.json` - Must contain a `version` field for image tagging
- `Dockerfile` - Located at `docker/Dockerfile`

## Shared Actions

This workflow uses reusable composite actions located in `.github/workflows/shared/`:

- **`set-short-sha`** - Generates 7-character commit SHA
- **`get-config`** - Retrieves environment-specific AWS configuration
- **`build-and-push`** - Builds and pushes Docker images to ECR
- **`authenticate-to-tailscale`** - Sets up Tailscale VPN connection
- **`deploy-to-ecs`** - Deploys application to ECS with migrations

Each shared action has its own README with detailed documentation.

## Image Tagging Strategy

Every build creates three tags:

1. **Short SHA**: `abc123d`
   - Unique identifier for this specific commit
2. **Semantic Version**: `1.22.0-abc123d`
   - Combines version from package.json with short SHA
   - Used for deployment tracking
3. **Latest Tag**: `latest`
   - Always points to the latest production image
   - Useful for quick rollbacks or testing

## Troubleshooting

### Build Fails

1. Check that `package.json` contains a valid `version` field
2. Verify AWS credentials are correctly configured
3. Ensure ECR repository exists in your AWS account
4. Check Docker build logs for application-specific errors

### Deploy Waiting Forever

1. Ensure you've created the `production` environment in GitHub
2. Add yourself as a required reviewer
3. Check that you have the necessary permissions

### Deploy Fails

1. Verify deployment scripts exist and are executable
2. Check that ECS cluster and service exist
3. Ensure IAM role has correct permissions
4. Verify Tailscale credentials for database access
5. Check ECS task definition is valid

### Migration Fails

1. Ensure `DATABASE_URL` secret is set correctly
2. Verify Tailscale can reach your database
3. Check migration command is correct (`pnpm db:migrate`)
4. Review migration logs in the workflow output

## Monitoring

After deployment, monitor:

1. **ECS Service**: Check service events and task status in AWS Console
2. **CloudWatch Logs**: Monitor application logs for errors
3. **GitHub Actions**: Review workflow logs for deployment details
4. **Metrics**: Track deployment duration and success rate

## Rollback

To rollback to a previous version:

1. Find the image tag from a previous successful deployment
2. Go to **Actions** → **Build, Push, and Deploy** → **Run workflow**
3. The workflow will build and deploy the code from that commit
4. Alternatively, use AWS Console to update the ECS service with a previous task definition

## Additional Resources

- [AWS OIDC for GitHub Actions](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [ECS Deployments](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-types.html)
- [Docker Build Cache](https://docs.docker.com/build/cache/)
