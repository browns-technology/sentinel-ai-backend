import joblib
import numpy as np
from typing import Dict, Tuple
import logging

logger = logging.getLogger(__name__)

class AnomalyDetector:
    def __init__(self, model_path: str):
        self.model_path = model_path
        self.model = None
        self.scaler = None
        self.feature_names = None
        self.load_model()
    
    def load_model(self):
        try:
            model_data = joblib.load(self.model_path)
            # use .get to avoid KeyError if structure differs
            self.model = model_data.get('model')
            self.scaler = model_data.get('scaler')
            self.feature_names = model_data.get('feature_names', [])
            logger.info(f"✓ Model loaded from {self.model_path}")
        except Exception as e:
            # Do not raise here — allow the application to start without a trained model.
            logger.error(f"Failed to load model '{self.model_path}': {e}")
            self.model = None
            self.scaler = None
            self.feature_names = []
    
    def extract_features(self, transaction: Dict) -> np.ndarray:
        features = {
            'amount': transaction['amount'],
            'hour': transaction.get('hour', 12),
            'velocity': transaction.get('velocity', 1.0),
            'geo_distance': transaction.get('geo_distance', 100)
        }
        
        feature_vector = [features[name] for name in self.feature_names]
        return np.array(feature_vector).reshape(1, -1)
    
    def predict(self, transaction: Dict) -> Tuple[float, bool, str, Dict]:
        features = self.extract_features(transaction)
        features_scaled = self.scaler.transform(features)
        
        anomaly_score = self.model.score_samples(features_scaled)[0]
        risk_score = 1 / (1 + np.exp(anomaly_score))
        
        is_anomaly = risk_score > 0.65
        
        if risk_score > 0.85:
            threat_level = "CRITICAL"
        elif risk_score > 0.65:
            threat_level = "HIGH"
        elif risk_score > 0.45:
            threat_level = "MEDIUM"
        else:
            threat_level = "SAFE"
        
        explanation = {
            'amount_flag': transaction['amount'] > 1000,
            'time_flag': transaction.get('hour', 12) < 6,
            'velocity_flag': transaction.get('velocity', 1) > 5,
            'geo_flag': transaction.get('geo_distance', 100) > 1000
        }
        
        return risk_score, is_anomaly, threat_level, explanation

detector = None

def get_detector(model_path: str) -> AnomalyDetector:
    global detector
    if detector is None:
        detector = AnomalyDetector(model_path)
    return detector