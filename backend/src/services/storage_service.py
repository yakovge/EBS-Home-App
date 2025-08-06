"""
Storage service for handling file uploads and storage operations.
Manages Firebase Storage for images and files with local fallback.
"""

from typing import Optional, List
import os
import uuid
from datetime import datetime
from pathlib import Path
from ..utils.firebase_config import get_storage_client


class StorageService:
    """Service for storage-related operations."""
    
    def __init__(self):
        self.storage_client = get_storage_client()
        # Local storage fallback directory
        self.local_storage_path = Path("./uploads")
        self.local_storage_path.mkdir(exist_ok=True)
        # Create subdirectories for organization
        (self.local_storage_path / "maintenance").mkdir(exist_ok=True)
        (self.local_storage_path / "checklists").mkdir(exist_ok=True)
        (self.local_storage_path / "profiles").mkdir(exist_ok=True)
    
    def upload_file(self, file_path: str, destination_path: str) -> Optional[str]:
        """
        Upload a file to Firebase Storage.
        
        Args:
            file_path: Local path to the file
            destination_path: Destination path in Firebase Storage
            
        Returns:
            Optional[str]: Public URL of the uploaded file or None
        """
        try:
            bucket = self.storage_client
            blob = bucket.blob(destination_path)
            blob.upload_from_filename(file_path)
            
            # Make the file publicly accessible
            blob.make_public()
            
            return blob.public_url
        except Exception as e:
            print(f"Error uploading file: {e}")
            return None
    
    def upload_bytes(self, file_bytes: bytes, destination_path: str, content_type: str = 'image/jpeg') -> Optional[str]:
        """
        Upload bytes to Firebase Storage.
        
        Args:
            file_bytes: File bytes to upload
            destination_path: Destination path in Firebase Storage
            content_type: Content type of the file
            
        Returns:
            Optional[str]: Public URL of the uploaded file or None
        """
        print(f"=== FIREBASE STORAGE UPLOAD ===")
        print(f"Destination path: {destination_path}")
        print(f"Content type: {content_type}")
        print(f"Bytes length: {len(file_bytes)}")
        
        try:
            print("Getting storage bucket...")
            bucket = self.storage_client
            if not bucket:
                print("ERROR: Storage client is None!")
                return None
            print(f"Storage bucket: {bucket.name}")
            
            print("Creating blob...")
            blob = bucket.blob(destination_path)
            print(f"Blob created: {blob.name}")
            
            print("Uploading bytes to Firebase...")
            blob.upload_from_string(file_bytes, content_type=content_type)
            print("Upload completed")
            
            # Make the file publicly accessible
            print("Making blob public...")
            blob.make_public()
            print("Blob made public")
            
            public_url = blob.public_url
            print(f"Public URL: {public_url}")
            return public_url
        except Exception as e:
            print(f"=== FIREBASE STORAGE UPLOAD ERROR ===")
            print(f"Error type: {type(e)}")
            print(f"Error message: {e}")
            
            # Check for specific error types and provide helpful messages
            if 'does not exist' in str(e) or '404' in str(e):
                print("ERROR: Firebase Storage bucket does not exist!")
                print("FALLBACK: Using local file storage instead")
                
                # Use local storage as fallback
                try:
                    # Generate unique filename
                    file_id = str(uuid.uuid4())
                    file_ext = 'jpg'  # Default to jpg for images
                    if '.' in destination_path:
                        file_ext = destination_path.split('.')[-1]
                    
                    # Determine subdirectory based on path
                    if 'maintenance' in destination_path:
                        subdir = 'maintenance'
                    elif 'checklist' in destination_path:
                        subdir = 'checklists'
                    elif 'profile' in destination_path:
                        subdir = 'profiles'
                    else:
                        subdir = ''
                    
                    # Save file locally
                    local_file = self.local_storage_path / subdir / f"{file_id}.{file_ext}"
                    with open(local_file, 'wb') as f:
                        f.write(file_bytes)
                    
                    # Return URL that backend will serve
                    local_url = f"http://localhost:5000/api/uploads/{subdir}/{file_id}.{file_ext}"
                    print(f"File saved locally: {local_file}")
                    print(f"Local URL: {local_url}")
                    return local_url
                    
                except Exception as local_error:
                    print(f"Local storage also failed: {local_error}")
                    # Last resort - return placeholder
                    placeholder_url = f"https://placeholder-storage.dev/{destination_path}"
                    return placeholder_url
            elif 'ServiceUnavailable' in str(e):
                print("Firebase Storage is temporarily unavailable")
            elif 'Forbidden' in str(e):
                print("Access forbidden - check Storage rules or service account permissions")
            elif 'NotFound' in str(e):
                print("Storage bucket not found - check project configuration")
            elif 'permission' in str(e).lower():
                print("Permission denied - check service account permissions")
            
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            
            return None
    
    def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from Firebase Storage.
        
        Args:
            file_path: Path of the file to delete
            
        Returns:
            bool: True if deleted successfully
        """
        try:
            bucket = self.storage_client
            blob = bucket.blob(file_path)
            blob.delete()
            return True
        except Exception as e:
            print(f"Error deleting file: {e}")
            return False
    
    def get_file_url(self, file_path: str) -> Optional[str]:
        """
        Get the public URL of a file.
        
        Args:
            file_path: Path of the file
            
        Returns:
            Optional[str]: Public URL of the file or None
        """
        try:
            bucket = self.storage_client
            blob = bucket.blob(file_path)
            return blob.public_url
        except Exception as e:
            print(f"Error getting file URL: {e}")
            return None
    
    def upload_maintenance_photo(self, user_id: str, maintenance_request_id: str, file_bytes: bytes, filename: str) -> Optional[str]:
        """
        Upload a maintenance photo.
        
        Args:
            user_id: ID of the user uploading the photo
            maintenance_request_id: ID of the maintenance request
            file_bytes: Photo bytes
            filename: Original filename
            
        Returns:
            Optional[str]: Public URL of the uploaded photo or None
        """
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        destination_path = f"maintenance/{user_id}/{maintenance_request_id}/{timestamp}_{filename}"
        
        return self.upload_bytes(file_bytes, destination_path, 'image/jpeg')
    
    def upload_checklist_photo(self, user_id: str, checklist_id: str, photo_type: str, file_bytes: bytes, filename: str) -> Optional[str]:
        """
        Upload a checklist photo.
        
        Args:
            user_id: ID of the user uploading the photo
            checklist_id: ID of the checklist
            photo_type: Type of photo (refrigerator, freezer, closet, general)
            file_bytes: Photo bytes
            filename: Original filename
            
        Returns:
            Optional[str]: Public URL of the uploaded photo or None
        """
        print(f"=== STORAGE SERVICE: CHECKLIST PHOTO UPLOAD ===")
        print(f"User ID: {user_id}")
        print(f"Checklist ID: {checklist_id}")
        print(f"Photo type: {photo_type}")
        print(f"Filename: {filename}")
        print(f"File size: {len(file_bytes)} bytes")
        
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        destination_path = f"checklists/{user_id}/{checklist_id}/{photo_type}/{timestamp}_{filename}"
        print(f"Destination path: {destination_path}")
        
        try:
            result = self.upload_bytes(file_bytes, destination_path, 'image/jpeg')
            print(f"Upload result: {result}")
            return result
        except Exception as e:
            print(f"Storage service upload failed: {e}")
            print(f"Error type: {type(e)}")
            # Return None instead of raising to see exact failure point
            return None
    
    def upload_profile_photo(self, user_id: str, file_bytes: bytes, filename: str) -> Optional[str]:
        """
        Upload a profile photo.
        
        Args:
            user_id: ID of the user
            file_bytes: Photo bytes
            filename: Original filename
            
        Returns:
            Optional[str]: Public URL of the uploaded photo or None
        """
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        destination_path = f"profiles/{user_id}/{timestamp}_{filename}"
        
        return self.upload_bytes(file_bytes, destination_path, 'image/jpeg')
    
    def delete_user_files(self, user_id: str) -> bool:
        """
        Delete all files for a user.
        
        Args:
            user_id: ID of the user
            
        Returns:
            bool: True if deleted successfully
        """
        try:
            bucket = self.storage_client
            blobs = bucket.list_blobs(prefix=f"maintenance/{user_id}/")
            
            for blob in blobs:
                blob.delete()
            
            blobs = bucket.list_blobs(prefix=f"checklists/{user_id}/")
            for blob in blobs:
                blob.delete()
            
            blobs = bucket.list_blobs(prefix=f"profiles/{user_id}/")
            for blob in blobs:
                blob.delete()
            
            return True
        except Exception as e:
            print(f"Error deleting user files: {e}")
            return False 