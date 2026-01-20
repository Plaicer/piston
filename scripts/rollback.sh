#!/bin/bash
set -e

echo "📋 Piston Rollback Script"
echo "=========================="

PISTON_DIR="/opt/piston"
DATA_DIR="/opt/piston/data"

# Get available image tags
echo "Available Piston images:"
docker images | grep piston

echo ""
echo "Enter image tag to rollback to (e.g., 'v3.1.0', 'main-latest'):"
read IMAGE_TAG

if [ -z "$IMAGE_TAG" ]; then
    echo "❌ No image tag provided"
    exit 1
fi

IMAGE="ghcr.io/engineer-man/piston:$IMAGE_TAG"

echo "Rolling back to: $IMAGE"

# Stop current container
echo "Stopping current container..."
sudo docker stop piston_api || echo "Container not running"

# Remove current container
echo "Removing current container..."
sudo docker rm piston_api || echo "Container doesn't exist"

# Start with previous image
echo "Starting container with: $IMAGE"
sudo docker run -d \
    --name piston_api \
    --restart always \
    --privileged \
    -p 2000:2000 \
    -v $DATA_DIR/piston/packages:/piston/packages \
    --tmpfs /tmp:exec \
    $IMAGE

echo "Waiting for container to be ready..."
sleep 5

if sudo docker exec piston_api curl -s http://localhost:2000/api/v2/runtimes > /dev/null 2>&1; then
    echo "✅ Rollback successful!"
else
    echo "❌ Container failed to start"
    sudo docker logs piston_api | tail -20
    exit 1
fi
