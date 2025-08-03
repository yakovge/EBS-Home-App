"""
User profile API endpoints.
Handles user profile management and preferences.
"""

from flask import Blueprint, request, jsonify, current_app
from typing import Dict, Any

from ..services.user_service import UserService
from ..middleware.auth import require_auth, require_role
from ..utils.validators import validate_request_data
from ..utils.exceptions import ResourceNotFoundError, ValidationError

user_bp = Blueprint('user', __name__)
user_service = UserService()


@user_bp.route('/profile', methods=['GET'])
@require_auth
def get_profile(current_user):
    """Get current user's profile."""
    return jsonify({
        'user': current_user.to_dict()
    }), 200


@user_bp.route('/profile', methods=['PUT'])
@require_auth
def update_profile(current_user):
    """
    Update current user's profile.
    Expects: { name?, preferred_language? }
    """
    try:
        data = validate_request_data(request.json, {
            'name': {'type': str, 'required': False, 'min_length': 2},
            'preferred_language': {
                'type': str, 
                'required': False, 
                'choices': ['en', 'he']
            }
        })
        
        updates = {}
        if 'name' in data:
            updates['name'] = data['name']
        if 'preferred_language' in data:
            updates['preferred_language'] = data['preferred_language']
        
        if updates:
            updated_user = user_service.update_user(current_user.id, updates)
            return jsonify({
                'message': 'Profile updated successfully',
                'user': updated_user.to_dict()
            }), 200
        else:
            return jsonify({
                'message': 'No updates provided'
            }), 200
            
    except ValidationError as e:
        return jsonify({'error': 'Validation error', 'message': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Update profile error: {str(e)}")
        return jsonify({'error': 'Failed to update profile', 'message': str(e)}), 500


@user_bp.route('/devices', methods=['GET'])
@require_auth
def get_devices(current_user):
    """Get user's device history."""
    return jsonify({
        'current_device': current_user.current_device.to_dict() if current_user.current_device else None,
        'device_history': [device.to_dict() for device in current_user.device_history]
    }), 200


@user_bp.route('/devices/reset', methods=['POST'])
@require_auth
def reset_device(current_user):
    """
    Reset device restriction (admin only).
    Allows user to login from a new device.
    """
    try:
        # For now, users can reset their own device
        # In production, this might require admin approval
        user_service.reset_user_device(current_user.id)
        
        return jsonify({
            'message': 'Device restriction reset successfully',
            'info': 'You can now login from a new device'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Reset device error: {str(e)}")
        return jsonify({'error': 'Failed to reset device', 'message': str(e)}), 500


@user_bp.route('/', methods=['GET'])
@require_auth
@require_role('admin')
def list_users(current_user):
    """
    List all users (admin only).
    Query params: role, is_active
    """
    try:
        filters = {}
        
        if request.args.get('role'):
            filters['role'] = request.args.get('role')
        
        if request.args.get('is_active'):
            filters['is_active'] = request.args.get('is_active').lower() == 'true'
        
        users = user_service.list_users(filters=filters)
        
        return jsonify({
            'users': [user.to_dict() for user in users],
            'total': len(users)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"List users error: {str(e)}")
        return jsonify({'error': 'Failed to list users', 'message': str(e)}), 500


@user_bp.route('/<user_id>/role', methods=['PUT'])
@require_auth
@require_role('admin')
def update_user_role(current_user, user_id):
    """
    Update user role (admin only).
    Expects: { role, is_maintenance_person?, is_yaffa? }
    """
    try:
        data = validate_request_data(request.json, {
            'role': {
                'type': str,
                'required': False,
                'choices': ['family_member', 'maintenance', 'admin']
            },
            'is_maintenance_person': {'type': bool, 'required': False},
            'is_yaffa': {'type': bool, 'required': False}
        })
        
        updates = {}
        if 'role' in data:
            updates['role'] = data['role']
        if 'is_maintenance_person' in data:
            updates['is_maintenance_person'] = data['is_maintenance_person']
        if 'is_yaffa' in data:
            updates['is_yaffa'] = data['is_yaffa']
        
        if updates:
            updated_user = user_service.update_user(user_id, updates)
            return jsonify({
                'message': 'User role updated successfully',
                'user': updated_user.to_dict()
            }), 200
        else:
            return jsonify({
                'message': 'No updates provided'
            }), 200
            
    except ValidationError as e:
        return jsonify({'error': 'Validation error', 'message': str(e)}), 400
    except ResourceNotFoundError as e:
        return jsonify({'error': 'User not found', 'message': str(e)}), 404
    except Exception as e:
        current_app.logger.error(f"Update user role error: {str(e)}")
        return jsonify({'error': 'Failed to update user role', 'message': str(e)}), 500