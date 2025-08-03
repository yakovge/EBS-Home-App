"""
Global error handler for the Flask application.
Provides consistent error responses and logging.
"""

from flask import jsonify, current_app
from werkzeug.exceptions import HTTPException
from ..utils.exceptions import AppException


def register_error_handlers(app):
    """
    Register error handlers for the Flask application.
    Handles both custom AppException and standard HTTP exceptions.
    """
    
    @app.errorhandler(AppException)
    def handle_app_exception(e: AppException):
        """Handle custom application exceptions."""
        response = {
            'error': e.__class__.__name__,
            'message': e.message
        }
        
        if e.details:
            response['details'] = e.details
        
        current_app.logger.error(
            f"{e.__class__.__name__}: {e.message}",
            extra={'details': e.details}
        )
        
        return jsonify(response), e.status_code
    
    @app.errorhandler(HTTPException)
    def handle_http_exception(e: HTTPException):
        """Handle standard HTTP exceptions."""
        response = {
            'error': e.name,
            'message': e.description
        }
        
        return jsonify(response), e.code
    
    @app.errorhandler(404)
    def handle_not_found(e):
        """Handle 404 errors."""
        return jsonify({
            'error': 'Not Found',
            'message': 'The requested resource was not found'
        }), 404
    
    @app.errorhandler(500)
    def handle_internal_error(e):
        """Handle 500 errors."""
        current_app.logger.error(f"Internal server error: {str(e)}")
        
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred. Please try again later.'
        }), 500
    
    @app.errorhandler(Exception)
    def handle_unexpected_error(e: Exception):
        """Handle any unexpected exceptions."""
        current_app.logger.error(
            f"Unexpected error: {str(e)}",
            exc_info=True
        )
        
        # In production, don't expose internal error details
        if current_app.debug:
            message = str(e)
        else:
            message = 'An unexpected error occurred'
        
        return jsonify({
            'error': 'UnexpectedError',
            'message': message
        }), 500