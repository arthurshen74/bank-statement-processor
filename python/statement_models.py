"""
Data models for normalized bank statements.
Defines the structure for storing statements in MongoDB.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime, date
from typing import List, Optional
from bson import ObjectId
from decimal import Decimal


@dataclass
class StatementTransaction:
    """Represents a single transaction within a statement."""
    bookingDate: str  # ISO date string (YYYY-MM-DD)
    bookingText: str
    amount: float

    def to_dict(self):
        """Convert to dictionary for MongoDB storage."""
        return {
            'bookingDate': self.bookingDate,
            'bookingText': self.bookingText,
            'amount': self.amount
        }


@dataclass
class StatementPage:
    """Represents a single page of a statement."""
    pageNumber: int
    pageImage: ObjectId  # GridFS reference to full page image
    pageImageCropped: Optional[ObjectId]  # GridFS reference to cropped image (girokonto only)
    numberOfTransactions: int
    transactions: List[StatementTransaction] = field(default_factory=list)

    def to_dict(self):
        """Convert to dictionary for MongoDB storage."""
        return {
            'pageNumber': self.pageNumber,
            'pageImage': self.pageImage,
            'pageImageCropped': self.pageImageCropped,
            'numberOfTransactions': self.numberOfTransactions,
            'transactions': [t.to_dict() for t in self.transactions]
        }


@dataclass
class Statement:
    """Represents a complete bank statement."""
    statementType: str  # "girokonto" or "kreditkarte"
    statementProvider: str  # e.g., "targobank"
    fileName: str
    statementDate: str  # ISO date string (YYYY-MM-DD)
    statementYear: int
    numberOfTransactions: int
    ingestDate: str  # ISO datetime string
    pages: List[StatementPage] = field(default_factory=list)

    def to_dict(self):
        """Convert to dictionary for MongoDB storage."""
        return {
            'statementType': self.statementType,
            'statementProvider': self.statementProvider,
            'fileName': self.fileName,
            'statementDate': self.statementDate,
            'statementYear': self.statementYear,
            'numberOfTransactions': self.numberOfTransactions,
            'ingestDate': self.ingestDate,
            'pages': [p.to_dict() for p in self.pages]
        }

    @classmethod
    def from_dict(cls, data: dict):
        """Create Statement from dictionary."""
        pages = [
            StatementPage(
                pageNumber=p['pageNumber'],
                pageImage=p['pageImage'],
                pageImageCropped=p.get('pageImageCropped'),
                numberOfTransactions=p['numberOfTransactions'],
                transactions=[
                    StatementTransaction(**t) for t in p['transactions']
                ]
            )
            for p in data.get('pages', [])
        ]

        return cls(
            statementType=data['statementType'],
            statementProvider=data['statementProvider'],
            fileName=data['fileName'],
            statementDate=data['statementDate'],
            statementYear=data['statementYear'],
            numberOfTransactions=data['numberOfTransactions'],
            ingestDate=data['ingestDate'],
            pages=pages
        )
