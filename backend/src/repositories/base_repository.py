"""
Base repository class implementing common CRUD operations.
All repositories inherit from this base class.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Type
from datetime import datetime
from google.cloud.firestore_v1 import Client, DocumentReference, Query

from ..models.base import BaseModel
from ..utils.firebase_config import get_firestore_client
from ..utils.exceptions import ResourceNotFoundError


class BaseRepository(ABC):
    """
    Abstract base repository providing common database operations.
    Uses Firebase Firestore as the underlying database.
    """
    
    def __init__(self, collection_name: str, model_class: Type[BaseModel]):
        self.collection_name = collection_name
        self.model_class = model_class
        self.db: Client = get_firestore_client()
        self.collection = self.db.collection(collection_name)
    
    def create(self, model: BaseModel) -> str:
        """
        Create a new document in the collection.
        Returns the document ID.
        """
        model.validate()
        doc_data = model.to_dict()
        
        if model.id:
            # Use provided ID
            doc_ref = self.collection.document(model.id)
            doc_ref.set(doc_data)
            return model.id
        else:
            # Generate new ID
            doc_ref = self.collection.document()
            doc_data['id'] = doc_ref.id
            doc_ref.set(doc_data)
            return doc_ref.id
    
    def get_by_id(self, doc_id: str) -> Optional[BaseModel]:
        """
        Get document by ID.
        Returns None if not found.
        """
        doc_ref = self.collection.document(doc_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            return None
        
        data = doc.to_dict()
        data['id'] = doc.id
        return self.model_class.from_dict(data)
    
    def get_by_id_or_fail(self, doc_id: str) -> BaseModel:
        """
        Get document by ID.
        Raises ResourceNotFoundError if not found.
        """
        model = self.get_by_id(doc_id)
        if not model:
            raise ResourceNotFoundError(self.collection_name, doc_id)
        return model
    
    def update(self, doc_id: str, updates: Dict[str, Any]) -> bool:
        """
        Update document fields.
        Returns True if successful.
        """
        doc_ref = self.collection.document(doc_id)
        
        # Add updated_at timestamp
        updates['updated_at'] = datetime.utcnow()
        
        doc_ref.update(updates)
        return True
    
    def delete(self, doc_id: str) -> bool:
        """
        Delete document by ID.
        Returns True if successful.
        """
        doc_ref = self.collection.document(doc_id)
        doc_ref.delete()
        return True
    
    def list(self, 
             filters: Optional[Dict[str, Any]] = None,
             order_by: Optional[str] = None,
             limit: Optional[int] = None,
             offset: Optional[int] = None) -> List[BaseModel]:
        """
        List documents with optional filtering and pagination.
        """
        query: Query = self.collection
        
        # Apply filters
        if filters:
            for field, value in filters.items():
                if isinstance(value, dict):
                    # Handle operators like {'>=': date}
                    for op, val in value.items():
                        query = query.where(field, op, val)
                else:
                    query = query.where(field, '==', value)
        
        # Apply ordering
        if order_by:
            if order_by.startswith('-'):
                # Descending order
                query = query.order_by(order_by[1:], direction='DESCENDING')
            else:
                query = query.order_by(order_by)
        
        # Apply pagination
        if offset:
            query = query.offset(offset)
        
        if limit:
            query = query.limit(limit)
        
        # Execute query
        docs = query.stream()
        
        results = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            results.append(self.model_class.from_dict(data))
        
        return results
    
    def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        Count documents matching filters.
        """
        query: Query = self.collection
        
        if filters:
            for field, value in filters.items():
                query = query.where(field, '==', value)
        
        # Firestore doesn't have direct count, so we fetch IDs only
        docs = query.select([]).stream()
        return sum(1 for _ in docs)
    
    def exists(self, doc_id: str) -> bool:
        """
        Check if document exists.
        """
        doc_ref = self.collection.document(doc_id)
        return doc_ref.get().exists
    
    def batch_create(self, models: List[BaseModel]) -> List[str]:
        """
        Create multiple documents in a batch.
        Returns list of created document IDs.
        """
        batch = self.db.batch()
        doc_ids = []
        
        for model in models:
            model.validate()
            doc_ref = self.collection.document()
            doc_data = model.to_dict()
            doc_data['id'] = doc_ref.id
            batch.set(doc_ref, doc_data)
            doc_ids.append(doc_ref.id)
        
        batch.commit()
        return doc_ids