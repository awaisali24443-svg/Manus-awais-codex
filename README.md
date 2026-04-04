# Synod - Autonomous Multi-Agent AI System (Awais Codex)

## Quick Start

### 1. Clone and install
git clone [your-repo]
cd synod
pip install -r requirements.txt
npm install
playwright install chromium

### 2. Set up Firebase
- Go to console.firebase.google.com
- Create project "synod-awais-codex"
- Enable Firestore (production mode)
- Enable Realtime Database
- Project Settings → Service Accounts → Generate Key
- Copy values to .env

### 3. Create Firestore Vector Index
- Go to Firebase Console → Firestore → Indexes
- Add index: Collection=global_memories, 
  Field=embedding, Type=Vector, Dimensions=768

### 4. Fill in .env file
cp .env.example .env
# Fill all values in .env

### 5. Run locally
uvicorn server:app --reload --port 3000
# In another terminal:
npm run dev

### 6. Deploy to Cloud Run
gcloud run deploy synod \
  --source . \
  --port 3000 \
  --set-env-vars "SYNOD_API_KEY=your_key"

Synod is a production-ready autonomous multi-agent AI system. It features a FastAPI backend, a React frontend dashboard, a 3-layer memory system, and multiple specialized agents (Master, Software Engineer, Logic, Research) working together to execute complex tasks.

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd synod
   ```

2. **Install Backend Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

4. **Environment Variables**
   Copy `.env.example` to `.env` and fill in your API keys.

## API Key Sources

- **GROQ_API_KEY**: Get from [Groq Console](https://console.groq.com/)
- **ANTHROPIC_API_KEY**: Get from [Anthropic Console](https://console.anthropic.com/)
- **HUGGINGFACE_API_KEY**: Get from [Hugging Face](https://huggingface.co/settings/tokens)
- **SUPABASE_URL** & **SUPABASE_KEY**: Get from [Supabase Dashboard](https://supabase.com/dashboard)
- **GITHUB_TOKEN**: Get from [GitHub Developer Settings](https://github.com/settings/tokens)
- **SERPAPI_KEY**: Get from [SerpApi](https://serpapi.com/)

## Firebase Setup Guide

To enable full-stack features (task persistence, event streaming, and real-time dashboard):

1. **Create a Firebase Project**: Go to [Firebase Console](https://console.firebase.google.com/).
2. **Enable Firestore**:
   - Create a Cloud Firestore database.
   - Set rules to `locked` mode initially.
   - Create a vector index for the `tasks` collection if using vector memory.
3. **Enable Realtime Database (RTDB)**:
   - Create an RTDB instance.
4. **Service Account**:
   - Go to Project Settings -> Service Accounts.
   - Generate a new private key JSON file.
   - Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to this file path.
5. **Environment Variables**:
   - Ensure `FIREBASE_PROJECT_ID` is set.
   - Ensure `FIREBASE_DATABASE_URL` is set for RTDB.

## How to Run Locally

1. **Start the Backend**
   ```bash
   npm run serve
   ```

2. **Start the Frontend**
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`.

## How to Deploy

### Backend (Google Cloud Run)
The repository includes a `Dockerfile` for multi-stage builds.
1. Build the image: `docker build -t synod-ai .`
2. Push to Google Container Registry.
3. Deploy to Cloud Run: `gcloud run deploy synod-ai --image <image-url> --platform managed --region <region>`
4. Set required environment variables in Cloud Run dashboard.
