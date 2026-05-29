# Deploy Structure

## Folders
- `frontend/` -> Deploy to Cloudflare Pages
- `backend/` -> Deploy to Render Web Service

## 1) Deploy backend on Render
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn app:app`
- Add env vars from `backend/.env.example`

### Important
Set `FRONTEND_ORIGIN` to your Pages domain.
Example: `https://amrutanshupanda.pages.dev`

## 2) Deploy frontend on Cloudflare Pages
- Root Directory: `frontend`
- Framework preset: None
- Build command: (leave empty)
- Output directory: `/`

No backend URL hardcode needed.
This project uses Cloudflare Pages Function proxy at `/api/*`.

In Cloudflare Pages > Settings > Environment Variables add:
- `BACKEND_ORIGIN=https://amrutanshupanda.onrender.com`

## 3) How it works
- Frontend calls `/api/profile` and `/api/contact`
- Pages Function (`frontend/functions/api/[[path]].js`) proxies to Render backend
- Backend URL remains hidden from frontend config

## 4) Testing
- Open frontend URL
- Check profile loads
- Submit contact form
- Admin panel remains on backend:
  `https://amrutanshupanda.onrender.com/admin`

## 5) MongoDB Atlas
- Network access allow Render (temporary `0.0.0.0/0`)
- Database user read/write access
