from fastapi.testclient import TestClient
from app.core.config import settings
import os

def test_read_main(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Bank Statement PDF Parser API is running"}

def test_upload_invalid_file(client: TestClient):
    # Create a dummy text file
    files = {'file': ('test.txt', b'content', 'text/plain')}
    response = client.post(f"{settings.API_V1_STR}/upload", files=files)
    assert response.status_code == 400

# Note: We can't easily test valid PDF upload/extraction without a real PDF file.
# In a real CI/CD, we would generate a PDF on the fly or have a sample in repo.
# For now, we verify the endpoint structure.
