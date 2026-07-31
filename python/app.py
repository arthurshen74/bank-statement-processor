#!/usr/bin/env python3
"""
Flask API for PDF Table Analysis
Provides endpoints for PDF upload and table structure recognition
"""

import os
import uuid
import json
import zipfile
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
from flask import Flask, request, jsonify, send_from_directory, Response, stream_with_context
from flask_cors import CORS
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import re
from typing import List, Dict, Tuple, Optional
from pdfplumber_processor import PdfPlumberProcessor
from pdftotext_processor import PdfToTextProcessor
from file_handler import FileHandler, FilePatterns, ExtractionResult
from image_service import ImageService
from sse_handler import SSEMessageQueue, SSEResponse
from utils import extract_date_from_filename, extract_statement_year_from_iso_date
import pdfplumber
from statement_repository import StatementRepository
from statement_normalizer import StatementNormalizer
from logger_config import setup_logging, get_logger
import logging

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
STATIC_FOLDER = 'static'
ALLOWED_EXTENSIONS = {'pdf', 'zip'}
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB max file size (increased for ZIP files)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Create directories
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(STATIC_FOLDER, exist_ok=True)

# Initialize global lock for image generation to prevent heap corruption
image_generation_lock = Lock()

# Initialize file handler
file_handler = FileHandler(UPLOAD_FOLDER, MAX_CONTENT_LENGTH)

# Initialize image service
image_service = ImageService(STATIC_FOLDER, image_generation_lock)

# Initialize statement repository
statement_repository = StatementRepository()

# Initialize logger
logger = get_logger(__name__)

def _store_page_image(url_path: Optional[str], metadata: Dict) -> Optional[str]:
    """
    Upload a staged page image to GridFS and always remove the staging file.

    The removal is in a finally block on purpose: when the GridFS write raises,
    the caller still needs the staging file gone, otherwise every failed ingest
    leaks a PNG into the static folder.

    Args:
        url_path: '/static/<name>.png' as returned by ImageService, or None
        metadata: Metadata to attach to the GridFS file

    Returns:
        ObjectId of the stored file, or None if url_path was None
    """
    if not url_path:
        return None

    path = os.path.join(STATIC_FOLDER, url_path.split('/')[-1])
    try:
        return statement_repository.save_image_to_gridfs(path, metadata=metadata)
    finally:
        try:
            os.remove(path)
        except OSError as e:
            logger.warning(f'Failed to remove staging file {path}: {e}')


@app.route('/')
def index():
    """Serve the React app"""
    return send_from_directory('frontend/dist', 'index.html')

@app.route('/static/<path:filename>')
def serve_static(filename):
    """Serve static files"""
    return send_from_directory(STATIC_FOLDER, filename)


@app.route('/api/process-pdflib-pdf', methods=['POST'])
def process_pdflib_pdf():
    """Process PDF or ZIP file using PDFPlumber to extract transactions with SSE and concurrent processing"""

    def process_single_pdf(pdf_path, filename, unique_id, tolerances, sse_queue):
        """Process a single PDF file and return results"""
        try:
            # Extract date from filename
            statement_date = extract_date_from_filename(filename)

            # Calculate statement year
            statement_year = extract_statement_year_from_iso_date(statement_date)

            # Initialize PDFPlumber processor
            processor = PdfPlumberProcessor(
                line_tolerance=tolerances['line_tolerance'],
                table_padding=tolerances['table_padding'],
                intersection_tolerance=tolerances['intersection_tolerance'],
                text_x_tolerance=tolerances['text_x_tolerance'],
                text_y_tolerance=tolerances['text_y_tolerance']
            )

            # Add status message
            sse_queue.add_status(f'Processing {filename}...')

            # Process PDF directly with PDFPlumber
            all_results = processor.process_pdf(pdf_path)
            total_pages = len(all_results)
            total_transactions = sum(result.numberOfTransactions for result in all_results)

            # Process images using ImageService
            formatted_results = []
            image_object_ids = []  # Track GridFS ObjectIds for MongoDB

            # Create error callback for image generation
            def image_error_callback(error_msg):
                sse_queue.add_warning(error_msg)

            # Temporarily set error callback
            original_callback = image_service.error_callback
            image_service.error_callback = image_error_callback

            for page_num, page_result in enumerate(all_results, 1):
                # Generate full page and cropped images
                full_page_url, cropped_image_url = image_service.generate_page_images_from_result(
                    page_result,
                    unique_id,
                    page_num,
                    context=filename
                )

                # Save images to GridFS
                try:
                    # Always stage the cropped image out first: if the full page
                    # upload fails the cropped file must still be cleaned up.
                    cropped_page_oid = _store_page_image(
                        cropped_image_url,
                        metadata={
                            'filename': filename,
                            'pageNumber': page_num,
                            'imageType': 'cropped'
                        }
                    )

                    full_page_oid = _store_page_image(
                        full_page_url,
                        metadata={
                            'filename': filename,
                            'pageNumber': page_num,
                            'imageType': 'full'
                        }
                    )
                    if full_page_oid is None:
                        raise ValueError("Full page URL is None")

                    # Store ObjectIds for normalization
                    image_object_ids.append({
                        'pageNumber': page_num,
                        'imageId': full_page_oid,
                        'croppedImageId': cropped_page_oid
                    })

                except Exception as img_error:
                    sse_queue.add_warning(f'Failed to save images to GridFS for page {page_num}: {str(img_error)}')
                    logger.error(f'GridFS save error: {img_error}')

                # Convert PageResult to dict and add image URLs
                result_dict = {
                    'pageNumber': page_result.pageNumber,
                    'numberOfTransactions': page_result.numberOfTransactions,
                    'transactions': page_result.transactions,
                    'orphans': page_result.orphans,
                    'warnings': page_result.warnings,
                    'imageUrl': full_page_url,
                    'croppedImageUrl': cropped_image_url
                }

                formatted_results.append(result_dict)

            # Restore original error callback
            image_service.error_callback = original_callback

            # Build result structure for normalization
            processing_result = {
                'filename': filename,
                'statementDate': statement_date,
                'statementYear': statement_year,
                'pages': formatted_results,
                'totalTransactions': total_transactions,
                'extractionConfig': tolerances
            }

            # Normalize and save to MongoDB
            statement_id = None
            try:
                sse_queue.add_status(f'Saving {filename} to database...')

                # Normalize the result
                normalized_statement = StatementNormalizer.normalize_pdflib_result(
                    processing_result,
                    image_object_ids
                )

                # Check for duplicate
                duplicate_id = statement_repository.check_duplicate(
                    normalized_statement.fileName,
                    normalized_statement.statementDate
                )

                if duplicate_id:
                    sse_queue.add_warning(f'{filename} already exists in database (ID: {duplicate_id})')
                    statement_id = duplicate_id
                else:
                    # Save to MongoDB
                    statement_id = statement_repository.save_statement(normalized_statement)
                    sse_queue.add_status(f'{filename} saved to database (ID: {statement_id})')

            except Exception as mongo_error:
                sse_queue.add_warning(f'Failed to save {filename} to database: {str(mongo_error)}')
                logger.error(f'MongoDB save error: {mongo_error}')

            # Add completion message
            sse_queue.add_status(f'{filename}: Extracted {total_transactions} transactions from {total_pages} pages')

            return {
                'filename': filename,
                'statementId': statement_id,
                'statementDate': statement_date,
                'statementYear': statement_year,
                'transactionCount': total_transactions,
                'pageCount': total_pages,
                'savedToDatabase': statement_id is not None
            }

        except Exception as e:
            sse_queue.add_warning(f'Error processing {filename}: {str(e)}')
            logger.error(f'Processing error for {filename}: {e}')
            return None
    
    def generate():
        try:
            # Get file from request
            file = request.files.get('file')

            # Get tolerance parameters from request (with defaults)
            tolerances = {
                'line_tolerance': float(request.form.get('line_tolerance', 1.0)),
                'table_padding': float(request.form.get('table_padding', 2.0)),
                'intersection_tolerance': float(request.form.get('intersection_tolerance', 5.0)),
                'text_x_tolerance': float(request.form.get('text_x_tolerance', 3.0)),
                'text_y_tolerance': float(request.form.get('text_y_tolerance', 3.0))
            }

            # Process upload using FileHandler
            try:
                yield SSEResponse.status('Extracting ZIP file...')
                extraction_result = file_handler.process_upload(
                    file, # type: ignore
                    patterns=[FilePatterns.GIROKONTO]
                )

                yield SSEResponse.status(f'Found {len(extraction_result.files)} matching PDF files in ZIP')

            except ValueError as e:
                yield SSEResponse.error(str(e))
                return

            # Prepare list of PDFs to process
            pdf_files = [
                (extracted.path, extracted.filename, extracted.unique_id)
                for extracted in extraction_result.files
            ]
            temp_dir = extraction_result.temp_dir

            try:

                # Process PDFs
                yield SSEResponse.status(f'Starting processing of {len(pdf_files)} file(s)...')

                # Setup for concurrent processing
                statements = []
                sse_queue = SSEMessageQueue()
                
                # Process files concurrently (max 5 threads)
                max_workers = min(5, len(pdf_files))
                
                if len(pdf_files) > 1:
                    yield SSEResponse.status(f'Processing {len(pdf_files)} files concurrently (up to {max_workers} at a time)...')

                    with ThreadPoolExecutor(max_workers=max_workers) as executor:
                        # Submit all tasks
                        future_to_pdf = {
                            executor.submit(process_single_pdf, pdf_path, pdf_name, pdf_id, tolerances, sse_queue): (pdf_path, pdf_name)
                            for pdf_path, pdf_name, pdf_id in pdf_files
                        }

                        # Process results as they complete
                        for future in as_completed(future_to_pdf):
                            # Send any queued messages
                            for msg in sse_queue.drain():
                                yield msg

                            pdf_path, pdf_name = future_to_pdf[future]
                            try:
                                result = future.result()
                                if result:
                                    statements.append(result)
                                    yield SSEResponse.progress(
                                        f'Completed {len(statements)} of {len(pdf_files)} files',
                                        len(statements),
                                        len(pdf_files)
                                    )
                            except Exception as e:
                                yield SSEResponse.warning(f'Failed to process {pdf_name}: {str(e)}')

                            # Clean up the PDF file if it was extracted from ZIP
                            file_handler.cleanup_pdf(pdf_path, temp_dir)
                else:
                    # Single file, process normally
                    pdf_path, pdf_name, pdf_id = pdf_files[0]
                    result = process_single_pdf(pdf_path, pdf_name, pdf_id, tolerances, sse_queue)

                    # Send any queued messages
                    for msg in sse_queue.drain():
                        yield msg

                    if result:
                        statements.append(result)

                # Clean up all temporary files
                extraction_result.cleanup()

                # Send summary
                total_statements = len(statements)
                total_transactions = sum(s.get('transactionCount', 0) for s in statements)
                saved_count = sum(1 for s in statements if s.get('savedToDatabase', False))

                if total_statements > 0:
                    yield SSEResponse.status(f'Processing complete! Processed {total_statements} statement(s) with {total_transactions} total transactions')
                    yield SSEResponse.status(f'Saved {saved_count} of {total_statements} statements to database')

                    # Send final results
                    yield SSEResponse.complete('Analysis complete!', {'success': True, 'savedStatements': statements})
                else:
                    yield SSEResponse.error('No statements could be processed successfully')

            except Exception as e:
                # Clean up on error
                extraction_result.cleanup()
                raise e
                
        except Exception as e:
            print(f"Error processing files: {e}")
            import traceback
            traceback.print_exc()
            yield SSEResponse.error(f'Error processing files: {str(e)}')
    
    return Response(stream_with_context(generate()), mimetype='text/event-stream')

@app.route('/api/process-creditcard-pdftotext', methods=['POST'])
def process_creditcard_pdftotext():
    """Process credit card PDF or ZIP using pdftotext and regex extraction with SSE"""

    def process_single_pdf(pdf_path, filename, unique_id, sse_queue):
        """Process a single PDF file and return results"""
        try:
            # Extract date from filename
            statement_date = extract_date_from_filename(filename)

            # Calculate statement year
            statement_year = extract_statement_year_from_iso_date(statement_date)

            # Add status message
            sse_queue.add_status(f'Processing {filename}...')

            # Initialize pdftotext processor for transaction extraction
            processor = PdfToTextProcessor()

            # Extract transactions using pdftotext
            transactions = processor.process_pdf(pdf_path)

            # Open PDF with pdfplumber to generate page images
            formatted_results = []
            image_object_ids = []  # Track GridFS ObjectIds for MongoDB

            # Create error callback for image generation
            def image_error_callback(error_msg):
                sse_queue.add_warning(error_msg)

            # Temporarily set error callback
            original_callback = image_service.error_callback
            image_service.error_callback = image_error_callback

            with pdfplumber.open(pdf_path) as pdf:
                total_pages = len(pdf.pages)

                # generate images for each page and link that page's transactions
                for page_num, page in enumerate(pdf.pages, 1):
                    # Generate page image using ImageService
                    image_url = image_service.generate_full_page_image(
                        page,
                        unique_id,
                        page_num,
                        context=filename
                    )

                    # Save image to GridFS
                    try:
                        image_oid = _store_page_image(
                            image_url,
                            metadata={
                                'filename': filename,
                                'pageNumber': page_num,
                                'imageType': 'full'
                            }
                        )
                        if image_oid is None:
                            raise ValueError("Image URL is None")

                        # Store ObjectId for normalization
                        image_object_ids.append({
                            'pageNumber': page_num,
                            'imageId': image_oid
                        })

                    except Exception as img_error:
                        sse_queue.add_warning(f'Failed to save image to GridFS for page {page_num}: {str(img_error)}')
                        logger.error(f'GridFS save error: {img_error}')

                    # Filter transactions for this page
                    page_transactions = [t for t in transactions if t['PageNumber'] == page_num]

                    result_dict = {
                        'pageNumber': page_num,
                        'numberOfTransactions': len(page_transactions),
                        'transactions': page_transactions,
                        'imageUrl': image_url
                    }

                    formatted_results.append(result_dict)

            # Restore original error callback
            image_service.error_callback = original_callback

            total_transactions = len(transactions)

            # Build result structure for normalization
            processing_result = {
                'filename': filename,
                'statementDate': statement_date,
                'statementYear': statement_year,
                'pages': formatted_results,
                'totalTransactions': total_transactions
            }

            # Normalize and save to MongoDB
            statement_id = None
            try:
                sse_queue.add_status(f'Saving {filename} to database...')

                # Normalize the result
                normalized_statement = StatementNormalizer.normalize_creditcard_result(
                    processing_result,
                    image_object_ids
                )

                # Check for duplicate
                duplicate_id = statement_repository.check_duplicate(
                    normalized_statement.fileName,
                    normalized_statement.statementDate
                )

                if duplicate_id:
                    sse_queue.add_warning(f'{filename} already exists in database (ID: {duplicate_id})')
                    statement_id = duplicate_id
                else:
                    # Save to MongoDB
                    statement_id = statement_repository.save_statement(normalized_statement)
                    sse_queue.add_status(f'{filename} saved to database (ID: {statement_id})')

            except Exception as mongo_error:
                sse_queue.add_warning(f'Failed to save {filename} to database: {str(mongo_error)}')
                logger.error(f'MongoDB save error: {mongo_error}')

            # Add completion message
            sse_queue.add_status(f'{filename}: Extracted {total_transactions} transactions from {total_pages} pages')

            return {
                'filename': filename,
                'statementId': statement_id,
                'statementDate': statement_date,
                'statementYear': statement_year,
                'transactionCount': total_transactions,
                'pageCount': total_pages,
                'savedToDatabase': statement_id is not None
            }

        except Exception as e:
            sse_queue.add_warning(f'Error processing {filename}: {str(e)}')
            logger.error(f'Processing error for {filename}: {e}')
            import traceback
            traceback.print_exc()
            return None
    
    def generate():
        try:
            # Get file from request
            file = request.files.get('file')

            # Process upload using FileHandler
            try:
                yield SSEResponse.status('Extracting ZIP file...')
                extraction_result = file_handler.process_upload(
                    file, # type: ignore
                    patterns=[FilePatterns.CREDITCARD]
                )

                yield SSEResponse.status(f'Found {len(extraction_result.files)} matching credit card PDF files in ZIP')

            except ValueError as e:
                yield SSEResponse.error(str(e))
                return

            # Prepare list of PDFs to process
            pdf_files = [
                (extracted.path, extracted.filename, extracted.unique_id)
                for extracted in extraction_result.files
            ]
            temp_dir = extraction_result.temp_dir

            try:
                # Process PDFs
                yield SSEResponse.status(f'Starting processing of {len(pdf_files)} credit card statement(s)...')

                # Setup for concurrent processing
                statements = []
                sse_queue = SSEMessageQueue()
                
                # Process files concurrently (max 5 threads)
                max_workers = min(5, len(pdf_files))
                
                if len(pdf_files) > 1:
                    yield SSEResponse.status(f'Processing {len(pdf_files)} files concurrently (up to {max_workers} at a time)...')

                    with ThreadPoolExecutor(max_workers=max_workers) as executor:
                        # Submit all tasks
                        future_to_pdf = {
                            executor.submit(process_single_pdf, pdf_path, pdf_name, pdf_id, sse_queue): (pdf_path, pdf_name)
                            for pdf_path, pdf_name, pdf_id in pdf_files
                        }

                        # Process results as they complete
                        for future in as_completed(future_to_pdf):
                            # Send any queued messages
                            for msg in sse_queue.drain():
                                yield msg

                            pdf_path, pdf_name = future_to_pdf[future]
                            try:
                                result = future.result()
                                if result:
                                    statements.append(result)
                                    yield SSEResponse.progress(
                                        f'Completed {len(statements)} of {len(pdf_files)} files',
                                        len(statements),
                                        len(pdf_files)
                                    )
                            except Exception as e:
                                yield SSEResponse.warning(f'Failed to process {pdf_name}: {str(e)}')

                            # Clean up the PDF file if it was extracted from ZIP
                            file_handler.cleanup_pdf(pdf_path, temp_dir)
                else:
                    # Single file, process normally
                    pdf_path, pdf_name, pdf_id = pdf_files[0]
                    result = process_single_pdf(pdf_path, pdf_name, pdf_id, sse_queue)

                    # Send any queued messages
                    for msg in sse_queue.drain():
                        yield msg

                    if result:
                        statements.append(result)

                # Clean up all temporary files
                extraction_result.cleanup()

                # Send summary
                total_statements = len(statements)
                total_transactions = sum(s.get('transactionCount', 0) for s in statements)
                saved_count = sum(1 for s in statements if s.get('savedToDatabase', False))

                if total_statements > 0:
                    yield SSEResponse.status(f'Processing complete! Processed {total_statements} credit card statement(s) with {total_transactions} total transactions')
                    yield SSEResponse.status(f'Saved {saved_count} of {total_statements} statements to database')

                    # Send final results
                    yield SSEResponse.complete('Analysis complete!', {'success': True, 'savedStatements': statements})
                else:
                    yield SSEResponse.error('No credit card statements could be processed successfully')

            except Exception as e:
                # Clean up on error
                extraction_result.cleanup()
                raise e
                
        except Exception as e:
            print(f"Error processing credit card files: {e}")
            import traceback
            traceback.print_exc()
            yield SSEResponse.error(f'Error processing credit card files: {str(e)}')
    
    return Response(stream_with_context(generate()), mimetype='text/event-stream')

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    # The static folder only ever holds images in flight to GridFS, so anything
    # still there is an orphan from a run that failed mid-upload. Sweep it once,
    # in the reloader's parent process: the child re-executes this file on every
    # code change, and purging there would delete another request's in-flight
    # staging file whenever a hot reload landed during an ingest.
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        if os.getenv('PURGE_STATIC_ON_STARTUP', 'true').lower() not in ('false', '0', 'no'):
            image_service.purge_static_folder()

    app.run(debug=True, host='0.0.0.0', port=int(os.getenv('PYTHON_PORT', '5001')))
