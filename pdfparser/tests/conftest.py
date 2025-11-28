import pytest
from fastapi.testclient import TestClient
from app.main import app
import pandas as pd

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def sample_transaction_df():
    data = {
        "Date": ["01/01/2023", "02/01/2023", "03/01/2023"],
        "Description": ["Opening Balance", "Transfer In", "ATM Withdrawal"],
        "Debit": ["", "", "100.00"],
        "Credit": ["", "500.00", ""],
        "Balance": ["1000.00", "1500.00", "1400.00"]
    }
    return pd.DataFrame(data)

@pytest.fixture
def sample_garbage_df():
    data = {
        "Header 1": ["Row 1", "Row 2"],
        "Header 2": ["Val 1", "Val 2"]
    }
    return pd.DataFrame(data)
