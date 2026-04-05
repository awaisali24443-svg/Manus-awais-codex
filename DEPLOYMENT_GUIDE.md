# Deployment Guide: Awais Codex (Synod) on Render

This guide provides step-by-step instructions for deploying the **Awais Codex (Synod)** application to **Render** using a free account.

## Prerequisites

1.  **A GitHub Account**: Your code must be pushed to a GitHub repository.
2.  **A Render Account**: Sign up at [render.com](https://render.com).
3.  **API Keys**: Ensure you have all necessary API keys (Groq, Anthropic, Firebase, E2B, etc.).

---

## Step 1: Push Code to GitHub

1.  Initialize a git repository in your project root (if not already done).
2.  Create a new repository on GitHub.
3.  Push your code:
    ```bash
    git remote add origin <your-github-repo-url>
    git add .
    git commit -m "Initial commit for deployment"
    git push -u origin main
    ```

## Step 2: Deploy Backend (FastAPI)

1.  Log in to the **Render Dashboard**.
2.  Click **New +** and select **Web Service**.
3.  Connect your GitHub repository.
4.  Configure the service:
    *   **Name**: `synod-backend`
    *   **Environment**: `Python 3`
    *   **Region**: Select the one closest to you.
    *   **Branch**: `main`
    *   **Build Command**: `pip install -r requirements.txt`
    *   **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
    *   **Plan**: `Free`
5.  **Environment Variables**: Click **Advanced** and add the following (refer to `.env.example`):
    *   `GROQ_API_KEY`: Your Groq API key.
    *   `ANTHROPIC_API_KEY`: Your Anthropic API key.
    *   `E2B_API_KEY`: Your E2B API key.
    *   `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, etc. (Copy from your Firebase service account JSON).
    *   `GITHUB_TOKEN`: A GitHub Personal Access Token with `repo` scope.
    *   `GITHUB_REPO_URL`: The URL of your project repository.
    *   `FRONTEND_URL`: The URL of your frontend (you'll get this in the next step, you can update it later).
6.  Click **Create Web Service**.

## Step 3: Deploy Frontend (React/Vite)

1.  Click **New +** and select **Static Site**.
2.  Connect the same GitHub repository.
3.  Configure the service:
    *   **Name**: `synod-frontend`
    *   **Branch**: `main`
    *   **Build Command**: `npm install && npm run build`
    *   **Publish Directory**: `dist`
4.  **Environment Variables**: Add the following:
    *   `VITE_API_URL`: The URL of your backend service (e.g., `https://synod-backend.onrender.com`).
    *   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, etc. (Copy from your `firebase-applet-config.json`).
5.  **Routes**: Go to the **Redirects/Rewrites** tab and add:
    *   **Source**: `/*`
    *   **Destination**: `/index.html`
    *   **Action**: `Rewrite`
6.  Click **Create Static Site**.

---

## Step 4: Final Configuration

1.  Once the frontend is deployed, copy its URL.
2.  Go back to the **Backend Service** settings and update the `FRONTEND_URL` environment variable with your frontend URL.
3.  In the **Firebase Console**, add your frontend URL to the **Authorized Domains** list under **Authentication > Settings**.

## Step 5: Verify Deployment

1.  Open your frontend URL in a browser.
2.  Test the agent by entering a goal in the command bar.
3.  Monitor the backend logs in the Render dashboard for any errors.

---

## Troubleshooting

*   **Cold Starts**: Render's free tier services spin down after inactivity. The first request might take a minute to wake up the backend.
*   **CORS Errors**: Ensure `FRONTEND_URL` in the backend matches your actual frontend URL exactly.
*   **Build Failures**: Check the build logs in Render. Ensure all dependencies are listed in `requirements.txt` and `package.json`.
