"""
PDFPlumber PDF Transaction Processor
Extracts transaction data from native PDF statements using pdfplumber
Returns data in the same format as targo_processor.py
"""

import re
from typing import List, Tuple, Dict, Optional, Any
from dataclasses import dataclass, asdict
import pdfplumber
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Transaction:
    """Represents a single transaction"""
    rowY: float
    Datum: str = ""
    Tag: str = ""
    Buchungstext: str = ""
    Ausgaben: str = ""
    Einnahmen: str = ""
    GuthabenKredit: str = ""

@dataclass
class PageResult:
    """Result for a single page processing"""
    pageNumber: int
    numberOfTransactions: int
    transactions: List[Dict[str, Any]]
    orphans: List[Dict[str, Any]]  # Will be empty for pdfplumber approach
    warnings: List[str]
    fullPage: Any = None  # Original full page
    croppedPage: Any = None  # Cropped page to table area
    detectedColumns: Optional[List[float]] = None  # X-coordinates of detected columns

class PdfPlumberProcessor:
    """Processes native PDF statements using pdfplumber to extract transactions"""
    
    # Expected column headers
    COLUMN_HEADERS = ["Datum", "Tag", "Buchungstext", "Ausgaben", "Einnahmen", "Guthaben/Kredit"]

    # End of table indicators
    FOOTER_INDICATORS = [["ENDSALDO"], ["Vorstand"]]
        
    def __init__(self, line_tolerance: float = 1.0, table_padding: float = 2.0, intersection_tolerance: float = 5.0, text_x_tolerance: float = 3.0, text_y_tolerance: float = 3.0):
        """
        Initialize processor with configurable table extraction tolerances
        
        Args:
            line_tolerance: Tolerance for grouping text into rows and snapping table lines
            table_padding: Padding applied to all sides of the table boundary
            intersection_tolerance: Tolerance for detecting intersecting lines in table structure
            text_x_tolerance: Tolerance for horizontal text grouping in table extraction
            text_y_tolerance: Tolerance for vertical text grouping in table extraction
        """
        self.line_tolerance = line_tolerance
        self.intersection_tolerance = intersection_tolerance
        self.text_x_tolerance = text_x_tolerance
        self.text_y_tolerance = text_y_tolerance
        self.table_pt = table_padding
        self.table_pb = table_padding
        self.table_pl = table_padding
        self.table_pr = table_padding

    def find_named_row_y(self, page, named_indicators: List[str], direction: int = 1) -> float:
        """
        Find the named row in a page given a list of strings (named_indicators) 
        that make up the header row.  ALL INDICATORS MUST BE FOUND IN THE SAME ROW 
        for that row to be identified as a named row.  Return that found row's
        y-coordinate (top).

        Args:
            page: pdfplumber page object.
            named_indicators: a list of strings that contain the names we are looking for.

        Returns:
            An integer denoting the named row's top y-coordinate.
            
        Raises:
            ValueError: If no row containing all indicators is found.
        """
        # Get all words with their positions
        words = page.extract_words()
        
        # Group words by their y-position (with tolerance for slight misalignment)
        y_tolerance = self.line_tolerance
        rows = {}
        for word in words:
            y_key = round(word['top'] / y_tolerance) * y_tolerance
            if y_key not in rows:
                rows[y_key] = []
            rows[y_key].append(word)

        # Debug write grouped rows to console
        for y_pos, row_words in sorted(rows.items()):
            row_text = '|'.join([w['text'] for w in row_words])
        
        # Check each row for all indicators
        for y_pos, row_words in sorted(rows.items()):
            row_text = ' '.join([w['text'] for w in row_words])
            
            # Check if ALL indicators are in this row
            if all(indicator in row_text for indicator in named_indicators):
                if direction == 1:
                    # Return the actual top y-coordinate (not the rounded key)
                    return min(w['top'] for w in row_words)
                else:
                    return max(w['bottom'] for w in row_words)

        logger.info(f"No row found containing all indicators: {named_indicators}")
        return -1  # Indicate not found

    def auto_detect_columns(self, page, header_row_y: float) -> List[float]:
        """
        Auto-detect the columns like shown above.  However, the FIRST word in the row 
        should take the x0 - self.table_pl (which is a configuration value).  Also, the 
        final line should not be the page edge, rather it should be the LAST word's
        x1 + self.table_pr.
        
        Args:
            page: pdfplumber page object.
            header_row_y: The y-coordinate of the header row top.
            
        Returns:
            A list of x-coordinates representing vertical column boundaries.
        """
        # Define a band around the header row to extract words
        header_band = (0, header_row_y - 2, page.width, header_row_y + 15)
        header_words = page.within_bbox(header_band).extract_words()

        if not header_words:
            raise ValueError(f"No words found at header row y={header_row_y}")
        
        # Sort words by x-position
        header_words.sort(key=lambda w: w['x0'])

        # Filter the header_words to only those that match expected headers
        filtered_header_words = []
        for expected_header in self.COLUMN_HEADERS:
            for word in header_words:
                if expected_header.lower() in word['text'].lower():
                    filtered_header_words.append(word)
                    break

        # Sort filtered words by x-position
        filtered_header_words.sort(key=lambda w: w['x0'])

        # Build column boundaries
        columns = []
        
        # First column starts before the first word
        columns.append(filtered_header_words[0]['x0'] - self.table_pl + 1)
        
        # Add start position of each word (except the first)
        for word in filtered_header_words[1:]:
            columns.append(word['x0'])
        
        # Last boundary is after the last word
        columns.append(filtered_header_words[-1]['x1'] + self.table_pr - 1)

        return columns

    def build_table_bbox(self, header_row_y: float, footer_row_y: float, 
                        detected_columns: List[float]) -> Tuple[float, float, float, float]:
        """
        Build a bounding box tuple from the parameters: x0 is 1st element in
        detected_columns, top is header_row_y - self.table_pt, x1 is the last 
        element in detected_columns, bottom is footer_row_y - self.table_pb. 
        The specific table header row is searched, therefore, we want to give the 
        top padding from that y point.  However, with the footer, we want to 
        EXCLUDE that footer from the table, therefore the padding is ALSO a removal.
        
        Args:
            header_row_y: Top y-coordinate of the header row.
            footer_row_y: Top y-coordinate of the footer row.
            detected_columns: List of x-coordinates for column boundaries.
            
        Returns:
            A tuple (x0, top, x1, bottom) defining the table bounding box.
        """
        if not detected_columns:
            raise ValueError("detected_columns cannot be empty")
            
        x0 = detected_columns[0] - self.table_pl
        x1 = detected_columns[-1] + self.table_pr
        top = header_row_y - self.table_pt - 5  # Extra 5 to include header row
        bottom = footer_row_y + self.table_pb + 5 # Subtract to exclude footer
        
        return (x0, top, x1, bottom)

    def build_table_extract_config(self, column_config: List[float]) -> Dict[str, Any]:
        """
        We want to build the extraction config here.  I will have a self.line_snap_tolerance
        configuration value for the snap_tolerance and join_tolerance parameters. 
        "vertical_strategy" should be "explicit" and "explicit_vertical_lines" should be
        column_config.  "horizontal_strategy" should be "lines".
        
        Args:
            column_config: List of x-coordinates defining vertical column boundaries.
            
        Returns:
            Dictionary containing pdfplumber table extraction settings.
        """
        return {
            "vertical_strategy": "explicit",
            "horizontal_strategy": "lines",
            "explicit_vertical_lines": column_config,
            "snap_tolerance": self.line_tolerance,
            "join_tolerance": self.line_tolerance,
            "edge_min_length": 3,
            "min_words_vertical": 1,  # Allow columns with just numbers
            "min_words_horizontal": 1,
            "text_x_tolerance": self.text_x_tolerance,
            "text_y_tolerance": self.text_y_tolerance,
            "intersection_tolerance": self.intersection_tolerance,
        }

    def normalize_column_header(self, header: str) -> str:
        """
        Normalize column header text to match expected headers
        
        Args:
            header: Raw header text from PDF
            
        Returns:
            Normalized header name
        """
        if not header:
            return ""
        
        header = header.strip()
        
        # Handle Guthaben/Kredit variations
        if any(word in header.lower() for word in ['guthaben', 'kredit']):
            return 'Guthaben/Kredit'
        
        # Direct matches
        for expected_header in self.COLUMN_HEADERS:
            if expected_header.lower() in header.lower():
                return expected_header
        
        return header

    def map_table_to_transactions(self, table: List[List[str]], page_height: float) -> List[Dict[str, Any]]:
        """
        Map extracted table data to Transaction objects
        
        Args:
            table: Raw table data from pdfplumber
            page_height: Height of the page for rowY calculation
            
        Returns:
            List of transaction dictionaries
        """
        if not table or len(table) < 2:
            return []
        
        transactions = []
        
        # First row should be headers
        headers = [self.normalize_column_header(cell) if cell else "" for cell in table[0]]
        
        # Create column mapping
        column_mapping = {}
        for i, header in enumerate(headers):
            if header in self.COLUMN_HEADERS:
                column_mapping[i] = header

        logger.info(f"Column mapping: {column_mapping}")
        
        # Process data rows
        for row_idx, row in enumerate(table[1:], 1):
            if not row or all(not cell or not cell.strip() for cell in row):
                continue  # Skip empty rows
            
            # Calculate approximate rowY (higher row index = lower on page)
            row_y = (row_idx / len(table)) * page_height
            
            transaction = Transaction(rowY=row_y)
            
            # Map cells to transaction fields
            for col_idx, cell_value in enumerate(row):
                if col_idx in column_mapping:
                    field_name = column_mapping[col_idx]
                    cell_text = cell_value.strip() if cell_value else ""
                    
                    if field_name == "Datum":
                        transaction.Datum = cell_text
                    elif field_name == "Tag":
                        transaction.Tag = cell_text
                    elif field_name == "Buchungstext":
                        transaction.Buchungstext = cell_text
                    elif field_name == "Ausgaben":
                        transaction.Ausgaben = cell_text
                    elif field_name == "Einnahmen":
                        transaction.Einnahmen = cell_text
                    elif field_name == "Guthaben/Kredit":
                        transaction.GuthabenKredit = cell_text
            
            transactions.append(asdict(transaction))
        
        return transactions

    def handle_continuation_rows(self, transactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Handle continuation rows (rows with only Buchungstext that should be appended to previous row)
        
        Args:
            transactions: List of transaction dictionaries
            
        Returns:
            Processed list with continuation rows merged
        """
        if not transactions:
            return transactions
        
        processed_transactions = []
        
        for transaction in transactions:
            # Check if this is a continuation row (only has Buchungstext)
            has_only_buchungstext = (
                transaction.get('Buchungstext', '').strip() and
                not transaction.get('Datum', '').strip() and
                not transaction.get('Tag', '').strip() and
                not transaction.get('Ausgaben', '').strip() and
                not transaction.get('Einnahmen', '').strip() and
                not transaction.get('GuthabenKredit', '').strip()
            )
            
            if has_only_buchungstext and processed_transactions:
                # Append to previous transaction's Buchungstext
                last_transaction = processed_transactions[-1]
                existing_text = last_transaction.get('Buchungstext', '').strip()
                continuation_text = transaction.get('Buchungstext', '').strip()
                
                if existing_text:
                    last_transaction['Buchungstext'] = existing_text + "\n" + continuation_text
                else:
                    last_transaction['Buchungstext'] = continuation_text
                    
                logger.info("Merged continuation row with previous transaction")
            else:
                # Add as new transaction
                processed_transactions.append(transaction)
        
        return processed_transactions

    def process_page(self, page, page_number: int) -> PageResult:
        """
        Process a single page to extract transactions using pdfplumber
        
        Args:
            page: pdfplumber page object
            page_number: Page number (1-indexed)
            
        Returns:
            PageResult object containing extracted transactions and metadata
        """
        warnings = []
        
        logger.info(f"Processing page {page_number} with pdfplumber...")
        
        try:
            # Find the "Transaktionen" header row
            header_row_y = self.find_named_row_y(page, self.COLUMN_HEADERS)
            if header_row_y == -1:
                raise ValueError("No transactions table header found")
            
            # Find ENDSALDO or TARGOBANK Vorstand footer row
            footer_row_y = -1
            for indicators in self.FOOTER_INDICATORS:
                footer_row_y = self.find_named_row_y(page, indicators, direction=-1)
                if footer_row_y != -1:
                    break
            if footer_row_y == -1:
                raise ValueError("No transactions table footer found")
            
        except ValueError as e:
            warnings.append(f"No transactions table found on page {page_number}: {str(e)}")
            return PageResult(
                pageNumber=page_number,
                numberOfTransactions=0,
                transactions=[],
                orphans=[],
                warnings=warnings,
                fullPage=page,
                croppedPage=None
            )
        
        try:
            # Log the header row
            logger.info(f"Found header at y={header_row_y}")
            # Log the footer row
            logger.info(f"Found footer at y={footer_row_y}")
            
            # Auto-detect columns
            detected_columns = self.auto_detect_columns(page, header_row_y)
            logger.info(f"Detected {len(detected_columns)} column boundaries")
            
            # Build table bounding box
            table_bbox = self.build_table_bbox(header_row_y, footer_row_y, detected_columns)
            logger.info(f"Table bounding box: {table_bbox}")
            
            # Crop page to table area
            cropped_page = page.crop(table_bbox)

            # Build extraction config
            extract_config = self.build_table_extract_config(detected_columns)
            logger.info(f"Table extraction config: {extract_config}")
            
            # Extract table
            table = cropped_page.extract_table(extract_config)
            logger.info(f"Extracted table with {len(table) if table else 0} rows")
            
            if not table or len(table) < 2:
                warnings.append(f"No table data extracted from page {page_number}")
                return PageResult(
                    pageNumber=page_number,
                    numberOfTransactions=0,
                    transactions=[],
                    orphans=[],
                    warnings=warnings,
                    fullPage=page,
                    croppedPage=cropped_page,
                    detectedColumns=detected_columns
                )
            
            # Map table data to transactions
            transactions = self.map_table_to_transactions(table, page.height)
            
            # Handle continuation rows
            transactions = self.handle_continuation_rows(transactions)
            
            # Filter out transactions without Datum
            valid_transactions = [t for t in transactions if t.get('Datum', '').strip()]
            
            if len(valid_transactions) != len(transactions):
                filtered_count = len(transactions) - len(valid_transactions)
                warnings.append(f"Filtered out {filtered_count} transactions without Datum on page {page_number}")
            
            logger.info(f"Extracted {len(valid_transactions)} valid transactions from page {page_number}")
            
            return PageResult(
                pageNumber=page_number,
                numberOfTransactions=len(valid_transactions),
                transactions=valid_transactions,
                orphans=[],  # No orphans with this approach
                warnings=warnings,
                fullPage=page,
                croppedPage=cropped_page,
                detectedColumns=detected_columns
            )
            
        except Exception as e:
            error_msg = f"Error processing page {page_number}: {str(e)}"
            logger.error(error_msg)
            warnings.append(error_msg)
            
            return PageResult(
                pageNumber=page_number,
                numberOfTransactions=0,
                transactions=[],
                orphans=[],
                warnings=warnings,
                fullPage=page,
                croppedPage=None
            )

    def process_pdf(self, pdf_path: str) -> List[PageResult]:
        """
        Process entire PDF file to extract transactions from all pages
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            List of PageResult objects, one for each page
        """
        results = []
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                logger.info(f"Processing PDF with {len(pdf.pages)} pages...")
                
                for page_num, page in enumerate(pdf.pages, 1):
                    result = self.process_page(page, page_num)
                    results.append(result)
                    
        except Exception as e:
            logger.error(f"Error processing PDF {pdf_path}: {e}")
            # Return empty result with error
            results.append(PageResult(
                pageNumber=1,
                numberOfTransactions=0,
                transactions=[],
                orphans=[],
                warnings=[f"Error processing PDF: {str(e)}"]
            ))
        
        return results
