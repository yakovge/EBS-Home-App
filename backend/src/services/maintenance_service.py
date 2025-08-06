"""
Maintenance service for handling maintenance request business logic.
Manages maintenance requests, assignments, and notifications.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from ..models.maintenance import MaintenanceRequest
from ..repositories.maintenance_repository import MaintenanceRepository
from ..repositories.user_repository import UserRepository


class MaintenanceService:
    """Service for maintenance-related operations."""
    
    def __init__(self):
        self.maintenance_repository = MaintenanceRepository()
        self.user_repository = UserRepository()
    
    def create_maintenance_request(self, user_id: str, description: str, location: str, photo_urls: List[str]) -> str:
        """
        Create a new maintenance request.
        
        Args:
            user_id: ID of the user creating the request
            description: Description of the maintenance issue
            location: Location of the issue
            photo_urls: List of photo URLs
            
        Returns:
            str: ID of the created maintenance request
            
        Raises:
            ValueError: If validation fails or user not found
            Exception: If repository operation fails
        """
        print("=== MAINTENANCE SERVICE DEBUGGING ===")
        print(f"SERVICE: create_maintenance_request called")
        print(f"SERVICE: user_id = {user_id} (type: {type(user_id)})")
        print(f"SERVICE: description = {description} (type: {type(description)})")
        print(f"SERVICE: location = {location} (type: {type(location)})")
        print(f"SERVICE: photo_urls = {photo_urls} (type: {type(photo_urls)})")
        
        # Validate inputs
        print("SERVICE: Starting input validation...")
        if not user_id or not user_id.strip():
            print("SERVICE: User ID validation failed")
            raise ValueError("User ID is required")
        if not description or len(description.strip()) < 10:
            print(f"SERVICE: Description validation failed (length: {len(description.strip()) if description else 0})")
            raise ValueError("Description must be at least 10 characters long")
        if not location or len(location.strip()) < 2:
            print(f"SERVICE: Location validation failed (length: {len(location.strip()) if location else 0})")
            raise ValueError("Location must be at least 2 characters long")
        # Photos are now optional - allow empty photo_urls
        if photo_urls is None:
            photo_urls = []
        print("SERVICE: Input validation passed")
        
        # Get user and validate
        print(f"SERVICE: Getting user from repository: {user_id}")
        try:
            user = self.user_repository.get_by_id(user_id)
            print(f"SERVICE: User repository returned: {user}")
            print(f"SERVICE: User type: {type(user)}")
            if not user:
                print("SERVICE: User not found in repository")
                raise ValueError(f"User with ID {user_id} not found")
            print(f"SERVICE: User found: {user.name} ({user.email})")
        except Exception as e:
            print(f"SERVICE ERROR: Failed to get user {user_id}: {str(e)}")
            print(f"SERVICE ERROR TYPE: {type(e)}")
            import traceback
            print(f"SERVICE TRACEBACK: {traceback.format_exc()}")
            raise ValueError("Failed to validate user") from e
        
        # Prepare maintenance data
        print("SERVICE: Preparing maintenance data...")
        maintenance_data = {
            'reporter_id': user_id,
            'reporter_name': user.name,
            'description': description.strip(),
            'location': location.strip(),
            'photo_urls': photo_urls,
            'status': 'pending',
            'maintenance_notified': False,
            'yaffa_notified': False
        }
        print(f"SERVICE: Maintenance data: {maintenance_data}")
        
        # Create maintenance request 
        print("SERVICE: Calling repository create_maintenance_request...")
        try:
            request_id = self.maintenance_repository.create_maintenance_request(maintenance_data)
            print(f"SERVICE: Repository returned request_id: {request_id}")
            print(f"Info: Created maintenance request {request_id} for user {user_id}")
            return request_id
        except Exception as e:
            print(f"SERVICE REPOSITORY ERROR: Failed to create maintenance request for user {user_id}: {str(e)}")
            print(f"SERVICE REPOSITORY ERROR TYPE: {type(e)}")
            import traceback
            print(f"SERVICE REPOSITORY TRACEBACK: {traceback.format_exc()}")
            raise Exception("Failed to create maintenance request") from e
    
    def get_maintenance_requests(self, status: Optional[str] = None) -> List[MaintenanceRequest]:
        """
        Get maintenance requests with optional status filter.
        
        Args:
            status: Optional status filter
            
        Returns:
            List[MaintenanceRequest]: List of maintenance requests
        """
        return self.maintenance_repository.get_maintenance_requests(status)
    
    def get_maintenance_request_by_id(self, request_id: str) -> Optional[MaintenanceRequest]:
        """
        Get a maintenance request by ID.
        
        Args:
            request_id: ID of the maintenance request
            
        Returns:
            Optional[MaintenanceRequest]: Maintenance request or None
        """
        return self.maintenance_repository.get_maintenance_request_by_id(request_id)
    
    def assign_maintenance_request(self, request_id: str, assigned_to_id: str) -> bool:
        """
        Assign a maintenance request to someone.
        
        Args:
            request_id: ID of the maintenance request
            assigned_to_id: ID of the person assigned
            
        Returns:
            bool: True if assigned successfully
        """
        assigned_user = self.user_repository.get_by_id(assigned_to_id)
        if not assigned_user:
            return False
        
        return self.maintenance_repository.assign_maintenance_request(
            request_id, 
            assigned_to_id, 
            assigned_user.name
        )
    
    def complete_maintenance_request(self, request_id: str, resolution_notes: str, 
                                   completed_by_id: str, completed_by_name: str) -> bool:
        """
        Mark a maintenance request as completed.
        
        Args:
            request_id: ID of the maintenance request
            resolution_notes: Notes about the resolution
            completed_by_id: ID of the user who marked it as complete
            completed_by_name: Name of the user who marked it as complete
            
        Returns:
            bool: True if completed successfully
        """
        return self.maintenance_repository.complete_maintenance_request(
            request_id, 
            resolution_notes,
            completed_by_id,
            completed_by_name
        )
    
    def reopen_maintenance_request(self, request_id: str, reopen_reason: str, 
                                 reopened_by_id: str, reopened_by_name: str) -> bool:
        """
        Reopen a completed maintenance request (mark as unfixed).
        
        Args:
            request_id: ID of the maintenance request
            reopen_reason: Reason for reopening
            reopened_by_id: ID of the user who reopened it
            reopened_by_name: Name of the user who reopened it
            
        Returns:
            bool: True if reopened successfully
        """
        return self.maintenance_repository.reopen_maintenance_request(
            request_id, 
            reopen_reason,
            reopened_by_id,
            reopened_by_name
        )
    
    def update_maintenance_request(self, request_id: str, update_data: Dict[str, Any]) -> bool:
        """
        Update a maintenance request.
        
        Args:
            request_id: ID of the maintenance request
            update_data: Data to update
            
        Returns:
            bool: True if updated successfully
        """
        return self.maintenance_repository.update_maintenance_request(request_id, update_data)
    
    def get_pending_maintenance_requests(self) -> List[MaintenanceRequest]:
        """
        Get all pending maintenance requests.
        
        Returns:
            List[MaintenanceRequest]: List of pending requests
        """
        return self.get_maintenance_requests('pending')
    
    def get_in_progress_maintenance_requests(self) -> List[MaintenanceRequest]:
        """
        Get all in-progress maintenance requests.
        
        Returns:
            List[MaintenanceRequest]: List of in-progress requests
        """
        return self.get_maintenance_requests('in_progress')
    
    def get_completed_maintenance_requests(self) -> List[MaintenanceRequest]:
        """
        Get all completed maintenance requests.
        
        Returns:
            List[MaintenanceRequest]: List of completed requests
        """
        return self.get_maintenance_requests('completed')
    
    def get_pending_maintenance_count(self) -> int:
        """
        Get count of pending maintenance requests.
        
        Returns:
            int: Number of pending requests
        """
        pending_requests = self.get_pending_maintenance_requests()
        return len(pending_requests)
    
    def get_recent_maintenance(self, limit: int = 5) -> List[MaintenanceRequest]:
        """
        Get recent maintenance requests.
        
        Args:
            limit: Maximum number of requests to return
            
        Returns:
            List[MaintenanceRequest]: List of recent requests
        """
        all_requests = self.maintenance_repository.get_maintenance_requests()
        # Sort by creation date (newest first) and limit
        sorted_requests = sorted(all_requests, key=lambda x: x.created_at, reverse=True)
        return sorted_requests[:limit] 