"""
Firebase configuration and initialization.
Manages Firebase Admin SDK setup for Firestore, Auth, and Storage.
"""

import os
import json
import firebase_admin
from firebase_admin import credentials, firestore, storage, auth
from typing import Optional


_firebase_initialized = False
_firestore_client: Optional[firestore.Client] = None
_storage_bucket = None


def initialize_firebase() -> None:
    """
    Initialize Firebase Admin SDK with service account credentials.
    Should be called once at application startup.
    """
    global _firebase_initialized, _firestore_client, _storage_bucket
    
    if _firebase_initialized:
        return
    
    # Try to use service account JSON file first
    service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH', 'serviceAccountKey.json')
    if os.path.exists(service_account_path):
        cred = credentials.Certificate(service_account_path)
    else:
        # Fallback to environment variables
        private_key = os.getenv('FIREBASE_PRIVATE_KEY', '')
        if private_key:
            # Handle the private key formatting properly
            private_key = private_key.replace('\\n', '\n').strip('"')
        
        service_account_info = {
            "type": "service_account",
            "project_id": os.getenv('FIREBASE_PROJECT_ID'),
            "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
            "private_key": private_key,
            "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
            "client_id": os.getenv('FIREBASE_CLIENT_ID'),
            "auth_uri": os.getenv('FIREBASE_AUTH_URI'),
            "token_uri": os.getenv('FIREBASE_TOKEN_URI'),
            "auth_provider_x509_cert_url": os.getenv('FIREBASE_AUTH_PROVIDER_CERT_URL'),
            "client_x509_cert_url": os.getenv('FIREBASE_CLIENT_CERT_URL')
        }
        cred = credentials.Certificate(service_account_info)
    
    # Initialize app
    # Get project ID from service account or environment
    project_id = None
    if os.path.exists(service_account_path):
        # Read project_id from service account file
        with open(service_account_path, 'r') as f:
            service_account_data = json.load(f)
            project_id = service_account_data.get('project_id')
    else:
        project_id = os.getenv('FIREBASE_PROJECT_ID')
    
    firebase_admin.initialize_app(cred, {
        'storageBucket': f"{project_id}.appspot.com"
    })
    
    _firebase_initialized = True
    _firestore_client = firestore.client()
    _storage_bucket = storage.bucket()
    
    print("Firebase initialized successfully")


def get_firestore_client() -> firestore.Client:
    """
    Get Firestore client instance.
    Ensures Firebase is initialized before returning client.
    """
    if not _firebase_initialized:
        initialize_firebase()
    return _firestore_client


def get_storage_client():
    """
    Get Storage bucket instance.
    Ensures Firebase is initialized before returning bucket.
    """
    if not _firebase_initialized:
        initialize_firebase()
    return _storage_bucket


def get_auth_client():
    """
    Get Firebase Auth instance.
    """
    if not _firebase_initialized:
        initialize_firebase()
    return auth