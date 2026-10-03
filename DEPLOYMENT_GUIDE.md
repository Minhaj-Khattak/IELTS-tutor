# 100% Free Deployment Guide: IELTS AI Platform

This guide walks you through deploying both the **FastAPI backend** and **Next.js frontend** completely free with **$0/month hosting cost**.

---

## Architecture Overview

| Component | Platform | Free Plan Limits | Why It's Best |
|---|---|---|---|
| **Backend** (`ielts-backend`) | **Render.com** | 750 free instance hrs/month (Web Service) | Native Python/FastAPI support, automatic HTTPS, free `.onrender.com` domain. |
| **Frontend** (`ielts-frontend`) | **Vercel.com** | Unlimited Hobby Plan, 100GB bandwidth | Official creators of Next.js, instant worldwide CDN, zero-config deploys. |

---

## Step 1: Push Your Code to GitHub (5 Minutes)

Both Render and Vercel deploy directly from your GitHub account.

1. Open your terminal in `d:/New folder`:
   ```powershell
   cd "d:/New folder"
   git init
   git add .
   git commit -m "Initial commit: IELTS AI Platform with Task 1 & Task 2"
   ```

2. Go to [GitHub.com/new](https://github.com/new) and create a **Private** (or Public) repository named `ielts-platform`.

3. Push your repository:
   ```powershell
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/ielts-platform.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 2: Deploy Backend to Render.com (Free)

1. Go to [Render.com](https://dashboard.render.com/) and Sign Up / Log in with your **GitHub account**.
2. Click **New +** → Select **Web Service**.
3. Select your `ielts-platform` repository.
4. Fill in these exact settings:
   - **Name**: `ielts-ai-backend` (or any unique name)
   - **Region**: Choose the closest region (e.g., Frankfurt, Singapore, or Oregon)
   - **Root Directory**: `ielts-backend` *(Important!)*
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Select **Free** ($0/month)
5. Under **Environment Variables**, add:
   - `GEMINI_API_KEY`: *(paste your actual Google Gemini API key)*
6. Click **Deploy Web Service**.
7. Once deployed, copy your backend URL at the top of the dashboard:
   `https://ielts-ai-backend-xxxx.onrender.com`

> **Note on Render Free Tier**: If inactive for 15 minutes, Render spins down the backend to sleep. The first request after a nap takes ~30-45 seconds to wake up, after which it runs at full speed.

---

## Step 3: Deploy Frontend to Vercel.com (Free)

1. Go to [Vercel.com](https://vercel.com/signup) and Log in with your **GitHub account**.
2. Click **Add New...** → **Project**.
3. Select your `ielts-platform` repository and click **Import**.
4. Configure the project:
   - **Framework Preset**: `Next.js` (auto-detected)
   - **Root Directory**: Click **Edit** and select `ielts-frontend` *(Important!)*
5. Open the **Environment Variables** accordion and add:
   - **Key**: `BACKEND_URL`
   - **Value**: `https://ielts-ai-backend-xxxx.onrender.com` *(paste your Render URL from Step 2)*
6. Click **Deploy**.
7. In ~60 seconds, Vercel will give you a live production URL:
   `https://ielts-platform-xxxx.vercel.app`

---

## Step 4: Final Link (Optional but Recommended)

To ensure strict CORS security:
1. In your **Render Dashboard** → Select your `ielts-ai-backend` service.
2. Go to **Environment** tab.
3. Add or update:
   - `FRONTEND_URL`: `https://ielts-platform-xxxx.vercel.app` *(your Vercel URL)*
4. Click **Save Changes** (Render will automatically re-deploy in 10 seconds).

---

## Verification Checklist

- [ ] Visit `https://ielts-ai-backend-xxxx.onrender.com/health` → Should return `{"status": "ok"}`
- [ ] Visit your Vercel URL → Should load the landing page with Task 1 & Task 2
- [ ] Test generating prompts and submitting an essay → Should grade via Gemini without errors
