#!/usr/bin/env bash
# deploy.sh — Upload portfolio to VPS and configure nginx
# Usage: bash deploy.sh <user@your-vps-ip>
# Example: bash deploy.sh root@203.0.113.42

set -euo pipefail

REMOTE="${1:?Usage: bash deploy.sh user@host}"
DOMAIN="rdpfister.com"
REMOTE_DIR="/var/www/$DOMAIN/html"
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN.conf"

echo "==> Uploading portfolio files to $REMOTE:$REMOTE_DIR ..."
ssh "$REMOTE" "mkdir -p $REMOTE_DIR"
rsync -avz --delete \
  --exclude 'nginx/' \
  --exclude 'deploy.sh' \
  --exclude '.claude/' \
  "$(dirname "$0")/" "$REMOTE:$REMOTE_DIR/"

echo "==> Uploading nginx config ..."
rsync -avz "$(dirname "$0")/nginx/$DOMAIN.conf" "$REMOTE:$NGINX_CONF"

echo "==> Enabling site and reloading nginx ..."
ssh "$REMOTE" bash <<EOF
  ln -sf $NGINX_CONF /etc/nginx/sites-enabled/$DOMAIN.conf
  nginx -t && systemctl reload nginx
EOF

echo ""
echo "Done! Your site is live at https://$DOMAIN"
echo ""
echo "If you haven't run Certbot yet, SSH into your server and run:"
echo "  sudo apt install -y certbot python3-certbot-nginx"
echo "  sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
