"""
Main Flask application entry point for EBS Home API.
This file initializes and configures the Flask application.
"""

import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from src.api import auth_bp, maintenance_bp, booking_bp, checklist_bp, user_bp
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
    app.config['CORS_ORIGINS'] = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    
    # Initialize CORS
    CORS(app, origins=[app.config['CORS_ORIGINS']], supports_credentials=True)
    
    # Initialize Firebase
    initialize_firebase()
    
    # Setup middleware
    setup_auth_middleware(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(maintenance_bp, url_prefix='/api/maintenance')
    app.register_blueprint(booking_bp, url_prefix='/api/bookings')
    app.register_blueprint(checklist_bp, url_prefix='/api/checklists')
    app.register_blueprint(user_bp, url_prefix='/api/users')
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'service': 'EBS Home API'}, 200
    
    return app


if __name__ == '__main__':
    app = create_app()
    port = int(os.getenv('PORT', 5000))
    host = os.getenv('HOST', '0.0.0.0')
    app.run(host=host, port=port, debug=os.getenv('FLASK_DEBUG', 'False') == 'True')