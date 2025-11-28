import pandas as pd
from typing import List, Dict, Tuple
import re

class Classifier:
    # Keywords to identify columns
    DATE_KEYWORDS = ["date", "txn date", "transaction date", "posting date", "value date"]
    DESC_KEYWORDS = ["description", "narration", "details", "particulars", "transaction details"]
    CREDIT_KEYWORDS = ["credit", "cr", "deposit", "amount"]
    DEBIT_KEYWORDS = ["debit", "dr", "withdrawal"]
    BALANCE_KEYWORDS = ["balance", "bal"]

    @classmethod
    def is_transaction_table(cls, df: pd.DataFrame) -> bool:
        """
        Determines if a dataframe represents a transaction table.
        Criteria:
        1. Has at least 3 rows (excluding header).
        2. Contains Date, Description, and Amount-like columns.
        """
        if df.empty or len(df) < 3:
            return False

        # Check headers (first row usually, or inferred headers)
        # We assume the dataframe passed here has headers set correctly or we inspect the first row
        headers = [str(c).lower() for c in df.columns]
        
        has_date = any(any(k in h for k in cls.DATE_KEYWORDS) for h in headers)
        has_desc = any(any(k in h for k in cls.DESC_KEYWORDS) for h in headers)
        has_amount = any(any(k in h for k in cls.CREDIT_KEYWORDS + cls.DEBIT_KEYWORDS) for h in headers)
        
        if has_date and has_desc and has_amount:
            return True
            
        # Fallback: Content inspection
        # Check if the first few rows look like transactions (Date-like, Numeric)
        # This is a simplified heuristic
        return False

    @classmethod
    def identify_columns(cls, df: pd.DataFrame) -> Dict[str, str]:
        """
        Maps dataframe columns to standard fields: txn_date, description, credit, debit, balance.
        Returns a dict: {'txn_date': 'ColName', ...}
        """
        mapping = {}
        headers = list(df.columns)
        
        for col in headers:
            col_lower = str(col).lower()
            
            if not mapping.get('txn_date') and any(k in col_lower for k in cls.DATE_KEYWORDS):
                mapping['txn_date'] = col
            elif not mapping.get('description') and any(k in col_lower for k in cls.DESC_KEYWORDS):
                mapping['description'] = col
            elif not mapping.get('credit') and any(k in col_lower for k in cls.CREDIT_KEYWORDS):
                mapping['credit'] = col
            elif not mapping.get('debit') and any(k in col_lower for k in cls.DEBIT_KEYWORDS):
                mapping['debit'] = col
            elif not mapping.get('balance') and any(k in col_lower for k in cls.BALANCE_KEYWORDS):
                mapping['balance'] = col
                
        # Handle case where only 'Amount' exists (could be mixed credit/debit)
        # For now, if we found 'credit' but not 'debit', and the column name is generic 'amount',
        # we might need smarter logic. But let's stick to the basics.
        
        return mapping
