"""
Firebase configuration and initialization.
Manages Firebase Admin SDK setup for Firestore, Auth, and Storage.
"""

import os
import json
import time
import firebase_admin
from firebase_admin import credentials, firestore, storage, auth, messaging
from typing import Optional, Dict, Any
from google.cloud.exceptions import GoogleCloudError


_firebase_initialized = False
_firestore_client: Optional[firestore.Client] = None
_storage_bucket = None
_initialization_error = None


def validate_environment() -> Dict[str, Any]:
    """
    Validate that all required environment variables are set.
    
    Returns:
        Dict containing validation results and missing variables
    """
    validation_result = {
        'valid': True,
        'missing_vars': [],
        'warnings': []
    }
    
    # Check for service account file first
    service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH', 'serviceAccountKey.json')
    
    if os.path.exists(service_account_path):
        try:
            with open(service_account_path, 'r') as f:
                service_data = json.load(f)
                required_fields = ['project_id', 'private_key', 'client_email']
                for field in required_fields:
                    if not service_data.get(field):
                        validation_result['missing_vars'].append(f"service_account.{field}")
                        validation_result['valid'] = False
        except Exception as e:
            validation_result['missing_vars'].append(f"Invalid service account file: {str(e)}")
            validation_result['valid'] = False
    else:
        # Check environment variables
        required_env_vars = [
            'FIREBASE_PROJECT_ID',
            'FIREBASE_PRIVATE_KEY',
            'FIREBASE_CLIENT_EMAIL'
        ]
        
        for var in required_env_vars:
            if not os.getenv(var):
                validation_result['missing_vars'].append(var)
                validation_result['valid'] = False
    
    # Check optional but recommended variables
    optional_vars = ['FIREBASE_PRIVATE_KEY_ID', 'FIREBASE_CLIENT_ID']
    for var in optional_vars:
        if not os.getenv(var) and not os.path.exists(service_account_path):
            validation_result['warnings'].append(f"Optional variable {var} not set")
    
    return validation_result


def initialize_firebase() -> None:
    """
    Initialize Firebase Admin SDK with service account credentials.
    Should be called once at application startup.
    
    Raises:
        ValueError: If required environment variables are missing
        Exception: If Firebase initialization fails
    """
    global _firebase_initialized, _firestore_client, _storage_bucket, _initialization_error
    
    if _firebase_initialized:
        print("Firebase already initialized")
        return
    
    if _initialization_error:
        print(f"Firebase initialization previously failed: {_initialization_error}")
        raise Exception(f"Firebase initialization failed: {_initialization_error}")
    
    print("=== FIREBASE INITIALIZATION START ===")
    
    try:
        # Validate environment first
        validation = validate_environment()
        if not validation['valid']:
            error_msg = f"Missing required Firebase configuration: {', '.join(validation['missing_vars'])}"
            print(f"VALIDATION ERROR: {error_msg}")
            _initialization_error = error_msg
            raise ValueError(error_msg)
        
        if validation['warnings']:
            for warning in validation['warnings']:
                print(f"WARNING: {warning}")
        
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
                _initialization_error = f"Service account file error: {str(e)}"
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
                "auth_uri": os.getenv('FIREBASE_AUTH_URI', 'https://accounts.google.com/o/oauth2/auth'),
                "token_uri": os.getenv('FIREBASE_TOKEN_URI', 'https://oauth2.googleapis.com/token'),
                "auth_provider_x509_cert_url": os.getenv('FIREBASE_AUTH_PROVIDER_CERT_URL', 'https://www.googleapis.com/oauth2/v1/certs'),
                "client_x509_cert_url": os.getenv('FIREBASE_CLIENT_CERT_URL')
            }
            print("Using environment variables for Firebase credentials")
            cred = credentials.Certificate(service_account_info)
        
        # Initialize app with retry logic
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
        
        if not project_id:
            error_msg = "Firebase project ID is required but not found"
            print(f"ERROR: {error_msg}")
            _initialization_error = error_msg
            raise ValueError(error_msg)
        
        print(f"Project ID: {project_id}")
        storage_bucket_name = os.getenv('FIREBASE_STORAGE_BUCKET', f"{project_id}.appspot.com")
        print(f"Storage bucket: {storage_bucket_name}")
        
        # Initialize Firebase app with retry logic
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                firebase_admin.initialize_app(cred, {
                    'storageBucket': storage_bucket_name
                })
                print("Firebase app initialized successfully")
                break
            except Exception as e:
                print(f"Firebase app initialization attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    print(f"Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                else:
                    _initialization_error = f"Firebase app initialization failed after {max_retries} attempts: {str(e)}"
                    raise Exception(_initialization_error)
    
        # Initialize and test Firestore connection
        try:
            _firestore_client = firestore.client()
            print("Firestore client initialized successfully")
            
            # Test Firestore connection with a simple query
            test_connection_firestore()
            
        except Exception as e:
            print(f"Error initializing Firestore client: {e}")
            _initialization_error = f"Firestore initialization failed: {str(e)}"
            raise
        
        # Initialize and test Storage connection
        try:
            _storage_bucket = storage.bucket()
            print(f"Storage bucket initialized: {_storage_bucket.name}")
            
            # Test Storage connection
            test_connection_storage()
            
        except Exception as e:
            print(f"Error initializing storage bucket: {e}")
            _initialization_error = f"Storage initialization failed: {str(e)}"
            raise
        
        # Test Firebase Authentication (for FCM)
        try:
            test_connection_auth()
        except Exception as e:
            print(f"Warning: Auth/FCM testing failed: {e}")
            # Don't fail initialization for FCM issues
        
        _firebase_initialized = True
        print("=== FIREBASE INITIALIZATION SUCCESS ===")
        
    except Exception as e:
        print(f"=== FIREBASE INITIALIZATION FAILED ===")
        print(f"Error: {str(e)}")
        _initialization_error = str(e)
        # Don't re-raise here to allow graceful degradation
        raise


def test_connection_firestore() -> None:
    """Test Firestore connection by attempting to read from users collection."""
    try:
        # Try to read a document or list collection
        users_ref = _firestore_client.collection('users')
        # Just check if we can access the collection (don't read actual data)
        query = users_ref.limit(1)
        docs = list(query.stream())
        print(f"Firestore connection test successful - users collection accessible")
    except Exception as e:
        print(f"Firestore connection test failed: {e}")
        raise


def test_connection_storage() -> None:
    """Test Storage connection and bucket access."""
    try:
        # Test bucket access by listing files (limit to 1 for efficiency)
        blobs = list(_storage_bucket.list_blobs(max_results=1))
        print(f"Storage connection test successful - bucket accessible, found {len(blobs)} files")
    except GoogleCloudError as e:
        if "404" in str(e) or "does not exist" in str(e).lower():
            print("Storage bucket doesn't exist - attempting to create it...")
            try:
                # Create the bucket using the storage client
                from google.cloud import storage as gcs_storage
                
                gcs_client = gcs_storage.Client()
                new_bucket = gcs_client.create_bucket(_storage_bucket.name)
                print(f"Successfully created storage bucket: {new_bucket.name}")
                
                # Test access again
                blobs = list(_storage_bucket.list_blobs(max_results=1))
                print("Bucket creation and access test successful")
                
            except Exception as create_error:
                print(f"Failed to create bucket: {create_error}")
                print("You may need to create the Firebase Storage bucket manually in the Firebase Console")
                # Allow app to continue with storage limitations
                raise
        else:
            print(f"Storage bucket access failed: {e}")
            raise
    except Exception as e:
        print(f"Storage connection test failed: {e}")
        raise


def test_connection_auth() -> None:
    """Test Firebase Auth/FCM connection."""
    try:
        # Test by attempting to create a custom token (this verifies auth credentials)
        # We won't actually use this token, just test the connection
        test_uid = "connection-test-uid"
        custom_token = auth.create_custom_token(test_uid)
        print("Firebase Auth/FCM connection test successful")
    except Exception as e:
        print(f"Firebase Auth/FCM connection test failed: {e}")
        raise


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


def get_messaging_client():
    """
    Get Firebase Cloud Messaging instance.
    """
    if not _firebase_initialized:
        initialize_firebase()
    return messaging


def is_firebase_available() -> bool:
    """
    Check if Firebase is properly initialized and available.
    
    Returns:
        bool: True if Firebase is available, False otherwise
    """
    return _firebase_initialized and _initialization_error is None


def get_firebase_status() -> Dict[str, Any]:
    """
    Get detailed Firebase connection status.
    
    Returns:
        Dict containing status information for all Firebase services
    """
    status = {
        'initialized': _firebase_initialized,
        'error': _initialization_error,
        'services': {}
    }
    
    if not _firebase_initialized:
        return status
    
    # Test Firestore
    try:
        if _firestore_client:
            users_ref = _firestore_client.collection('users')
            query = users_ref.limit(1)
            docs = list(query.stream())
            status['services']['firestore'] = {
                'available': True,
                'status': 'connected',
                'message': 'Firestore connection successful'
            }
        else:
            status['services']['firestore'] = {
                'available': False,
                'status': 'error',
                'message': 'Firestore client not initialized'
            }
    except Exception as e:
        status['services']['firestore'] = {
            'available': False,
            'status': 'error',
            'message': f'Firestore connection failed: {str(e)}'
        }
    
    # Test Storage
    try:
        if _storage_bucket:
            blobs = list(_storage_bucket.list_blobs(max_results=1))
            status['services']['storage'] = {
                'available': True,
                'status': 'connected',
                'message': f'Storage bucket accessible: {_storage_bucket.name}'
            }
        else:
            status['services']['storage'] = {
                'available': False,
                'status': 'error',
                'message': 'Storage bucket not initialized'
            }
    except Exception as e:
        status['services']['storage'] = {
            'available': False,
            'status': 'error',
            'message': f'Storage connection failed: {str(e)}'
        }
    
    # Test Auth/FCM
    try:
        test_uid = "health-check-uid"
        custom_token = auth.create_custom_token(test_uid)
        status['services']['auth'] = {
            'available': True,
            'status': 'connected',
            'message': 'Firebase Auth/FCM connection successful'
        }
    except Exception as e:
        status['services']['auth'] = {
            'available': False,
            'status': 'error',
            'message': f'Auth/FCM connection failed: {str(e)}'
        }
    
    return status


def reset_firebase_connection() -> None:
    """
    Reset Firebase connection state to force reinitialization.
    Use with caution - mainly for testing or recovery scenarios.
    """
    global _firebase_initialized, _firestore_client, _storage_bucket, _initialization_error
    
    print("Resetting Firebase connection state...")
    
    # Delete existing app if it exists
    try:
        firebase_admin.delete_app(firebase_admin.get_app())
        print("Deleted existing Firebase app")
    except ValueError:
        print("No existing Firebase app to delete")
    except Exception as e:
        print(f"Error deleting Firebase app: {e}")
    
    # Reset global state
    _firebase_initialized = False
    _firestore_client = None
    _storage_bucket = None
    _initialization_error = None
    
    print("Firebase connection state reset complete")


def get_environment_info() -> Dict[str, Any]:
    """
    Get information about the current environment configuration.
    
    Returns:
        Dict containing environment configuration details
    """
    service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH', 'serviceAccountKey.json')
    
    env_info = {
        'service_account_file': {
            'path': service_account_path,
            'exists': os.path.exists(service_account_path),
            'readable': False,
            'valid': False
        },
        'environment_variables': {},
        'firebase_project': None,
        'storage_bucket': None
    }
    
    # Check service account file
    if env_info['service_account_file']['exists']:
        try:
            with open(service_account_path, 'r') as f:
                service_data = json.load(f)
                env_info['service_account_file']['readable'] = True
                env_info['service_account_file']['valid'] = bool(
                    service_data.get('project_id') and 
                    service_data.get('private_key') and 
                    service_data.get('client_email')
                )
                env_info['firebase_project'] = service_data.get('project_id')
        except Exception:
            pass
    
    # Check environment variables
    env_vars = [
        'FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_PRIVATE_KEY_ID', 'FIREBASE_CLIENT_ID', 'FIREBASE_STORAGE_BUCKET'
    ]
    
    for var in env_vars:
        value = os.getenv(var)
        env_info['environment_variables'][var] = {
            'set': bool(value),
            'length': len(value) if value else 0,
            # Don't expose actual values for security
            'preview': value[:10] + '...' if value and len(value) > 10 else value[:10] if value else None
        }
    
    # Get project info from env vars if not from service account
    if not env_info['firebase_project']:
        env_info['firebase_project'] = os.getenv('FIREBASE_PROJECT_ID')
    
    if env_info['firebase_project']:
        env_info['storage_bucket'] = os.getenv('FIREBASE_STORAGE_BUCKET', f"{env_info['firebase_project']}.appspot.com")
    
    return env_info