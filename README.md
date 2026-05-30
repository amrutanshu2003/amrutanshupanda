# MERN Portfolio

## 1) Backend setup

```powershell
cd mern\server
npm install
copy .env.example .env
```

Edit `.env`:

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_uri
FRONTEND_ORIGIN=http://localhost:5173
```

Run backend:

```powershell
npm run dev
```

## 2) Frontend setup

```powershell
cd ..\client
npm install
```

Create `.env` in `mern/client`:

```env
VITE_API_URL=http://localhost:5000/api
```

Run frontend:

```powershell
npm run dev
```

Open:
- http://localhost:5173
- http://localhost:5173/admin

## Features included
- Portfolio data from MongoDB
- Contact form saves to MongoDB
- Admin edits profile
- Admin sees and deletes messages
