# GitHub Actions Workflow Setup

## What's Been Created

### 1. Shared Workflow Actions

✅ **`shared/set-short-sha/`** - Generates short commit SHA for tagging
✅ **`shared/get-config/`** - Retrieves environment-specific AWS configuration  
✅ **`shared/authenticate-to-tailscale/`** - Sets up Tailscale connection (already existed)
✅ **`shared/build-and-push/`** - Builds and pushes Docker images to ECR (already existed)
✅ **`shared/deploy-to-ecs/`** - Deploys to ECS with migrations (already existed)

### 2. Main Workflow

✅ **`build-push-deploy.yml`** - Main CI/CD pipeline

## How It Works

### Automatic Build (on every commit to main)

When you push to `main`, the workflow automatically:

1. Builds the Docker image
2. Tags it with version + short SHA (e.g., `1.22.0-abc123`)
3. Pushes to ECR with tags: `<sha>`, `<version-sha>`, `current-production`

### Manual Deploy (workflow_dispatch)

To deploy, go to **Actions → Build, Push, and Deploy → Run workflow** and choose:

- **Image Tag**: Leave empty to use the latest build from main, or specify a tag
- **Skip Build**: Check this to only deploy an existing image without rebuilding

The workflow is configured for **production** environment only.

## What's Still Needed

### 1. ✅ Deployment Scripts

The `deploy-to-ecs` action expects these scripts in `.github/deploy-scripts/`:

- **`register-task-def.sh`** - Registers new ECS task definitions
  - Parameters: `--aws-account-id`, `--aws-region`, `--ecr-repo`, `--ecs-config-path`, `--env`, `--image-tag`
- **`update-ecs-service.sh`** - Updates ECS service with new task definition
  - Parameters: `--cluster-name`, `--service-name`, `--timeout-minutes`
- **`run-migrations.sh`** - Executes database migrations
  - Parameters: `--env`, `--database-url`, `--migration-cmd`
- **`deregister-old-task-def.sh`** - Cleans up old task definitions
  - Parameters: `--ecs-config-path`, `--env`, `--keep-recent`

### 2. ❌ ECS Configuration Files

Create an `ecs/` directory at the project root with production configuration:

```
ecs/
└── production/
    └── task-definition.json
```

The `task-definition.json` should define your ECS task (container definitions, memory, CPU, environment variables, etc.).

### 3. ⚠️ AWS Configuration

Edit `.github/workflows/shared/get-config/action.yml` and replace placeholder values:

```bash
AWS_ACCOUNT_ID="YOUR_AWS_ACCOUNT_ID"  # Replace with your AWS account ID
ECR_REPO="better-chatbot"
CLUSTER_NAME="production-cluster"      # Replace with your ECS cluster name
SERVICE_NAME="better-chatbot"
ROLE_NAME="github-action-deploy-app"  # Replace with your IAM role name
```

### 4. ⚠️ GitHub Secrets

Add these secrets in **Settings → Secrets and variables → Actions**:

- `TS_OAUTH_CLIENT_ID` - Tailscale OAuth client ID
- `TS_OAUTH_SECRET` - Tailscale OAuth secret
- `DATABASE_URL` - Database connection string for migrations

### 5. ⚠️ AWS IAM Setup

Create these IAM roles in your AWS account:

- **`github-action-ecr-push-image`** - For pushing images to ECR
  - Trust policy: GitHub OIDC provider
  - Permissions: ECR push, CloudWatch Logs
- **`github-action-deploy-app`** - For deploying to ECS
  - Trust policy: GitHub OIDC provider
  - Permissions: ECS task definition registration, ECS service updates, ECR pull, SSM parameter read/write

### 6. ⚠️ GitHub Environment (Optional but Recommended)

Set up the production environment in **Settings → Environments** to require manual approval for deployments:

- `production` - Require approval from designated reviewers before deployment

### 7. ⚠️ Node Version File

The deploy action expects a `.nvmrc` file at the project root. Create one with:

```
20
```

or whatever Node version you're using.

## Migration Notes

### Key Changes from Original Workflow

1. **Removed Slack notifications** - As requested
2. **Changed trigger** - Now runs on every push to `main`
3. **Split build and deploy** - Build is automatic, deploy is manual
4. **Adjusted paths** - Changed from `packages/backend` to `.` (project root)
5. **Changed package manager** - Uses `pnpm` instead of `npm`
6. **Simplified structure** - Single application instead of monorepo

### Path Updates

- **Working Directory**: `packages/backend` → `.`
- **Build Context**: `packages/backend` → `.`
- **Migration Command**: `npm run prisma:migrate` → `pnpm db:migrate`

## Testing the Workflow

1. **Test build only** (automatic):

   - Push to `main` branch
   - Verify the build job completes and image is pushed to ECR

2. **Test manual deploy** (after setup is complete):
   - Go to Actions tab
   - Click "Build, Push, and Deploy"
   - Click "Run workflow"
   - Select environment and options
   - Click "Run workflow"

## Additional Resources

- [AWS OIDC for GitHub Actions](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [ECS Task Definitions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html)
