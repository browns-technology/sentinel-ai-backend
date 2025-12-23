from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class TransactionCreate(BaseModel):
    amount: float = Field(..., gt=0)
    location: str
    device: str
    merchant: Optional[str] = None

class PredictionResponse(BaseModel):
    transaction_id: str
    risk_score: float
    is_anomaly: bool
    threat_level: str
    confidence: float
    explanation: dict