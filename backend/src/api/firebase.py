"""
Firebase health check and configuration endpoints.
Provides endpoints for monitoring Firebase service status.
"""

from flask import Blueprint, jsonify
from ..utils.firebase_config import (
    get_firebase_status, 
    get_environment_info, 
    is_firebase_available,
    validate_environment
)

firebase_bp = Blueprint('firebase', __name__)


@firebase_bp.route('/health', methods=['GET'])
def firebase_health():
    """
    Get Firebase services health status.
    
    Returns:
        JSON response with detailed status of all Firebase services
    """
    try:
        status = get_firebase_status()
        
        # Determine overall health
        overall_healthy = status['initialized'] and not status['error']
        if overall_healthy and status['services']:
            # Check if all services are available
            for service_name, service_status in status['services'].items():
                if not service_status['available']:
                    overall_healthy = False
                    break
        
        response_data = {
            'healthy': overall_healthy,
            'firebase': status,
            'timestamp': None  # Will be set by Flask
        }
        
        status_code = 200 if overall_healthy else 503
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'healthy': False,
            'error': f'Health check failed: {str(e)}',
            'firebase': {
                'initialized': False,
                'error': str(e),
                'services': {}
            }
        }), 500


@firebase_bp.route('/config/validate', methods=['GET'])
def validate_config():
    """
    Validate Firebase configuration without initializing services.
    
    Returns:
        JSON response with configuration validation results
    """
    try:
        validation = validate_environment()
        env_info = get_environment_info()
        
        response_data = {
            'valid': validation['valid'],
            'validation': validation,
            'environment': env_info,
            'firebase_available': is_firebase_available()
        }
        
        status_code = 200 if validation['valid'] else 400
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'valid': False,
            'error': f'Configuration validation failed: {str(e)}',
            'validation': {
                'valid': False,
                'missing_vars': ['unknown'],
                'warnings': []
            },
            'environment': {},
            'firebase_available': False
        }), 500


@firebase_bp.route('/services/status', methods=['GET'])
def services_status():
    """
    Get detailed status of individual Firebase services.
    
    Returns:
        JSON response with status of Firestore, Storage, and Auth services
    """
    try:
        status = get_firebase_status()
        
        # Extract just the services information
        services_info = status.get('services', {})
        
        # Add summary
        summary = {
            'total_services': len(services_info),
            'available_services': sum(1 for s in services_info.values() if s['available']),
            'unavailable_services': sum(1 for s in services_info.values() if not s['available']),
            'all_available': all(s['available'] for s in services_info.values()) if services_info else False
        }
        
        response_data = {
            'summary': summary,
            'services': services_info,
            'firebase_initialized': status['initialized']
        }
        
        status_code = 200 if summary['all_available'] else 503
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'summary': {
                'total_services': 0,
                'available_services': 0,
                'unavailable_services': 0,
                'all_available': False
            },
            'services': {},
            'firebase_initialized': False,
            'error': str(e)
        }), 500


@firebase_bp.route('/info', methods=['GET'])
def firebase_info():
    """
    Get Firebase configuration information (non-sensitive).
    
    Returns:
        JSON response with Firebase project and configuration details
    """
    try:
        env_info = get_environment_info()
        
        # Filter out sensitive information
        safe_info = {
            'project_id': env_info['firebase_project'],
            'storage_bucket': env_info['storage_bucket'],
            'service_account_file_exists': env_info['service_account_file']['exists'],
            'service_account_valid': env_info['service_account_file']['valid'],
            'environment_variables_count': len([
                var for var, info in env_info['environment_variables'].items() 
                if info['set']
            ]),
            'firebase_available': is_firebase_available()
        }
        
        return jsonify(safe_info), 200
        
    except Exception as e:
        return jsonify({
            'project_id': None,
            'storage_bucket': None,
            'service_account_file_exists': False,
            'service_account_valid': False,
            'environment_variables_count': 0,
            'firebase_available': False,
            'error': str(e)
        }), 500