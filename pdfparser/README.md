# Bank Statement PDF Parser

A production-ready FastAPI microservice to extract transaction tables from bank statement PDFs.

## Features

- **Multi-Table Extraction**: Handles multiple tables and identifies the correct transaction table.
- **OCR Fallback**: Uses PaddleOCR for scanned documents or when native extraction fails.
- **Intelligent Classification**: Automatically detects transaction tables based on column headers and content.
- **Data Normalization**: Standardizes dates and numeric formats.

## Setup

1.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
    *Note: You may need to install system dependencies for OpenCV and PaddleOCR.*

2.  **Run the Server**:
    ```bash
    uvicorn app.main:app --reload
    ```

3.  **API Documentation**:
    Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) to view the Swagger UI.

## Usage

### Upload a PDF
`POST /upload`
- Body: `file` (multipart/form-data)
- Returns: `{"file_id": "..."}`

### Extract Transactions
`POST /extract`
- Body: `{"file_id": "..."}` or upload file directly.
- Returns: JSON with extracted transactions.

## Project Structure

- `app/services/extractor.py`: Main orchestration logic.
- `app/services/pdf_parser.py`: Native PDF extraction (pdfplumber/camelot).
- `app/services/ocr_parser.py`: OCR extraction (PaddleOCR).
- `app/services/classifier.py`: Table identification logic.
