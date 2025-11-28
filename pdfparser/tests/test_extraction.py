import pytest
import pandas as pd
from app.services.classifier import Classifier
from app.services.normalizer import Normalizer

def test_classifier_transaction_table(sample_transaction_df, sample_garbage_df):
    assert Classifier.is_transaction_table(sample_transaction_df) is True
    assert Classifier.is_transaction_table(sample_garbage_df) is False

def test_classifier_identify_columns(sample_transaction_df):
    mapping = Classifier.identify_columns(sample_transaction_df)
    assert mapping['txn_date'] == 'Date'
    assert mapping['description'] == 'Description'
    assert mapping['credit'] == 'Credit'
    assert mapping['debit'] == 'Debit'

def test_normalizer_date():
    assert Normalizer.normalize_date("01/01/2023") == "2023-01-01"
    assert Normalizer.normalize_date("2023-01-01") == "2023-01-01"
    assert Normalizer.normalize_date("1 Jan 2023") == "2023-01-01"
    assert Normalizer.normalize_date("Invalid") is None

def test_normalizer_amount():
    assert Normalizer.normalize_amount("1,000.00") == 1000.0
    assert Normalizer.normalize_amount("1000") == 1000.0
    assert Normalizer.normalize_amount("$100.50") == 100.5
    assert Normalizer.normalize_amount("") == 0.0
    assert Normalizer.normalize_amount(None) == 0.0

def test_normalizer_description():
    desc = "  Multi\nLine  Description  "
    assert Normalizer.clean_description(desc) == "Multi Line Description"
