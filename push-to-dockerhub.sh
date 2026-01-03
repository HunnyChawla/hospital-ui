#!/bin/bash

# Docker Hub Push Script for Hospital UI
# Usage: ./push-to-dockerhub.sh [username] [image-name] [tag]
# Or use environment variables: DOCKERHUB_USERNAME, DOCKERHUB_IMAGE, DOCKERHUB_TAG

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_error() {
    echo -e "${RED}Error: $1${NC}" >&2
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running. Please start Docker first."
    exit 1
fi

# Get configuration from parameters or environment variables
DOCKERHUB_USERNAME="${1:-${DOCKERHUB_USERNAME:-technesian}}"
IMAGE_NAME="${2:-${DOCKERHUB_IMAGE:-hospital-ui}}"
TAG="${3:-${DOCKERHUB_TAG:-latest}}"

# Validate Docker Hub username (should not be empty after defaults)
if [ -z "$DOCKERHUB_USERNAME" ]; then
    print_error "Docker Hub username is required."
    echo "Usage: ./push-to-dockerhub.sh [username] [image-name] [tag]"
    echo "Or set DOCKERHUB_USERNAME environment variable"
    echo "Default username: technesian"
    exit 1
fi

# Get version from package.json if available
if [ -f "package.json" ] && [ "$TAG" = "latest" ]; then
    VERSION=$(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)
    if [ -n "$VERSION" ]; then
        print_info "Detected version from package.json: $VERSION"
        # Use version as additional tag
        VERSION_TAG="$VERSION"
    fi
fi

# Full image name
FULL_IMAGE_NAME="${DOCKERHUB_USERNAME}/${IMAGE_NAME}"

print_info "Building and pushing Docker image..."
print_info "Image: ${FULL_IMAGE_NAME}:${TAG}"
if [ -n "$VERSION_TAG" ]; then
    print_info "Additional tag: ${FULL_IMAGE_NAME}:${VERSION_TAG}"
fi

# Check if user is logged in to Docker Hub
if ! docker info | grep -q "Username:"; then
    print_info "You may need to login to Docker Hub. Run: docker login"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build the Docker image
print_info "Building Docker image..."
if docker build -t "${FULL_IMAGE_NAME}:${TAG}" .; then
    print_success "Image built successfully: ${FULL_IMAGE_NAME}:${TAG}"
else
    print_error "Failed to build Docker image"
    exit 1
fi

# Tag with version if available
if [ -n "$VERSION_TAG" ]; then
    print_info "Tagging image with version: ${VERSION_TAG}"
    if docker tag "${FULL_IMAGE_NAME}:${TAG}" "${FULL_IMAGE_NAME}:${VERSION_TAG}"; then
        print_success "Image tagged: ${FULL_IMAGE_NAME}:${VERSION_TAG}"
    else
        print_error "Failed to tag image with version"
        exit 1
    fi
fi

# Push the image(s)
print_info "Pushing image to Docker Hub..."
if docker push "${FULL_IMAGE_NAME}:${TAG}"; then
    print_success "Image pushed successfully: ${FULL_IMAGE_NAME}:${TAG}"
else
    print_error "Failed to push image. Make sure you're logged in: docker login"
    exit 1
fi

# Push version tag if available
if [ -n "$VERSION_TAG" ]; then
    print_info "Pushing version tag..."
    if docker push "${FULL_IMAGE_NAME}:${VERSION_TAG}"; then
        print_success "Version tag pushed successfully: ${FULL_IMAGE_NAME}:${VERSION_TAG}"
    else
        print_error "Failed to push version tag"
        exit 1
    fi
fi

print_success "All done! Image available at: https://hub.docker.com/r/${DOCKERHUB_USERNAME}/${IMAGE_NAME}"
echo ""
echo "To pull and run the image:"
echo "  docker pull ${FULL_IMAGE_NAME}:${TAG}"
if [ -n "$VERSION_TAG" ]; then
    echo "  docker pull ${FULL_IMAGE_NAME}:${VERSION_TAG}"
fi

