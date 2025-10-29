# CloudManager - Docker Deployment Guide

This guide covers running CloudManager using Docker and Docker Compose.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Service Details](#service-details)
- [Database Management](#database-management)
- [Troubleshooting](#troubleshooting)
- [Production Deployment](#production-deployment)

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB RAM available
- Ports 80, 5432, 6379, and 8000 available

## Quick Start

### 1. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and update the following critical values:

```bash
# Generate a secure JWT secret key
JWT_SECRET_KEY=$(openssl rand -hex 32)

# Set strong passwords
DB_PASSWORD=<your-secure-database-password>
REDIS_PASSWORD=<your-secure-redis-password>

# Configure email/SMS if needed
SENDGRID_API_KEY=<your-sendgrid-api-key>
TWILIO_ACCOUNT_SID=<your-twilio-sid>
TWILIO_AUTH_TOKEN=<your-twilio-token>
```

### 2. Start Services

```bash
# Start all services in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
```

### 3. Access the Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/api/docs
- **Alternative API Docs**: http://localhost:8000/api/redoc

### 4. Initial Setup

The backend container automatically:
- Waits for PostgreSQL to be ready
- Runs all database migrations
- Verifies the database schema
- Starts the FastAPI server

## Configuration

### Environment Variables

All configuration is done through environment variables in the `.env` file:

#### Database Configuration
```bash
DB_PASSWORD=cloudmanager_password  # Change in production!
```

#### Redis Configuration
```bash
REDIS_PASSWORD=redis_password  # Change in production!
```

#### Security Configuration
```bash
JWT_SECRET_KEY=your-secret-key-change-in-production  # MUST change!
ENVIRONMENT=production  # Options: development, staging, production
DEBUG=False  # Set to True only for development
```

#### Application Configuration
```bash
LOG_LEVEL=INFO  # Options: DEBUG, INFO, WARNING, ERROR, CRITICAL
```

#### Email Configuration (Optional)
```bash
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@cloudmanager.com
SENDGRID_FROM_NAME=CloudManager
```

#### SMS Configuration (Optional)
```bash
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

## Service Details

### Backend Service

The backend service runs the FastAPI application with:
- Automatic database migration on startup
- Health checks every 30 seconds
- Auto-restart on failure
- Volume mounts for development
- Non-root user for security

### PostgreSQL Service

- **Image**: PostgreSQL 15 Alpine
- **Port**: 5432
- **Database**: cloudmanager
- **User**: cloudmanager
- **Data**: Persisted in `postgres_data` volume

### Redis Service

- **Image**: Redis 7 Alpine
- **Port**: 6379
- **Persistence**: AOF enabled
- **Data**: Persisted in `redis_data` volume

### Frontend Service

- **Image**: Custom Nginx with React build
- **Port**: 80
- **API Proxy**: Configured to backend:8000

## Database Management

### Running Migrations

Migrations run automatically on container startup. To run manually:

```bash
# Access the backend container
docker-compose exec backend bash

# Run migrations
alembic upgrade head

# Create a new migration
alembic revision --autogenerate -m "Description of changes"

# View migration history
alembic history

# Check current version
alembic current
```

### Database Backup

```bash
# Backup the database
docker-compose exec postgres pg_dump -U cloudmanager cloudmanager > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker-compose exec -T postgres psql -U cloudmanager cloudmanager < backup_20250101_120000.sql
```

### Database Shell Access

```bash
# Access PostgreSQL shell
docker-compose exec postgres psql -U cloudmanager -d cloudmanager

# Run a query
docker-compose exec postgres psql -U cloudmanager -d cloudmanager -c "SELECT COUNT(*) FROM users;"
```

### Reset Database (Development Only)

```bash
# Stop all services
docker-compose down

# Remove database volume
docker volume rm manil_postgres_data

# Start services (fresh database will be created)
docker-compose up -d
```

## Troubleshooting

### Check Service Status

```bash
# View all running containers
docker-compose ps

# Check health status
docker-compose ps backend
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service with last 100 lines
docker-compose logs -f --tail=100 backend

# Search logs
docker-compose logs backend | grep ERROR
```

### Database Connection Issues

```bash
# Test database connectivity
docker-compose exec backend python -c "
import psycopg2
conn = psycopg2.connect(
    host='postgres',
    port=5432,
    user='cloudmanager',
    password='cloudmanager_password',
    database='cloudmanager'
)
print('✓ Database connection successful!')
conn.close()
"
```

### Redis Connection Issues

```bash
# Test Redis connectivity
docker-compose exec backend python -c "
import redis
r = redis.Redis(host='redis', port=6379, password='redis_password')
r.ping()
print('✓ Redis connection successful!')
"
```

### Container Won't Start

```bash
# Check container logs
docker-compose logs backend

# Rebuild without cache
docker-compose build --no-cache backend

# Remove and recreate
docker-compose down
docker-compose up -d --force-recreate backend
```

### Port Conflicts

If ports are already in use, modify `docker-compose.yml`:

```yaml
services:
  backend:
    ports:
      - "8001:8000"  # Change 8000 to 8001

  frontend:
    ports:
      - "8080:80"  # Change 80 to 8080
```

## Production Deployment

### Security Checklist

- [ ] Change all default passwords in `.env`
- [ ] Generate secure JWT_SECRET_KEY: `openssl rand -hex 32`
- [ ] Set `DEBUG=False`
- [ ] Set `ENVIRONMENT=production`
- [ ] Configure proper email/SMS credentials
- [ ] Enable SSL/TLS (use reverse proxy like Nginx or Traefik)
- [ ] Set up regular database backups
- [ ] Configure log rotation
- [ ] Limit exposed ports (don't expose PostgreSQL/Redis publicly)
- [ ] Use Docker secrets for sensitive data
- [ ] Enable firewall rules
- [ ] Set up monitoring and alerting

### Performance Optimization

```yaml
# In docker-compose.yml for production
services:
  backend:
    environment:
      - WORKERS=4  # Number of Uvicorn workers
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Using Docker Secrets (Recommended)

```yaml
# docker-compose.yml
version: "3.8"
services:
  backend:
    secrets:
      - db_password
      - jwt_secret
    environment:
      - DB_PASSWORD_FILE=/run/secrets/db_password
      - JWT_SECRET_KEY_FILE=/run/secrets/jwt_secret

secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
```

### Backup Strategy

```bash
# Create backup script: scripts/backup.sh
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
docker-compose exec -T postgres pg_dump -U cloudmanager cloudmanager | \
  gzip > "$BACKUP_DIR/db_backup_$DATE.sql.gz"

# Backup storage
tar -czf "$BACKUP_DIR/storage_backup_$DATE.tar.gz" -C ./backend/storage .

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "*.gz" -mtime +7 -delete
```

### Monitoring

```bash
# Add Prometheus metrics endpoint in backend
# Add container health monitoring

# View resource usage
docker stats

# View disk usage
docker system df
```

## Useful Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart a service
docker-compose restart backend

# View logs
docker-compose logs -f backend

# Execute command in container
docker-compose exec backend python -c "print('Hello')"

# Access container shell
docker-compose exec backend bash

# Rebuild and restart
docker-compose up -d --build

# Remove everything (including volumes)
docker-compose down -v

# Check health status
docker-compose ps
```

## Development vs Production

### Development Setup

```bash
# .env for development
DEBUG=True
ENVIRONMENT=development
LOG_LEVEL=DEBUG

# Use volume mounts for hot reload
volumes:
  - ./backend:/app
```

### Production Setup

```bash
# .env for production
DEBUG=False
ENVIRONMENT=production
LOG_LEVEL=INFO

# Don't mount source code
# Use built image only
```

## Support

For issues or questions:
1. Check the logs: `docker-compose logs -f`
2. Review this documentation
3. Check the main README.md
4. Contact the development team

## License

Copyright © 2025 CloudManager. All rights reserved.
