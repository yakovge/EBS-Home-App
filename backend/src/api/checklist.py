"""
Exit checklist API endpoints.
Handles photo uploads and checklist submissions for house exit.
"""

from flask import Blueprint, request, jsonify, current_app
from typing import Dict, Any, List

from ..services.checklist_service import ChecklistService
from ..services.booking_service import BookingService
from ..services.storage_service import StorageService
from ..middleware.auth import require_auth
from ..utils.validators import validate_request_data, validate_photo_data
from ..utils.exceptions import ValidationError, ResourceNotFoundError
from ..models.checklist import PhotoType

checklist_bp = Blueprint('checklist', __name__)
checklist_service = ChecklistService()
booking_service = BookingService()
storage_service = StorageService()


@checklist_bp.route('/', methods=['GET'])
@require_auth
def list_checklists(current_user):
    """
    List exit checklists with optional filtering.
    Query params: user_id, booking_id, limit, offset
    """
    try:
        filters = {}
        
        if request.args.get('user_id'):
            filters['user_id'] = request.args.get('user_id')
        
        if request.args.get('booking_id'):
            filters['booking_id'] = request.args.get('booking_id')
        
        # Pagination
        limit = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))
        
        checklists = checklist_service.list_checklists(
            filters=filters,
            order_by='-submitted_at',
            limit=limit,
            offset=offset
        )
        
        return jsonify({
            'checklists': [checklist.to_dict() for checklist in checklists],
            'total': len(checklists),
            'limit': limit,
            'offset': offset
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"List checklists error: {str(e)}")
        return jsonify({'error': 'Failed to list checklists', 'message': str(e)}), 500


@checklist_bp.route('/', methods=['POST'])
@require_auth
def create_checklist(current_user):
    """
    Create new exit checklist.
    Expects: { booking_id, photos: [{ photo_type, photo_url, notes }] }
    """
    try:
        data = validate_request_data(request.json, {
            'booking_id': {'type': str, 'required': True},
            'photos': {'type': list, 'required': True}
        })
        
        # Verify booking exists and belongs to user
        booking = booking_service.get_booking(data['booking_id'])
        if booking.user_id != current_user.id:
            return jsonify({
                'error': 'Permission denied',
                'message': 'You can only create checklists for your own bookings'
            }), 403
        
        # Validate photos
        required_photos = {
            PhotoType.REFRIGERATOR.value: 2,
            PhotoType.FREEZER.value: 2,
            PhotoType.CLOSET.value: 3
        }
        validate_photo_data(data['photos'], required_photos)
        
        # Create checklist
        checklist = checklist_service.create_checklist(
            user_id=current_user.id,
            user_name=current_user.name,
            booking_id=data['booking_id'],
            photos=data['photos']
        )
        
        # Update booking with checklist completion
        booking_service.mark_checklist_completed(
            booking_id=data['booking_id'],
            checklist_id=checklist.id
        )
        
        return jsonify({
            'message': 'Exit checklist submitted successfully',
            'checklist': checklist.to_dict()
        }), 201
        
    except (ValueError, ValidationError) as e:
        return jsonify({'error': 'Validation error', 'message': str(e)}), 400
    except ResourceNotFoundError as e:
        return jsonify({'error': 'Resource not found', 'message': str(e)}), 404
    except Exception as e:
        current_app.logger.error(f"Create checklist error: {str(e)}")
        return jsonify({'error': 'Failed to create checklist', 'message': str(e)}), 500


@checklist_bp.route('/<checklist_id>', methods=['GET'])
@require_auth
def get_checklist(current_user, checklist_id):
    """Get specific checklist by ID."""
    try:
        checklist = checklist_service.get_checklist(checklist_id)
        return jsonify(checklist.to_dict()), 200
        
    except ResourceNotFoundError:
        return jsonify({'error': 'Checklist not found'}), 404
    except Exception as e:
        current_app.logger.error(f"Get checklist error: {str(e)}")
        return jsonify({'error': 'Failed to get checklist', 'message': str(e)}), 500


@checklist_bp.route('/upload-url', methods=['POST'])
@require_auth
def get_upload_url(current_user):
    """
    Get signed URL for photo upload.
    Expects: { filename, content_type }
    """
    try:
        data = validate_request_data(request.json, {
            'filename': {'type': str, 'required': True},
            'content_type': {'type': str, 'required': True}
        })
        
        # Validate content type is image
        if not data['content_type'].startswith('image/'):
            return jsonify({
                'error': 'Invalid content type',
                'message': 'Only image files are allowed'
            }), 400
        
        # Generate upload URL
        upload_info = storage_service.generate_upload_url(
            filename=data['filename'],
            content_type=data['content_type'],
            user_id=current_user.id
        )
        
        return jsonify(upload_info), 200
        
    except ValueError as e:
        return jsonify({'error': 'Validation error', 'message': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Generate upload URL error: {str(e)}")
        return jsonify({'error': 'Failed to generate upload URL', 'message': str(e)}), 500


@checklist_bp.route('/requirements', methods=['GET'])
@require_auth
def get_checklist_requirements(current_user):
    """Get checklist photo requirements."""
    return jsonify({
        'requirements': {
            'refrigerator': {
                'count': 2,
                'description': 'Photos of refrigerator contents'
            },
            'freezer': {
                'count': 2,
                'description': 'Photos of freezer contents'
            },
            'closet': {
                'count': 3,
                'description': 'Photos of closets'
            }
        },
        'notes': {
            'required': True,
            'min_length': 5,
            'description': 'Describe what is present or missing in each photo'
        }
    }), 200