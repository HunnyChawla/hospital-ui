# Stage 1: Build the Next.js application
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build arguments for Next.js public environment variables (optional)
# These can override values from .env.production if explicitly provided
# If not provided, Next.js will read from .env.production file automatically
ARG NEXT_PUBLIC_BASE_PATH
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_DOMAIN_URL
# Add more NEXT_PUBLIC_* variables as needed

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies including devDependencies (needed for TypeScript build)
# Don't set NODE_ENV=production yet, as it would skip devDependencies
# Use BuildKit cache mount to persist npm cache between builds
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy source code (including .env.production if it exists)
COPY . .

# Build the application (creates static files in out/)
# Set NODE_ENV=production for the build so Next.js reads .env.production
# Next.js will use build args if provided, otherwise .env.production, then defaults
# Only set environment variables if build args are non-empty to avoid overriding .env.production
RUN \
    export NODE_ENV=production && \
    ([ -z "$NEXT_PUBLIC_BASE_PATH" ] || export NEXT_PUBLIC_BASE_PATH="$NEXT_PUBLIC_BASE_PATH") && \
    ([ -z "$NEXT_PUBLIC_API_BASE_URL" ] || export NEXT_PUBLIC_API_BASE_URL="$NEXT_PUBLIC_API_BASE_URL") && \
    ([ -z "$NEXT_PUBLIC_DOMAIN_URL" ] || export NEXT_PUBLIC_DOMAIN_URL="$NEXT_PUBLIC_DOMAIN_URL") && \
    npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static files from builder stage
COPY --from=builder /app/out /usr/share/nginx/html

# Copy entrypoint script
COPY entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port 80
EXPOSE 80

# Set entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

