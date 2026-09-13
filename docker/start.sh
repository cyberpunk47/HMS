#!/bin/bash
set -e

echo "========================================="
echo "  HMS Microservices - Docker Startup"
echo "========================================="

# Build all images
echo "[1/3] Building all Docker images..."
docker compose up --build -d

# Wait for infrastructure
echo "[2/3] Waiting for infrastructure to initialize..."
echo "  - PostgreSQL..."
sleep 5
echo "  - Kafka..."
sleep 5
echo "  - Eureka Server..."
sleep 10

# Show status
echo "[3/3] All containers started!"
echo ""
echo "========================================="
echo "  Service URLs"
echo "========================================="
echo "  Eureka Dashboard : http://localhost:8761"
echo "  API Gateway      : http://localhost:9000"
echo "  UserMS           : http://localhost:8082"
echo "  ProfileMS        : http://localhost:9100"
echo "  AppointmentMS    : http://localhost:9200"
echo "  PharmacyMS       : http://localhost:9300"
echo "  NotificationMS   : http://localhost:9101"
echo "========================================="
echo ""

# Follow logs
docker compose logs -f
