import os
import firebase_admin
from firebase_admin import credentials, firestore, db
from supabase import create_client, Client

def initialize_firebase():
    if not firebase_admin._apps:
        project_id = os.getenv("FIREBASE_PROJECT_ID")
        client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
        private_key = os.getenv("FIREBASE_PRIVATE_KEY")
        database_url = os.getenv("FIREBASE_DATABASE_URL")
        
        if project_id and client_email and private_key:
            # Aggressive cleaning for Render environment variables
            # 1. Remove any surrounding quotes and whitespace
            clean_key = private_key.strip().strip('"').strip("'")
            # 2. Replace literal \n with actual newlines
            clean_key = clean_key.replace('\\n', '\n')
            
            # 3. Reconstruct the PEM structure to ensure no trailing spaces or malformed lines
            # This is the most reliable way to fix "MalformedFraming"
            lines = [line.strip() for line in clean_key.split('\n') if line.strip()]
            
            if lines:
                # Ensure headers are perfectly formatted with 5 dashes
                if not lines[0].startswith('-----BEGIN PRIVATE KEY-----'):
                    # If it contains the text but not the dashes, replace the whole line
                    if 'BEGIN PRIVATE KEY' in lines[0]:
                        lines[0] = '-----BEGIN PRIVATE KEY-----'
                    else:
                        lines.insert(0, '-----BEGIN PRIVATE KEY-----')
                
                if not lines[-1].startswith('-----END PRIVATE KEY-----'):
                    if 'END PRIVATE KEY' in lines[-1]:
                        lines[-1] = '-----END PRIVATE KEY-----'
                    else:
                        lines.append('-----END PRIVATE KEY-----')
                
                # Re-join with proper newlines
                private_key = '\n'.join(lines) + '\n'

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
                'databaseURL': database_url
            })
        else:
            # Fallback for local dev if credentials are not fully set
            firebase_admin.initialize_app(options={
                'databaseURL': database_url
            })

initialize_firebase()
db_client = firestore.client()
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
