#!/usr/bin/env bash
set -euo pipefail

# ── Oracle Cloud VM setup for YouTube Playlist Manager ──────────────────────
# Run this as root on a fresh Oracle Cloud Ampere A1 instance (Ubuntu 24.04).
# Usage: sudo bash setup.sh

APP_USER=ytm
APP_DIR=/opt/youtube-playlist-deleter
DOMAIN="${1:-}"  # pass your domain as arg, or use IP later

if [[ -z "$DOMAIN" ]]; then
  echo "WARNING: No domain provided. SSL will be skipped."
  echo "Pass your domain: sudo bash setup.sh your-domain.com"
  echo "Or set it up later with: certbot --nginx -d your-domain.com"
fi

echo "=== Updating system ==="
apt-get update -qq
apt-get upgrade -y -qq

echo "=== Installing Node.js 20 ==="
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node $(node -v) • npm $(npm -v)"

echo "=== Installing nginx & certbot ==="
apt-get install -y nginx certbot python3-certbot-nginx

echo "=== Creating app user ==="
id -u "$APP_USER" &>/dev/null || useradd -m -s /bin/bash "$APP_USER"

echo "=== Cloning / updating app ==="
if [[ -d "$APP_DIR" ]]; then
  cd "$APP_DIR" && git pull
else
  git clone https://github.com/YOUR_USERNAME/youtube-playlist-deleter "$APP_DIR"
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

echo "=== Building app ==="
cd "$APP_DIR"
sudo -u "$APP_USER" npm ci
sudo -u "$APP_USER" npm run build -w @yt/shared
sudo -u "$APP_USER" npm run build -w youtube-playlist-manager-web

echo "=== Setting up environment ==="
if [[ ! -f "$APP_DIR/.env.production" ]]; then
  echo "!!! Create $APP_DIR/.env.production from deploy/oracle/.env.production !!!"
  echo "    then run: systemctl restart youtube-manager"
fi

echo "=== Installing systemd service ==="
cp "$APP_DIR/deploy/oracle/youtube-manager.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable youtube-manager
systemctl start youtube-manager
systemctl status youtube-manager --no-pager

echo "=== Setting up nginx ==="
if [[ -n "$DOMAIN" ]]; then
  sed "s/YOUR_DOMAIN_OR_IP/$DOMAIN/g; s/YOUR_DOMAIN/$DOMAIN/g" \
    "$APP_DIR/deploy/oracle/nginx.conf" > /etc/nginx/sites-available/youtube-manager
  ln -sf /etc/nginx/sites-available/youtube-manager /etc/nginx/sites-enabled/
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
  echo "=== Obtaining SSL certificate ==="
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" || true
  echo "SSL setup complete. Auto-renewal is configured."
else
  echo "Skipping SSL. Use the public IP directly on port 80 (not secure)."
  echo "Better: set up a domain and run: certbot --nginx -d your-domain.com"
fi

echo ""
echo "=== Done ==="
echo "App: https://$DOMAIN"
echo "Logs: journalctl -u youtube-manager -f"
echo "Restart: systemctl restart youtube-manager"
