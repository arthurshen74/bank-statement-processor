#!/usr/bin/env python3
"""
SSE (Server-Sent Events) Handler Module
Provides thread-safe message queue handling for Server-Sent Events responses
"""

import json
from threading import Lock
from typing import List, Optional, Dict, Any, Generator
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class MessageType(Enum):
    """SSE message types"""
    STATUS = "status"
    ERROR = "error"
    WARNING = "warning"
    PROGRESS = "progress"
    COMPLETE = "complete"


class SSEMessageQueue:
    """
    Thread-safe message queue for Server-Sent Events

    Manages a queue of SSE messages with automatic formatting and thread-safe operations.
    Designed to work seamlessly with Flask's streaming response pattern.
    """

    def __init__(self):
        """Initialize SSE message queue with lock"""
        self._queue: List[str] = []
        self._lock = Lock()

    def _format_sse_message(self, message_type: str, message: str, **extra_data) -> str:
        """
        Format a message in SSE format

        Args:
            message_type: Type of message (status, error, warning, etc.)
            message: Message content
            **extra_data: Additional data to include in the message

        Returns:
            Formatted SSE message string
        """
        data = {
            'type': message_type,
            'message': message,
            **extra_data
        }
        return f"data: {json.dumps(data)}\n\n"

    def add(self, message_type: MessageType, message: str, **extra_data):
        """
        Add a message to the queue

        Args:
            message_type: Type of message (use MessageType enum)
            message: Message content
            **extra_data: Additional data to include in the message
        """
        with self._lock:
            formatted = self._format_sse_message(message_type.value, message, **extra_data)
            self._queue.append(formatted)
            logger.debug(f"SSE message added: {message_type.value} - {message[:50]}...")

    def add_status(self, message: str):
        """
        Add a status message

        Args:
            message: Status message content
        """
        self.add(MessageType.STATUS, message)

    def add_error(self, message: str):
        """
        Add an error message

        Args:
            message: Error message content
        """
        self.add(MessageType.ERROR, message)

    def add_warning(self, message: str):
        """
        Add a warning message

        Args:
            message: Warning message content
        """
        self.add(MessageType.WARNING, message)

    def add_progress(self, message: str, current: int, total: int):
        """
        Add a progress message

        Args:
            message: Progress message content
            current: Current progress value
            total: Total progress value
        """
        self.add(MessageType.PROGRESS, message, current=current, total=total)

    def add_complete(self, message: str, results: Optional[Dict[str, Any]] = None):
        """
        Add a completion message

        Args:
            message: Completion message content
            results: Optional results data to include
        """
        if results:
            self.add(MessageType.COMPLETE, message, results=results)
        else:
            self.add(MessageType.COMPLETE, message)

    def drain(self) -> Generator[str, None, None]:
        """
        Drain all messages from the queue and yield them

        This is a generator that yields all queued messages and clears the queue.
        Thread-safe operation.

        Yields:
            SSE formatted message strings
        """
        with self._lock:
            for msg in self._queue:
                yield msg
            self._queue.clear()

    def get_all(self) -> List[str]:
        """
        Get all messages and clear the queue

        Returns:
            List of all queued messages (queue is cleared after this call)
        """
        with self._lock:
            messages = self._queue.copy()
            self._queue.clear()
            return messages

    def size(self) -> int:
        """
        Get the current queue size

        Returns:
            Number of messages in the queue
        """
        with self._lock:
            return len(self._queue)

    def clear(self):
        """Clear all messages from the queue"""
        with self._lock:
            self._queue.clear()


class SSEResponse:
    """
    Helper class for building SSE responses

    Provides convenience methods for generating SSE messages without a queue.
    Useful for direct yielding in generator functions.
    """

    @staticmethod
    def format(message_type: MessageType, message: str, **extra_data) -> str:
        """
        Format a single SSE message

        Args:
            message_type: Type of message (use MessageType enum)
            message: Message content
            **extra_data: Additional data to include in the message

        Returns:
            Formatted SSE message string
        """
        data = {
            'type': message_type.value,
            'message': message,
            **extra_data
        }
        return f"data: {json.dumps(data)}\n\n"

    @staticmethod
    def status(message: str) -> str:
        """Create a status message"""
        return SSEResponse.format(MessageType.STATUS, message)

    @staticmethod
    def error(message: str) -> str:
        """Create an error message"""
        return SSEResponse.format(MessageType.ERROR, message)

    @staticmethod
    def warning(message: str) -> str:
        """Create a warning message"""
        return SSEResponse.format(MessageType.WARNING, message)

    @staticmethod
    def progress(message: str, current: int, total: int) -> str:
        """Create a progress message"""
        return SSEResponse.format(MessageType.PROGRESS, message, current=current, total=total)

    @staticmethod
    def complete(message: str, results: Optional[Dict[str, Any]] = None) -> str:
        """Create a completion message"""
        if results:
            return SSEResponse.format(MessageType.COMPLETE, message, results=results)
        return SSEResponse.format(MessageType.COMPLETE, message)
