# Variables (can be overridden from command line)
# Example: make build-and-push TAG=v1.2.3
ECR_REPO=525896657660.dkr.ecr.us-west-2.amazonaws.com
AWS_REGION=us-west-2
IMAGE=better-chatbot
TAG=latest

# Phony targets
.PHONY: build tag-for-ecr login push build-and-push shell clean

# Build the Docker image
build:
	docker build -f docker/Dockerfile . --tag=$(IMAGE):$(TAG)

# Tag the image for ECR
tag-for-ecr: build
	docker tag $(IMAGE):$(TAG) $(ECR_REPO)/$(IMAGE):$(TAG)

# Login to ECR
login:
	aws ecr get-login-password --region=$(AWS_REGION) | \
		docker login --username=AWS --password-stdin $(ECR_REPO)

# Push the image to ECR
push: tag-for-ecr login
	docker push $(ECR_REPO)/$(IMAGE):$(TAG)

# Build, tag, and push in one command
build-and-push: push

# Run the latest image locally for testing and debugging
shell: build
	docker run -it --rm $(IMAGE):$(TAG) /bin/bash

# Clean up local images
clean:
	docker rmi $(IMAGE):$(TAG) || true
	docker rmi $(ECR_REPO)/$(IMAGE):$(TAG) || true
