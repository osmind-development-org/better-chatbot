# Authenticate to Tailscale Action

**Purpose**: Setup Tailscale connection for secure database access.

## Description

This action establishes a secure Tailscale connection using OAuth credentials. It's designed to provide secure network access to private resources like databases that are not publicly accessible.

## Inputs

| Input             | Required | Description                    | Default  |
| ----------------- | -------- | ------------------------------ | -------- |
| `oauth_client_id` | ✅       | Tailscale OAuth client ID      |          |
| `oauth_secret`    | ✅       | Tailscale OAuth secret         |          |
| `tags`            | ❌       | Tailscale tags for the session | `tag:ci` |
| `version`         | ❌       | Tailscale version to use       | `latest` |
| `use_cache`       | ❌       | Whether to use cache           | `"true"` |

## Process

1. **Setup Tailscale**: Establishes secure connection using provided OAuth credentials

## Example Usage

### Basic Usage

```yaml
- name: Connect to Tailscale
  uses: ./.github/workflows/shared/authenticate-to-tailscale
  with:
    oauth_client_id: ${{ secrets.TS_OAUTH_CLIENT_ID }}
    oauth_secret: ${{ secrets.TS_OAUTH_SECRET }}
```

### Custom Configuration

```yaml
- name: Connect to Tailscale
  uses: ./.github/workflows/shared/authenticate-to-tailscale
  with:
    oauth_client_id: ${{ secrets.TS_OAUTH_CLIENT_ID }}
    oauth_secret: ${{ secrets.TS_OAUTH_SECRET }}
    tags: tag:ci,tag:database
    version: "1.54.0"
    use_cache: "false"
```

## Prerequisites

- Tailscale OAuth client credentials must be configured as repository secrets
- The OAuth client must have appropriate permissions for the Tailscale network
- Target resources must be accessible within the Tailscale network
