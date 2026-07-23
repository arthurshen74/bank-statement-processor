"""
Repository for managing Statement documents in MongoDB.
Handles CRUD operations and GridFS image storage.
"""

from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from pymongo.errors import DuplicateKeyError
import gridfs
from mongo_service import mongo_service
from statement_models import Statement
import logging


class StatementRepository:
    """Repository for Statement documents with GridFS image storage."""

    def __init__(self):
        """Initialize repository with MongoDB connection."""
        self.db = mongo_service.db
        self.collection = self.db['transactionStatements']
        self.fs = gridfs.GridFS(self.db)
        self.logger = logging.getLogger(__name__)

        # Create indexes for efficient querying
        self._create_indexes()

    def _create_indexes(self):
        """Create database indexes for optimal query performance."""
        try:
            # Compound index for duplicate detection
            self.collection.create_index(
                [('fileName', 1), ('statementDate', 1)],
                unique=True,
                name='unique_filename_date'
            )

            # Index for querying by statement type
            self.collection.create_index('statementType', name='idx_statement_type')

            # Index for querying by provider
            self.collection.create_index('statementProvider', name='idx_provider')

            # Index for querying by ingest date (most recent first)
            self.collection.create_index([('ingestDate', -1)], name='idx_ingest_date_desc')

            self.logger.info("Database indexes created successfully")
        except Exception as e:
            self.logger.warning(f"Index creation warning: {e}")

    def save_image_to_gridfs(self, image_path: str, metadata: Optional[Dict[str, Any]] = None) -> ObjectId:
        """
        Save an image file to GridFS.

        Args:
            image_path: Path to the image file on disk
            metadata: Optional metadata to store with the image

        Returns:
            ObjectId of the stored file

        Raises:
            FileNotFoundError: If image file doesn't exist
            Exception: If GridFS storage fails
        """
        try:
            with open(image_path, 'rb') as image_file:
                # Determine content type
                content_type = 'image/png'
                if image_path.lower().endswith('.jpg') or image_path.lower().endswith('.jpeg'):
                    content_type = 'image/jpeg'

                # Prepare metadata
                file_metadata = metadata or {}
                file_metadata['contentType'] = content_type
                file_metadata['uploadDate'] = datetime.utcnow()

                # Store in GridFS
                file_id = self.fs.put(
                    image_file,
                    filename=image_path.split('/')[-1],
                    metadata=file_metadata
                )

                self.logger.info(f"Saved image to GridFS: {image_path} -> {file_id}")
                return file_id

        except FileNotFoundError as e:
            self.logger.error(f"Image file not found: {image_path}")
            raise
        except Exception as e:
            self.logger.error(f"Failed to save image to GridFS: {e}")
            raise

    def get_image_from_gridfs(self, file_id: ObjectId) -> Optional[bytes]:
        """
        Retrieve an image from GridFS.

        Args:
            file_id: ObjectId of the file in GridFS

        Returns:
            Image bytes or None if not found
        """
        try:
            grid_out = self.fs.get(file_id)
            return grid_out.read()
        except gridfs.errors.NoFile: # type: ignore
            self.logger.warning(f"File not found in GridFS: {file_id}")
            return None
        except Exception as e:
            self.logger.error(f"Failed to retrieve image from GridFS: {e}")
            return None

    def delete_image_from_gridfs(self, file_id: ObjectId) -> bool:
        """
        Delete an image from GridFS.

        Args:
            file_id: ObjectId of the file to delete

        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            self.fs.delete(file_id)
            self.logger.info(f"Deleted image from GridFS: {file_id}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to delete image from GridFS: {e}")
            return False

    def check_duplicate(self, filename: str, statement_date: str) -> Optional[str]:
        """
        Check if a statement with the same filename and date already exists.

        Args:
            filename: Statement filename
            statement_date: Statement date in ISO format

        Returns:
            Document ID if duplicate exists, None otherwise
        """
        try:
            existing = self.collection.find_one(
                {'fileName': filename, 'statementDate': statement_date},
                {'_id': 1}
            )

            if existing:
                doc_id = str(existing['_id'])
                self.logger.warning(f"Duplicate statement found: {filename} ({statement_date}) -> {doc_id}")
                return doc_id

            return None

        except Exception as e:
            self.logger.error(f"Error checking for duplicate: {e}")
            return None

    def save_statement(self, statement: Statement) -> str:
        """
        Save a normalized statement to MongoDB.

        Args:
            statement: Statement object to save

        Returns:
            String representation of inserted document ID

        Raises:
            DuplicateKeyError: If duplicate statement exists
            Exception: If save operation fails
        """
        try:
            # Convert statement to dictionary
            doc = statement.to_dict()

            # Insert into MongoDB
            result = self.collection.insert_one(doc)

            doc_id = str(result.inserted_id)
            self.logger.info(
                f"Saved statement: {statement.fileName} "
                f"({statement.statementType}) -> {doc_id}"
            )

            return doc_id

        except DuplicateKeyError as e:
            self.logger.error(
                f"Duplicate statement detected: {statement.fileName} "
                f"({statement.statementDate})"
            )
            raise
        except Exception as e:
            self.logger.error(f"Failed to save statement: {e}")
            raise

    def get_statement_by_id(self, doc_id: str) -> Optional[Statement]:
        """
        Retrieve a statement by its MongoDB ID.

        Args:
            doc_id: String representation of ObjectId

        Returns:
            Statement object or None if not found
        """
        try:
            doc = self.collection.find_one({'_id': ObjectId(doc_id)})

            if doc:
                # Remove MongoDB _id before converting
                doc.pop('_id', None)
                return Statement.from_dict(doc)

            return None

        except Exception as e:
            self.logger.error(f"Failed to retrieve statement {doc_id}: {e}")
            return None

    def delete_statement(self, doc_id: str, delete_images: bool = True) -> bool:
        """
        Delete a statement and optionally its associated images.

        Args:
            doc_id: String representation of ObjectId
            delete_images: Whether to delete associated GridFS images

        Returns:
            True if deleted successfully, False otherwise
        """
        try:
            # Get statement first if we need to delete images
            if delete_images:
                statement = self.get_statement_by_id(doc_id)
                if statement:
                    # Delete all page images
                    for page in statement.pages:
                        self.delete_image_from_gridfs(page.pageImage)
                        if page.pageImageCropped:
                            self.delete_image_from_gridfs(page.pageImageCropped)

            # Delete the statement document
            result = self.collection.delete_one({'_id': ObjectId(doc_id)})

            if result.deleted_count > 0:
                self.logger.info(f"Deleted statement: {doc_id}")
                return True

            return False

        except Exception as e:
            self.logger.error(f"Failed to delete statement {doc_id}: {e}")
            return False

    def get_all_statements(self, limit: int = 100, skip: int = 0) -> list:
        """
        Retrieve all statements with pagination.

        Args:
            limit: Maximum number of statements to return
            skip: Number of statements to skip

        Returns:
            List of statement dictionaries
        """
        try:
            cursor = self.collection.find().sort('ingestDate', -1).skip(skip).limit(limit)
            statements = []

            for doc in cursor:
                doc['_id'] = str(doc['_id'])  # Convert ObjectId to string
                statements.append(doc)

            return statements

        except Exception as e:
            self.logger.error(f"Failed to retrieve statements: {e}")
            return []

    def get_statement_count(self) -> int:
        """
        Get total count of statements in the collection.

        Returns:
            Total number of statements
        """
        try:
            return self.collection.count_documents({})
        except Exception as e:
            self.logger.error(f"Failed to count statements: {e}")
            return 0
