#!/usr/bin/env python3
"""
Image Service Module
Handles PDF page image generation with thread-safe operations
"""

import os
from threading import Lock
from typing import Optional, List, Callable
import logging

logger = logging.getLogger(__name__)


class ImageService:
    """
    Service for generating and saving PDF page images

    Provides thread-safe image generation from pdfplumber pages with support for:
    - Full page images
    - Cropped images with optional column overlays
    - Configurable resolution
    - Error handling and logging
    """

    DEFAULT_RESOLUTION = 300
    DEFAULT_COLUMN_STROKE = "red"
    DEFAULT_COLUMN_STROKE_WIDTH = 2

    def __init__(
        self,
        static_folder: str,
        image_lock: Lock,
        resolution: int = DEFAULT_RESOLUTION,
        error_callback: Optional[Callable[[str], None]] = None
    ):
        """
        Initialize image service

        Args:
            static_folder: Directory to save generated images
            image_lock: Thread lock for image generation operations
            resolution: DPI resolution for generated images (default: 300)
            error_callback: Optional callback function for error messages
        """
        self.static_folder = static_folder
        self.image_lock = image_lock
        self.resolution = resolution
        self.error_callback = error_callback

        # Ensure static folder exists
        os.makedirs(static_folder, exist_ok=True)

    def _build_image_filename(
        self,
        unique_id: str,
        page_num: int,
        suffix: str = ""
    ) -> tuple[str, str, str]:
        """
        Build image filename and paths

        Args:
            unique_id: Unique identifier for the file
            page_num: Page number
            suffix: Optional suffix (e.g., "_cropped")

        Returns:
            Tuple of (filename, full_path, url_path)
        """
        filename = f"{unique_id}_page_{page_num}{suffix}.png"
        full_path = os.path.join(self.static_folder, filename)
        url_path = f'/static/{filename}'

        return filename, full_path, url_path

    def purge_static_folder(self) -> tuple[int, int]:
        """
        Delete every generated image left in the static folder

        The static folder is a staging area, not a repository: images are written
        here only so they can be streamed into GridFS, and are removed immediately
        afterwards. Anything still present is an orphan from a run that failed
        before its GridFS upload completed. Nothing reads these files back — the
        webapp loads page images from GridFS by file id.

        Returns:
            Tuple of (files_removed, bytes_freed)
        """
        count = 0
        freed = 0

        try:
            entries = os.listdir(self.static_folder)
        except OSError as e:
            logger.warning(f'Could not list static folder {self.static_folder}: {e}')
            return 0, 0

        for name in entries:
            if not name.lower().endswith('.png'):
                continue

            path = os.path.join(self.static_folder, name)
            try:
                size = os.path.getsize(path)
                os.remove(path)
                count += 1
                freed += size
            except OSError as e:
                logger.warning(f'Could not remove staging file {path}: {e}')

        if count:
            logger.info(f'Purged {count} staging images from {self.static_folder} ({freed / 1024 / 1024:.1f} MB)')
        else:
            logger.info(f'No staging images to purge in {self.static_folder}')

        return count, freed

    def _report_error(self, error_message: str):
        """
        Report error via callback or logger

        Args:
            error_message: Error message to report
        """
        logger.warning(error_message)
        if self.error_callback:
            self.error_callback(error_message)

    def generate_full_page_image(
        self,
        page,
        unique_id: str,
        page_num: int,
        context: Optional[str] = None
    ) -> Optional[str]:
        """
        Generate and save full page image from pdfplumber page

        Args:
            page: pdfplumber page object
            unique_id: Unique identifier for the file
            page_num: Page number
            context: Optional context string for error messages (e.g., filename)

        Returns:
            URL path to saved image, or None if generation failed
        """
        if not page:
            return None

        filename, full_path, url_path = self._build_image_filename(unique_id, page_num)

        try:
            with self.image_lock:
                page_image = page.to_image(resolution=self.resolution)
                page_image.save(full_path, "PNG")

            logger.debug(f"Generated full page image: {filename}")
            return url_path

        except Exception as e:
            error_msg = f"{context} Page {page_num}: Could not save full page image: {str(e)}" if context else f"Page {page_num}: Could not save full page image: {str(e)}"
            self._report_error(error_msg)
            return None

    def generate_cropped_image(
        self,
        cropped_page,
        unique_id: str,
        page_num: int,
        columns: Optional[List[float]] = None,
        context: Optional[str] = None,
        column_stroke: str = DEFAULT_COLUMN_STROKE,
        column_stroke_width: int = DEFAULT_COLUMN_STROKE_WIDTH
    ) -> Optional[str]:
        """
        Generate and save cropped page image with optional column overlays

        Args:
            cropped_page: pdfplumber cropped page object
            unique_id: Unique identifier for the file
            page_num: Page number
            columns: Optional list of x-coordinates for column lines
            context: Optional context string for error messages (e.g., filename)
            column_stroke: Color for column lines (default: "red")
            column_stroke_width: Width of column lines (default: 2)

        Returns:
            URL path to saved image, or None if generation failed
        """
        if not cropped_page:
            return None

        filename, full_path, url_path = self._build_image_filename(unique_id, page_num, "_cropped")

        try:
            with self.image_lock:
                cropped_image = cropped_page.to_image(resolution=self.resolution)

                # Draw column lines if provided
                if columns:
                    cropped_image.draw_vlines(
                        columns,
                        stroke=column_stroke,
                        stroke_width=column_stroke_width
                    )

                cropped_image.save(full_path, "PNG")

            logger.debug(f"Generated cropped page image: {filename}")
            return url_path

        except Exception as e:
            error_msg = f"{context} Page {page_num}: Could not save cropped image: {str(e)}" if context else f"Page {page_num}: Could not save cropped image: {str(e)}"
            self._report_error(error_msg)
            return None

    def generate_page_images_from_result(
        self,
        page_result,
        unique_id: str,
        page_num: int,
        context: Optional[str] = None
    ) -> tuple[Optional[str], Optional[str]]:
        """
        Generate both full page and cropped images from a PageResult object

        This is a convenience method for processing pdfplumber_processor PageResult objects.

        Args:
            page_result: PageResult object from pdfplumber_processor
            unique_id: Unique identifier for the file
            page_num: Page number
            context: Optional context string for error messages (e.g., filename)

        Returns:
            Tuple of (full_page_url, cropped_page_url) - either can be None if generation failed
        """
        full_page_url = None
        cropped_page_url = None

        # Generate full page image
        if hasattr(page_result, 'fullPage') and page_result.fullPage:
            full_page_url = self.generate_full_page_image(
                page_result.fullPage,
                unique_id,
                page_num,
                context
            )

        # Generate cropped image with columns
        if hasattr(page_result, 'croppedPage') and page_result.croppedPage:
            columns = None
            if hasattr(page_result, 'detectedColumns') and page_result.detectedColumns:
                columns = page_result.detectedColumns

            cropped_page_url = self.generate_cropped_image(
                page_result.croppedPage,
                unique_id,
                page_num,
                columns=columns,
                context=context
            )

        return full_page_url, cropped_page_url

    def generate_images_from_pdf(
        self,
        pdf,
        unique_id: str,
        context: Optional[str] = None
    ) -> List[tuple[int, str]]:
        """
        Generate full page images from all pages in a pdfplumber PDF

        Args:
            pdf: pdfplumber PDF object
            unique_id: Unique identifier for the file
            context: Optional context string for error messages (e.g., filename)

        Returns:
            List of tuples (page_number, image_url) for successfully generated images
        """
        results = []

        for page_num, page in enumerate(pdf.pages, 1):
            url = self.generate_full_page_image(page, unique_id, page_num, context)
            if url:
                results.append((page_num, url))

        return results
