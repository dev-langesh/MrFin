from datetime import date
from typing import Optional
from pydantic import BaseModel, Field

class Transaction(BaseModel):
    txn_date: date = Field(..., alias="txnDate")
    description: str
    credit: float = 0.0
    debit: float = 0.0
    balance: Optional[float] = None

    class Config:
        populate_by_name = True

class ExtractedTable(BaseModel):
    """Represents a raw table extracted from PDF"""
    page_number: int
    data: list[list[str]]  # List of rows, where each row is a list of cell texts
    confidence: float = 0.0
