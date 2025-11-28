import pdfplumber
import pandas as pd
from typing import List
from app.models.transaction import ExtractedTable

class PDFParser:
    @staticmethod
    def extract_tables(pdf_path: str) -> List[ExtractedTable]:
        """
        Extracts tables from a PDF using pdfplumber.
        """
        extracted_tables = []
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for i, page in enumerate(pdf.pages):
                    # pdfplumber extract_tables returns a list of lists of strings
                    tables = page.extract_tables()
                    
                    for table_data in tables:
                        # Clean up None values
                        cleaned_data = [
                            [cell if cell is not None else "" for cell in row]
                            for row in table_data
                        ]
                        
                        # Filter out empty rows or very small tables
                        if len(cleaned_data) < 2:
                            continue
                            
                        extracted_tables.append(ExtractedTable(
                            page_number=i + 1,
                            data=cleaned_data,
                            confidence=1.0 # Native extraction is high confidence
                        ))
                        
        except Exception as e:
            print(f"Error in PDFParser: {e}")
            # Log error properly in production
            pass
            
        return extracted_tables
