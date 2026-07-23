"""
MongoDB connection service for managing database connections.
Provides a singleton instance to reuse connections across the application.
"""

import os
from typing import Optional
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class MongoService:
    """Singleton service for MongoDB connection management."""

    _instance: Optional['MongoService'] = None
    _client: Optional[MongoClient] = None
    _db: Optional[Database] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MongoService, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize MongoDB connection if not already connected."""
        if self._client is None:
            self._connect()

    def _connect(self):
        """Establish connection to MongoDB."""
        mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
        database_name = os.getenv('MONGO_DATABASE', 'bankStatementProcessor')

        try:
            # Create MongoDB client with connection timeout
            self._client = MongoClient(
                mongo_uri,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=10000
            )

            # Test connection
            self._client.admin.command('ping')

            # Get database reference
            self._db = self._client[database_name]

            print(f"✓ Connected to MongoDB database: {database_name}")

        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            print(f"✗ Failed to connect to MongoDB: {e}")
            raise

    @property
    def db(self) -> Database:
        """Get the database instance."""
        if self._db is None:
            raise RuntimeError("MongoDB connection not established")
        return self._db

    @property
    def client(self) -> MongoClient:
        """Get the MongoDB client instance."""
        if self._client is None:
            raise RuntimeError("MongoDB connection not established")
        return self._client

    def is_connected(self) -> bool:
        """Check if MongoDB connection is active."""
        try:
            if self._client is not None:
                self._client.admin.command('ping')
                return True
        except Exception:
            pass
        return False

    def close(self):
        """Close MongoDB connection."""
        if self._client is not None:
            self._client.close()
            self._client = None
            self._db = None
            print("MongoDB connection closed")


# Create singleton instance
mongo_service = MongoService()
