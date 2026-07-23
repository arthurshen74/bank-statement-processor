#!/usr/bin/env python3
"""
Utility Functions Module
Common utility functions used across the application
"""

import re
from typing import Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def extract_date_from_filename(filename: str, default: str = "N/A") -> str:
    """
    Extract date from filename with pattern "vom YYYY-MM-DD"

    Targobank statement filenames typically follow the pattern:
    - "Ihr Finanzstatus vom 2024-01-15.pdf"
    - "Ihre Kreditkartenabrechnung vom 2024-01-15.pdf"

    Args:
        filename: Name of the file to extract date from
        default: Default value to return if no date is found (default: "N/A")

    Returns:
        Date string in format YYYY-MM-DD or default value if not found

    Examples:
        >>> extract_date_from_filename("Ihr Finanzstatus vom 2024-01-15.pdf")
        '2024-01-15'
        >>> extract_date_from_filename("Ihre Kreditkartenabrechnung vom 2024-01-15.pdf")
        '2024-01-15'
        >>> extract_date_from_filename("invalid.pdf")
        'N/A'
        >>> extract_date_from_filename("invalid.pdf", "unknown")
        'unknown'
    """
    pattern = re.compile(r'vom[_\s]+(\d{4}-\d{2}-\d{2})')
    match = pattern.search(filename)

    if match:
        date_str = match.group(1)
        # Validate that it's a real date
        try:
            datetime.strptime(date_str, '%Y-%m-%d')
            return date_str
        except ValueError:
            logger.warning(f"Invalid date format in filename: {filename}")
            return default

    return default
    
def extract_statement_year_from_iso_date(iso_date: str) -> int:
    """
    Extract statement year from ISO date string.  If the day 
    portion of the date occurs in the first week of the month 
    then get the year from the previous month, otherwise get 
    the year from the current month.

    Args:
        iso_date: Date string in ISO format (YYYY-MM-DD)
    Returns:
        Year as int (YYYY) or 0 if invalid
    """
    statement_year = 0
    match = re.search(r'(\d{4})-(\d{2})-(\d{2})', iso_date)

    try:
        if match:
            year, month, day = map(int, match.groups())
            if day <= 7:
                if month == 1:
                    statement_year = year - 1
                else:
                    statement_year = year
            else:
                statement_year = year
    except Exception:
        return 0

    return statement_year


def sanitize_filename(filename: str, max_length: int = 255) -> str:
    """
    Sanitize filename by removing or replacing invalid characters

    Args:
        filename: Original filename
        max_length: Maximum allowed length (default: 255)

    Returns:
        Sanitized filename safe for filesystem use

    Examples:
        >>> sanitize_filename("file/with\\invalid:chars.pdf")
        'file_with_invalid_chars.pdf'
    """
    # Remove or replace invalid characters
    sanitized = re.sub(r'[<>:"/\\|?*]', '_', filename)

    # Remove control characters
    sanitized = ''.join(char for char in sanitized if ord(char) >= 32)

    # Trim to max length while preserving extension
    if len(sanitized) > max_length:
        name, ext = sanitized.rsplit('.', 1) if '.' in sanitized else (sanitized, '')
        if ext:
            max_name_length = max_length - len(ext) - 1
            sanitized = f"{name[:max_name_length]}.{ext}"
        else:
            sanitized = sanitized[:max_length]

    return sanitized


def format_file_size(size_bytes: int) -> str:
    """
    Format file size in bytes to human-readable format

    Args:
        size_bytes: File size in bytes

    Returns:
        Human-readable file size string

    Examples:
        >>> format_file_size(1024)
        '1.00 KB'
        >>> format_file_size(1048576)
        '1.00 MB'
        >>> format_file_size(500)
        '500 B'
    """
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024.0 or unit == 'TB':
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0 # type: ignore

    return f"{size_bytes:.2f} PB"


def truncate_string(text: str, max_length: int, suffix: str = "...") -> str:
    """
    Truncate string to maximum length with optional suffix

    Args:
        text: Text to truncate
        max_length: Maximum length including suffix
        suffix: Suffix to add if truncated (default: "...")

    Returns:
        Truncated string

    Examples:
        >>> truncate_string("This is a long text", 10)
        'This is...'
        >>> truncate_string("Short", 10)
        'Short'
    """
    if len(text) <= max_length:
        return text

    return text[:max_length - len(suffix)] + suffix
