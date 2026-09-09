# Videa deployment

## GitHub

From the repository root:

```powershell
git init
git add .
git commit -m "Add Docker and Vercel deployment configuration"
git branch -M main
git remote add origin https://github.com/G-tech-dev/videa.git
git push -u origin main
```

If the remote already exists, use `git remote set-url origin https://github.com/G-tech-dev/videa.git` instead of `git remote add`.

## Vercel frontend

1. Import `G-tech-dev/videa` into Vercel.
2. Set **Root Directory** to `frontend`.
3. Keep the framework preset as **Vite**. The build command and output directory are read from `frontend/package.json` and Vite defaults.
4. Add this environment variable:

   ```text
   VITE_API_URL=https://YOUR-BACKEND-DOMAIN/api
   ```

5. Deploy. `frontend/vercel.json` keeps React Router routes working after a refresh.

## Backend hosting on Render

Vercel does not run the backend Docker container as a persistent Express service. This repository includes `render.yaml` for deploying the API to Render with `backend/Dockerfile`.

1. Open Render and choose **New > Blueprint**.
2. Connect `G-tech-dev/videa` and select the `main` branch.
3. Render detects `render.yaml` and creates the `videa-api` web service.
4. Set the secret environment variables when prompted:

Set these backend environment variables on that host:

```text
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<long-random-secret>
CORS_ORIGINS=https://YOUR-VERCEL-DOMAIN.vercel.app
YOUTUBE_API_KEY=<optional-key>
```

The service must expose its assigned `PORT`. Verify it with:

```text
https://YOUR-BACKEND-DOMAIN/api/health
```

After the backend is live, set `VITE_API_URL` in Vercel to its `/api` URL and redeploy the frontend.

## Local Docker stack

Create a root `.env` file containing a non-default secret:

```text
JWT_SECRET=replace-with-a-long-random-value
```

Start the frontend, API, and MongoDB together:

```powershell
docker compose up --build
```

Open `http://localhost:8080`. The API health check is available at `http://localhost:5000/api/health`.