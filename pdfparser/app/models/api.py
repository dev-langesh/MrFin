from typing import List, Optional
from pydantic import BaseModel
from app.models.transaction import Transaction

class ExtractionResponse(BaseModel):
    status: str
    tables_detected: int
    transactions_extracted: int
    data: List[Transaction]
    file_id: Optional[str] = None
    message: Optional[str] = None

class UploadResponse(BaseModel):
    file_id: str
    filename: str
    message: str
