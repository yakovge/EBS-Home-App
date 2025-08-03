"""
Base service class implementing common functionality.
All services inherit from this base class following DRY principle.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import logging


class BaseService(ABC):
    """
    Abstract base service class providing common functionality.
    Implements logging, error handling, and base CRUD operations.
    """
    
    def __init__(self, service_name: str):
        self.logger = logging.getLogger(service_name)
        self.service_name = service_name
    
    def log_info(self, message: str, **kwargs) -> None:
        """Log info level message with context."""
        self.logger.info(f"[{self.service_name}] {message}", extra=kwargs)
    
    def log_error(self, message: str, error: Exception = None, **kwargs) -> None:
        """Log error level message with exception details."""
        error_msg = f"[{self.service_name}] {message}"
        if error:
            error_msg += f" - Error: {str(error)}"
        self.logger.error(error_msg, exc_info=error is not None, extra=kwargs)
    
    def log_warning(self, message: str, **kwargs) -> None:
        """Log warning level message."""
        self.logger.warning(f"[{self.service_name}] {message}", extra=kwargs)
    
    @abstractmethod
    def validate_data(self, data: Dict[str, Any]) -> bool:
        """
        Validate input data for the service.
        Must be implemented by each service.
        """
        pass