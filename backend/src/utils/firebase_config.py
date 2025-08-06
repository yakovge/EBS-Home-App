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
        print("Firebase already initialized")
        return
    
    print("=== FIREBASE INITIALIZATION START ===")
    
    # Try to use service account JSON file first
    service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH', 'serviceAccountKey.json')
    print(f"Looking for service account file: {service_account_path}")
    
    if os.path.exists(service_account_path):
        print(f"Using service account file: {service_account_path}")
        try:
            cred = credentials.Certificate(service_account_path)
            print("Service account credentials loaded successfully")
        except Exception as e:
            print(f"Error loading service account file: {e}")
            raise
    else:
        print("Service account file not found, trying environment variables")
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
        print("Using environment variables for Firebase credentials")
        cred = credentials.Certificate(service_account_info)
    
    # Initialize app
    # Get project ID from service account or environment
    project_id = None
    if os.path.exists(service_account_path):
        print("Reading project ID from service account file...")
        # Read project_id from service account file
        with open(service_account_path, 'r') as f:
            service_account_data = json.load(f)
            project_id = service_account_data.get('project_id')
    else:
        project_id = os.getenv('FIREBASE_PROJECT_ID')
    
    print(f"Project ID: {project_id}")
    storage_bucket_name = f"{project_id}.appspot.com"
    print(f"Storage bucket: {storage_bucket_name}")
    
    try:
        firebase_admin.initialize_app(cred, {
            'storageBucket': storage_bucket_name
        })
        print("Firebase app initialized successfully")
    except Exception as e:
        print(f"Error initializing Firebase app: {e}")
        raise
    
    try:
        _firestore_client = firestore.client()
        print("Firestore client initialized successfully")
    except Exception as e:
        print(f"Error initializing Firestore client: {e}")
        raise
    
    try:
        # Initialize storage client
        _storage_bucket = storage.bucket()
        print(f"Storage bucket initialized: {_storage_bucket.name}")
        
        # Test bucket access and create if it doesn't exist
        try:
            # Try to list files to test access
            blobs = list(_storage_bucket.list_blobs(max_results=1))
            print(f"Bucket access test successful - found {len(blobs)} files")
        except Exception as access_test_error:
            print(f"Bucket access test failed: {access_test_error}")
            
            # Check if it's a "bucket does not exist" error
            if "does not exist" in str(access_test_error) or "404" in str(access_test_error):
                print("Bucket doesn't exist - attempting to create it...")
                try:
                    # Create the bucket using the storage client
                    from google.cloud import storage as gcs_storage
                    
                    # Get the storage client directly
                    gcs_client = gcs_storage.Client()
                    new_bucket = gcs_client.create_bucket(_storage_bucket.name)
                    print(f"Successfully created storage bucket: {new_bucket.name}")
                    
                    # Test access again
                    blobs = list(_storage_bucket.list_blobs(max_results=1))
                    print("Bucket creation and access test successful")
                    
                except Exception as create_error:
                    print(f"Failed to create bucket: {create_error}")
                    print("You may need to create the Firebase Storage bucket manually in the Firebase Console")
                    # Don't raise here - let the app continue but warn about storage issues
            else:
                print(f"Bucket exists but access failed: {access_test_error}")
            
    except Exception as e:
        print(f"Error initializing storage bucket: {e}")
        raise
    
    _firebase_initialized = True
    print("=== FIREBASE INITIALIZATION SUCCESS ===")


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
        print("Firebase not initialized, initializing now...")
        initialize_firebase()
    
    print(f"Returning storage bucket: {_storage_bucket}")
    if _storage_bucket:
        print(f"Storage bucket name: {_storage_bucket.name}")
    else:
        print("WARNING: Storage bucket is None!")
    
    return _storage_bucket


def get_auth_client():
    """
    Get Firebase Auth instance.
    """
    if not _firebase_initialized:
        initialize_firebase()
    return auth