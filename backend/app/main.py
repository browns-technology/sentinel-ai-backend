from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import random
from datetime import datetime
import numpy as np
import joblib

app = FastAPI(title="Sentinel AI")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
        "https://*.onrender.com",
        "*" 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model
print("Loading model...")
try:
    model_data = joblib.load('data/trained_model.pkl')
    model = model_data['model']
    scaler = model_data['scaler']
    print("✓ Model loaded!")
except Exception as e:
    print(f"❌ Model load failed: {e}")
    model = None
    scaler = None

def predict_transaction(amount, hour, velocity, geo_distance):
    """Simple prediction"""
    if model is None:
        # Fallback if model not loaded
        risk_score = 0.8 if amount > 1000 else 0.3
    else:
        features = np.array([[amount, hour, velocity, geo_distance]])
        features_scaled = scaler.transform(features)
        anomaly_score = model.score_samples(features_scaled)[0]
        risk_score = 1 / (1 + np.exp(anomaly_score))
    
    is_anomaly = risk_score > 0.65
    
    if risk_score > 0.85:
        threat_level = "CRITICAL"
    elif risk_score > 0.65:
        threat_level = "HIGH"
    else:
        threat_level = "SAFE"
    
    return float(risk_score), bool(is_anomaly), threat_level

@app.get("/")
async def root():
    return {"status": "running", "message": "Sentinel AI Backend"}

@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": model is not None}

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    print("✓ WebSocket client connected!")
    
    locations = ['New York', 'London', 'Tokyo', 'Singapore', 'Dubai', 'Mumbai']
    devices = ['Mobile', 'Desktop', 'Tablet', 'ATM']
    merchants = ['Amazon', 'Walmart', 'Starbucks', 'Shell', 'Apple']
    
    count = 0
    
    try:
        while True:
            count += 1
            
            # Generate transaction
            is_anomaly_target = random.random() < 0.12
            
            if is_anomaly_target:
                amount = random.uniform(2000, 8000)
                hour = random.choice([2, 3, 4, 5])
                velocity = random.uniform(8, 15)
                geo_distance = random.uniform(1000, 5000)
            else:
                amount = random.uniform(10, 200)
                hour = random.randint(8, 22)
                velocity = random.uniform(0.5, 3)
                geo_distance = random.uniform(10, 500)
            
            # Get prediction
            risk_score, is_anomaly, threat_level = predict_transaction(
                amount, hour, velocity, geo_distance
            )
            
            # Build transaction
            transaction = {
                'id': f'TXN_{datetime.now().strftime("%Y%m%d%H%M%S")}_{random.randint(1000, 9999)}',
                'timestamp': datetime.now().isoformat(),
                'amount': round(amount, 2),
                'location': random.choice(locations),
                'device': random.choice(devices),
                'merchant': random.choice(merchants),
                'risk_score': risk_score,
                'is_anomaly': is_anomaly,
                'threat_level': threat_level,
                'confidence': 0.85 + random.random() * 0.15,
                'features': {
                    'velocity': velocity,
                    'geoDist': geo_distance,
                    'deviceChange': random.random() > 0.7,
                    'unusual_time': hour < 6,
                    'amount_spike': is_anomaly
                }
            }
            
            # Send to client
            message = {
                'type': 'transaction',
                'data': transaction
            }
            
            await websocket.send_json(message)
            
            # Log every 10 transactions
            if count % 10 == 0:
                print(f"📊 Sent {count} transactions. Last: ${amount:.2f} ({threat_level})")
            
            if is_anomaly:
                print(f"🚨 ANOMALY #{count}: ${amount:.2f} - {threat_level}")
            
            # Wait 1.2 seconds
            await asyncio.sleep(1.2)
            
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
    finally:
        print(f"🔌 Client disconnected after {count} transactions")

if __name__ == "__main__":
    import uvicorn
    import os
    
    port = int(os.getenv("PORT", 8000))
    
    print(f"""
    ╔══════════════════════════════════════════╗
    ║   🛡️  SENTINEL AI - Backend Started     ║
    ║   Port: {port}
    ╚══════════════════════════════════════════╝
    """)
    uvicorn.run(app, host="0.0.0.0", port=port)