"""
Maintenance request API endpoints.
Handles creating, updating, and managing maintenance requests.
"""

from flask import Blueprint, request, jsonify, current_app, g
from typing import Dict, Any

from ..services.maintenance_service import MaintenanceService
from ..services.storage_service import StorageService
from ..middleware.auth import require_auth
from ..utils.validators import validate_request_data
from ..utils.exceptions import ValidationError, ResourceNotFoundError

maintenance_bp = Blueprint('maintenance', __name__)
maintenance_service = MaintenanceService()
storage_service = StorageService()


@maintenance_bp.route('', methods=['GET'])
@require_auth
def list_maintenance_requests(current_user):
    """
    List maintenance requests.
    """
    try:
        status = request.args.get('status')
        requests = maintenance_service.get_maintenance_requests(status)
        
        return jsonify([req.to_dict() for req in requests]), 200
        
    except Exception as e:
        current_app.logger.error(f"List maintenance requests error: {str(e)}")
        return jsonify({'error': 'Failed to list requests', 'message': str(e)}), 500


@maintenance_bp.route('', methods=['POST'])
@require_auth
def create_maintenance_request(current_user):
    """
    Create new maintenance request.
    Expects: { description, location, photo_urls[] }
    """
    try:
        data = validate_request_data(request.json, {
            'description': {'type': str, 'required': True, 'min_length': 10},
            'location': {'type': str, 'required': True, 'min_length': 2},
            'photo_urls': {'type': list, 'required': False, 'default': []}
        })
        
        # Create request  
        request_id = maintenance_service.create_maintenance_request(
            user_id=current_user.id,
            description=data['description'],
            location=data['location'],
            photo_urls=data['photo_urls']
        )
        
        # Get the created request to return
        maintenance_request = maintenance_service.get_maintenance_request_by_id(request_id)
        
        # Note: Notification service integration will be added later
        
        return jsonify(maintenance_request.to_dict()), 201
        
    except (ValueError, ValidationError) as e:
        current_app.logger.warning(f"Create maintenance validation error: {str(e)}")
        return jsonify({'error': 'Validation error', 'message': str(e)}), 400
    except Exception as e:
        import traceback
        current_app.logger.error(f"Create maintenance unexpected error: {str(e)}")
        current_app.logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to create request', 'message': str(e)}), 500


@maintenance_bp.route('/<request_id>', methods=['GET'])
@require_auth
def get_maintenance_request(current_user, request_id):
    """Get specific maintenance request by ID."""
    try:
        maintenance_request = maintenance_service.get_maintenance_request_by_id(request_id)
        return jsonify(maintenance_request.to_dict()), 200
        
    except ResourceNotFoundError:
        return jsonify({'error': 'Request not found'}), 404
    except Exception as e:
        current_app.logger.error(f"Get maintenance request error: {str(e)}")
        return jsonify({'error': 'Failed to get request', 'message': str(e)}), 500


@maintenance_bp.route('/<request_id>/assign', methods=['POST'])
@require_auth
def assign_maintenance_request(current_user, request_id):
    """
    Assign maintenance request to a user.
    Maintenance person only endpoint.
    """
    try:
        success = maintenance_service.assign_maintenance_request(
            request_id=request_id,
            assigned_to_id=current_user.id
        )
        
        if not success:
            return jsonify({'error': 'Failed to assign request'}), 400
            
        maintenance_request = maintenance_service.get_maintenance_request_by_id(request_id)
        
        return jsonify({
            'message': 'Request assigned successfully',
            'request': maintenance_request.to_dict()
        }), 200
        
    except ResourceNotFoundError:
        return jsonify({'error': 'Request not found'}), 404
    except Exception as e:
        current_app.logger.error(f"Assign maintenance request error: {str(e)}")
        return jsonify({'error': 'Failed to assign request', 'message': str(e)}), 500


@maintenance_bp.route('/<request_id>/complete', methods=['POST'])
@require_auth
def complete_maintenance_request(current_user, request_id):
    """
    Mark maintenance request as completed.
    Expects: { resolution_notes }
    """
    try:
        data = validate_request_data(request.json, {
            'resolution_notes': {'type': str, 'required': True, 'min_length': 5}
        })
        
        success = maintenance_service.complete_maintenance_request(
            request_id=request_id,
            resolution_notes=data['resolution_notes'],
            completed_by_id=current_user.id,
            completed_by_name=current_user.name
        )
        
        if not success:
            return jsonify({'error': 'Failed to complete request'}), 400
            
        maintenance_request = maintenance_service.get_maintenance_request_by_id(request_id)
        
        # Note: Notification service integration will be added later
        
        return jsonify({
            'message': 'Request completed successfully',
            'request': maintenance_request.to_dict()
        }), 200
        
    except (ValueError, ValidationError) as e:
        return jsonify({'error': 'Validation error', 'message': str(e)}), 400
    except ResourceNotFoundError:
        return jsonify({'error': 'Request not found'}), 404
    except Exception as e:
        current_app.logger.error(f"Complete maintenance request error: {str(e)}")
        return jsonify({'error': 'Failed to complete request', 'message': str(e)}), 500


@maintenance_bp.route('/<request_id>/reopen', methods=['POST'])
@require_auth
def reopen_maintenance_request(current_user, request_id):
    """
    Reopen (mark as unfixed) a completed maintenance request.
    Expects: { reopen_reason }
    """
    try:
        data = validate_request_data(request.json, {
            'reopen_reason': {'type': str, 'required': True, 'min_length': 5}
        })
        
        success = maintenance_service.reopen_maintenance_request(
            request_id=request_id,
            reopen_reason=data['reopen_reason'],
            reopened_by_id=current_user.id,
            reopened_by_name=current_user.name
        )
        
        if not success:
            return jsonify({'error': 'Failed to reopen request'}), 400
            
        maintenance_request = maintenance_service.get_maintenance_request_by_id(request_id)
        
        return jsonify({
            'message': 'Request reopened successfully',
            'request': maintenance_request.to_dict()
        }), 200
        
    except (ValueError, ValidationError) as e:
        return jsonify({'error': 'Validation error', 'message': str(e)}), 400
    except ResourceNotFoundError:
        return jsonify({'error': 'Request not found'}), 404
    except Exception as e:
        current_app.logger.error(f"Reopen maintenance request error: {str(e)}")
        return jsonify({'error': 'Failed to reopen request', 'message': str(e)}), 500


@maintenance_bp.route('/upload-photo', methods=['POST'])
@require_auth
def upload_maintenance_photo(current_user):
    """
    Upload a photo for maintenance requests.
    Expects multipart form data with 'photo' file and optional 'maintenance_id'.
    Returns the photo URL for use in maintenance request creation.
    """
    try:
        # Check if photo file is present
        if 'photo' not in request.files:
            return jsonify({'error': 'No photo file provided'}), 400
        
        photo_file = request.files['photo']
        if photo_file.filename == '':
            return jsonify({'error': 'No photo file selected'}), 400
        
        # Validate file type and size
        allowed_types = {'image/jpeg', 'image/jpg', 'image/png', 'image/webp'}
        if photo_file.content_type not in allowed_types:
            return jsonify({'error': 'Invalid file type. Only JPEG, PNG, and WebP are allowed'}), 400
        
        # Check file size (max 5MB)
        max_size = 5 * 1024 * 1024  # 5MB
        photo_file.seek(0, 2)  # Seek to end
        file_size = photo_file.tell()
        photo_file.seek(0)  # Reset to beginning
        
        if file_size > max_size:
            return jsonify({'error': 'File size too large. Maximum 5MB allowed'}), 400
        
        # Read file bytes
        file_bytes = photo_file.read()
        filename = photo_file.filename
        
        # Get maintenance_id from form data (optional for pre-creation uploads)
        maintenance_id = request.form.get('maintenance_id', 'temp')
        
        # Upload photo to Firebase Storage
        photo_url = storage_service.upload_maintenance_photo(
            user_id=current_user.id,
            maintenance_request_id=maintenance_id,
            file_bytes=file_bytes,
            filename=filename
        )
        
        if not photo_url:
            return jsonify({'error': 'Failed to upload photo'}), 500
        
        return jsonify({
            'photo_url': photo_url,
            'message': 'Photo uploaded successfully'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Upload maintenance photo error: {str(e)}")
        return jsonify({'error': 'Failed to upload photo', 'message': str(e)}), 500