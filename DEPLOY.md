# Deploying ToolShed on Your Local Network

This guide covers deploying ToolShed to a local server (Raspberry Pi, old laptop, NAS, etc.) with a memorable hostname like `toolshed.local`.

## Option 1: Dokploy (Recommended)

[Dokploy](https://dokploy.com) is a self-hosted PaaS that makes deployment simple with a clean UI.

### Step 1: Install Dokploy on Your Server

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

Access Dokploy at `http://<server-ip>:3000` and create your admin account.

### Step 2: Add ToolShed

1. Create a new **Project**
2. Add a new **Application** → Select **Docker Compose**
3. Choose **GitHub** as the source and connect the repo: `https://github.com/award28/toolshed`
4. Dokploy auto-detects the `docker-compose.yml`
5. In **Domains**, add your domain (e.g., `toolshed.local` or `toolshed.yourdomain.com`)
6. Click **Deploy**

### Step 3: Configure Volumes (Important)

In the application settings under **Advanced** → **Volumes**, ensure these persist:
- `toolshed-data` → Database storage
- `toolshed-uploads` → Image storage

The `docker-compose.yml` already defines named volumes, so data persists across deployments.

That's it! Dokploy handles builds, restarts, and updates automatically.

---

## Option 2: Docker Compose

The repo includes a ready-to-use `docker-compose.yml`:

```bash
# Clone the repository
git clone https://github.com/award28/toolshed.git
cd toolshed

# Start with Docker Compose
docker compose up -d
```

This automatically:
- Builds the application
- Creates persistent volumes for data and uploads
- Restarts on failure
- Exposes port 3000

**Custom port:**
```bash
PORT=8080 docker compose up -d
```

**View logs:**
```bash
docker compose logs -f
```

**Update to latest:**
```bash
git pull
docker compose up -d --build
```

---

## Option 3: Automated Install Script

Run the install script for a full automated setup:

```bash
curl -fsSL https://raw.githubusercontent.com/award28/toolshed/main/install.sh | bash
```

Or with options:
```bash
curl -fsSL https://raw.githubusercontent.com/award28/toolshed/main/install.sh | bash -s -- \
  --yes --port 3000 --hostname toolshed
```

This installs Node.js, builds the app, sets up systemd, and configures mDNS.

---

## Option 4: Manual Deployment

### Prerequisites

- A machine that stays on (Raspberry Pi, mini PC, old laptop, NAS)
- Node.js 18+ installed
- Git installed

### Step 1: Clone and Build

```bash
# Clone the repository
git clone https://github.com/award28/toolshed.git
cd toolshed

# Install dependencies
npm install

# Build for production
npm run build
```

### Step 2: Create Data Directories

```bash
mkdir -p data uploads
```

### Step 3: Test the Production Build

```bash
# Run the production server
node build

# Or with a specific port
PORT=3000 node build
```

Visit `http://<server-ip>:3000` to verify it works.

### Step 4: Run as a Service (Linux/Raspberry Pi)

Create a systemd service so it starts on boot:

```bash
sudo nano /etc/systemd/system/toolshed.service
```

Paste this (adjust paths and user):

```ini
[Unit]
Description=ToolShed Workshop Tool Inventory
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/toolshed
ExecStart=/usr/bin/node build
Restart=on-failure
Environment=PORT=3000
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable toolshed
sudo systemctl start toolshed
sudo systemctl status toolshed
```

### Step 5: Set Up `toolshed.local` Hostname

#### On the Server (Linux/Raspberry Pi)

Install Avahi for mDNS:

```bash
sudo apt install avahi-daemon
sudo systemctl enable avahi-daemon
sudo systemctl start avahi-daemon
```

Set the hostname:

```bash
sudo hostnamectl set-hostname toolshed
```

Edit `/etc/hosts` to add:

```
127.0.0.1   toolshed
```

Reboot:

```bash
sudo reboot
```

#### Accessing from Other Devices

- **macOS/iOS**: Works automatically - browse to `http://toolshed.local:3000`
- **Windows**: Install [Bonjour](https://support.apple.com/kb/DL999) or use the IP address
- **Linux**: Install `avahi-daemon` and `libnss-mdns`
- **Android**: mDNS support varies - use IP address or a DNS solution

### Step 6: Optional - Use Port 80 (No Port Number Needed)

To access via `http://toolshed.local` without the port:

```bash
# Allow Node.js to bind to port 80
sudo setcap cap_net_bind_service=+ep $(which node)
```

Then update the service to use `PORT=80`.

---

## Option 5: Using a Reverse Proxy (nginx)

If you want HTTPS or to run multiple services:

```nginx
server {
    listen 80;
    server_name toolshed.local;

    client_max_body_size 50M;  # For image uploads

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Backup Your Data

The important data is in two places:

```bash
# Database
cp data/tools.db /path/to/backup/

# Images
cp -r uploads/ /path/to/backup/
```

Consider setting up a cron job for regular backups:

```bash
crontab -e
```

Add:

```
0 2 * * * cp /home/pi/toolshed/data/tools.db /home/pi/backups/tools-$(date +\%Y\%m\%d).db
0 2 * * * rsync -a /home/pi/toolshed/uploads/ /home/pi/backups/uploads/
```

---

## Troubleshooting

### Can't connect from other devices

1. Check firewall: `sudo ufw allow 3000/tcp`
2. Verify the server IP: `hostname -I`
3. Test locally first: `curl http://localhost:3000`

### mDNS not working

1. Verify Avahi is running: `systemctl status avahi-daemon`
2. Check hostname: `hostname`
3. Try the IP address directly

### Service won't start

Check logs: `journalctl -u toolshed -f`
