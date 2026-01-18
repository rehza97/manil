# Development build for CloudManager Frontend
# Cross-platform support: Linux, Windows 10/11, macOS
# Supports both x86_64 (amd64) and ARM64 architectures
FROM node:20-alpine

# Set working directory (works on all platforms)
WORKDIR /app

# Install system dependencies (Alpine package manager works on all Docker platforms)
RUN apk add --no-cache git curl

# Copy package files first for better layer caching
COPY package*.json ./

# Install ALL dependencies
# Using --legacy-peer-deps to resolve React 19 peer dependency conflicts
# (e.g., @testing-library/react requires React 18 but we're using React 19)
RUN npm install --legacy-peer-deps

# Copy source code
# Note: File permissions are handled automatically by Docker on all platforms
# Windows Docker Desktop uses Linux containers, so permissions work correctly
COPY . .

# Expose port (works on all platforms)
EXPOSE 5173

# Health check (works on all platforms)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5173/ || exit 1

# Start development server
# Using array form (exec form) for cross-platform compatibility
# This ensures proper signal handling on Linux, macOS, and Windows
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
