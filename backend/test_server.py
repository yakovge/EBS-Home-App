"""
Simple test server for API validation without Firebase dependencies
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
import hashlib
from datetime import datetime, timedelta
import os
import json
from pathlib import Path

app = Flask(__name__)
CORS(app, origins=["*"])

@app.before_request
def log_request_info():
    print(f"REQUEST: {request.method} {request.path}")

@app.after_request  
def log_response_info(response):
    print(f"RESPONSE: {response.status_code} - {response.content_type}")
    return response

# Persistent storage file - use absolute path
import sys
SCRIPT_DIR = Path(os.path.dirname(os.path.abspath(sys.argv[0] if sys.argv else __file__)))
DATA_FILE = SCRIPT_DIR / 'backend_data.json'

# Initialize or load data store
def load_data():
    print(f"Loading data from: {DATA_FILE}")
    print(f"File exists: {DATA_FILE.exists()}")
    if DATA_FILE.exists():
        try:
            with open(DATA_FILE, 'r') as f:
                data = json.load(f)
                print(f"Data loaded successfully: {len(data.get('bookings', []))} bookings, {len(data.get('maintenance', []))} maintenance")
                return data
        except Exception as e:
            print(f"Error loading data: {e}")
    
    # Default data structure
    return {
        'maintenance': [],
        'bookings': [],
        'checklists': [],
        'users': {
            'test_user_123': {
                'id': 'test_user_123',
                'name': 'Test User',
                'email': 'test@eisenberg.family',
                'role': 'family_member',
                'preferredLanguage': 'en',
                'isActive': True,
                'deviceHistory': [],
                'firebaseUid': 'test_firebase_uid',
                'isYaffa': False,
                'isMaintenancePerson': False,
                'createdAt': datetime.now().isoformat(),
                'updatedAt': datetime.now().isoformat()
            }
        }
    }

def save_data():
    try:
        with open(DATA_FILE, 'w') as f:
            json.dump(data_store, f, indent=2)
        print(f"Data saved to {DATA_FILE}")
    except Exception as e:
        print(f"Error saving data: {e}")

# Load data on startup
data_store = load_data()

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'message': 'Test server running',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    token = data.get('token')
    
    # Simple token validation for testing
    if token and len(token.strip()) > 5:
        return jsonify({
            'success': True,
            'token': f'session_{uuid.uuid4().hex}',
            'user': data_store['users']['test_user_123']
        })
    
    return jsonify({
        'success': False,
        'error': 'Invalid token'
    }), 401

@app.route('/api/auth/verify', methods=['GET'])
def verify():
    auth_header = request.headers.get('Authorization')
    
    if auth_header and auth_header.startswith('Bearer '):
        return jsonify({
            'valid': True,
            'user': data_store['users']['test_user_123']
        })
    
    return jsonify({
        'valid': False,
        'error': 'Invalid session'
    }), 401

@app.route('/api/maintenance', methods=['GET', 'POST'])
def maintenance():
    if request.method == 'GET':
        print(f"GET /maintenance - returning {len(data_store['maintenance'])} items")
        return jsonify(data_store['maintenance'])
    
    elif request.method == 'POST':
        # Get user info from auth header
        auth_header = request.headers.get('Authorization')
        user_id = 'anonymous_user'
        user_name = 'Anonymous User'
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.replace('Bearer ', '')
            if token and len(token) > 10:
                user_id = 'user_' + hashlib.md5(token.encode()).hexdigest()[:8]
                user_name = f'User {user_id[-4:]}'
        
        data = request.get_json()
        
        maintenance_item = {
            'id': str(uuid.uuid4()),
            'description': data.get('description', ''),
            'location': data.get('location', ''),
            'photo_urls': data.get('photo_urls', []),
            'status': 'pending',
            'priority': 'medium',
            'user_id': user_id,
            'user_name': user_name,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        data_store['maintenance'].append(maintenance_item)
        save_data()  # Persist after adding
        
        return jsonify(maintenance_item), 201

@app.route('/api/bookings', methods=['GET', 'POST'])
def bookings():
    if request.method == 'GET':
        # For debugging, return all bookings regardless of auth
        # In production, this would filter by user_id from auth header
        print(f"GET /bookings - returning {len(data_store['bookings'])} bookings")
        return jsonify(data_store['bookings'])
    
    elif request.method == 'POST':
        # Get user info from auth header
        auth_header = request.headers.get('Authorization')
        user_id = 'anonymous_user'
        user_name = 'Anonymous User'
        
        if auth_header and auth_header.startswith('Bearer '):
            # Extract user info from token (simplified for test)
            token = auth_header.replace('Bearer ', '')
            if token and len(token) > 10:
                # Generate consistent user ID from token
                user_id = 'user_' + hashlib.md5(token.encode()).hexdigest()[:8]
                user_name = f'User {user_id[-4:]}'
        
        data = request.get_json()
        
        booking_item = {
            'id': str(uuid.uuid4()),
            'start_date': data.get('start_date', ''),
            'end_date': data.get('end_date', ''),
            'guest_name': data.get('guest_name', ''),
            'guest_count': data.get('guest_count', 1),
            'notes': data.get('notes', ''),
            'status': 'confirmed',
            'user_id': user_id,
            'user_name': user_name,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        data_store['bookings'].append(booking_item)
        save_data()  # Persist after adding
        
        return jsonify(booking_item), 201

@app.route('/api/bookings/<booking_id>', methods=['DELETE', 'PUT'])
def booking_operations(booking_id):
    if request.method == 'DELETE':
        # Delete/cancel booking
        auth_header = request.headers.get('Authorization')
        user_id = 'anonymous_user'
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.replace('Bearer ', '')
            if token and len(token) > 10:
                user_id = 'user_' + hashlib.md5(token.encode()).hexdigest()[:8]
        
        # Find and remove the booking
        booking_to_remove = None
        found_booking = None
        for i, booking in enumerate(data_store['bookings']):
            if booking['id'] == booking_id:
                found_booking = booking
                if booking['user_id'] == user_id:
                    booking_to_remove = i
                    break
        
        if booking_to_remove is not None:
            removed_booking = data_store['bookings'].pop(booking_to_remove)
            save_data()
            print(f"Booking {booking_id} cancelled by {user_id}")
            return jsonify({'message': 'Booking cancelled successfully', 'booking': removed_booking}), 200
        elif found_booking:
            print(f"Authorization failed: booking {booking_id} belongs to {found_booking['user_id']} but request from {user_id}")
            return jsonify({
                'error': 'Unauthorized: You can only cancel your own bookings',
                'booking_owner': found_booking['user_id'],
                'requesting_user': user_id
            }), 403
        else:
            print(f"Booking {booking_id} not found")
            return jsonify({'error': 'Booking not found'}), 404
    
    elif request.method == 'PUT':
        # Update booking (for cancellation status)
        auth_header = request.headers.get('Authorization')
        user_id = 'anonymous_user'
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.replace('Bearer ', '')
            if token and len(token) > 10:
                user_id = 'user_' + hashlib.md5(token.encode()).hexdigest()[:8]
        
        data = request.get_json()
        
        # Find and update the booking
        for booking in data_store['bookings']:
            if booking['id'] == booking_id and booking['user_id'] == user_id:
                # Update allowed fields
                if 'status' in data:
                    booking['status'] = data['status']
                if 'is_cancelled' in data:
                    booking['is_cancelled'] = data['is_cancelled']
                booking['updated_at'] = datetime.now().isoformat()
                
                save_data()
                print(f"Booking {booking_id} updated by {user_id}: {data}")
                return jsonify(booking), 200
        
        return jsonify({'error': 'Booking not found or unauthorized'}), 404

@app.route('/api/checklists', methods=['GET', 'POST'])
def checklists():
    if request.method == 'GET':
        print(f"GET /checklists - returning {len(data_store['checklists'])} items")
        return jsonify(data_store['checklists'])
    
    elif request.method == 'POST':
        # Get user info from auth header
        auth_header = request.headers.get('Authorization')
        user_id = 'anonymous_user'
        user_name = 'Anonymous User'
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.replace('Bearer ', '')
            if token and len(token) > 10:
                user_id = 'user_' + hashlib.md5(token.encode()).hexdigest()[:8]
                user_name = f'User {user_id[-4:]}'
        
        data = request.get_json()
        
        checklist_item = {
            'id': str(uuid.uuid4()),
            'booking_id': data.get('booking_id', ''),
            'categories': data.get('categories', []),
            'important_notes': data.get('important_notes', ''),
            'status': 'submitted',
            'user_id': user_id,
            'user_name': user_name,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        data_store['checklists'].append(checklist_item)
        save_data()  # Persist after adding
        
        return jsonify(checklist_item), 201

@app.route('/api/maintenance/upload-photo', methods=['POST'])
def upload_maintenance_photo():
    # Mock photo upload for maintenance
    if 'photo' in request.files:
        file = request.files['photo']
        if file.filename:
            # Simulate photo upload
            photo_url = f'http://localhost:5000/uploads/maintenance/{uuid.uuid4()}.jpg'
            return jsonify({'photo_url': photo_url}), 201
    
    return jsonify({'error': 'No photo file provided'}), 400

@app.route('/api/checklists/upload-photo', methods=['POST'])
def upload_checklist_photo():
    # Mock photo upload for checklist
    if 'photo' in request.files:
        file = request.files['photo']
        photo_type = request.form.get('photo_type', 'general')
        
        if file.filename:
            # Simulate photo upload
            photo_url = f'http://localhost:5000/uploads/checklists/{photo_type}_{uuid.uuid4()}.jpg'
            return jsonify({'photo_url': photo_url}), 201
    
    return jsonify({'error': 'No photo file provided'}), 400

@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    return jsonify({
        'summary': {
            'active_bookings': len(data_store['bookings']),
            'pending_maintenance': len([m for m in data_store['maintenance'] if m['status'] == 'pending']),
            'completed_checklists': len(data_store['checklists'])
        },
        'recent_activity': [
            {
                'id': 'activity_1',
                'type': 'maintenance',
                'description': f'New maintenance request: {item["description"][:50]}...',
                'timestamp': item['created_at']
            } for item in data_store['maintenance'][:5]
        ]
    })

@app.errorhandler(404)
def not_found_handler(error):
    print(f"ERROR 404: {request.method} {request.path}")
    return jsonify({
        'error': 'Endpoint not found',
        'method': request.method,
        'path': request.path,
        'available_endpoints': [
            'GET /api/health',
            'GET/POST /api/bookings',
            'DELETE/PUT /api/bookings/<booking_id>',
            'GET/POST /api/maintenance',
            'GET/POST /api/checklists',
            'POST /api/auth/login',
            'GET /api/auth/verify'
        ]
    }), 404

if __name__ == '__main__':
    print("Starting test server on http://localhost:5000")
    print("Endpoints available:")
    print("  GET  /api/health")
    print("  POST /api/auth/login")
    print("  GET  /api/auth/verify")
    print("  GET  /api/maintenance")
    print("  POST /api/maintenance")
    print("  GET  /api/bookings")
    print("  POST /api/bookings")
    print("  GET  /api/checklists")
    print("  POST /api/checklists")
    print("  GET  /api/dashboard")
    
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)