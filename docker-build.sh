#!/bin/bash

# =============================================================================
# Docker Build Script for Hospital UI
# =============================================================================
# Supports: build, push, build-push, tag, clean
#
# Usage:
#   ./docker-build.sh build                    # Build image locally
#   ./docker-build.sh build-push --username=USER  # Build and push to Docker Hub
#   ./docker-build.sh push                     # Push existing image
#   ./docker-build.sh tag latest v1.0.0        # Tag image
#   ./docker-build.sh clean                    # Remove images and cache
#
# Environment Variables:
#   DOCKERHUB_USERNAME  - Docker Hub username
#   DOCKERHUB_IMAGE     - Image name (default: hospital-ui)
#   DOCKERHUB_TAG       - Image tag (default: latest)
#   DOCKER_PLATFORMS    - Build platforms (default: linux/amd64)
#   CACHE_MODE          - Cache mode: registry, local, none (default: registry)
# =============================================================================

set -e  # Exit on error

# ---- Script Directory ----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ---- Default Configuration ----
USERNAME="${DOCKERHUB_USERNAME:-}"
IMAGE_NAME="${DOCKERHUB_IMAGE:-hospital-ui}"
TAG="${DOCKERHUB_TAG:-latest}"
PLATFORMS="${DOCKER_PLATFORMS:-linux/amd64}"
BUILDER_NAME="hospital-ui-builder"
CACHE_MODE="${CACHE_MODE:-registry}"

# Build arguments (from environment)
NEXT_PUBLIC_BASE_PATH="${NEXT_PUBLIC_BASE_PATH:-}"
NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-}"
NEXT_PUBLIC_DOMAIN_URL="${NEXT_PUBLIC_DOMAIN_URL:-}"

# Flags
CI_MODE=false
DRY_RUN=false

# ---- Colors ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ---- Helper Functions ----
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_info() { echo -e "${YELLOW}[INFO]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }
log_debug() { echo -e "${CYAN}[DEBUG]${NC} $1"; }

# Get version from package.json
get_version() {
    if [ -f "package.json" ]; then
        grep -o '"version": "[^"]*"' package.json | cut -d'"' -f4
    fi
}

# Get git short SHA
get_git_sha() {
    if git rev-parse --git-dir > /dev/null 2>&1; then
        git rev-parse --short HEAD 2>/dev/null
    fi
}

# Get ISO 8601 timestamp
get_build_date() {
    date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# ---- Show Help ----
show_help() {
    cat << 'EOF'
Docker Build Script for Hospital UI

USAGE:
    ./docker-build.sh <command> [options]

COMMANDS:
    build       Build image locally (--load)
    push        Push existing image to registry
    build-push  Build and push to registry (default)
    tag         Tag existing image: ./docker-build.sh tag <source> <target>
    clean       Remove images and build cache

OPTIONS:
    --ci                Non-interactive CI mode (no prompts)
    --no-cache          Disable all caching
    --cache=MODE        Cache mode: registry, local, none (default: registry)
    --platform=PLAT     Target platforms (default: linux/amd64)
    --username=USER     Docker Hub username (required for push)
    --image=NAME        Image name (default: hospital-ui)
    --tag=TAG           Image tag (default: latest)
    --dry-run           Show commands without executing

BUILD ARGUMENTS:
    --api-url=URL       Set NEXT_PUBLIC_API_BASE_URL
    --base-path=PATH    Set NEXT_PUBLIC_BASE_PATH
    --domain-url=URL    Set NEXT_PUBLIC_DOMAIN_URL

ENVIRONMENT VARIABLES:
    DOCKERHUB_USERNAME      Docker Hub username
    DOCKERHUB_IMAGE         Image name
    DOCKERHUB_TAG           Image tag
    DOCKER_PLATFORMS        Build platforms
    CACHE_MODE              Cache mode (registry, local, none)
    NEXT_PUBLIC_API_BASE_URL    API base URL for Next.js build
    NEXT_PUBLIC_BASE_PATH       Base path for Next.js build
    NEXT_PUBLIC_DOMAIN_URL      Domain URL for Next.js build

EXAMPLES:
    # Build locally
    ./docker-build.sh build

    # Build and push with custom tag
    ./docker-build.sh build-push --username=myuser --tag=v1.0.0

    # Build for single platform (faster)
    ./docker-build.sh build --platform=linux/amd64

    # CI/CD build with registry cache
    ./docker-build.sh build-push --ci --username=myuser --cache=registry

    # Build with custom API URL
    ./docker-build.sh build --api-url=https://api.example.com

    # Clean up
    ./docker-build.sh clean
EOF
}

# ---- Parse Arguments ----
parse_args() {
    COMMAND="${1:-build-push}"
    shift || true

    while [[ $# -gt 0 ]]; do
        case $1 in
            --ci)
                CI_MODE=true
                ;;
            --no-cache)
                CACHE_MODE="none"
                ;;
            --dry-run)
                DRY_RUN=true
                ;;
            --cache=*)
                CACHE_MODE="${1#*=}"
                ;;
            --platform=*)
                PLATFORMS="${1#*=}"
                ;;
            --username=*)
                USERNAME="${1#*=}"
                ;;
            --image=*)
                IMAGE_NAME="${1#*=}"
                ;;
            --tag=*)
                TAG="${1#*=}"
                ;;
            --api-url=*)
                NEXT_PUBLIC_API_BASE_URL="${1#*=}"
                ;;
            --base-path=*)
                NEXT_PUBLIC_BASE_PATH="${1#*=}"
                ;;
            --domain-url=*)
                NEXT_PUBLIC_DOMAIN_URL="${1#*=}"
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                # For tag command, remaining args are source and target
                if [ "$COMMAND" = "tag" ]; then
                    break
                fi
                log_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
        shift
    done

    # Store remaining args for tag command
    REMAINING_ARGS=("$@")
}

# ---- Check Prerequisites ----
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
}

# ---- Setup Buildx ----
setup_buildx() {
    log_step "Setting up Docker Buildx..."

    # Check if buildx is available
    if ! docker buildx version &> /dev/null; then
        log_error "Docker Buildx is not available. Please update Docker."
        exit 1
    fi

    # Check if builder exists
    if docker buildx inspect "$BUILDER_NAME" &> /dev/null; then
        log_info "Using existing builder: $BUILDER_NAME"
        docker buildx use "$BUILDER_NAME"
    else
        log_info "Creating new buildx builder: $BUILDER_NAME"
        docker buildx create --name "$BUILDER_NAME" --use --bootstrap
    fi

    # Ensure builder is running
    docker buildx inspect --bootstrap &> /dev/null

    log_success "Buildx builder ready"
}

# ---- Build Image ----
do_build() {
    local push_flag="$1"

    # Determine full image name
    local full_image
    if [ -n "$USERNAME" ]; then
        full_image="${USERNAME}/${IMAGE_NAME}"
    else
        full_image="${IMAGE_NAME}"
    fi

    # Get metadata
    local version=$(get_version)
    local git_sha=$(get_git_sha)
    local build_date=$(get_build_date)

    log_step "Building image: ${full_image}:${TAG}"
    log_info "Platforms: ${PLATFORMS}"
    log_info "Cache mode: ${CACHE_MODE}"
    log_info "Pull latest base images: yes"
    [ -n "$version" ] && log_info "Version: ${version}"
    [ -n "$git_sha" ] && log_info "Git SHA: ${git_sha}"

    # Construct build command
    # --pull ensures we always get the latest base images (node:20-alpine, nginx:alpine)
    local cmd="docker buildx build --pull --platform ${PLATFORMS}"

    # Cache configuration
    case $CACHE_MODE in
        registry)
            if [ -n "$USERNAME" ]; then
                cmd+=" --cache-from=type=registry,ref=${full_image}:buildcache"
                cmd+=" --cache-to=type=registry,ref=${full_image}:buildcache,mode=max,compression=zstd,compression-level=3"
            else
                log_info "Registry cache requires username, using inline cache"
                cmd+=" --cache-to=type=inline"
            fi
            ;;
        local)
            local cache_dir="${TMPDIR:-/tmp}/.buildx-cache"
            cmd+=" --cache-from=type=local,src=${cache_dir}"
            cmd+=" --cache-to=type=local,dest=${cache_dir}-new,mode=max"
            ;;
        none)
            cmd+=" --no-cache"
            ;;
        *)
            log_error "Invalid cache mode: ${CACHE_MODE}"
            exit 1
            ;;
    esac

    # Build arguments
    [ -n "$NEXT_PUBLIC_BASE_PATH" ] && cmd+=" --build-arg NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}"
    [ -n "$NEXT_PUBLIC_API_BASE_URL" ] && cmd+=" --build-arg NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}"
    [ -n "$NEXT_PUBLIC_DOMAIN_URL" ] && cmd+=" --build-arg NEXT_PUBLIC_DOMAIN_URL=${NEXT_PUBLIC_DOMAIN_URL}"

    # Metadata arguments
    cmd+=" --build-arg APP_VERSION=${version:-0.1.0}"
    cmd+=" --build-arg BUILD_DATE=${build_date}"
    [ -n "$git_sha" ] && cmd+=" --build-arg VCS_REF=${git_sha}"

    # Tags
    cmd+=" -t ${full_image}:${TAG}"
    if [ -n "$version" ] && [ "$TAG" != "$version" ]; then
        cmd+=" -t ${full_image}:${version}"
    fi

    # Push or load
    if [ "$push_flag" = "push" ]; then
        cmd+=" --push"
    else
        # For local builds, only load if single platform
        if [[ "$PLATFORMS" != *","* ]]; then
            cmd+=" --load"
        else
            log_info "Multi-platform build without push. Image will be in buildx cache only."
            log_info "Use --push to push to registry, or specify single platform with --platform=linux/amd64"
        fi
    fi

    # Build context
    cmd+=" ."

    echo ""
    log_info "Executing: $cmd"
    echo ""

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would execute above command"
        return 0
    fi

    # Execute build
    if eval $cmd; then
        echo ""
        log_success "Build completed successfully!"

        # Handle local cache rotation
        if [ "$CACHE_MODE" = "local" ]; then
            local cache_dir="${TMPDIR:-/tmp}/.buildx-cache"
            if [ -d "${cache_dir}-new" ]; then
                rm -rf "${cache_dir}"
                mv "${cache_dir}-new" "${cache_dir}"
            fi
        fi
    else
        log_error "Build failed"
        exit 1
    fi
}

# ---- Push Image ----
do_push() {
    if [ -z "$USERNAME" ]; then
        log_error "Username required for push. Set DOCKERHUB_USERNAME or use --username"
        exit 1
    fi

    local full_image="${USERNAME}/${IMAGE_NAME}"

    log_step "Pushing image: ${full_image}:${TAG}"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would push ${full_image}:${TAG}"
        return 0
    fi

    if docker push "${full_image}:${TAG}"; then
        log_success "Push completed successfully!"
        echo ""
        echo "Image available at: https://hub.docker.com/r/${USERNAME}/${IMAGE_NAME}"
    else
        log_error "Push failed"
        exit 1
    fi
}

# ---- Tag Image ----
do_tag() {
    local source_tag="${REMAINING_ARGS[0]:-latest}"
    local target_tag="${REMAINING_ARGS[1]:-$TAG}"

    local full_image
    if [ -n "$USERNAME" ]; then
        full_image="${USERNAME}/${IMAGE_NAME}"
    else
        full_image="${IMAGE_NAME}"
    fi

    log_step "Tagging ${full_image}:${source_tag} as ${full_image}:${target_tag}"

    if [ "$DRY_RUN" = true ]; then
        log_info "[DRY RUN] Would tag image"
        return 0
    fi

    if docker tag "${full_image}:${source_tag}" "${full_image}:${target_tag}"; then
        log_success "Tag completed successfully!"
    else
        log_error "Tag failed"
        exit 1
    fi
}

# ---- Clean ----
do_clean() {
    log_step "Cleaning up Docker resources..."

    local full_image
    if [ -n "$USERNAME" ]; then
        full_image="${USERNAME}/${IMAGE_NAME}"
    else
        full_image="${IMAGE_NAME}"
    fi

    # Remove images
    log_info "Removing ${full_image} images..."
    docker images "${full_image}" -q 2>/dev/null | xargs -r docker rmi -f 2>/dev/null || true

    # Remove dangling images
    log_info "Removing dangling images..."
    docker image prune -f

    # Remove buildx builder
    log_info "Removing buildx builder: ${BUILDER_NAME}..."
    docker buildx rm "$BUILDER_NAME" 2>/dev/null || true

    # Clear build cache
    log_info "Pruning build cache..."
    docker builder prune -f

    # Clear local cache directory
    local cache_dir="${TMPDIR:-/tmp}/.buildx-cache"
    if [ -d "${cache_dir}" ]; then
        log_info "Removing local cache directory..."
        rm -rf "${cache_dir}" "${cache_dir}-new"
    fi

    log_success "Cleanup completed!"
}

# ---- Main ----
main() {
    parse_args "$@"

    # Show banner
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  Hospital UI - Docker Build Script"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""

    # Check Docker
    check_docker

    # Validate username for push operations
    if [[ "$COMMAND" =~ push ]] && [ -z "$USERNAME" ]; then
        log_error "Username required for push operations."
        echo "Set DOCKERHUB_USERNAME environment variable or use --username=<user>"
        exit 1
    fi

    # Confirmation for push (unless CI mode)
    if [ "$CI_MODE" = false ] && [[ "$COMMAND" =~ push ]]; then
        local full_image="${USERNAME}/${IMAGE_NAME}"
        echo "About to push: ${full_image}:${TAG}"
        read -p "Continue? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Aborted by user"
            exit 0
        fi
    fi

    # Execute command
    case $COMMAND in
        build)
            setup_buildx
            do_build "load"
            ;;
        push)
            do_push
            ;;
        build-push)
            setup_buildx
            do_build "push"
            ;;
        tag)
            do_tag
            ;;
        clean)
            do_clean
            ;;
        -h|--help)
            show_help
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac

    echo ""
}

main "$@"
