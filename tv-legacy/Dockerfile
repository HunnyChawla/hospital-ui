# TV Legacy Display - Dockerfile
# Simple Node.js server for serving static HTML/CSS/JS files
# Compatible with older browsers for TV displays

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Add metadata labels
LABEL maintainer="Hospital Management System"
LABEL description="TV Legacy Display - Static file server for old browsers"
LABEL version="1.0.0"

# Copy package files
COPY package*.json ./

# Install dependencies (currently none, but future-proof)
# Use --production to skip devDependencies
RUN npm ci --production --omit=dev || npm install --production || echo "No dependencies to install"

# Copy application files
COPY server.js ./
COPY *.html ./
COPY *.css ./
COPY *.js ./
COPY *.png ./
COPY assets/ ./assets/

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port 5500 (default for tv-legacy)
EXPOSE 5500

# Add healthcheck to verify server is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:5500/ || exit 1

# Set environment variables (can be overridden)
ENV PORT=5500
ENV API_BASE_URL=http://localhost:8080

# Start the server
CMD ["node", "server.js"]
