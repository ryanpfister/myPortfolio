# rdpfister.com — Backend API

Small Express + SQLite service that powers the blog admin and SSR blog post pages.

## What it does

- `GET  /api/posts`           — list published posts (public)
- `GET  /api/posts/:slug`     — one published post (public)
- `GET  /blog/:slug`          — SSR HTML page for a post (public)
- `POST /api/auth/login`      — admin login (sets JWT cookie)
- `POST /api/auth/logout`     — clear session
- `GET  /api/auth/me`         — check session
- `GET  /api/admin/posts`     — list ALL posts incl. drafts (auth)
- `POST /api/admin/posts`     — create post (auth)
- `PUT  /api/admin/posts/:slug` — update post (auth)
- `DELETE /api/admin/posts/:slug` — delete post (auth)

The `/admin.html` page in the static site talks to these endpoints.

---

## First-time VPS setup

Run these once on your VPS as a user with sudo. They assume your repo lives at `/var/www/rdpfister.com/html`.

### 1. Install Node 20+

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential
node -v          # should print v20.x
```

`build-essential` is needed because `better-sqlite3` compiles a native binding.

### 2. Install backend dependencies

```bash
cd /var/www/rdpfister.com/html/server
sudo npm install --omit=dev
```

### 3. Generate credentials

Pick a password for the admin, then hash it:

```bash
node hash.js "your-real-password-here"
```

Copy the resulting `$2b$...` string.

Generate a JWT signing secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Create the `.env`

```bash
sudo cp .env.example .env
sudo nano .env
```

Fill in:

```
ADMIN_USERNAME=ryan
ADMIN_PASSWORD_HASH=$2b$10$...your-hash-from-step-3...
JWT_SECRET=...random-hex-from-step-3...
NODE_ENV=production
COOKIE_SECURE=true
COOKIE_DOMAIN=rdpfister.com
```

Lock it down:

```bash
sudo chown www-data:www-data .env
sudo chmod 600 .env
```

### 5. Install the systemd service

```bash
sudo cp portfolio-api.service /etc/systemd/system/portfolio-api.service
sudo chown -R www-data:www-data /var/www/rdpfister.com/html/server
sudo systemctl daemon-reload
sudo systemctl enable portfolio-api
sudo systemctl start portfolio-api
sudo systemctl status portfolio-api
```

You should see `Active: active (running)`.

### 6. Wire nginx

The repo's `nginx/rdpfister.com.conf` already contains the proxy blocks. Copy it to nginx and reload:

```bash
sudo cp /var/www/rdpfister.com/html/nginx/rdpfister.com.conf /etc/nginx/sites-available/rdpfister.com
sudo nginx -t
sudo systemctl reload nginx
```

### 7. (Optional) Seed a welcome post

```bash
cd /var/www/rdpfister.com/html/server
sudo -u www-data node seed.js
```

### 8. Verify

```bash
curl https://rdpfister.com/api/health
# → {"ok":true,"uptime":...}

curl https://rdpfister.com/api/posts
# → {"posts":[...]}
```

Then open `https://rdpfister.com/admin.html` in your browser and log in.

---

## Day-to-day deploys

After you push code changes from your laptop:

```bash
cd /var/www/rdpfister.com/html && sudo git pull origin main
# If server/ deps changed:
cd server && sudo npm install --omit=dev
# If server code changed:
sudo systemctl restart portfolio-api
# If nginx config changed:
sudo cp nginx/rdpfister.com.conf /etc/nginx/sites-available/rdpfister.com && sudo systemctl reload nginx
```

Editing blog posts doesn't require any of the above — the admin writes to the DB and changes appear instantly.

---

## Backup the database

The SQLite file lives at `server/portfolio.db`. To back it up:

```bash
cp /var/www/rdpfister.com/html/server/portfolio.db ~/backups/portfolio-$(date +%F).db
```

Set up a cron job to back it up nightly:

```cron
0 3 * * * cp /var/www/rdpfister.com/html/server/portfolio.db /var/backups/portfolio-$(date +\%F).db
```

---

## Troubleshooting

**Service won't start**

```bash
sudo journalctl -u portfolio-api -n 50
```

Usually a malformed `.env` or `better-sqlite3` couldn't compile (run `sudo apt-get install build-essential` and re-`npm install`).

**Login returns 500**

Check `ADMIN_PASSWORD_HASH` and `JWT_SECRET` are set in `.env`.

**Login returns 429**

Brute-force lockout. Wait 5 minutes or restart the service.

**Posts don't appear on blog.html**

Open browser devtools → Network tab → reload `/blog.html`. The page calls `/api/posts` — if it 502s, the Node service is down. If it returns `{"posts":[]}`, you haven't published any yet.
