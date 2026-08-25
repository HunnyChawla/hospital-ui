#!/bin/sh

# Default values
: "${NEXT_PUBLIC_API_BASE_URL:=/api}"
: "${NEXT_PUBLIC_DOMAIN_URL:=}"

# Create env-config.js
cat <<EOF > /usr/share/nginx/html/env-config.js
window.__ENV = {
  NEXT_PUBLIC_API_BASE_URL: "${NEXT_PUBLIC_API_BASE_URL}",
  NEXT_PUBLIC_DOMAIN_URL: "${NEXT_PUBLIC_DOMAIN_URL}",
};
EOF

# Execute the passed command
exec "$@"
