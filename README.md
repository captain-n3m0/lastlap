# LastLap — Self-Hosting Guide (Hostinger or any VPS / shared host)

A gamified racer-themed dashboard built with **React + FastAPI + MongoDB**.

This guide walks you through deploying both the frontend and the backend to
Hostinger. The same instructions work for any VPS provider (DigitalOcean,
Hetzner, Contabo, AWS EC2, etc.).

---

## What you'll need

| Item | Where to get it |
|---|---|
| A Hostinger plan that supports Node.js + Python (e.g. **VPS** or **Cloud Hosting** — the cheap "Web Hosting" / "Premium" shared plans only support PHP, so won't work for the backend) | https://www.hostinger.com |
| A domain name | included with most Hostinger plans |
| A MongoDB database | **MongoDB Atlas** free tier — https://www.mongodb.com/atlas — recommended. (Hostinger doesn't host Mongo natively.) |
| An X Developer app | Required for "Continue with X" OAuth — https://developer.x.com/en/portal/dashboard |
| A Twitterapi.io API key | Required for X task verification — https://twitterapi.io |

---

## 1. Get your MongoDB connection string

1. Sign up at https://www.mongodb.com/atlas (free).
2. Create a free **M0 cluster**.
3. Under **Database Access** → add a user with a password.
4. Under **Network Access** → add `0.0.0.0/0` (allow access from anywhere) — or whitelist only your Hostinger server's IP for tighter security.
5. Click **Connect → Drivers** and copy the connection string. It looks like:
   ```
   mongodb+srv://lastlap_user:YOUR_PASSWORD@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```
6. Save this — you'll paste it into `backend/.env` shortly.

---

## 2. Prepare the code

```bash
# Frontend
cp frontend/.env.example frontend/.env
# Open frontend/.env and either:
#   - leave REACT_APP_BACKEND_URL empty if frontend + backend share the same domain
#   - or set it to your backend URL, e.g. https://api.yourdomain.com

# Backend
cp backend/.env.example backend/.env
# Edit backend/.env:
#   MONGO_URL=<your-atlas-connection-string>
#   DB_NAME=lastlap_db
#   JWT_SECRET=<generate with: openssl rand -hex 32>
#   CORS_ORIGINS=https://lastlap.fun,https://www.lastlap.fun
#   ADMIN_EMAIL=<your admin email>
#   ADMIN_PASSWORD=<a strong password>
#   FRONTEND_PUBLIC_URL=https://lastlap.fun
#   X_CONSUMER_KEY=<your X Consumer Key / API Key>          # OAuth 1.0a
#   X_CONSUMER_SECRET=<your X Consumer Secret / API Secret> # OAuth 1.0a
#   # Or use OAuth 2.0 credentials instead:
#   X_OAUTH_CLIENT_ID=<your X OAuth 2.0 client ID>
#   X_OAUTH_CLIENT_SECRET=<your X OAuth 2.0 client secret>
#   X_OAUTH_REDIRECT_URI=https://lastlap.fun/oauth/x/callback
#   X_OAUTH_SCOPES=tweet.read users.read offline.access
#   TWITTERAPI_IO_API_KEY=<your Twitterapi.io API key> # X task verification
#   TWITTERAPI_IO_TIMEOUT=15
#   TWITTERAPI_IO_RETRIES=1
#   TWITTERAPI_IO_MIN_INTERVAL_SECONDS=0
```

In the X Developer Portal, enable user authentication and add the exact callback URL:

```text
https://lastlap.fun/oauth/x/callback
```

For local testing, also add:

```text
http://localhost:3000/oauth/x/callback
```

---

## 3. Build the frontend (static files)

```bash
cd frontend
yarn install
yarn build
```

This produces a `frontend/build/` folder containing pure static files
(HTML, CSS, JS, images, fonts) — exactly what you upload to a web host.

---

## 4. Deploy on Hostinger

### Option A — Hostinger VPS (recommended, single domain)

This is the easiest setup: frontend and backend live on the same domain.

1. **Spin up a VPS** (Ubuntu 22.04, 1 GB RAM is enough).
2. **SSH in** and install dependencies:
   ```bash
   apt update && apt install -y python3.11 python3.11-venv python3-pip nginx git
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt install -y nodejs
   npm install -g yarn pm2
   ```
3. **Upload the project** (`scp -r ./* user@your-server:/var/www/lastlap`).
4. **Set up the backend:**
   ```bash
   cd /var/www/lastlap/backend
   python3.11 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   # backend/.env should already be filled in from step 2
   pm2 start "venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001" --name lastlap-api
   pm2 save && pm2 startup
   ```
5. **Build the frontend on the server (or upload the pre-built `build/`):**
   ```bash
   cd /var/www/lastlap/frontend
   yarn install && yarn build
   ```
6. **Configure Nginx** — create `/etc/nginx/sites-available/lastlap`:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       # Frontend (static files)
       root /var/www/lastlap/frontend/build;
       index index.html;

       location / {
           try_files $uri /index.html;
       }

       # Backend API — proxied to FastAPI
       location /api/ {
           proxy_pass http://127.0.0.1:8001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   Then enable and reload:
   ```bash
   ln -s /etc/nginx/sites-available/lastlap /etc/nginx/sites-enabled/
   nginx -t && systemctl reload nginx
   ```
7. **Point your domain** to the VPS IP in Hostinger's DNS panel (A record `@` → server IP).
8. **Add free HTTPS:**
   ```bash
   apt install -y certbot python3-certbot-nginx
   certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

Done — visit `https://yourdomain.com` and you're live.

### Option B — Hostinger Cloud / Shared (frontend only) + separate backend host

If your Hostinger plan only supports static files / PHP:

1. Build the frontend locally: `cd frontend && yarn build`.
2. Upload the contents of `frontend/build/` to your Hostinger `public_html` folder via the File Manager or FTP.
3. Host the backend somewhere that supports Python (free options below) and put the public URL in `frontend/.env`:
   - **Render.com** free tier (Python web service)
   - **Railway.app** (free trial)
   - **Fly.io** free tier
   - **Hostinger VPS** (the cheap KVM 1 plan works)
4. Re-build the frontend after setting the URL, then re-upload.

---

## 5. First login

After deployment, log in with the admin credentials you set in
`backend/.env`. The "Seed" routine in `backend/server.py` only auto-creates the
admin user the first time the backend starts. Tasks and leaderboard entries
come from real data in your database.

---

## 6. What to change before going public

- [ ] `JWT_SECRET` — must be a long random string
- [ ] `ADMIN_PASSWORD` — change from the example values
- [ ] `RESEND_API_KEY` / `EMAIL_FROM` — required for OTP email delivery
- [ ] `CORS_ORIGINS` — set to your real domain (not `*`)
- [ ] `X_CONSUMER_KEY` / `X_CONSUMER_SECRET` or `X_OAUTH_CLIENT_ID` / `X_OAUTH_CLIENT_SECRET`, plus `X_OAUTH_REDIRECT_URI` — required for X login
- [ ] `TWITTERAPI_IO_API_KEY` — required for verified X tasks to award LP
- [ ] MongoDB Atlas IP allowlist — restrict to your server's IP

---

## Project layout

```
.
├── backend/                 FastAPI app
│   ├── server.py            all routes (auth, tasks, leaderboard, referrals, wallet)
│   ├── requirements.txt
│   └── .env.example
├── frontend/                React app (CRA + craco + Tailwind + shadcn/ui)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env.example
└── README.md
```

All third-party assets (fonts, images) are bundled locally — no CDN or
external dependencies at runtime. The only external service you need is
your MongoDB database.
