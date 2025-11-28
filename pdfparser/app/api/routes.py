import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from app.core.config import settings
from app.models.api import UploadResponse, ExtractionResponse
from app.services.extractor import ExtractorService

router = APIRouter()

@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """
    Uploads a PDF file and returns a file ID.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF allowed.")
    
    file_id = str(uuid.uuid4())
    file_path = settings.UPLOAD_DIR / f"{file_id}.pdf"
    
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save file: {e}")
        
    return UploadResponse(
        file_id=file_id,
        filename=file.filename,
        message="File uploaded successfully"
    )

@router.post("/extract", response_model=ExtractionResponse)
async def extract_transactions(file_id: str):
    """
    Extracts transactions from a previously uploaded file.
    """
    file_path = settings.UPLOAD_DIR / f"{file_id}.pdf"
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
        
    try:
        result = ExtractorService.extract_transactions(str(file_path))
        result["file_id"] = file_id
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {e}")
