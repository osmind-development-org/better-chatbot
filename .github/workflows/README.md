# Build, Push, and Deploy Workflow

This is the main CI/CD pipeline for building and deploying the Better Chatbot application to AWS ECS.

## Overview

The workflow consists of two jobs:

1. **Build and Push** - Builds a Docker image and pushes it to Amazon ECR
2. **Deploy** - Deploys the built image to Amazon ECS (requires manual approval)

This job uses a GitHub Environment with protection rules. When a deployment is waiting for approval:

1. Go to the **Actions** tab
2. Click on the running workflow
3. You'll see a yellow banner: **"Review pending deployments"**
4. Click **Review deployments**
5. Select `production` environment
6. (Optional) Add a comment
7. Click **Approve and deploy**

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
