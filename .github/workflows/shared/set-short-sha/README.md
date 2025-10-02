# Set Short SHA Action

**Purpose**: Generate a short commit SHA for image tagging.

## Description

This action extracts the first 7 characters from the current Git commit SHA and makes it available as an output. This short SHA is commonly used for Docker image tagging and deployment tracking.

## Outputs

| Output      | Description                           |
| ----------- | ------------------------------------- |
| `SHORT_SHA` | Short commit SHA (first 7 characters) |

## Example Usage

```yaml
- name: Generate short SHA
  id: short_sha
  uses: ./.github/workflows/shared/set-short-sha

- name: Use short SHA
  run: |
    echo "Short SHA: ${{ steps.short_sha.outputs.SHORT_SHA }}"
```

## Use Cases

- Docker image tagging
- Deployment tracking
- Artifact naming
- Version identification in CI/CD pipelines
