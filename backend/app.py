"""
Main Flask application entry point for EBS Home API.
This file initializes and configures the Flask application.
"""

import os
from flask import Flask, request
from dotenv import load_dotenv

from src.api import auth_bp, maintenance_bp, booking_bp, checklist_bp, user_bp, dashboard_bp
from src.utils.firebase_config import initialize_firebase
from src.middleware.error_handler import register_error_handlers
from src.middleware.auth import setup_auth_middleware

# Load environment variables
load_dotenv()


def create_app():
    """
    Create and configure the Flask application.
    Returns a configured Flask app instance.
    """
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['CORS_ORIGINS'] = os.getenv('FRONTEND_URL', 'http://localhost:3001')
    
    # Initialize Firebase
    initialize_firebase()
    
    # Setup middleware
    setup_auth_middleware(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Manual CORS setup (Flask-CORS seems to have conflicts)
    print(f"Setting up manual CORS for origin: {app.config['CORS_ORIGINS']}")
    
    @app.after_request
    def after_request(response):
        # Temporary CORS fix - allow all origins for local development
        origin = request.headers.get('Origin')
        if origin:
            response.headers.add('Access-Control-Allow-Origin', origin)
        else:
            response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    @app.route('/api/<path:path>', methods=['OPTIONS'])
    def handle_options(path):
        response = app.response_class()
        origin = request.headers.get('Origin')
        if origin:
            response.headers.add('Access-Control-Allow-Origin', origin)
        else:
            response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(maintenance_bp, url_prefix='/api/maintenance')
    app.register_blueprint(booking_bp, url_prefix='/api/bookings')
    app.register_blueprint(checklist_bp, url_prefix='/api/checklists')
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'service': 'EBS Home API'}, 200
    
    # Test endpoint to debug 500 error
    @app.route('/api/test', methods=['GET', 'POST'])
    def test_endpoint():
        print("=== TEST ENDPOINT REACHED ===")
        return {'message': 'Test endpoint working', 'method': request.method}, 200
    
    return app


if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 5000))
    host = os.getenv('HOST', '0.0.0.0')
    app.run(host=host, port=port, debug=os.getenv('FLASK_DEBUG', 'False') == 'True')