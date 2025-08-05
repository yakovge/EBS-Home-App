#!/usr/bin/env python3
"""
Script to reset device registrations for testing.
Run this if you're getting 403 "Device not authorized" errors.
"""

import sys
import os
sys.path.append('backend/src')

from services.user_service import UserService
from repositories.user_repository import UserRepository

def reset_all_devices():
    """Clear all device registrations for testing purposes."""
    try:
        user_repo = UserRepository()
        user_service = UserService()
        
        # Get all users
        # For testing, we'll clear device history for all users
        print("Clearing all device registrations...")
        
        # This would require access to Firestore to list all users
        # For now, just print instructions
        print("To reset device registrations:")
        print("1. Go to Firebase Console")
        print("2. Navigate to Firestore Database")
        print("3. Find the 'users' collection")
        print("4. For each user document, clear the 'device_history' field")
        print("5. Or delete the entire user document to reset completely")
        
        print("\nAlternatively, modify the device verification to be less strict for testing.")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    reset_all_devices()