#!/bin/bash
set -e

echo "🔧 Setting up EC2 instance for Piston deployment..."

# Configuration
PISTON_DIR="/opt/piston"
DATA_DIR="/opt/piston/data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log messages
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    log_error "This script must be run as root"
    exit 1
fi

# Update system
log_info "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install Docker
log_info "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    log_info "Installing Docker..."
    apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    echo \
        "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
else
    log_warn "Docker is already installed"
fi

# Install AWS CLI for pulling from ECR when needed
log_info "Checking AWS CLI installation..."
if ! command -v aws &> /dev/null; then
    log_info "Installing AWS CLI..."
    apt-get install -y awscli
else
    log_warn "AWS CLI is already installed"
fi

# Start Docker
log_info "Starting Docker service..."
systemctl start docker
systemctl enable docker

# Create Piston directories
log_info "Creating Piston directories..."
mkdir -p $PISTON_DIR $DATA_DIR/piston/packages
chmod 755 $PISTON_DIR

# Create docker-compose.yml
log_info "Creating docker-compose configuration..."
cat > $PISTON_DIR/docker-compose.yml << 'EOF'
version: '3.2'

services:
    api:
        image: ghcr.io/engineer-man/piston:latest
        container_name: piston_api
        restart: always
        privileged: true
        ports:
            - 2000:2000
        volumes:
            - ./data/piston/packages:/piston/packages
        tmpfs:
            - /tmp:exec
        environment:
            - LOG_LEVEL=info
EOF

# Create systemd service for auto-updates
log_info "Creating systemd service for Piston..."
cat > /etc/systemd/system/piston.service << 'EOF'
[Unit]
Description=Piston Code Execution Engine
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/opt/piston/scripts/ec2-deploy.sh
ExecStop=/usr/bin/docker stop piston_api
ExecStopPost=/usr/bin/docker rm -f piston_api
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable piston.service

# Configure UFW firewall if installed
if command -v ufw &> /dev/null; then
    log_info "Configuring firewall..."
    ufw allow 22/tcp
    ufw allow 2000/tcp
    ufw --force enable || log_warn "Firewall configuration failed"
else
    log_warn "UFW not installed, skipping firewall configuration"
fi

# Create health check script
log_info "Creating health check script..."
cat > $PISTON_DIR/health-check.sh << 'EOF'
#!/bin/bash
# Health check script for Piston

HOST="localhost"
PORT="2000"
URL="http://$HOST:$PORT/api/v2/runtimes"

if curl -sf $URL > /dev/null 2>&1; then
    echo "Piston API is healthy"
    exit 0
else
    echo "Piston API is unhealthy"
    exit 1
fi
EOF

chmod +x $PISTON_DIR/health-check.sh

# Create monitoring script
log_info "Creating monitoring script..."
cat > $PISTON_DIR/monitor.sh << 'EOF'
#!/bin/bash
# Monitor Piston container status

echo "=== Piston Status ==="
docker ps -a --filter "name=piston_api" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=== Recent Logs ==="
docker logs --tail 20 piston_api 2>/dev/null || echo "Container not running"

echo ""
echo "=== Disk Usage ==="
du -sh /opt/piston/data/piston/packages 2>/dev/null || echo "Data directory not found"
EOF

chmod +x $PISTON_DIR/monitor.sh

log_info "✅ EC2 instance setup completed!"
log_info ""
log_info "Next steps:"
log_info "1. Update GitHub Actions secrets with your EC2 details"
log_info "2. Run: bash /opt/piston/scripts/ec2-deploy.sh"
log_info "3. Monitor with: /opt/piston/monitor.sh"
log_info "4. If using ECR, attach an IAM role with ECR read access or configure AWS creds"
