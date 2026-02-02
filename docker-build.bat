@echo off
setlocal enabledelayedexpansion

:: =============================================================================
:: Docker Build Script for Hospital UI (Windows)
:: =============================================================================
:: Supports: build, push, build-push, tag, clean
::
:: Usage:
::   docker-build.bat build                    - Build image locally
::   docker-build.bat build-push --username=USER  - Build and push to Docker Hub
::   docker-build.bat push                     - Push existing image
::   docker-build.bat tag latest v1.0.0        - Tag image
::   docker-build.bat clean                    - Remove images and cache
::
:: Environment Variables:
::   DOCKERHUB_USERNAME  - Docker Hub username
::   DOCKERHUB_IMAGE     - Image name (default: hospital-ui)
::   DOCKERHUB_TAG       - Image tag (default: latest)
::   DOCKER_PLATFORMS    - Build platforms (default: linux/amd64)
::   CACHE_MODE          - Cache mode: registry, local, none (default: registry)
:: =============================================================================

:: ---- Script Directory ----
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: ---- Default Configuration ----
:: Don't set a default username - let it be empty for local builds
set "USERNAME="
if defined DOCKERHUB_USERNAME set "USERNAME=%DOCKERHUB_USERNAME%"
if not defined DOCKERHUB_IMAGE set "IMAGE_NAME=hospital-ui"
if defined DOCKERHUB_IMAGE set "IMAGE_NAME=%DOCKERHUB_IMAGE%"
if not defined DOCKERHUB_TAG set "TAG=latest"
if defined DOCKERHUB_TAG set "TAG=%DOCKERHUB_TAG%"
if not defined DOCKER_PLATFORMS set "PLATFORMS=linux/amd64"
if defined DOCKER_PLATFORMS set "PLATFORMS=%DOCKER_PLATFORMS%"
set "BUILDER_NAME=hospital-ui-builder"
if not defined CACHE_MODE set "CACHE_MODE=registry"

:: Build arguments
if not defined NEXT_PUBLIC_BASE_PATH set "NEXT_PUBLIC_BASE_PATH="
if not defined NEXT_PUBLIC_API_BASE_URL set "NEXT_PUBLIC_API_BASE_URL="
if not defined NEXT_PUBLIC_DOMAIN_URL set "NEXT_PUBLIC_DOMAIN_URL="

:: Flags
set "CI_MODE=false"
set "DRY_RUN=false"

:: Tag command arguments
set "TAG_SOURCE="
set "TAG_TARGET="

:: ---- Parse Command ----
set "COMMAND=%~1"
if "%COMMAND%"=="" set "COMMAND=build-push"
if "%COMMAND%"=="-h" goto :show_help
if "%COMMAND%"=="--help" goto :show_help

shift

:: ---- Parse Options ----
:parse_loop
if "%~1"=="" goto :parse_done

set "ARG=%~1"

:: Handle flags
if "%ARG%"=="--ci" (
    set "CI_MODE=true"
    shift
    goto :parse_loop
)
if "%ARG%"=="--no-cache" (
    set "CACHE_MODE=none"
    shift
    goto :parse_loop
)
if "%ARG%"=="--dry-run" (
    set "DRY_RUN=true"
    shift
    goto :parse_loop
)
if "%ARG%"=="-h" goto :show_help
if "%ARG%"=="--help" goto :show_help

:: Handle --option=value format
echo !ARG! | findstr /C:"--cache=" >nul && (
    for /f "tokens=2 delims==" %%a in ("!ARG!") do set "CACHE_MODE=%%a"
    shift
    goto :parse_loop
)
echo !ARG! | findstr /C:"--platform=" >nul && (
    for /f "tokens=2 delims==" %%a in ("!ARG!") do set "PLATFORMS=%%a"
    shift
    goto :parse_loop
)
echo !ARG! | findstr /C:"--username=" >nul && (
    for /f "tokens=2 delims==" %%a in ("!ARG!") do set "USERNAME=%%a"
    shift
    goto :parse_loop
)
echo !ARG! | findstr /C:"--image=" >nul && (
    for /f "tokens=2 delims==" %%a in ("!ARG!") do set "IMAGE_NAME=%%a"
    shift
    goto :parse_loop
)
echo !ARG! | findstr /C:"--tag=" >nul && (
    for /f "tokens=2 delims==" %%a in ("!ARG!") do set "TAG=%%a"
    shift
    goto :parse_loop
)
echo !ARG! | findstr /C:"--api-url=" >nul && (
    for /f "tokens=2 delims==" %%a in ("!ARG!") do set "NEXT_PUBLIC_API_BASE_URL=%%a"
    shift
    goto :parse_loop
)
echo !ARG! | findstr /C:"--base-path=" >nul && (
    for /f "tokens=2 delims==" %%a in ("!ARG!") do set "NEXT_PUBLIC_BASE_PATH=%%a"
    shift
    goto :parse_loop
)
echo !ARG! | findstr /C:"--domain-url=" >nul && (
    for /f "tokens=2 delims==" %%a in ("!ARG!") do set "NEXT_PUBLIC_DOMAIN_URL=%%a"
    shift
    goto :parse_loop
)

:: Handle tag command positional arguments
if "%COMMAND%"=="tag" (
    if not defined TAG_SOURCE (
        set "TAG_SOURCE=%ARG%"
        shift
        goto :parse_loop
    )
    if not defined TAG_TARGET (
        set "TAG_TARGET=%ARG%"
        shift
        goto :parse_loop
    )
)

echo [ERROR] Unknown option: %ARG%
echo Use --help for usage information
exit /b 1

:parse_done

:: ---- Get Version from package.json ----
set "VERSION="
if exist "package.json" (
    for /f "tokens=2 delims=:," %%a in ('findstr /C:"\"version\"" package.json') do (
        set "VERSION=%%~a"
        set "VERSION=!VERSION: =!"
        set "VERSION=!VERSION:"=!"
    )
)

:: ---- Get Git SHA ----
set "GIT_SHA="
git rev-parse --short HEAD >nul 2>&1
if not errorlevel 1 (
    for /f %%a in ('git rev-parse --short HEAD 2^>nul') do set "GIT_SHA=%%a"
)

:: ---- Get Build Date ----
for /f "tokens=*" %%a in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ'"') do set "BUILD_DATE=%%a"

:: ---- Build Full Image Name ----
if defined USERNAME (
    if not "!USERNAME!"=="" (
        set "FULL_IMAGE=!USERNAME!/!IMAGE_NAME!"
    ) else (
        set "FULL_IMAGE=!IMAGE_NAME!"
    )
) else (
    set "FULL_IMAGE=!IMAGE_NAME!"
)

:: ---- Show Banner ----
echo.
echo ===============================================================
echo   Hospital UI - Docker Build Script (Windows)
echo ===============================================================
echo.

:: ---- Check Docker ----
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    exit /b 1
)

:: ---- Execute Command ----
if "%COMMAND%"=="build" goto :do_build
if "%COMMAND%"=="push" goto :do_push
if "%COMMAND%"=="build-push" goto :do_build_push
if "%COMMAND%"=="tag" goto :do_tag
if "%COMMAND%"=="clean" goto :do_clean

echo [ERROR] Unknown command: %COMMAND%
echo Use --help for usage information
exit /b 1

:: =============================================================================
:: COMMANDS
:: =============================================================================

:: ---- Build (Load) ----
:do_build
call :setup_buildx
if errorlevel 1 exit /b 1
call :build_image "load"
goto :end

:: ---- Push Only ----
:do_push
if not defined USERNAME (
    echo [ERROR] Username required for push. Set DOCKERHUB_USERNAME or use --username
    exit /b 1
)
if "!USERNAME!"=="" (
    echo [ERROR] Username required for push. Set DOCKERHUB_USERNAME or use --username
    exit /b 1
)

echo [STEP] Pushing !FULL_IMAGE!:!TAG!

if "!DRY_RUN!"=="true" (
    echo [DRY RUN] Would push !FULL_IMAGE!:!TAG!
    goto :end
)

docker push "!FULL_IMAGE!:!TAG!"
if errorlevel 1 (
    echo [ERROR] Push failed
    exit /b 1
)

echo [SUCCESS] Push completed successfully!
echo.
echo Image available at: https://hub.docker.com/r/!USERNAME!/!IMAGE_NAME!
goto :end

:: ---- Build and Push ----
:do_build_push
if not defined USERNAME (
    echo [ERROR] Username required for push. Set DOCKERHUB_USERNAME or use --username
    exit /b 1
)
if "!USERNAME!"=="" (
    echo [ERROR] Username required for push. Set DOCKERHUB_USERNAME or use --username
    exit /b 1
)

call :setup_buildx
if errorlevel 1 exit /b 1

if "!CI_MODE!"=="false" (
    echo About to push: !FULL_IMAGE!:!TAG!
    set /p "CONFIRM=Continue? (y/n) "
    if /i not "!CONFIRM!"=="y" (
        echo [INFO] Aborted by user
        exit /b 0
    )
)

call :build_image "push"
goto :end

:: ---- Tag ----
:do_tag
if not defined TAG_SOURCE set "TAG_SOURCE=latest"
if not defined TAG_TARGET set "TAG_TARGET=!TAG!"

echo [STEP] Tagging !FULL_IMAGE!:!TAG_SOURCE! as !FULL_IMAGE!:!TAG_TARGET!

if "!DRY_RUN!"=="true" (
    echo [DRY RUN] Would tag image
    goto :end
)

docker tag "!FULL_IMAGE!:!TAG_SOURCE!" "!FULL_IMAGE!:!TAG_TARGET!"
if errorlevel 1 (
    echo [ERROR] Tag failed
    exit /b 1
)

echo [SUCCESS] Tag completed successfully!
goto :end

:: ---- Clean ----
:do_clean
echo [STEP] Cleaning up Docker resources...

echo [INFO] Removing !FULL_IMAGE! images...
for /f "tokens=*" %%i in ('docker images "!FULL_IMAGE!" -q 2^>nul') do (
    docker rmi -f %%i 2>nul
)

echo [INFO] Removing dangling images...
docker image prune -f >nul 2>&1

echo [INFO] Removing buildx builder: !BUILDER_NAME!...
docker buildx rm "!BUILDER_NAME!" 2>nul

echo [INFO] Pruning build cache...
docker builder prune -f >nul 2>&1

echo [INFO] Removing local cache directory...
if exist "%TEMP%\.buildx-cache" rmdir /s /q "%TEMP%\.buildx-cache" 2>nul
if exist "%TEMP%\.buildx-cache-new" rmdir /s /q "%TEMP%\.buildx-cache-new" 2>nul

echo [SUCCESS] Cleanup completed!
goto :end

:: =============================================================================
:: HELPER FUNCTIONS
:: =============================================================================

:: ---- Setup Buildx ----
:setup_buildx
echo [STEP] Setting up Docker Buildx...

docker buildx version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Buildx is not available. Please update Docker Desktop.
    exit /b 1
)

docker buildx inspect "!BUILDER_NAME!" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Creating new buildx builder: !BUILDER_NAME!
    docker buildx create --name "!BUILDER_NAME!" --use --bootstrap
    if errorlevel 1 (
        echo [ERROR] Failed to create buildx builder
        exit /b 1
    )
) else (
    echo [INFO] Using existing builder: !BUILDER_NAME!
    docker buildx use "!BUILDER_NAME!"
)

echo [SUCCESS] Buildx builder ready
exit /b 0

:: ---- Build Image ----
:build_image
set "PUSH_FLAG=%~1"

echo [STEP] Building image: !FULL_IMAGE!:!TAG!
echo [INFO] Platforms: !PLATFORMS!
echo [INFO] Cache mode: !CACHE_MODE!
echo [INFO] Pull latest base images: yes
if defined VERSION echo [INFO] Version: !VERSION!
if defined GIT_SHA echo [INFO] Git SHA: !GIT_SHA!

:: Construct command
:: --pull ensures we always get the latest base images (node:20-alpine, nginx:alpine)
set "CMD=docker buildx build --pull --platform !PLATFORMS!"

:: Cache configuration
if "!CACHE_MODE!"=="registry" (
    if defined USERNAME (
        if not "!USERNAME!"=="" (
            set "CMD=!CMD! --cache-from=type=registry,ref=!FULL_IMAGE!:buildcache"
            set "CMD=!CMD! --cache-to=type=registry,ref=!FULL_IMAGE!:buildcache,mode=max,compression=zstd,compression-level=3"
        ) else (
            echo [INFO] Registry cache requires username, using inline cache
            set "CMD=!CMD! --cache-to=type=inline"
        )
    ) else (
        echo [INFO] Registry cache requires username, using inline cache
        set "CMD=!CMD! --cache-to=type=inline"
    )
)
if "!CACHE_MODE!"=="local" (
    set "CMD=!CMD! --cache-from=type=local,src=%TEMP%\.buildx-cache"
    set "CMD=!CMD! --cache-to=type=local,dest=%TEMP%\.buildx-cache-new,mode=max"
)
if "!CACHE_MODE!"=="none" (
    set "CMD=!CMD! --no-cache"
)

:: Build arguments
if defined NEXT_PUBLIC_BASE_PATH (
    if not "!NEXT_PUBLIC_BASE_PATH!"=="" set "CMD=!CMD! --build-arg NEXT_PUBLIC_BASE_PATH=!NEXT_PUBLIC_BASE_PATH!"
)
if defined NEXT_PUBLIC_API_BASE_URL (
    if not "!NEXT_PUBLIC_API_BASE_URL!"=="" set "CMD=!CMD! --build-arg NEXT_PUBLIC_API_BASE_URL=!NEXT_PUBLIC_API_BASE_URL!"
)
if defined NEXT_PUBLIC_DOMAIN_URL (
    if not "!NEXT_PUBLIC_DOMAIN_URL!"=="" set "CMD=!CMD! --build-arg NEXT_PUBLIC_DOMAIN_URL=!NEXT_PUBLIC_DOMAIN_URL!"
)

:: Metadata arguments
if defined VERSION (
    set "CMD=!CMD! --build-arg APP_VERSION=!VERSION!"
) else (
    set "CMD=!CMD! --build-arg APP_VERSION=0.1.0"
)
if defined BUILD_DATE set "CMD=!CMD! --build-arg BUILD_DATE=!BUILD_DATE!"
if defined GIT_SHA set "CMD=!CMD! --build-arg VCS_REF=!GIT_SHA!"

:: Tags
set "CMD=!CMD! -t !FULL_IMAGE!:!TAG!"
if defined VERSION (
    if not "!TAG!"=="!VERSION!" set "CMD=!CMD! -t !FULL_IMAGE!:!VERSION!"
)

:: Push or load
if "!PUSH_FLAG!"=="push" (
    set "CMD=!CMD! --push"
) else (
    :: For local builds, check if single platform
    echo !PLATFORMS! | findstr /C:"," >nul
    if errorlevel 1 (
        set "CMD=!CMD! --load"
    ) else (
        echo [INFO] Multi-platform build without push. Image will be in buildx cache only.
        echo [INFO] Use --push to push to registry, or specify single platform with --platform=linux/amd64
    )
)

:: Build context
set "CMD=!CMD! ."

echo.
echo [INFO] Executing: !CMD!
echo.

if "!DRY_RUN!"=="true" (
    echo [DRY RUN] Would execute above command
    exit /b 0
)

:: Execute build
!CMD!
if errorlevel 1 (
    echo [ERROR] Build failed
    exit /b 1
)

echo.
echo [SUCCESS] Build completed successfully!

:: Handle local cache rotation
if "!CACHE_MODE!"=="local" (
    if exist "%TEMP%\.buildx-cache-new" (
        if exist "%TEMP%\.buildx-cache" rmdir /s /q "%TEMP%\.buildx-cache"
        move "%TEMP%\.buildx-cache-new" "%TEMP%\.buildx-cache" >nul 2>&1
    )
)

exit /b 0

:: =============================================================================
:: HELP
:: =============================================================================

:show_help
echo.
echo Docker Build Script for Hospital UI (Windows)
echo.
echo USAGE:
echo     docker-build.bat ^<command^> [options]
echo.
echo COMMANDS:
echo     build       Build image locally (--load)
echo     push        Push existing image to registry
echo     build-push  Build and push to registry (default)
echo     tag         Tag existing image: docker-build.bat tag ^<source^> ^<target^>
echo     clean       Remove images and build cache
echo.
echo OPTIONS:
echo     --ci                Non-interactive CI mode (no prompts)
echo     --no-cache          Disable all caching (forces full rebuild)
echo     --cache=MODE        Cache mode: registry, local, none (default: registry)
echo                         Note: --pull is always used to get latest base images
echo     --platform=PLAT     Target platforms (default: linux/amd64)
echo     --username=USER     Docker Hub username (required for push)
echo     --image=NAME        Image name (default: hospital-ui)
echo     --tag=TAG           Image tag (default: latest)
echo     --dry-run           Show commands without executing
echo.
echo BUILD ARGUMENTS:
echo     --api-url=URL       Set NEXT_PUBLIC_API_BASE_URL
echo     --base-path=PATH    Set NEXT_PUBLIC_BASE_PATH
echo     --domain-url=URL    Set NEXT_PUBLIC_DOMAIN_URL
echo.
echo ENVIRONMENT VARIABLES:
echo     DOCKERHUB_USERNAME      Docker Hub username
echo     DOCKERHUB_IMAGE         Image name
echo     DOCKERHUB_TAG           Image tag
echo     DOCKER_PLATFORMS        Build platforms
echo     CACHE_MODE              Cache mode (registry, local, none)
echo     NEXT_PUBLIC_API_BASE_URL    API base URL for Next.js build
echo     NEXT_PUBLIC_BASE_PATH       Base path for Next.js build
echo     NEXT_PUBLIC_DOMAIN_URL      Domain URL for Next.js build
echo.
echo EXAMPLES:
echo     REM Build locally
echo     docker-build.bat build
echo.
echo     REM Build and push with custom tag
echo     docker-build.bat build-push --username=myuser --tag=v1.0.0
echo.
echo     REM Build for single platform (faster)
echo     docker-build.bat build --platform=linux/amd64
echo.
echo     REM CI/CD build with registry cache
echo     docker-build.bat build-push --ci --username=myuser --cache=registry
echo.
echo     REM Build with custom API URL
echo     docker-build.bat build --api-url=https://api.example.com
echo.
echo     REM Clean up
echo     docker-build.bat clean
echo.
goto :end

:end
endlocal
