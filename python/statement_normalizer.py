"""
Service for normalizing PDF processing results into the standard Statement format.
Handles conversion from both pdflib (girokonto) and pdftotext (kreditkarte) formats.
"""

import re
from datetime import datetime, date
from typing import Dict, Any, List, Optional
from decimal import Decimal, InvalidOperation
from statement_models import Statement, StatementPage, StatementTransaction


class StatementNormalizer:
    """Normalizes different PDF processing outputs into standard Statement format."""

    PROVIDER_TARGOBANK = "targobank"
    TYPE_GIROKONTO = "girokonto"
    TYPE_KREDITKARTE = "kreditkarte"

    @staticmethod
    def extract_statement_date_from_filename(filename: str) -> Optional[str]:
        """
        Extract statement date from filename pattern.
        Expected patterns:
        - Ihr Finanzstatus vom 2023-01-31.pdf
        - Ihre Kreditkartenabrechnung vom 2023-01-31.pdf

        Returns:
            ISO date string (YYYY-MM-DD) or None if not found
        """
        pattern = r'vom[_\s]+(\d{4}-\d{2}-\d{2})'
        match = re.search(pattern, filename)
        if match:
            return match.group(1)
        return None

    @staticmethod
    def parse_german_decimal(value: str) -> float:
        """
        Parse German decimal format to float.
        Examples:
        - "1.234,56" -> 1234.56
        - "1234,56" -> 1234.56
        - "123,45" -> 123.45

        Args:
            value: String in German decimal format

        Returns:
            Float value
        """
        if not value or value.strip() == '':
            return 0.0

        # Remove thousand separators (dots) and replace comma with dot
        clean_value = value.replace('.', '').replace(',', '.')

        try:
            return float(clean_value)
        except (ValueError, InvalidOperation):
            return 0.0

    @staticmethod
    def parse_girokonto_amount(ausgaben: str, einnahmen: str) -> float:
        """
        Convert Girokonto Ausgaben/Einnahmen columns to single amount.

        Args:
            ausgaben: Expense value (should be negative)
            einnahmen: Income value (should be positive)

        Returns:
            Float amount (negative for expenses, positive for income)
        """
        ausgaben_clean = ausgaben.strip() if ausgaben else ''
        einnahmen_clean = einnahmen.strip() if einnahmen else ''

        if ausgaben_clean and ausgaben_clean != '':
            # Ausgaben (expense) should be negative
            return -abs(StatementNormalizer.parse_german_decimal(ausgaben_clean))
        elif einnahmen_clean and einnahmen_clean != '':
            # Einnahmen (income) should be positive
            return abs(StatementNormalizer.parse_german_decimal(einnahmen_clean))
        else:
            return 0.0

    @staticmethod
    def normalize_date(date_str: str, statement_date: Optional[str] = None) -> str:
        """
        Normalize various date formats to ISO format (YYYY-MM-DD).

        Args:
            date_str: Date string in various formats
            statement_date: Reference statement date for inferring year

        Returns:
            ISO date string (YYYY-MM-DD)
        """
        if not date_str or date_str.strip() == '':
            return ''

        date_str = date_str.strip()

        # Already in ISO format (YYYY-MM-DD)
        if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
            return date_str

        # Format: DD.MM.YYYY
        match = re.match(r'^(\d{2})\.(\d{2})\.(\d{4})$', date_str)
        if match:
            day, month, year = match.groups()
            return f"{year}-{month}-{day}"

        # Format: DD.MM.YY (two-digit year)
        match = re.match(r'^(\d{2})\.(\d{2})\.(\d{2})$', date_str)
        if match:
            day, month, year = match.groups()
            # Assume 20YY for years 00-99
            full_year = f"20{year}"
            return f"{full_year}-{month}-{day}"

        # Format: DD.MM. (partial date with trailing period, need to infer year from statement)
        match = re.match(r'^(\d{2})\.(\d{2})\.$', date_str)
        if match and statement_date:
            day, month = match.groups()
            year = statement_date[:4]  # Extract year from statement date
            return f"{year}-{month}-{day}"

        # Format: DD.MM (partial date without year, need to infer year from statement)
        # This is the common format for girokonto transactions
        match = re.match(r'^(\d{2})\.(\d{2})$', date_str)
        if match and statement_date:
            day, month = match.groups()
            year = statement_date[:4]  # Extract year from statement date
            return f"{year}-{month}-{day}"

        # If we can't parse, return as-is
        return date_str

    @staticmethod
    def normalize_pdflib_result(
        result: Dict[str, Any],
        image_object_ids: List[Dict[str, Any]]
    ) -> Statement:
        """
        Normalize pdflib (Girokonto) processing result.

        Args:
            result: The processing result from process-pdflib endpoint
            image_object_ids: List of dicts with pageNumber, imageId, croppedImageId

        Returns:
            Normalized Statement object
        """
        filename = result.get('filename', '')
        statement_date = StatementNormalizer.extract_statement_date_from_filename(filename)

        if not statement_date and 'statementDate' in result:
            statement_date = result['statementDate']

        statement_year = None
        # extract year from statement_date if possible, if the statement day
        # is in the first week of the month, assume the transactions are from 
        # the previous month        
        match = re.search(r'(\d{4})-(\d{2})-(\d{2})', statement_date)
        if match:
            year, month, day = map(int, match.groups())
            if day <= 7:
                if month == 1:
                    statement_year = year - 1
                else:
                    statement_year = year
            else:
                statement_year = year
        
        if not statement_year and 'statementYear' in result:
            statement_year = result['statementYear']

        pages = []
        total_transactions = 0

        for page_data in result.get('pages', []):
            page_number = page_data.get('pageNumber', 0)

            # Find corresponding image ObjectIds
            image_info = next(
                (img for img in image_object_ids if img['pageNumber'] == page_number),
                None
            )

            if not image_info:
                continue

            # Convert transactions
            transactions = []
            for tx in page_data.get('transactions', []):
                # Parse date
                booking_date = StatementNormalizer.normalize_date(
                    tx.get('Datum', ''),
                    statement_date
                )

                # Parse amount from Ausgaben/Einnahmen
                amount = StatementNormalizer.parse_girokonto_amount(
                    tx.get('Ausgaben', ''),
                    tx.get('Einnahmen', '')
                )

                # Get booking text
                booking_text = tx.get('Buchungstext', '').strip()

                transactions.append(StatementTransaction(
                    bookingDate=booking_date,
                    bookingText=booking_text,
                    amount=amount
                ))

            total_transactions += len(transactions)

            # Create page
            statement_page = StatementPage(
                pageNumber=page_number,
                pageImage=image_info['imageId'],
                pageImageCropped=image_info.get('croppedImageId'),
                numberOfTransactions=len(transactions),
                transactions=transactions
            )

            pages.append(statement_page)

        # Create statement
        statement = Statement(
            statementType=StatementNormalizer.TYPE_GIROKONTO,
            statementProvider=StatementNormalizer.PROVIDER_TARGOBANK,
            fileName=filename,
            statementDate=statement_date or '',
            statementYear=statement_year or 0,
            numberOfTransactions=total_transactions,
            ingestDate=datetime.utcnow().isoformat(),
            pages=pages
        )

        return statement

    @staticmethod
    def normalize_creditcard_result(
        result: Dict[str, Any],
        image_object_ids: List[Dict[str, Any]]
    ) -> Statement:
        """
        Normalize pdftotext (Kreditkarte) processing result.

        Args:
            result: The processing result from process-creditcard-pdftotext endpoint
            image_object_ids: List of dicts with pageNumber, imageId

        Returns:
            Normalized Statement object
        """
        filename = result.get('filename', '')
        statement_date = StatementNormalizer.extract_statement_date_from_filename(filename)

        if not statement_date and 'statementDate' in result:
            statement_date = result['statementDate']

        statement_year = None
        # extract year from statement_date if possible, if the statement day
        # is in the first week of the month, assume the transactions are from 
        # the previous month        
        match = re.search(r'(\d{4})-(\d{2})-(\d{2})', statement_date)
        if match:
            year, month, day = map(int, match.groups())
            if day <= 7:
                if month == 1:
                    statement_year = year - 1
                else:
                    statement_year = year
            else:
                statement_year = year
        
        if not statement_year and 'statementYear' in result:
            statement_year = result['statementYear']

    
        pages = []
        total_transactions = 0

        for page_data in result.get('pages', []):
            page_number = page_data.get('pageNumber', 0)

            # Find corresponding image ObjectId
            image_info = next(
                (img for img in image_object_ids if img['pageNumber'] == page_number),
                None
            )

            if not image_info:
                continue

            # Convert transactions
            transactions = []
            for tx in page_data.get('transactions', []):
                # Parse date
                booking_date = StatementNormalizer.normalize_date(
                    tx.get('DatumBuchung', ''),
                    statement_date
                )

                # Amount is already a float (negative for debits)
                amount = float(tx.get('Amount', 0.0))

                # Get booking text
                booking_text = tx.get('Buchungstext', '').strip()

                transactions.append(StatementTransaction(
                    bookingDate=booking_date,
                    bookingText=booking_text,
                    amount=amount
                ))

            total_transactions += len(transactions)

            # Create page (no cropped image for credit cards)
            statement_page = StatementPage(
                pageNumber=page_number,
                pageImage=image_info['imageId'],
                pageImageCropped=None,
                numberOfTransactions=len(transactions),
                transactions=transactions
            )

            pages.append(statement_page)

        # Create statement
        statement = Statement(
            statementType=StatementNormalizer.TYPE_KREDITKARTE,
            statementProvider=StatementNormalizer.PROVIDER_TARGOBANK,
            fileName=filename,
            statementDate=statement_date or '',
            statementYear=statement_year or 0,
            numberOfTransactions=total_transactions,
            ingestDate=datetime.utcnow().isoformat(),
            pages=pages
        )

        return statement
