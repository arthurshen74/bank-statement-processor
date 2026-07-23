#!/usr/bin/env python3
"""
File Handler Module
Provides utilities for handling file uploads, ZIP extraction, and PDF file management
"""

import os
import re
import uuid
import zipfile
import tempfile
import shutil
from typing import List, Tuple, Optional, Set
from dataclasses import dataclass
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage
from utils import extract_date_from_filename as extract_date_util
import logging

logger = logging.getLogger(__name__)


@dataclass
class FilePattern:
    """Defines a file pattern for matching PDFs in ZIP archives"""
    name: str
    pattern: re.Pattern
    description: str


class FilePatterns:
    """Predefined file patterns for different statement types"""

    GIROKONTO = FilePattern(
        name="girokonto",
        pattern=re.compile(r'Ihr[_\s]+Finanzstatus[_\s]+vom[_\s]+\d{4}-\d{2}-\d{2}.*\.pdf', re.IGNORECASE),
        description="Ihr Finanzstatus vom"
    )

    CREDITCARD = FilePattern(
        name="creditcard",
        pattern=re.compile(r'Ihre[_\s]+Kreditkartenabrechnung[_\s]+vom[_\s]+\d{4}-\d{2}-\d{2}.*\.pdf', re.IGNORECASE),
        description="Ihre Kreditkartenabrechnung vom"
    )


@dataclass
class ExtractedFile:
    """Represents an extracted PDF file ready for processing"""
    path: str
    filename: str
    unique_id: str
    file_type: Optional[str] = None


@dataclass
class ExtractionResult:
    """Result of file extraction operation"""
    files: List[ExtractedFile]
    temp_dir: Optional[str]
    upload_path: Optional[str]

    def cleanup(self):
        """Clean up temporary files and directories"""
        # Clean up temp directory
        if self.temp_dir and os.path.exists(self.temp_dir):
            try:
                shutil.rmtree(self.temp_dir)
                logger.info(f"Cleaned up temp directory: {self.temp_dir}")
            except Exception as e:
                logger.error(f"Error cleaning up temp directory {self.temp_dir}: {e}")

        # Clean up upload path
        if self.upload_path and os.path.exists(self.upload_path):
            try:
                os.remove(self.upload_path)
                logger.info(f"Cleaned up upload file: {self.upload_path}")
            except Exception as e:
                logger.error(f"Error cleaning up upload file {self.upload_path}: {e}")


class FileHandler:
    """Handles file uploads, validation, and extraction"""

    ALLOWED_EXTENSIONS: Set[str] = {'pdf', 'zip'}

    def __init__(self, upload_folder: str, max_content_length: int = 50 * 1024 * 1024):
        """
        Initialize file handler

        Args:
            upload_folder: Directory to store uploaded files
            max_content_length: Maximum file size in bytes (default 50MB)
        """
        self.upload_folder = upload_folder
        self.max_content_length = max_content_length

        # Ensure upload folder exists
        os.makedirs(upload_folder, exist_ok=True)

    def allowed_file(self, filename: str) -> bool:
        """
        Check if file extension is allowed

        Args:
            filename: Name of the file to check

        Returns:
            True if file extension is allowed, False otherwise
        """
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in self.ALLOWED_EXTENSIONS

    def validate_file(self, file: FileStorage) -> Tuple[bool, Optional[str]]:
        """
        Validate uploaded file

        Args:
            file: Uploaded file from Flask request

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not file:
            return False, "No file provided"

        if not file.filename:
            return False, "No file selected"

        if not self.allowed_file(file.filename):
            return False, f"Invalid file type. Only {', '.join(self.ALLOWED_EXTENSIONS)} files are allowed."

        return True, None

    def save_upload(self, file: FileStorage, prefix: Optional[str] = None) -> Tuple[str, str, str]:
        """
        Save uploaded file with unique ID

        Args:
            file: Uploaded file from Flask request
            prefix: Optional prefix for the unique ID

        Returns:
            Tuple of (upload_path, filename, unique_id)
        """
        filename = secure_filename(file.filename) if file.filename else 'document'
        unique_id = str(uuid.uuid4())

        if prefix:
            unique_id = f"{prefix}_{unique_id}"

        upload_path = os.path.join(self.upload_folder, f"{unique_id}_{filename}")
        file.save(upload_path)

        logger.info(f"Saved upload to: {upload_path}")
        return upload_path, filename, unique_id

    def extract_date_from_filename(self, filename: str) -> str:
        """
        Extract date from filename with pattern "vom YYYY-MM-DD"

        Args:
            filename: Name of the file

        Returns:
            Date string in format YYYY-MM-DD or "N/A" if not found
        """
        return extract_date_util(filename)

    def extract_zip(
        self,
        zip_path: str,
        patterns: Optional[List[FilePattern]] = None,
        unique_id: Optional[str] = None
    ) -> Tuple[List[ExtractedFile], str]:
        """
        Extract PDF files from ZIP archive matching specified patterns

        Args:
            zip_path: Path to ZIP file
            patterns: List of FilePattern objects to match (if None, extracts all PDFs)
            unique_id: Base unique ID for extracted files

        Returns:
            Tuple of (list of ExtractedFile objects, temp_dir path)

        Raises:
            ValueError: If no matching files found
        """
        temp_dir = tempfile.mkdtemp()
        extracted_files = []

        if unique_id is None:
            unique_id = str(uuid.uuid4())

        try:
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                all_files = zip_ref.namelist()

                if patterns:
                    # Match files against patterns
                    for file_name in all_files:
                        basename = os.path.basename(file_name)

                        for pattern_obj in patterns:
                            if pattern_obj.pattern.search(basename):
                                # Extract file
                                zip_ref.extract(file_name, temp_dir)
                                pdf_path = os.path.join(temp_dir, file_name)

                                # Create unique ID for this file
                                file_unique_id = f"{unique_id}_{pattern_obj.name}_{basename.replace('.pdf', '')}"

                                extracted_files.append(ExtractedFile(
                                    path=pdf_path,
                                    filename=basename,
                                    unique_id=file_unique_id,
                                    file_type=pattern_obj.name
                                ))
                                break  # Only match first pattern

                    if not extracted_files:
                        pattern_descriptions = [p.description for p in patterns]
                        raise ValueError(f"No matching PDF files found in ZIP (looking for: {', '.join(pattern_descriptions)})")
                else:
                    # Extract all PDF files
                    for file_name in all_files:
                        if file_name.lower().endswith('.pdf'):
                            basename = os.path.basename(file_name)
                            zip_ref.extract(file_name, temp_dir)
                            pdf_path = os.path.join(temp_dir, file_name)

                            file_unique_id = f"{unique_id}_{basename.replace('.pdf', '')}"

                            extracted_files.append(ExtractedFile(
                                path=pdf_path,
                                filename=basename,
                                unique_id=file_unique_id
                            ))

                    if not extracted_files:
                        raise ValueError("No PDF files found in ZIP")

                logger.info(f"Extracted {len(extracted_files)} files from ZIP")
                return extracted_files, temp_dir

        except zipfile.BadZipFile:
            # Clean up temp dir on error
            shutil.rmtree(temp_dir)
            raise ValueError("Invalid ZIP file")
        except Exception as e:
            # Clean up temp dir on error
            shutil.rmtree(temp_dir)
            raise

    def extract_single_pattern(
        self,
        zip_path: str,
        pattern: FilePattern,
        unique_id: Optional[str] = None
    ) -> Tuple[List[ExtractedFile], str]:
        """
        Extract PDF files matching a single pattern from ZIP

        Args:
            zip_path: Path to ZIP file
            pattern: FilePattern object to match
            unique_id: Base unique ID for extracted files

        Returns:
            Tuple of (list of ExtractedFile objects, temp_dir path)
        """
        return self.extract_zip(zip_path, [pattern], unique_id)

    def process_upload(
        self,
        file: FileStorage,
        patterns: Optional[List[FilePattern]] = None,
        zip_only: bool = False
    ) -> ExtractionResult:
        """
        Process uploaded file (PDF or ZIP) and extract all relevant files

        Args:
            file: Uploaded file from Flask request
            patterns: Optional list of FilePattern objects for ZIP extraction
            zip_only: If True, only accept ZIP files

        Returns:
            ExtractionResult containing extracted files and cleanup info

        Raises:
            ValueError: If validation fails or extraction fails
        """
        # Validate file
        is_valid, error_msg = self.validate_file(file)
        if not is_valid:
            raise ValueError(error_msg)

        # Save upload
        upload_path, filename, unique_id = self.save_upload(file)

        is_zip = filename.lower().endswith('.zip')

        if zip_only and not is_zip:
            os.remove(upload_path)
            raise ValueError("Only ZIP files are accepted")

        extracted_files = []
        temp_dir = None

        try:
            if is_zip:
                # Extract from ZIP
                extracted_files, temp_dir = self.extract_zip(upload_path, patterns, unique_id)
                # Clean up uploaded ZIP immediately
                os.remove(upload_path)
                upload_path = None  # Mark as cleaned
            else:
                # Single PDF file
                extracted_files.append(ExtractedFile(
                    path=upload_path,
                    filename=filename,
                    unique_id=unique_id
                ))

            return ExtractionResult(
                files=extracted_files,
                temp_dir=temp_dir,
                upload_path=upload_path  # Will be None if ZIP (already cleaned)
            )

        except Exception as e:
            # Clean up on error
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
            if upload_path and os.path.exists(upload_path):
                os.remove(upload_path)
            raise

    def cleanup_pdf(self, pdf_path: str, temp_dir: Optional[str] = None):
        """
        Clean up a single PDF file (only if it's in temp directory)

        Args:
            pdf_path: Path to PDF file
            temp_dir: Temp directory path (if file should only be cleaned from temp)
        """
        if temp_dir and pdf_path.startswith(temp_dir):
            try:
                os.remove(pdf_path)
                logger.debug(f"Cleaned up PDF: {pdf_path}")
            except Exception as e:
                logger.error(f"Error cleaning up PDF {pdf_path}: {e}")
