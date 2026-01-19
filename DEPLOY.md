# Deploying ToolShed on Your Local Network

This guide covers deploying ToolShed to a local server (Raspberry Pi, old laptop, NAS, etc.) with a memorable hostname like `toolshed.local`.

## Option 1: Simple Deployment (Recommended)

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

## Option 2: Docker Deployment

### Create a Dockerfile

```dockerfile
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY build ./build
COPY data ./data
COPY uploads ./uploads

ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "build"]
```

### Build and Run

```bash
# Build the app first
npm run build

# Build Docker image
docker build -t toolshed .

# Run container
docker run -d \
  --name toolshed \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/uploads:/app/uploads \
  toolshed
```

---

## Option 3: Using a Reverse Proxy (nginx)

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
