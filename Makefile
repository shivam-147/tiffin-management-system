.PHONY: help up down restart logs build ps clean db-up db-down backend-build seed-admin

# Default target
help:
	@echo "=========================================================="
	@echo "    Tiffin Management System - Docker Management CLI      "
	@echo "=========================================================="
	@echo "  make up             - Start all services (MongoDB + Backend)"
	@echo "  make down           - Stop all containers"
	@echo "  make restart        - Restart all containers"
	@echo "  make build          - Build or rebuild Docker containers"
	@echo "  make logs           - Tail logs from all containers"
	@echo "  make ps             - List status of active containers"
	@echo ""
	@echo "  make db-up          - Start MongoDB only (for local dev)"
	@echo "  make db-down        - Stop MongoDB container"
	@echo "  make db-shell       - Open mongosh shell inside MongoDB"
	@echo ""
	@echo "  make seed-admin     - Run create-admin seed script"
	@echo "  make clean          - Stop containers and remove volumes"
	@echo "=========================================================="

# Start all containers in background
up:
	docker compose up -d

# Stop all containers
down:
	docker compose down

# Restart containers
restart:
	docker compose down && docker compose up -d

# Build or rebuild containers
build:
	docker compose build

# Follow logs
logs:
	docker compose logs -f

# Follow backend logs
logs-backend:
	docker compose logs -f backend

# Follow MongoDB logs
logs-db:
	docker compose logs -f mongodb

# Check running containers
ps:
	docker compose ps

# Start only MongoDB (convenient for local npm run dev in backend/)
db-up:
	docker compose up -d mongodb

# Stop only MongoDB
db-down:
	docker compose stop mongodb

# Open interactive MongoDB shell
db-shell:
	docker compose exec mongodb mongosh tiffin_management

# Run initial admin seeder script inside backend container
seed-admin:
	docker compose exec backend npm run create-admin

# Remove all containers and volumes (data wipe)
clean:
	docker compose down -v
