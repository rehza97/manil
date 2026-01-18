# Multi-stage build for CloudManager Backend
# Cross-platform support: Linux, Windows 10/11, macOS
# Supports both x86_64 (amd64) and ARM64 architectures

# Stage 1: Builder
FROM python:3.11-slim as builder

# Set working directory (works on all platforms)
WORKDIR /app

# Install system dependencies for building
# Debian/Ubuntu package manager works on all Docker platforms
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim

# Set environment variables (works on all platforms)
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Set working directory
WORKDIR /app

# Install system dependencies (runtime only)
RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq5 \
    redis-tools \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies from builder to system location
COPY --from=builder /root/.local /usr/local

# Copy application code
# Note: File permissions are handled automatically by Docker on all platforms
COPY . .

# Copy and set permissions for entrypoint script
# Using exec form for cross-platform compatibility
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create storage directories (works on all platforms)
RUN mkdir -p storage/uploads storage/temp storage/pdfs \
    storage/attachments storage/backups logs

# Create non-root user (works on all platforms)
# Note: docker-compose.yml may override this with user: root for Docker socket access
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app || true

# Switch to non-root user (can be overridden in docker-compose.yml)
# Commented out for development when Docker socket access is needed
# USER appuser

# Expose port (works on all platforms)
EXPOSE 8000

# Health check (works on all platforms)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Set entrypoint (using exec form for cross-platform compatibility)
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Run the application
# Using exec form (array) for proper signal handling on all platforms
# Use --reload for development hot reload (incompatible with --workers)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
