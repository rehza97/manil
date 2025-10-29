# Guide Docker - CloudManager

Ce guide explique comment utiliser les Dockerfiles et docker-compose pour déployer CloudManager.

## 🐳 Structure des Dockerfiles

### Backend (FastAPI)

- **Fichier:** `backend/Dockerfile`
- **Image de base:** Python 3.11-slim
- **Architecture:** Multi-stage build
- **Port:** 8000
- **Fonctionnalités:**
  - Build optimisé avec cache des dépendances
  - Utilisateur non-root pour la sécurité
  - Health checks intégrés
  - Support PostgreSQL et Redis

### Frontend (React + Vite)

- **Fichier:** `frontend/Dockerfile`
- **Image de base:** Node.js 20-alpine + Nginx Alpine
- **Architecture:** Multi-stage build
- **Port:** 80
- **Fonctionnalités:**
  - Build optimisé avec Vite
  - Nginx configuré pour SPA
  - Compression Gzip
  - Headers de sécurité
  - Proxy API intégré

## 🚀 Utilisation

### 1. Variables d'environnement

Créez un fichier `.env` à la racine du projet :

```bash
# Database
DB_PASSWORD=your_secure_password
DATABASE_URL=postgresql+asyncpg://cloudmanager:your_secure_password@postgres:5432/cloudmanager

# Redis
REDIS_PASSWORD=your_redis_password
REDIS_URL=redis://:your_redis_password@redis:6379/0

# JWT
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production

# Application
DEBUG=False
ENVIRONMENT=production

# Frontend
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=CloudManager
```

### 2. Démarrage des services

```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter les services
docker-compose down
```

### 3. Services disponibles

- **Frontend:** http://localhost:80
- **Backend API:** http://localhost:8000
- **PostgreSQL:** localhost:5432
- **Redis:** localhost:6379

### 4. Commandes utiles

```bash
# Rebuild les images
docker-compose build --no-cache

# Redémarrer un service spécifique
docker-compose restart frontend

# Voir les logs d'un service
docker-compose logs -f backend

# Exécuter des commandes dans un conteneur
docker-compose exec backend python -c "print('Hello from backend')"
docker-compose exec frontend sh

# Nettoyer les volumes
docker-compose down -v
```

## 🔧 Développement

### Mode développement

Pour le développement, vous pouvez utiliser les services séparément :

```bash
# Backend seulement
docker-compose up postgres redis backend

# Frontend en mode dev (local)
cd frontend
npm run dev
```

### Hot reload

Le backend est configuré avec un volume monté pour le hot reload en développement.

## 🛡️ Sécurité

### Backend

- Utilisateur non-root (appuser)
- Variables d'environnement pour les secrets
- Headers de sécurité
- Validation des entrées

### Frontend

- Utilisateur non-root (nginx)
- Headers de sécurité CSP
- Configuration Nginx sécurisée
- Proxy API pour éviter les CORS

## 📊 Monitoring

### Health Checks

Tous les services incluent des health checks :

```bash
# Vérifier le statut des services
docker-compose ps

# Health check manuel
curl http://localhost:8000/health  # Backend
curl http://localhost:80/health    # Frontend
```

### Logs

```bash
# Logs en temps réel
docker-compose logs -f

# Logs d'un service spécifique
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 🚀 Production

### Optimisations

1. **Images multi-stage** pour réduire la taille
2. **Cache des dépendances** pour des builds plus rapides
3. **Compression Gzip** pour le frontend
4. **Health checks** pour la surveillance
5. **Utilisateurs non-root** pour la sécurité

### Déploiement

```bash
# Build pour la production
docker-compose -f docker-compose.prod.yml up -d

# Avec un reverse proxy (Nginx/Traefik)
# Configurer les domaines et SSL
```

## 🔍 Dépannage

### Problèmes courants

1. **Port déjà utilisé**

   ```bash
   # Changer les ports dans docker-compose.yml
   ports:
     - "8080:8000"  # Backend sur 8080
   ```

2. **Erreur de base de données**

   ```bash
   # Vérifier les logs PostgreSQL
   docker-compose logs postgres

   # Redémarrer la base de données
   docker-compose restart postgres
   ```

3. **Frontend ne se connecte pas au backend**
   ```bash
   # Vérifier la variable VITE_API_URL
   # S'assurer que le backend est accessible
   curl http://localhost:8000/health
   ```

### Nettoyage

```bash
# Supprimer tous les conteneurs et volumes
docker-compose down -v --remove-orphans

# Nettoyer les images non utilisées
docker system prune -a

# Nettoyer les volumes orphelins
docker volume prune
```

## 📝 Notes importantes

1. **Secrets:** Ne jamais commiter les fichiers `.env` avec de vrais secrets
2. **Volumes:** Les données sont persistées dans des volumes Docker
3. **Réseau:** Tous les services communiquent via le réseau `cloudmanager-network`
4. **Dépendances:** Le frontend attend que le backend soit healthy avant de démarrer
5. **Build:** Les images sont rebuildées automatiquement si le code change

## 🔗 Liens utiles

- [Documentation Docker Compose](https://docs.docker.com/compose/)
- [Documentation FastAPI](https://fastapi.tiangolo.com/)
- [Documentation Vite](https://vitejs.dev/)
- [Documentation Nginx](https://nginx.org/en/docs/)
