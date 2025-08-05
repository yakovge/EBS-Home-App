"""
Dashboard API endpoints for overview data and statistics.
Provides aggregated data for the main dashboard view.
"""

from flask import Blueprint, jsonify, request
from flask_cors import cross_origin
from src.services.maintenance_service import MaintenanceService
from src.services.booking_service import BookingService
from src.services.checklist_service import ChecklistService
from src.middleware.auth import require_auth
from src.utils.exceptions import APIError

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/stats', methods=['GET'])
@cross_origin()
@require_auth
def get_dashboard_stats(current_user):
    """Get dashboard statistics and metrics."""
    try:
        maintenance_service = MaintenanceService()
        booking_service = BookingService()
        checklist_service = ChecklistService()
        
        # Get counts for each category
        current_bookings = booking_service.get_current_bookings_count()
        pending_maintenance = maintenance_service.get_pending_maintenance_count()
        exit_checklists = checklist_service.get_recent_checklists_count()
        
        stats = {
            'currentBookings': current_bookings,
            'pendingMaintenance': pending_maintenance,
            'exitChecklists': exit_checklists,
        }
        
        return jsonify(stats), 200
        
    except Exception as e:
        raise APIError(f"Failed to fetch dashboard stats: {str(e)}", 500)

@dashboard_bp.route('/', methods=['GET'])
@cross_origin()
@require_auth
def get_dashboard_data(current_user):
    """Get complete dashboard data including stats and recent items."""
    try:
        maintenance_service = MaintenanceService()
        booking_service = BookingService()
        checklist_service = ChecklistService()
        
        # Get all dashboard data
        stats = {
            'currentBookings': booking_service.get_current_bookings_count(),
            'pendingMaintenance': maintenance_service.get_pending_maintenance_count(),
            'exitChecklists': checklist_service.get_recent_checklists_count(),
        }
        
        recent_maintenance = maintenance_service.get_recent_maintenance(limit=5)
        upcoming_bookings = booking_service.get_upcoming_bookings_limited(limit=5)
        recent_checklists = checklist_service.get_recent_checklists(limit=5)
        
        dashboard_data = {
            'stats': stats,
            'recentMaintenance': recent_maintenance,
            'upcomingBookings': upcoming_bookings,
            'recentChecklists': recent_checklists,
        }
        
        return jsonify(dashboard_data), 200
        
    except Exception as e:
        raise APIError(f"Failed to fetch dashboard data: {str(e)}", 500) 