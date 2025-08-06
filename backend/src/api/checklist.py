"""
Exit checklist API endpoints.
Handles photo uploads and checklist submissions for house exit.
"""

from flask import Blueprint, request, jsonify, current_app
from typing import Dict, Any, List

from ..services.checklist_service import ChecklistService
from ..services.storage_service import StorageService
from ..middleware.auth import require_auth
from ..utils.validators import validate_request_data
from ..utils.exceptions import ValidationError, ResourceNotFoundError

checklist_bp = Blueprint('checklist', __name__)
checklist_service = ChecklistService()
storage_service = StorageService()


@checklist_bp.route('', methods=['GET'])
@require_auth
def list_checklists(current_user):
    """
    List exit checklists.
    """
    try:
        checklists = checklist_service.get_checklists()
        return jsonify([checklist.to_dict() for checklist in checklists]), 200
        
    except Exception as e:
        current_app.logger.error(f"List checklists error: {str(e)}")
        return jsonify({'error': 'Failed to list checklists', 'message': str(e)}), 500


@checklist_bp.route('', methods=['POST'])
@require_auth
def create_checklist(current_user):
    """
    Create new exit checklist.
    Expects: { booking_id }
    """
    try:
        data = validate_request_data(request.json, {
            'booking_id': {'type': str, 'required': False}
        })
        
        # Create checklist
        checklist_id = checklist_service.create_checklist(
            user_id=current_user.id,
            booking_id=data.get('booking_id')
        )
        
        # Get the created checklist to return
        checklist = checklist_service.get_checklist_by_id(checklist_id)
        
        return jsonify(checklist.to_dict()), 201
        
    except (ValueError, ValidationError) as e:
        current_app.logger.warning(f"Create checklist validation error: {str(e)}")
        return jsonify({'error': 'Validation error', 'message': str(e)}), 400
    except Exception as e:
        import traceback
        current_app.logger.error(f"Create checklist unexpected error: {str(e)}")
        current_app.logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to create checklist', 'message': str(e)}), 500


@checklist_bp.route('/<checklist_id>', methods=['GET'])
@require_auth
def get_checklist(current_user, checklist_id):
    """Get specific checklist by ID."""
    try:
        checklist = checklist_service.get_checklist_by_id(checklist_id)
        return jsonify(checklist.to_dict()), 200
        
    except ResourceNotFoundError:
        return jsonify({'error': 'Checklist not found'}), 404
    except Exception as e:
        current_app.logger.error(f"Get checklist error: {str(e)}")
        return jsonify({'error': 'Failed to get checklist', 'message': str(e)}), 500


@checklist_bp.route('/<checklist_id>/entries', methods=['POST'])
@require_auth
def add_entry_to_checklist(current_user, checklist_id):
    """
    Add entry (text or photo) to checklist.
    Photos are now optional - only notes are required.
    Expects: { photo_type, notes, photo_url? }
    """
    try:
        data = validate_request_data(request.json, {
            'photo_type': {'type': str, 'required': True},
            'notes': {'type': str, 'required': True},
            'photo_url': {'type': str, 'required': False}
        })
        
        # Add entry to checklist (text-only or with photo)
        success = checklist_service.add_entry_to_checklist(
            checklist_id=checklist_id,
            photo_type=data['photo_type'],
            notes=data['notes'],
            photo_url=data.get('photo_url')  # Optional
        )
        
        if not success:
            return jsonify({'error': 'Failed to add entry'}), 400
        
        entry_type = "photo entry" if data.get('photo_url') else "text entry"
        return jsonify({'message': f'Checklist {entry_type} added successfully'}), 200
        
    except (ValueError, ValidationError) as e:
        current_app.logger.warning(f"Add entry validation error: {str(e)}")
        return jsonify({'error': 'Validation error', 'message': str(e)}), 400
    except ResourceNotFoundError:
        return jsonify({'error': 'Checklist not found'}), 404
    except Exception as e:
        import traceback
        current_app.logger.error(f"Add entry unexpected error: {str(e)}")
        current_app.logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to add entry', 'message': str(e)}), 500


@checklist_bp.route('/<checklist_id>/photos', methods=['POST'])
@require_auth
def add_photo_to_checklist(current_user, checklist_id):
    """
    Legacy endpoint for adding photos to checklist.
    Expects: { photo_type, photo_url, notes }
    """
    try:
        data = validate_request_data(request.json, {
            'photo_type': {'type': str, 'required': True},
            'photo_url': {'type': str, 'required': True},
            'notes': {'type': str, 'required': True}
        })
        
        # Add photo to checklist (backward compatibility)
        success = checklist_service.add_photo_to_checklist(
            checklist_id=checklist_id,
            photo_type=data['photo_type'],
            photo_url=data['photo_url'],
            notes=data['notes']
        )
        
        if not success:
            return jsonify({'error': 'Failed to add photo'}), 400
        
        return jsonify({'message': 'Photo added successfully'}), 200
        
    except (ValueError, ValidationError) as e:
        current_app.logger.warning(f"Add photo validation error: {str(e)}")
        return jsonify({'error': 'Validation error', 'message': str(e)}), 400
    except ResourceNotFoundError:
        return jsonify({'error': 'Checklist not found'}), 404
    except Exception as e:
        import traceback
        current_app.logger.error(f"Add photo unexpected error: {str(e)}")
        current_app.logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to add photo', 'message': str(e)}), 500


@checklist_bp.route('/<checklist_id>/submit', methods=['POST'])
@require_auth
def submit_checklist(current_user, checklist_id):
    """
    Submit checklist for completion.
    """
    try:
        # Submit checklist
        success = checklist_service.submit_checklist(checklist_id)
        
        if not success:
            return jsonify({'error': 'Failed to submit checklist'}), 400
        
        # Get the submitted checklist to return
        checklist = checklist_service.get_checklist_by_id(checklist_id)
        
        return jsonify({
            'message': 'Checklist submitted successfully',
            'checklist': checklist.to_dict()
        }), 200
        
    except (ValueError, ValidationError) as e:
        current_app.logger.warning(f"Submit checklist validation error: {str(e)}")
        return jsonify({'error': 'Validation error', 'message': str(e)}), 400
    except ResourceNotFoundError:
        return jsonify({'error': 'Checklist not found'}), 404
    except Exception as e:
        import traceback
        current_app.logger.error(f"Submit checklist unexpected error: {str(e)}")
        current_app.logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to submit checklist', 'message': str(e)}), 500


@checklist_bp.route('/<checklist_id>/important-notes', methods=['PUT'])
@require_auth
def update_important_notes(current_user, checklist_id):
    """
    Update important notes for a checklist.
    Expects: { important_notes }
    """
    try:
        data = validate_request_data(request.json, {
            'important_notes': {'type': str, 'required': True}
        })
        
        # Update important notes
        update_data = {
            'important_notes': data['important_notes']
        }
        
        success = checklist_service.update_checklist(checklist_id, update_data)
        
        if not success:
            return jsonify({'error': 'Failed to update important notes'}), 400
        
        return jsonify({'message': 'Important notes updated successfully'}), 200
        
    except (ValueError, ValidationError) as e:
        current_app.logger.warning(f"Update important notes validation error: {str(e)}")
        return jsonify({'error': 'Validation error', 'message': str(e)}), 400
    except ResourceNotFoundError:
        return jsonify({'error': 'Checklist not found'}), 404
    except Exception as e:
        import traceback
        current_app.logger.error(f"Update important notes unexpected error: {str(e)}")
        current_app.logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to update important notes', 'message': str(e)}), 500


@checklist_bp.route('/upload-photo', methods=['POST'])
@require_auth
def upload_checklist_photo(current_user):
    """
    Upload a photo for checklist items.
    Expects multipart form data with 'photo' file, 'photo_type', and optional 'checklist_id'.
    Returns the photo URL for use in checklist photo addition.
    """
    try:
        # Check if photo file is present
        if 'photo' not in request.files:
            return jsonify({'error': 'No photo file provided'}), 400
        
        photo_file = request.files['photo']
        if photo_file.filename == '':
            return jsonify({'error': 'No photo file selected'}), 400
        
        # Get photo_type from form data
        photo_type = request.form.get('photo_type')
        if not photo_type:
            return jsonify({'error': 'photo_type is required'}), 400
        
        # Validate photo_type
        allowed_types = {'refrigerator', 'freezer', 'closet'}
        if photo_type not in allowed_types:
            return jsonify({'error': f'Invalid photo_type. Must be one of: {", ".join(allowed_types)}'}), 400
        
        # Validate file type and size
        allowed_file_types = {'image/jpeg', 'image/jpg', 'image/png', 'image/webp'}
        if photo_file.content_type not in allowed_file_types:
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
        
        # Get checklist_id from form data (optional for pre-creation uploads)
        checklist_id = request.form.get('checklist_id', 'temp')
        
        # Upload photo to Firebase Storage
        photo_url = storage_service.upload_checklist_photo(
            user_id=current_user.id,
            checklist_id=checklist_id,
            photo_type=photo_type,
            file_bytes=file_bytes,
            filename=filename
        )
        
        if not photo_url:
            return jsonify({'error': 'Failed to upload photo'}), 500
        
        return jsonify({
            'photo_url': photo_url,
            'photo_type': photo_type,
            'message': 'Photo uploaded successfully'
        }), 200
        
    except Exception as e:
        import traceback
        current_app.logger.error(f"Upload checklist photo error: {str(e)}")
        current_app.logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to upload photo', 'message': str(e)}), 500