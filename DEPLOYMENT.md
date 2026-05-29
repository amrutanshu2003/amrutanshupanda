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
Example: `https://my-portfolio.pages.dev`

## 2) Deploy frontend on Cloudflare Pages
- Root Directory: `frontend`
- Framework preset: None
- Build command: (leave empty)
- Output directory: `/`

Before deploy, in `frontend/index.html` set:
`window.BACKEND_URL = "https://YOUR-RENDER-SERVICE.onrender.com"`

## 3) DNS and testing
- Open frontend URL
- Check profile loads (from backend `/api/profile`)
- Submit contact form (hits backend `/api/contact`)
- Open backend admin at `https://YOUR-RENDER-SERVICE.onrender.com/admin`

## 4) MongoDB Atlas
- Network access allow Render (temporary `0.0.0.0/0`)
- Database user read/write access
