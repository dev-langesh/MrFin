import pandas as pd
from typing import List, Dict
from app.services.pdf_parser import PDFParser
from app.services.ocr_parser import OCRParser
from app.services.classifier import Classifier
from app.services.normalizer import Normalizer
from app.models.transaction import Transaction, ExtractedTable

class ExtractorService:
    @staticmethod
    def extract_transactions(pdf_path: str) -> Dict:
        """
        Main entry point for extraction.
        1. Try Native PDF Extraction
        2. If no valid tables, try OCR (Not fully implemented in MVP)
        3. Classify tables
        4. Normalize data
        5. Return result
        """
        # 1. Extract raw tables
        raw_tables: List[ExtractedTable] = PDFParser.extract_tables(pdf_path)
        
        # 2. OCR Fallback (if needed)
        if not raw_tables:
            # raw_tables = OCRParser.extract_tables(pdf_path)
            pass

        valid_transactions = []
        tables_detected = len(raw_tables)
        
        for table in raw_tables:
            # Convert to DataFrame
            if not table.data:
                continue
                
            # Assume first row is header
            df = pd.DataFrame(table.data[1:], columns=table.data[0])
            
            # 3. Classify
            if Classifier.is_transaction_table(df):
                # Identify columns
                col_map = Classifier.identify_columns(df)
                
                # Extract data
                for _, row in df.iterrows():
                    txn = ExtractorService._process_row(row, col_map)
                    if txn:
                        valid_transactions.append(txn)

        # Sort by date
        valid_transactions.sort(key=lambda x: x.txn_date, reverse=True)
        
        return {
            "status": "success",
            "tables_detected": tables_detected,
            "transactions_extracted": len(valid_transactions),
            "data": valid_transactions
        }

    @staticmethod
    def _process_row(row: pd.Series, col_map: Dict[str, str]) -> Transaction:
        try:
            # Get raw values
            date_str = row.get(col_map.get('txn_date'))
            desc_str = row.get(col_map.get('description'))
            credit_str = row.get(col_map.get('credit'))
            debit_str = row.get(col_map.get('debit'))
            
            # Normalize
            txn_date = Normalizer.normalize_date(str(date_str))
            if not txn_date:
                return None
                
            description = Normalizer.clean_description(str(desc_str))
            credit = Normalizer.normalize_amount(credit_str)
            debit = Normalizer.normalize_amount(debit_str)
            
            # Basic validation: Must have a date and at least one amount or description
            if not description and credit == 0 and debit == 0:
                return None
                
            return Transaction(
                txnDate=txn_date, # Alias used in model
                description=description,
                credit=credit,
                debit=debit
            )
        except Exception:
            return None
