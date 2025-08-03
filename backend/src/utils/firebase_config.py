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
    
    # In production, use service account JSON file
    # For development, use environment variables
    if os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH'):
        cred = credentials.Certificate(os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH'))
    else:
        # Build credentials from environment variables
        service_account_info = {
            "type": "service_account",
            "project_id": os.getenv('FIREBASE_PROJECT_ID'),
            "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
            "private_key": os.getenv('FIREBASE_PRIVATE_KEY', '').replace('\\n', '\n'),
            "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
            "client_id": os.getenv('FIREBASE_CLIENT_ID'),
            "auth_uri": os.getenv('FIREBASE_AUTH_URI'),
            "token_uri": os.getenv('FIREBASE_TOKEN_URI'),
            "auth_provider_x509_cert_url": os.getenv('FIREBASE_AUTH_PROVIDER_CERT_URL'),
            "client_x509_cert_url": os.getenv('FIREBASE_CLIENT_CERT_URL')
        }
        cred = credentials.Certificate(service_account_info)
    
    # Initialize app
    firebase_admin.initialize_app(cred, {
        'storageBucket': f"{os.getenv('FIREBASE_PROJECT_ID')}.appspot.com"
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