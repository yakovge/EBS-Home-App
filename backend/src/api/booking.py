"""
Booking calendar API endpoints.
Handles house reservation management and calendar views.
"""

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime, date
from typing import Dict, Any

from ..services.booking_service import BookingService
from ..middleware.auth import require_auth
from ..utils.validators import validate_request_data, validate_date_range
from ..utils.exceptions import ConflictError, ResourceNotFoundError, ValidationError

booking_bp = Blueprint('booking', __name__)
booking_service = BookingService()


@booking_bp.route('', methods=['GET'])
@require_auth
def list_bookings(current_user):
    """
    List bookings with optional date filtering.
    Query params: start_date, end_date, user_id, include_cancelled
    """
    try:
        filters = {}
        
        # Parse date filters
        if request.args.get('start_date'):
            start_date = date.fromisoformat(request.args.get('start_date'))
            filters['end_date'] = {'>=': start_date}
        
        if request.args.get('end_date'):
            end_date = date.fromisoformat(request.args.get('end_date'))
            filters['start_date'] = {'<=': end_date}
        
        # User filter
        if request.args.get('user_id'):
            filters['user_id'] = request.args.get('user_id')
        
        # Include cancelled bookings?
        include_cancelled = request.args.get('include_cancelled', 'false').lower() == 'true'
        if not include_cancelled:
            filters['is_cancelled'] = False
        
        # Simple implementation - get all bookings and filter
        user_filter = filters.get('user_id')
        bookings = booking_service.get_bookings(user_filter)
        
        return jsonify({
            'bookings': [booking.to_dict() for booking in bookings],
            'total': len(bookings)
        }), 200
        
    except ValueError as e:
        return jsonify({'error': 'Invalid date format', 'message': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"List bookings error: {str(e)}")
        return jsonify({'error': 'Failed to list bookings', 'message': str(e)}), 500


@booking_bp.route('', methods=['POST'])
@require_auth
def create_booking(current_user):
    """
    Create new booking.
    Expects: { start_date, end_date, notes? }
    """
    try:
        data = validate_request_data(request.json, {
            'start_date': {'type': str, 'required': True},
            'end_date': {'type': str, 'required': True},
            'notes': {'type': str, 'required': False}
        })
        
        # Parse dates
        start_date = date.fromisoformat(data['start_date'])
        end_date = date.fromisoformat(data['end_date'])
        
        # Validate date range
        validate_date_range(start_date, end_date)
        
        # No explicit conflict checking - let the service handle it
        
        # Create booking
        booking_id = booking_service.create_booking(
            user_id=current_user.id,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            notes=data.get('notes')
        )
        
        # Get the created booking to return
        booking = booking_service.get_booking_by_id(booking_id)
        
        return jsonify({
            'message': 'Booking created successfully',
            'booking': booking.to_dict()
        }), 201
        
    except (ValueError, ConflictError, ValidationError) as e:
        return jsonify({'error': type(e).__name__, 'message': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Create booking error: {str(e)}")
        return jsonify({'error': 'Failed to create booking', 'message': str(e)}), 500


@booking_bp.route('/<booking_id>', methods=['GET'])
@require_auth
def get_booking(current_user, booking_id):
    """Get specific booking by ID."""
    try:
        booking = booking_service.get_booking_by_id(booking_id)
        return jsonify(booking.to_dict()), 200
        
    except ResourceNotFoundError:
        return jsonify({'error': 'Booking not found'}), 404
    except Exception as e:
        current_app.logger.error(f"Get booking error: {str(e)}")
        return jsonify({'error': 'Failed to get booking', 'message': str(e)}), 500


@booking_bp.route('/<booking_id>', methods=['PUT'])
@require_auth
def update_booking(current_user, booking_id):
    """
    Update booking (only by booking owner).
    Expects: { start_date?, end_date?, notes? }
    """
    try:
        booking = booking_service.get_booking_by_id(booking_id)
        
        # Check ownership
        if booking.user_id != current_user.id:
            return jsonify({'error': 'Permission denied', 'message': 'You can only update your own bookings'}), 403
        
        data = validate_request_data(request.json, {
            'start_date': {'type': str, 'required': False},
            'end_date': {'type': str, 'required': False},
            'notes': {'type': str, 'required': False}
        })
        
        # Parse dates if provided
        updates = {}
        if 'start_date' in data:
            updates['start_date'] = date.fromisoformat(data['start_date'])
        if 'end_date' in data:
            updates['end_date'] = date.fromisoformat(data['end_date'])
        if 'notes' in data:
            updates['notes'] = data['notes']
        
        # Validate new date range if dates changed
        if 'start_date' in updates or 'end_date' in updates:
            new_start = updates.get('start_date', booking.start_date)
            new_end = updates.get('end_date', booking.end_date)
            validate_date_range(new_start, new_end)
            
            # TODO: Add conflict checking for updates
        
        # Update booking
        updated_booking = booking_service.update_booking(booking_id, updates)
        
        return jsonify({
            'message': 'Booking updated successfully',
            'booking': updated_booking.to_dict()
        }), 200
        
    except (ValueError, ConflictError, ResourceNotFoundError) as e:
        status_code = 404 if isinstance(e, ResourceNotFoundError) else 400
        return jsonify({'error': type(e).__name__, 'message': str(e)}), status_code
    except Exception as e:
        current_app.logger.error(f"Update booking error: {str(e)}")
        return jsonify({'error': 'Failed to update booking', 'message': str(e)}), 500


@booking_bp.route('/<booking_id>/cancel', methods=['POST'])
@require_auth
def cancel_booking(current_user, booking_id):
    """Cancel booking (only by booking owner)."""
    try:
        booking = booking_service.get_booking_by_id(booking_id)
        
        # Check ownership
        if booking.user_id != current_user.id:
            return jsonify({'error': 'Permission denied', 'message': 'You can only cancel your own bookings'}), 403
        
        cancelled_booking = booking_service.cancel_booking(booking_id)
        
        return jsonify({
            'message': 'Booking cancelled successfully',
            'booking': cancelled_booking.to_dict()
        }), 200
        
    except ResourceNotFoundError:
        return jsonify({'error': 'Booking not found'}), 404
    except Exception as e:
        current_app.logger.error(f"Cancel booking error: {str(e)}")
        return jsonify({'error': 'Failed to cancel booking', 'message': str(e)}), 500


@booking_bp.route('/<booking_id>', methods=['DELETE'])
@require_auth
def delete_booking(current_user, booking_id):
    """Delete/cancel booking via DELETE method (alias for cancel)."""
    try:
        booking = booking_service.get_booking_by_id(booking_id)
        
        # Check ownership
        if booking.user_id != current_user.id:
            return jsonify({'error': 'Permission denied', 'message': 'You can only delete your own bookings'}), 403
        
        cancelled_booking = booking_service.cancel_booking(booking_id)
        
        return jsonify({
            'message': 'Booking cancelled successfully'
        }), 200
        
    except ResourceNotFoundError:
        return jsonify({'error': 'Booking not found'}), 404
    except Exception as e:
        current_app.logger.error(f"Delete booking error: {str(e)}")
        return jsonify({'error': 'Failed to cancel booking', 'message': str(e)}), 500


@booking_bp.route('/calendar', methods=['GET'])
@require_auth
def get_calendar_view(current_user):
    """
    Get calendar view with bookings for specified month.
    Query params: year, month
    """
    try:
        year = int(request.args.get('year', datetime.now().year))
        month = int(request.args.get('month', datetime.now().month))
        
        calendar_data = booking_service.get_calendar_view(year, month)
        
        return jsonify(calendar_data), 200
        
    except ValueError as e:
        return jsonify({'error': 'Invalid year/month', 'message': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Get calendar view error: {str(e)}")
        return jsonify({'error': 'Failed to get calendar', 'message': str(e)}), 500