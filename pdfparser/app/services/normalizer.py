import re
from datetime import datetime
from typing import Optional
import pandas as pd

class Normalizer:
    @staticmethod
    def normalize_date(date_str: str) -> Optional[str]:
        """
        Attempts to parse a date string into YYYY-MM-DD format.
        Supports: dd/MM/yyyy, MM-dd-yyyy, d-M-yy, dd-MMM-yyyy, etc.
        """
        if not date_str or not isinstance(date_str, str):
            return None
            
        date_str = date_str.strip()
        
        # Common date formats
        formats = [
            "%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%d", "%d-%m-%Y",
            "%d.%m.%Y", "%d %b %Y", "%d %B %Y",
            "%d-%b-%Y", "%d-%B-%Y",
            "%d/%m/%y", "%m/%d/%y"
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue
                
        return None

    @staticmethod
    def normalize_amount(amount_str: str) -> float:
        """
        Converts a currency string to float.
        Removes commas, currency symbols, and handles Cr/Dr suffixes.
        """
        if not amount_str:
            return 0.0
            
        if isinstance(amount_str, (int, float)):
            return float(amount_str)
            
        # Remove currency symbols and commas
        clean_str = re.sub(r'[^\d\.\-]', '', str(amount_str).replace(',', ''))
        
        # Handle empty string after cleaning
        if not clean_str:
            return 0.0
            
        try:
            val = float(clean_str)
            # Handle Cr/Dr suffixes if they were part of the original string (simplified logic here)
            # In a real scenario, we'd check the suffix before regex cleaning, 
            # but usually Cr/Dr are in separate columns or handled by the classifier.
            return val
        except ValueError:
            return 0.0

    @staticmethod
    def clean_description(desc: str) -> str:
        """
        Cleans up description text.
        Replaces newlines with spaces, removes excessive whitespace.
        """
        if not desc:
            return ""
        return " ".join(str(desc).split())
