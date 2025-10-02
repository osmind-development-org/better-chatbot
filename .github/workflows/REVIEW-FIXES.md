# Deployment Setup Review & Fixes

## Issues Found and Fixed

### ✅ 1. Environment Directory Mismatch

**Issue**: Workflow uses `env: prod` but ECS config was in `ecs/production/`  
**Fix**: Renamed directory from `ecs/production/` to `ecs/prod/` to match workflow environment name  
**Impact**: Task definition registration would have failed

### ✅ 2. Wrong Package Manager

**Issue**: Deploy action used `npm` instead of `pnpm`  
**Fix**:

- Added `pnpm/action-setup@v4` step before Node.js setup
- Changed cache from `npm` to `pnpm`
- Changed cache-dependency-path from `package-lock.json` to `pnpm-lock.yaml`
- Changed install command from `npm ci --only=production` to `pnpm install --frozen-lockfile --prod`

**Impact**: Dependency installation would have failed

### ✅ 3. Missing .nvmrc File

**Issue**: Deploy action expected `.nvmrc` file but it didn't exist  
**Fix**: Created `.nvmrc` with `20` (matches package.json engines requirement)  
**Impact**: Node.js setup might have failed or used wrong version

### ✅ 4. Missing Dockerfile Path

**Issue**: Build action didn't specify Dockerfile location (Dockerfile is at `docker/Dockerfile`, not root)  
**Fix**: Added `file: docker/Dockerfile` to build-push action  
**Impact**: Docker build would have failed to find Dockerfile

### ✅ 5. Step Ordering for pnpm Cache

**Issue**: pnpm setup was after Node.js setup, breaking cache functionality  
**Fix**: Moved pnpm setup before Node.js setup  
**Impact**: Caching wouldn't work efficiently

## Configuration Verified ✓

### AWS Configuration (get-config action)

- ✅ AWS Account ID: `525896657660`
- ✅ AWS Region: `us-west-2`
- ✅ ECR Repository: `better-chat`
- ✅ ECS Cluster: `tools-prod`
- ✅ ECS Service: `better-chat`
- ✅ IAM Role: `github-action-deploy-better-chatbot`

### Task Definition (ecs/prod/task-definition.json)

- ✅ Family name: `better-chat` (matches service name)
- ✅ Image reference: `525896657660.dkr.ecr.us-west-2.amazonaws.com/better-chat:latest`
- ✅ Container name: `server` (will be updated by deployment script)
- ✅ DataDog sidecar: Configured correctly (won't be overwritten by script)
- ✅ Secrets: Properly configured with ARNs

### Deployment Scripts

- ✅ `register-task-def.sh` - Correctly handles ECR repo filtering
- ✅ `update-ecs-service.sh` - Properly waits for service stability
- ✅ `run-migrations.sh` - Handles pnpm commands
- ✅ `deregister-old-task-def.sh` - Cleans up old revisions

### Build Configuration

- ✅ Dockerfile: `docker/Dockerfile` - Uses pnpm correctly
- ✅ Build context: `.` (project root)
- ✅ Platform: `linux/arm64`
- ✅ Migration command: `pnpm db:migrate`
- ✅ Package.json version: `1.22.0` (used for tagging)

### Image Tagging Strategy

The workflow creates three tags for each build:

1. **Short SHA**: `abc123d` (7-char commit hash)
2. **Semantic Version**: `1.22.0-abc123d` (version + SHA)
3. **Latest Tag**: `latest` (always points to most recent build)

## Required GitHub Secrets

Ensure these are configured in repository settings:

- `TS_OAUTH_CLIENT_ID` - Tailscale OAuth client ID
- `TS_OAUTH_SECRET` - Tailscale OAuth secret
- `DATABASE_URL` - Database connection string for migrations

## Required GitHub Environment

Create a `prod` environment in repository settings with:

- Required reviewers for deployment approval
- (Optional) Deployment branch restriction to `main`

## Workflow Execution Flow

```
Push to main
    ↓
Build Job
├─ Checkout
├─ Get config (prod)
├─ Build Docker image
└─ Push to ECR with 3 tags
    ↓
Deploy Job (requires approval)
├─ Checkout
├─ Get config (prod)
├─ Setup Tailscale
├─ Setup pnpm
├─ Setup Node.js (with pnpm cache)
├─ Install dependencies (pnpm)
├─ Register task definition
├─ Run migrations (pnpm db:migrate)
├─ Update ECS service
└─ Cleanup old task definitions
```

## Testing Recommendations

1. **Test Build Only**: Push to main and verify ECR image is created
2. **Test Deploy with Approval**: Manually approve deployment in GitHub Actions UI
3. **Verify Migrations**: Check that migrations run successfully via Tailscale
4. **Monitor ECS**: Watch service events and CloudWatch logs
5. **Verify Image Tags**: Check ECR for all three tags

## Next Steps

- [ ] Verify all GitHub secrets are configured
- [ ] Create `prod` environment with required reviewers
- [ ] Test build workflow by pushing to main
- [ ] Test deployment with manual approval
- [ ] Monitor first production deployment
