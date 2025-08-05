"""
Storage service for handling file uploads and storage operations.
Manages Firebase Storage for images and files.
"""

from typing import Optional, List
import os
from datetime import datetime
from ..utils.firebase_config import get_storage_client


class StorageService:
    """Service for storage-related operations."""
    
    def __init__(self):
        self.storage_client = get_storage_client()
    
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
        try:
            bucket = self.storage_client
            blob = bucket.blob(destination_path)
            blob.upload_from_string(file_bytes, content_type=content_type)
            
            # Make the file publicly accessible
            blob.make_public()
            
            return blob.public_url
        except Exception as e:
            print(f"Error uploading bytes: {e}")
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
            photo_type: Type of photo (refrigerator, freezer, closet)
            file_bytes: Photo bytes
            filename: Original filename
            
        Returns:
            Optional[str]: Public URL of the uploaded photo or None
        """
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        destination_path = f"checklists/{user_id}/{checklist_id}/{photo_type}/{timestamp}_{filename}"
        
        return self.upload_bytes(file_bytes, destination_path, 'image/jpeg')
    
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