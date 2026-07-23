#!/usr/bin/env python3
"""
PDF to Text processor for credit card statements using pdftotext and regex
"""

import os
import re
import subprocess
import tempfile
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, date


@dataclass
class StatementDate:
    """Statement date data model"""
    date: date  # Normalized date object


@dataclass
class KreditkarteTransaction:
    """Credit card transaction data model"""
    DatumBuchung: str
    Buchungstext: str
    Amount: float
    PageNumber: Optional[int] = None  # Optional page number


class PdfToTextProcessor:
    """Process credit card PDFs using pdftotext and regex extraction"""
    
    def __init__(self):
        # Private instance variable to store the statement date
        self._statement_date: Optional[date] = None
        
        # German month name to number mapping
        self.german_months = {
            'Januar': 1, 'Februar': 2, 'März': 3, 'April': 4,
            'Mai': 5, 'Juni': 6, 'Juli': 7, 'August': 8,
            'September': 9, 'Oktober': 10, 'November': 11, 'Dezember': 12
        }
        
        # Regex patterns for extracting statement date
        self.statement_date_patterns = [
            # Pattern 1: "Rechnungsdatum       05.02.2017" -> DD.MM.YYYY
            re.compile(r'Rechnungsdatum\s+(\d{2})\.(\d{2})\.(\d{4})'),
            # Pattern 2: "Rechnungsdatum:      03. März 2022" -> DD. Month YYYY
            re.compile(r'Rechnungsdatum:\s+(\d{2})\.\s*(\w+)\s+(\d{4})')
        ]
        
        # Regex pattern for extracting credit card transactions
        # Matches: spaces + date + spaces + date + text + amount
        # The text is captured non-greedily to avoid consuming the amount
        self.transaction_pattern = re.compile(
            r'^\s+[0-3]\d\.[01]\d\.?(?:[012]\d)?\s+([0-3]\d\.[01]\d\.?(?:[012]\d)?)\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})(?:\s+(\d+,\d{2} [a-zA-Z]{3})?\s*(\d{1,6},\d{1,10})?)?\s*$'
        )

        # Regex pattern to extract page number: (lot's of spaces)Seite X(/ or von)Y(lots of spaces)
        self.page_number_pattern = re.compile(r'^\s*Seite\s+(\d+)\s*(?:/|von)\s*(\d+)\s*$')
    
    def parse_pdf_to_text(self, pdf_path: str) -> List[str]:
        """
        Convert PDF to text using pdftotext with -layout option
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            List of text lines from the PDF
        """
        try:
            # Check if pdftotext is available
            result = subprocess.run(['which', 'pdftotext'], capture_output=True, text=True)
            if result.returncode != 0:
                raise Exception("pdftotext not found. Please install poppler-utils: brew install poppler")
            
            # Run pdftotext with -layout option
            result = subprocess.run(
                ['pdftotext', '-x', '50', '-W', '545', '-y', '0', '-H', '841', '-layout', '-nodiag', pdf_path, '-'],
                capture_output=True,
                text=True,
                check=True
            )
            
            # Split output into lines
            lines = result.stdout.split('\n')
            return lines
            
        except subprocess.CalledProcessError as e:
            raise Exception(f"Error running pdftotext: {e.stderr}")
        except Exception as e:
            raise Exception(f"Error processing PDF: {str(e)}")
    
    def parse_statement_date(self, line: str) -> Optional[date]:
        """
        Parse statement date from line and return normalized date object
        
        Args:
            line: Single line of text from PDF
            
        Returns:
            date object if pattern matches, None otherwise
        """
        # Try Pattern 1: DD.MM.YYYY
        match = self.statement_date_patterns[0].search(line)
        if match:
            day, month, year = match.groups()
            return datetime(int(year), int(month), int(day)).date()
        
        # Try Pattern 2: DD. MonthName YYYY
        match = self.statement_date_patterns[1].search(line)
        if match:
            day, month_name, year = match.groups()
            month_num = self.german_months.get(month_name)
            if month_num:
                return datetime(int(year), month_num, int(day)).date()
        
        return None
    
    def parse_pdf_line(self, line: str) -> Optional[KreditkarteTransaction]:
        """
        Parse a single line of text to extract transaction data or statement date
        
        Args:
            line: Single line of text from PDF
            
        Returns:
            KreditkarteTransaction object if transaction pattern matches, None otherwise
        """
        # Check for page number line
        page_match = self.page_number_pattern.match(line)
        if page_match:
            self.current_page = int(page_match.group(1)) # this always occurs at the bottom of the page, since we are zero indexed, leave as is.
            return None
        
        # Check if statement date is already set
        if self._statement_date is None:
            # Try to find and parse statement date
            parsed_date = self.parse_statement_date(line)
            if parsed_date:
                self._statement_date = parsed_date
                return None
            # If no statement date found, return None
            return None
        
        # Statement date is set, try to match transaction pattern
        match = self.transaction_pattern.match(line)
        if not match:
            return None
        
        # Extract matched groups
        datum_buchung = match.group(1)

        # If datum_buchung is DD.MM., then grab the year from _statement_date
        if datum_buchung.endswith('.'):
            # if the month part is 12 and statement month is 01, it means the transaction is from last year
            month_part = int(datum_buchung.split('.')[1])
            if month_part == 12 and self._statement_date.month == 1:
                datum_buchung = f"{datum_buchung}{self._statement_date.year - 1}"
            else:
                datum_buchung = f"{datum_buchung}{self._statement_date.year}"
        else:
            # check if datum_buchung is DD.MM.YY and convert to DD.MM.YYYY
            parts = datum_buchung.split('.')
            if len(parts) == 3 and len(parts[2]) == 2:
                year_part = int(parts[2])
                full_year = 2000 + year_part
                datum_buchung = f"{parts[0]}.{parts[1]}.{full_year}"

        buchungstext = match.group(2).strip()
        amount_str = match.group(3)
        
        # Check if it starts with a minus
        is_negative = amount_str.startswith('-')
        
        # Convert German number format to float
        # Remove dots (thousands separator) and replace comma with dot (decimal separator)
        amount_clean = amount_str.replace('-', '').replace('.', '').replace(',', '.')
        
        # Convert to float and apply sign
        amount = float(amount_clean)
        if is_negative:
            amount = -amount
        
        return KreditkarteTransaction(
            DatumBuchung=datum_buchung,
            Buchungstext=buchungstext,
            Amount=amount,
            PageNumber=self.current_page + 1
        )
    
    def reset_statement_date(self):
        """Reset the statement date for processing a new PDF"""
        self._statement_date = None

    def reset_current_page(self):
        """Reset current page for processing a new PDF, zero indexed."""
        self.current_page = 0
    
    def get_statement_date(self) -> Optional[date]:
        """Get the current statement date"""
        return self._statement_date
    
    def process_pdf(self, pdf_path: str) -> List[Dict]:
        """
        Process entire PDF and extract all transactions
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            List of transaction dictionaries
        """
        # Reset statement date for new PDF
        self.reset_statement_date()
        self.reset_current_page()

        # Get all lines from PDF
        lines = self.parse_pdf_to_text(pdf_path)
        
        # Extract transactions from lines
        transactions = []
        for line in lines:
            transaction = self.parse_pdf_line(line)
            if transaction:
                # Convert dataclass to dict for JSON serialization
                transactions.append(asdict(transaction))
        
        return transactions


# For testing
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        processor = PdfToTextProcessor()
        pdf_path = sys.argv[1]
        
        try:
            transactions = processor.process_pdf(pdf_path)
            print(f"Found {len(transactions)} transactions:")
            for t in transactions:
                print(f"  {t['DatumBuchung']} - {t['Buchungstext'][:50]}... - {t['Amount']}")
        except Exception as e:
            print(f"Error: {e}")
    else:
        print("Usage: python pdftotext_processor.py <pdf_path>")
