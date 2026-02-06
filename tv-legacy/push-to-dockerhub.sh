#!/bin/bash

# Docker Hub Push Script for TV Legacy Display (Multi-Platform)
# Usage: ./push-to-dockerhub.sh [username] [image-name] [tag] [--platform=linux/amd64,linux/arm64] [--multi-platform]
# Or use environment variables: DOCKERHUB_USERNAME, DOCKERHUB_IMAGE, DOCKERHUB_TAG, DOCKER_PLATFORMS

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

# Parse arguments
POSITIONAL_ARGS=()
PLATFORMS=""

for arg in "$@"; do
    case $arg in
        --platform=*)
            PLATFORMS="${arg#*=}"
            shift
            ;;
        --multi-platform)
            PLATFORMS="linux/amd64,linux/arm64"
            shift
            ;;
        --help|-h)
            echo "Docker Hub Push Script for TV Legacy Display (Multi-Platform)"
            echo ""
            echo "Usage: ./push-to-dockerhub.sh [username] [image-name] [tag] [options]"
            echo ""
            echo "Arguments:"
            echo "  username    Docker Hub username (default: technesian)"
            echo "  image-name  Image name (default: tv-legacy-display)"
            echo "  tag         Image tag (default: latest)"
            echo ""
            echo "Options:"
            echo "  --platform=PLATFORMS  Comma-separated list of platforms to build"
            echo "                        Example: --platform=linux/amd64"
            echo "  --multi-platform      Build for linux/amd64 and linux/arm64"
            echo "                        (Default behavior is single platform/native)"
            echo "  -h, --help           Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  DOCKERHUB_USERNAME   Docker Hub username"
            echo "  DOCKERHUB_IMAGE      Image name"
            echo "  DOCKERHUB_TAG        Image tag"
            echo "  DOCKER_PLATFORMS     Platforms to build (e.g., linux/amd64,linux/arm64)"
            echo ""
            echo "Examples:"
            echo "  ./push-to-dockerhub.sh"
            echo "  ./push-to-dockerhub.sh myuser tv-legacy v1.0.0"
            echo "  ./push-to-dockerhub.sh --platform=linux/amd64"
            exit 0
            ;;
        *)
            POSITIONAL_ARGS+=("$arg")
            ;;
    esac
done

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
DOCKERHUB_USERNAME="${POSITIONAL_ARGS[0]:-${DOCKERHUB_USERNAME:-technesian}}"
IMAGE_NAME="${POSITIONAL_ARGS[1]:-${DOCKERHUB_IMAGE:-tv-legacy-display}}"
TAG="${POSITIONAL_ARGS[2]:-${DOCKERHUB_TAG:-latest}}"
PLATFORMS="${PLATFORMS:-${DOCKER_PLATFORMS}}"

# Validate Docker Hub username (should not be empty after defaults)
if [ -z "$DOCKERHUB_USERNAME" ]; then
    print_error "Docker Hub username is required."
    echo "Usage: ./push-to-dockerhub.sh [username] [image-name] [tag]"
    echo "Or set DOCKERHUB_USERNAME environment variable"
    echo "Default username: technesian"
    exit 1
fi

# Get version from package.json if available
VERSION_TAG=""
if [ -f "package.json" ] && [ "$TAG" = "latest" ]; then
    VERSION=$(grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4)
    if [ -n "$VERSION" ]; then
        print_info "Detected version from package.json: $VERSION"
        VERSION_TAG="$VERSION"
    fi
fi

# Full image name
FULL_IMAGE_NAME="${DOCKERHUB_USERNAME}/${IMAGE_NAME}"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  TV Legacy Display - Docker Multi-Platform Build & Push"
echo "═══════════════════════════════════════════════════════════════"
echo ""
print_info "Image: ${FULL_IMAGE_NAME}:${TAG}"
if [ -n "$VERSION_TAG" ]; then
    print_info "Version tag: ${FULL_IMAGE_NAME}:${VERSION_TAG}"
fi
print_info "Platforms: ${PLATFORMS}"
echo ""

# Check if user is logged in to Docker Hub
if ! docker info 2>/dev/null | grep -q "Username:"; then
    print_info "You may need to login to Docker Hub. Run: docker login"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Setup buildx builder for multi-platform builds
print_step "Setting up Docker Buildx for multi-platform builds..."

BUILDER_NAME="tv-legacy-builder"

# Check if builder already exists
if docker buildx inspect "$BUILDER_NAME" &> /dev/null; then
    print_info "Using existing builder: $BUILDER_NAME"
    docker buildx use "$BUILDER_NAME"
else
    print_info "Creating new buildx builder: $BUILDER_NAME"
    docker buildx create --name "$BUILDER_NAME" --use --bootstrap
fi

# Ensure builder is bootstrapped
docker buildx inspect --bootstrap &> /dev/null

print_success "Buildx builder ready"

# Build and push with version tag if available
if [ -n "$PLATFORMS" ]; then
    print_step "Building and pushing multi-platform image ($PLATFORMS)..."
else
    print_step "Building and pushing native image..."
fi

# Construct the build command with registry cache for faster multi-platform builds
BUILD_CMD="docker buildx build --push"
if [ -n "$PLATFORMS" ]; then
    BUILD_CMD="${BUILD_CMD} --platform ${PLATFORMS}"
fi
BUILD_CMD="${BUILD_CMD} --cache-from=type=registry,ref=${FULL_IMAGE_NAME}:buildcache"
BUILD_CMD="${BUILD_CMD} --cache-to=type=registry,ref=${FULL_IMAGE_NAME}:buildcache,mode=max,compression=zstd,compression-level=3"

# Add tags
BUILD_CMD="${BUILD_CMD} -t ${FULL_IMAGE_NAME}:${TAG}"

if [ -n "$VERSION_TAG" ]; then
    BUILD_CMD="${BUILD_CMD} -t ${FULL_IMAGE_NAME}:${VERSION_TAG}"
fi

# Add build context
BUILD_CMD="${BUILD_CMD} ."

print_info "Executing: $BUILD_CMD"
echo ""

# Execute build
if $BUILD_CMD; then
    echo ""
    print_success "Image built and pushed successfully!"
else
    print_error "Failed to build/push image"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
print_success "All done!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Image available at: https://hub.docker.com/r/${DOCKERHUB_USERNAME}/${IMAGE_NAME}"
echo ""
echo "To pull and run the image on any platform:"
echo "  docker pull ${FULL_IMAGE_NAME}:${TAG}"
if [ -n "$VERSION_TAG" ]; then
    echo "  docker pull ${FULL_IMAGE_NAME}:${VERSION_TAG}"
fi
echo ""
echo "Supported platforms: ${PLATFORMS}"
echo ""
