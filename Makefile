# Variables (can be overridden from command line)
# Example: make build-and-push TAG=v1.2.3
ECR_REPO=525896657660.dkr.ecr.us-west-2.amazonaws.com
AWS_REGION=us-west-2
IMAGE=better-chatbot
TAG=latest

# Phony targets
.PHONY: help dev dev-setup db-up db-down db-logs db-reset db-shell \
        build tag-for-ecr login push build-and-push shell clean install

# Default target - show help
help:
	@echo "Better Chatbot Development Commands"
	@echo ""
	@echo "Development:"
	@echo "  make install        Install dependencies"
	@echo "  make dev-setup      Interactive dev setup (run after install)"
	@echo "  make dev            Start Next.js dev server (assumes DB is running)"
	@echo "  make dev-full       Start both database and Next.js dev server"
	@echo ""
	@echo "Database:"
	@echo "  make db-up          Start Postgres container"
	@echo "  make db-down        Stop Postgres container"
	@echo "  make db-logs        View Postgres logs"
	@echo "  make db-reset       Drop all tables and recreate schema (complete reset)"
	@echo "  make db-migrate     Run database migrations"
	@echo "  make db-shell       Open psql shell in Postgres container"
	@echo "  make db-studio      Open Drizzle Studio to view database"
	@echo ""
	@echo "Testing:"
	@echo "  make test           Run unit tests"
	@echo "  make test-watch     Run unit tests in watch mode"
	@echo "  make test-e2e       Run end-to-end tests"
	@echo "  make test-e2e-ui    Run end-to-end tests with UI"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint           Run linting"
	@echo "  make format         Format code with Biome"
	@echo "  make check          Run all checks (lint, types, tests)"
	@echo ""
	@echo "Docker (Production):"
	@echo "  make build          Build Docker image"
	@echo "  make build-and-push Build and push to ECR"
	@echo "  make clean          Clean up local Docker images"

# Install dependencies
install:
	pnpm install

# Development setup
dev-setup:
	@echo "🚀 Running interactive environment setup..."
	@pnpm dev:setup
	@echo ""
	@echo "Setting up database..."
	@make db-up
	@echo "Waiting for database to be ready..."
	@sleep 5
	@make db-migrate
	@echo ""
	@echo "✅ Dev environment setup complete!"
	@echo "   Run 'make dev' to start the development server"

# Start development server (assumes DB is already running)
dev:
	pnpm dev

# Start full development environment (DB + app)
dev-full:
	@make db-up
	@echo "Waiting for database to be ready..."
	@sleep 3
	@make dev

# Database commands
# Note: This only starts Postgres. The app runs on your host for fast hot reload.
# To run everything in Docker, use: docker compose --profile full -f docker/compose.yml up -d
db-up:
	docker compose -f docker/compose.yml up -d postgres
	@echo "✅ Postgres is starting..."
	@echo "   Connection: postgresql://postgres:postgres@localhost:5432/better_chatbot_dev"

db-down:
	docker compose -f docker/compose.yml down

db-logs:
	docker compose -f docker/compose.yml logs -f postgres

db-reset:
	@echo "🗑️  Stopping database and removing volumes..."
	@docker compose -f docker/compose.yml down -v
	@echo "🚀 Starting fresh database..."
	@make db-up
	@echo "⏳ Waiting for database to be ready..."
	@sleep 3
	@pnpm db:reset

db-migrate:
	pnpm db:migrate

db-shell:
	docker compose -f docker/compose.yml exec postgres psql -U postgres -d better_chatbot_dev

db-studio:
	pnpm db:studio

# Testing
test:
	pnpm test

test-watch:
	pnpm test:watch

test-e2e:
	pnpm test:e2e

test-e2e-ui:
	pnpm test:e2e:ui

# Code quality
lint:
	pnpm lint

format:
	pnpm format

check:
	pnpm check

# Docker production commands
build:
	docker build -f docker/Dockerfile . --tag=$(IMAGE):$(TAG)

tag-for-ecr: build
	docker tag $(IMAGE):$(TAG) $(ECR_REPO)/$(IMAGE):$(TAG)

login:
	aws ecr get-login-password --region=$(AWS_REGION) | \
		docker login --username=AWS --password-stdin $(ECR_REPO)

push: tag-for-ecr login
	docker push $(ECR_REPO)/$(IMAGE):$(TAG)

build-and-push: push

shell: build
	docker run -it --rm $(IMAGE):$(TAG) /bin/bash

clean:
	docker rmi $(IMAGE):$(TAG) || true
	docker rmi $(ECR_REPO)/$(IMAGE):$(TAG) || true
	docker compose -f docker/compose.yml down -v
