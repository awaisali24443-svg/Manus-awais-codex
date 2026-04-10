import os
import json
import firebase_admin
from firebase_admin import credentials, firestore, db
from supabase import create_client, Client

def initialize_firebase():
    if not firebase_admin._apps:
        project_id = os.getenv("FIREBASE_PROJECT_ID")
        client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
        private_key = os.getenv("FIREBASE_PRIVATE_KEY")
        database_url = os.getenv("FIREBASE_DATABASE_URL")
        
        # Try to load from config file if env vars are missing
        config_path = os.path.join(os.path.dirname(__file__), "../../firebase-applet-config.json")
        config_data = {}
        if os.path.exists(config_path):
            try:
                with open(config_path, "r") as f:
                    config_data = json.load(f)
            except Exception as e:
                print(f"Error loading firebase-applet-config.json: {e}")

        if project_id and client_email and private_key:
            print(f"Initializing Firebase with Service Account for project: {project_id}")
            # Aggressive cleaning for Render environment variables
            clean_key = private_key.strip().strip('"').strip("'")
            clean_key = clean_key.replace('\\n', '\n')
            lines = [line.strip() for line in clean_key.split('\n') if line.strip()]
            
            if lines:
                if not lines[0].startswith('-----BEGIN PRIVATE KEY-----'):
                    if 'BEGIN PRIVATE KEY' in lines[0]:
                        lines[0] = '-----BEGIN PRIVATE KEY-----'
                    else:
                        lines.insert(0, '-----BEGIN PRIVATE KEY-----')
                
                if not lines[-1].startswith('-----END PRIVATE KEY-----'):
                    if 'END PRIVATE KEY' in lines[-1]:
                        lines[-1] = '-----END PRIVATE KEY-----'
                    else:
                        lines.append('-----END PRIVATE KEY-----')
                
                private_key = '\n'.join(lines) + '\n'

            try:
                cred = credentials.Certificate({
                    "type": "service_account",
                    "project_id": project_id,
                    "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID", ""),
                    "private_key": private_key,
                    "client_email": client_email,
                    "client_id": os.getenv("FIREBASE_CLIENT_ID", ""),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                    "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{client_email}"
                })
                firebase_admin.initialize_app(cred, {
                    'databaseURL': database_url or f"https://{project_id}.firebaseio.com"
                })
                print("Firebase initialized successfully with Service Account.")
            except Exception as e:
                print(f"Failed to initialize Firebase with Service Account: {e}")
                # Fallback to default
                try:
                    firebase_admin.initialize_app()
                    print("Firebase initialized with default credentials.")
                except Exception as e2:
                    print(f"Firebase default initialization failed: {e2}")
        else:
            print("Missing Service Account env vars. Falling back to local config/default.")
            # Fallback for local dev
            try:
                firebase_admin.initialize_app(options={
                    'databaseURL': database_url or (f"https://{config_data.get('projectId')}.firebaseio.com" if config_data.get('projectId') else None)
                })
                print("Firebase initialized with local config fallback.")
            except Exception as e:
                print(f"Firebase local config initialization failed: {e}")
                try:
                    firebase_admin.initialize_app()
                    print("Firebase initialized with default credentials (no config).")
                except Exception as e2:
                    print(f"Firebase absolute fallback failed: {e2}")

initialize_firebase()

# Get database ID from environment or config
database_id = os.getenv("FIREBASE_DATABASE_ID")
if not database_id:
    config_path = os.path.join(os.path.dirname(__file__), "../../firebase-applet-config.json")
    database_id = "(default)"
    if os.path.exists(config_path):
        try:
            with open(config_path, "r") as f:
                config_data = json.load(f)
                database_id = config_data.get("firestoreDatabaseId", "(default)")
        except Exception:
            pass

try:
    db_client = firestore.client(database=database_id)
    print(f"Firestore client initialized for database: {database_id}")
except Exception as e:
    print(f"Failed to initialize Firestore client: {e}")
    db_client = None

rtdb_client = db

# Supabase Initialization
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if supabase_url and supabase_key:
    supabase_client: Client = create_client(
        supabase_url, supabase_key
    )
else:
    supabase_client = None
    print("WARNING: Supabase not configured. Vector memory disabled.")
