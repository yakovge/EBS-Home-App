"""
Maintenance request API endpoints.
Handles creating, updating, and managing maintenance requests.
"""

from flask import Blueprint, request, jsonify, current_app
from typing import Dict, Any

from ..services.maintenance_service import MaintenanceService
from ..services.notification_service import NotificationService
from ..middleware.auth import require_auth, require_maintenance_person
from ..utils.validators import validate_request_data

maintenance_bp = Blueprint('maintenance', __name__)
maintenance_service = MaintenanceService()
notification_service = NotificationService()


@maintenance_bp.route('/', methods=['GET'])
@require_auth
def list_maintenance_requests(current_user):
    """
    List maintenance requests with optional filtering.
    Query params: status, assigned_to_id, limit, offset
    """
    try:
        filters = {}
        
        # Apply filters based on query params
        if request.args.get('status'):
            filters['status'] = request.args.get('status')
        
        if request.args.get('assigned_to_id'):
            filters['assigned_to_id'] = request.args.get('assigned_to_id')
        
        # Pagination
        limit = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))
        
        requests = maintenance_service.list_requests(
            filters=filters,
            limit=limit,
            offset=offset
        )
        
        return jsonify({
            'requests': [req.to_dict() for req in requests],
            'total': len(requests),
            'limit': limit,
            'offset': offset
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"List maintenance requests error: {str(e)}")
        return jsonify({'error': 'Failed to list requests', 'message': str(e)}), 500


@maintenance_bp.route('/', methods=['POST'])
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
            'photo_urls': {'type': list, 'required': True}
        })
        
        # Create request
        maintenance_request = maintenance_service.create_request(
            reporter_id=current_user.id,
            reporter_name=current_user.name,
            description=data['description'],
            location=data['location'],
            photo_urls=data['photo_urls']
        )
        
        # Send notification to maintenance person
        notification_service.notify_maintenance_person(maintenance_request)
        
        return jsonify({
            'message': 'Maintenance request created successfully',
            'request': maintenance_request.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({'error': 'Validation error', 'message': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Create maintenance request error: {str(e)}")
        return jsonify({'error': 'Failed to create request', 'message': str(e)}), 500


@maintenance_bp.route('/<request_id>', methods=['GET'])
@require_auth
def get_maintenance_request(current_user, request_id):
    """Get specific maintenance request by ID."""
    try:
        maintenance_request = maintenance_service.get_request(request_id)
        return jsonify(maintenance_request.to_dict()), 200
        
    except ResourceNotFoundError:
        return jsonify({'error': 'Request not found'}), 404
    except Exception as e:
        current_app.logger.error(f"Get maintenance request error: {str(e)}")
        return jsonify({'error': 'Failed to get request', 'message': str(e)}), 500


@maintenance_bp.route('/<request_id>/assign', methods=['POST'])
@require_auth
@require_maintenance_person
def assign_maintenance_request(current_user, request_id):
    """
    Assign maintenance request to a user.
    Maintenance person only endpoint.
    """
    try:
        maintenance_request = maintenance_service.assign_request(
            request_id=request_id,
            assigned_to_id=current_user.id,
            assigned_to_name=current_user.name
        )
        
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
@require_maintenance_person
def complete_maintenance_request(current_user, request_id):
    """
    Mark maintenance request as completed.
    Expects: { resolution_notes }
    """
    try:
        data = validate_request_data(request.json, {
            'resolution_notes': {'type': str, 'required': True, 'min_length': 5}
        })
        
        maintenance_request = maintenance_service.complete_request(
            request_id=request_id,
            resolution_notes=data['resolution_notes']
        )
        
        # Send notification to Yaffa
        notification_service.notify_yaffa_completion(maintenance_request)
        
        return jsonify({
            'message': 'Request completed successfully',
            'request': maintenance_request.to_dict()
        }), 200
        
    except ValueError as e:
        return jsonify({'error': 'Validation error', 'message': str(e)}), 400
    except ResourceNotFoundError:
        return jsonify({'error': 'Request not found'}), 404
    except Exception as e:
        current_app.logger.error(f"Complete maintenance request error: {str(e)}")
        return jsonify({'error': 'Failed to complete request', 'message': str(e)}), 500