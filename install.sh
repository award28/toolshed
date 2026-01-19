#!/usr/bin/env bash
#
# ToolShed Installation Script
#
# Usage:
#   Interactive:  ./install.sh
#   Automated:    ./install.sh --yes --port 3000 --hostname toolshed
#   Via curl:     curl -fsSL https://raw.githubusercontent.com/award28/toolshed/main/install.sh | bash
#
set -e

# Default configuration
DEFAULT_PORT=3000
DEFAULT_HOSTNAME="toolshed"
DEFAULT_INSTALL_DIR="/opt/toolshed"
DEFAULT_USER="$USER"
REPO_URL="https://github.com/award28/toolshed.git"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration variables (set by arguments or prompts)
PORT=""
HOSTNAME=""
INSTALL_DIR=""
SERVICE_USER=""
AUTO_YES=false
SKIP_MDNS=false
USE_PORT_80=false

#######################################
# Print colored output
#######################################
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

#######################################
# Print banner
#######################################
print_banner() {
    echo -e "${GREEN}"
    cat << "EOF"
  _____           _  __ _              _
 |_   _|__   ___ | |/ _| |__   ___  __| |
   | |/ _ \ / _ \| | |_| '_ \ / _ \/ _` |
   | | (_) | (_) | |  _| | | |  __/ (_| |
   |_|\___/ \___/|_|_| |_| |_|\___|\__,_|

EOF
    echo -e "${NC}"
    echo "Workshop Tool Inventory System - Installation Script"
    echo "====================================================="
    echo ""
}

#######################################
# Show help
#######################################
show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    -y, --yes           Run in non-interactive mode with defaults
    -p, --port PORT     Set the port number (default: $DEFAULT_PORT)
    -n, --hostname NAME Set the hostname for mDNS (default: $DEFAULT_HOSTNAME)
    -d, --dir PATH      Set installation directory (default: $DEFAULT_INSTALL_DIR)
    -u, --user USER     Set the user to run the service (default: current user)
    --skip-mdns         Skip mDNS/hostname configuration
    --port-80           Configure to run on port 80 (requires root)
    -h, --help          Show this help message

Examples:
    # Interactive installation
    $0

    # Automated installation with defaults
    $0 --yes

    # Custom configuration
    $0 --yes --port 8080 --hostname workshop --dir /home/pi/toolshed

    # Install via curl (interactive)
    curl -fsSL https://raw.githubusercontent.com/award28/toolshed/main/install.sh | bash

    # Install via curl (automated)
    curl -fsSL https://raw.githubusercontent.com/award28/toolshed/main/install.sh | bash -s -- --yes
EOF
}

#######################################
# Parse command line arguments
#######################################
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -y|--yes)
                AUTO_YES=true
                shift
                ;;
            -p|--port)
                PORT="$2"
                shift 2
                ;;
            -n|--hostname)
                HOSTNAME="$2"
                shift 2
                ;;
            -d|--dir)
                INSTALL_DIR="$2"
                shift 2
                ;;
            -u|--user)
                SERVICE_USER="$2"
                shift 2
                ;;
            --skip-mdns)
                SKIP_MDNS=true
                shift
                ;;
            --port-80)
                USE_PORT_80=true
                PORT=80
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

#######################################
# Prompt for user input
#######################################
prompt() {
    local var_name=$1
    local prompt_text=$2
    local default_value=$3
    local current_value="${!var_name}"

    if [[ -n "$current_value" ]]; then
        return
    fi

    if [[ "$AUTO_YES" == true ]]; then
        eval "$var_name=\"$default_value\""
        return
    fi

    read -rp "$prompt_text [$default_value]: " input
    eval "$var_name=\"${input:-$default_value}\""
}

#######################################
# Confirm action
#######################################
confirm() {
    local prompt_text=$1

    if [[ "$AUTO_YES" == true ]]; then
        return 0
    fi

    read -rp "$prompt_text [Y/n]: " response
    case "$response" in
        [nN][oO]|[nN])
            return 1
            ;;
        *)
            return 0
            ;;
    esac
}

#######################################
# Detect OS and package manager
#######################################
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    elif [[ -f /etc/debian_version ]]; then
        OS="debian"
    elif [[ -f /etc/redhat-release ]]; then
        OS="rhel"
    elif [[ "$(uname)" == "Darwin" ]]; then
        OS="macos"
    else
        OS="unknown"
    fi

    # Detect package manager
    if command -v apt-get &> /dev/null; then
        PKG_MANAGER="apt"
        PKG_UPDATE="sudo apt-get update"
        PKG_INSTALL="sudo apt-get install -y"
    elif command -v dnf &> /dev/null; then
        PKG_MANAGER="dnf"
        PKG_UPDATE="sudo dnf check-update || true"
        PKG_INSTALL="sudo dnf install -y"
    elif command -v yum &> /dev/null; then
        PKG_MANAGER="yum"
        PKG_UPDATE="sudo yum check-update || true"
        PKG_INSTALL="sudo yum install -y"
    elif command -v pacman &> /dev/null; then
        PKG_MANAGER="pacman"
        PKG_UPDATE="sudo pacman -Sy"
        PKG_INSTALL="sudo pacman -S --noconfirm"
    elif command -v brew &> /dev/null; then
        PKG_MANAGER="brew"
        PKG_UPDATE="brew update"
        PKG_INSTALL="brew install"
    else
        PKG_MANAGER="unknown"
    fi

    info "Detected OS: $OS"
    info "Package manager: $PKG_MANAGER"
}

#######################################
# Check if running as root
#######################################
check_root() {
    if [[ $EUID -eq 0 ]]; then
        IS_ROOT=true
    else
        IS_ROOT=false
    fi
}

#######################################
# Install Node.js if not present
#######################################
install_nodejs() {
    if command -v node &> /dev/null; then
        local node_version
        node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $node_version -ge 18 ]]; then
            success "Node.js $(node --version) is already installed"
            return
        else
            warn "Node.js version is too old (need v18+)"
        fi
    fi

    info "Installing Node.js..."

    case $PKG_MANAGER in
        apt)
            # Install Node.js via NodeSource
            curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
            $PKG_INSTALL nodejs
            ;;
        dnf|yum)
            curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
            $PKG_INSTALL nodejs
            ;;
        pacman)
            $PKG_INSTALL nodejs npm
            ;;
        brew)
            $PKG_INSTALL node
            ;;
        *)
            error "Cannot install Node.js automatically. Please install Node.js 18+ manually."
            exit 1
            ;;
    esac

    success "Node.js $(node --version) installed"
}

#######################################
# Install git if not present
#######################################
install_git() {
    if command -v git &> /dev/null; then
        success "Git is already installed"
        return
    fi

    info "Installing git..."
    $PKG_INSTALL git
    success "Git installed"
}

#######################################
# Install build dependencies
#######################################
install_build_deps() {
    info "Installing build dependencies..."

    case $PKG_MANAGER in
        apt)
            $PKG_INSTALL build-essential python3
            ;;
        dnf|yum)
            $PKG_INSTALL gcc gcc-c++ make python3
            ;;
        pacman)
            $PKG_INSTALL base-devel python
            ;;
        brew)
            # Usually already available on macOS
            ;;
    esac

    success "Build dependencies installed"
}

#######################################
# Clone and build ToolShed
#######################################
install_toolshed() {
    info "Installing ToolShed to $INSTALL_DIR..."

    # Create directory
    if [[ -d "$INSTALL_DIR" ]]; then
        if confirm "Directory $INSTALL_DIR already exists. Remove and reinstall?"; then
            sudo rm -rf "$INSTALL_DIR"
        else
            error "Installation cancelled"
            exit 1
        fi
    fi

    sudo mkdir -p "$INSTALL_DIR"
    sudo chown "$SERVICE_USER:$SERVICE_USER" "$INSTALL_DIR"

    # Clone repository
    info "Cloning repository..."
    git clone "$REPO_URL" "$INSTALL_DIR"

    # Install dependencies and build
    info "Installing dependencies..."
    cd "$INSTALL_DIR"
    npm install

    info "Building for production..."
    npm run build

    # Create data directories
    mkdir -p "$INSTALL_DIR/data" "$INSTALL_DIR/uploads"

    success "ToolShed installed successfully"
}

#######################################
# Setup systemd service
#######################################
setup_systemd() {
    if [[ ! -d /etc/systemd/system ]]; then
        warn "systemd not found, skipping service setup"
        return
    fi

    info "Setting up systemd service..."

    local service_file="/etc/systemd/system/toolshed.service"

    sudo tee "$service_file" > /dev/null << EOF
[Unit]
Description=ToolShed Workshop Tool Inventory
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
ExecStart=$(which node) build
Restart=on-failure
RestartSec=10
Environment=PORT=$PORT
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    # If using port 80, allow Node.js to bind to privileged ports
    if [[ "$PORT" -lt 1024 ]]; then
        info "Configuring Node.js to bind to port $PORT..."
        sudo setcap cap_net_bind_service=+ep "$(which node)"
    fi

    sudo systemctl daemon-reload
    sudo systemctl enable toolshed
    sudo systemctl start toolshed

    # Wait a moment and check status
    sleep 2
    if sudo systemctl is-active --quiet toolshed; then
        success "ToolShed service started successfully"
    else
        error "Failed to start ToolShed service"
        sudo systemctl status toolshed
        exit 1
    fi
}

#######################################
# Setup mDNS hostname
#######################################
setup_mdns() {
    if [[ "$SKIP_MDNS" == true ]]; then
        info "Skipping mDNS setup"
        return
    fi

    if [[ "$OS" == "macos" ]]; then
        info "macOS already supports mDNS via Bonjour"
        return
    fi

    info "Setting up mDNS for ${HOSTNAME}.local..."

    # Install avahi
    case $PKG_MANAGER in
        apt)
            $PKG_INSTALL avahi-daemon
            ;;
        dnf|yum)
            $PKG_INSTALL avahi
            ;;
        pacman)
            $PKG_INSTALL avahi nss-mdns
            ;;
        *)
            warn "Cannot install avahi automatically"
            return
            ;;
    esac

    # Set hostname
    if command -v hostnamectl &> /dev/null; then
        sudo hostnamectl set-hostname "$HOSTNAME"
    fi

    # Update /etc/hosts
    if ! grep -q "127.0.0.1.*$HOSTNAME" /etc/hosts; then
        echo "127.0.0.1   $HOSTNAME" | sudo tee -a /etc/hosts > /dev/null
    fi

    # Enable and start avahi
    sudo systemctl enable avahi-daemon
    sudo systemctl start avahi-daemon

    success "mDNS configured - device will be accessible at ${HOSTNAME}.local"
}

#######################################
# Configure firewall
#######################################
setup_firewall() {
    info "Configuring firewall..."

    if command -v ufw &> /dev/null; then
        sudo ufw allow "$PORT/tcp" || true
        success "UFW rule added for port $PORT"
    elif command -v firewall-cmd &> /dev/null; then
        sudo firewall-cmd --permanent --add-port="$PORT/tcp" || true
        sudo firewall-cmd --reload || true
        success "Firewalld rule added for port $PORT"
    else
        info "No firewall detected, skipping"
    fi
}

#######################################
# Print completion message
#######################################
print_completion() {
    local ip_addr
    ip_addr=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "your-server-ip")

    echo ""
    echo -e "${GREEN}====================================================${NC}"
    echo -e "${GREEN}  ToolShed Installation Complete!${NC}"
    echo -e "${GREEN}====================================================${NC}"
    echo ""
    echo "Access ToolShed at:"
    echo ""
    if [[ "$SKIP_MDNS" != true ]]; then
        echo -e "  ${BLUE}http://${HOSTNAME}.local:${PORT}${NC}  (from Mac/iOS/Linux with mDNS)"
    fi
    echo -e "  ${BLUE}http://${ip_addr}:${PORT}${NC}  (via IP address)"
    echo ""
    echo "Useful commands:"
    echo ""
    echo "  sudo systemctl status toolshed   # Check service status"
    echo "  sudo systemctl restart toolshed  # Restart service"
    echo "  sudo journalctl -u toolshed -f   # View logs"
    echo ""
    echo "Data locations:"
    echo ""
    echo "  Database: $INSTALL_DIR/data/tools.db"
    echo "  Images:   $INSTALL_DIR/uploads/"
    echo ""

    if [[ "$PORT" != "80" ]]; then
        echo -e "${YELLOW}Tip: To access without the port number, re-run with --port-80${NC}"
        echo ""
    fi
}

#######################################
# Main installation flow
#######################################
main() {
    print_banner
    parse_args "$@"

    # Gather configuration
    echo "Configuration"
    echo "-------------"
    prompt PORT "Port number" "$DEFAULT_PORT"
    prompt HOSTNAME "Hostname (for .local access)" "$DEFAULT_HOSTNAME"
    prompt INSTALL_DIR "Installation directory" "$DEFAULT_INSTALL_DIR"
    prompt SERVICE_USER "User to run the service" "$DEFAULT_USER"

    echo ""
    echo "Installation Summary:"
    echo "  Port:        $PORT"
    echo "  Hostname:    ${HOSTNAME}.local"
    echo "  Directory:   $INSTALL_DIR"
    echo "  User:        $SERVICE_USER"
    echo ""

    if ! confirm "Proceed with installation?"; then
        echo "Installation cancelled"
        exit 0
    fi

    echo ""

    # Run installation steps
    detect_os
    check_root

    info "Updating package lists..."
    $PKG_UPDATE || true

    install_git
    install_nodejs
    install_build_deps
    install_toolshed
    setup_systemd
    setup_mdns
    setup_firewall

    print_completion
}

# Run main function
main "$@"
