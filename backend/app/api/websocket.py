from fastapi import WebSocket, WebSocketDisconnect
from typing import List
import asyncio
import random
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manage WebSocket connections"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"✓ Client connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"✗ Client disconnected. Remaining: {len(self.active_connections)}")
    
    async def send_to_client(self, websocket: WebSocket, message: dict):
        """Send message to a specific client"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"❌ Error sending to client: {e}")

manager = ConnectionManager()

async def generate_transaction_stream(detector, websocket: WebSocket, client_id: int):
    """
    Generate realistic transaction stream for a specific client
    
    Args:
        detector: ML model detector
        websocket: WebSocket connection
        client_id: Unique client identifier
    """
    logger.info(f"🎬 Starting transaction generator for client {client_id}")
    
    locations = ['New York', 'London', 'Tokyo', 'Singapore', 'Dubai', 'Mumbai']
    devices = ['Mobile', 'Desktop', 'Tablet', 'ATM']
    merchants = ['Amazon', 'Walmart', 'Starbucks', 'Shell', 'Apple', 'Target', 'Best Buy']
    
    transaction_count = 0
    
    try:
        while True:
            transaction_count += 1
            
            # Generate random transaction
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
            
            transaction = {
                'id': f'TXN_{datetime.now().strftime("%Y%m%d%H%M%S")}_{random.randint(1000, 9999)}',
                'timestamp': datetime.now().isoformat(),
                'amount': round(amount, 2),
                'location': random.choice(locations),
                'device': random.choice(devices),
                'merchant': random.choice(merchants),
                'hour': hour,
                'velocity': velocity,
                'geo_distance': geo_distance
            }
            
            # Get ML prediction
            try:
                risk_score, is_anomaly, threat_level, explanation = detector.predict(transaction)
                
                transaction['risk_score'] = float(risk_score)
                transaction['is_anomaly'] = bool(is_anomaly)
                transaction['threat_level'] = threat_level
                transaction['confidence'] = float(0.85 + random.random() * 0.15)
                transaction['features'] = {
                    'velocity': velocity,
                    'geoDist': geo_distance,
                    'deviceChange': random.random() > 0.7,
                    'unusual_time': hour < 6,
                    'amount_spike': is_anomaly
                }
                
                # Send to this specific client
                message = {
                    'type': 'transaction',
                    'data': transaction
                }
                
                await manager.send_to_client(websocket, message)
                
                # Log every 10th transaction
                if transaction_count % 10 == 0:
                    logger.info(f"📊 Client {client_id}: Sent {transaction_count} transactions, last: ${amount:.2f} ({threat_level})")
                
                # Log anomalies
                if is_anomaly:
                    logger.warning(f"🚨 Client {client_id}: ANOMALY detected! ${amount:.2f} - {threat_level}")
                
            except Exception as e:
                logger.error(f"❌ Error generating transaction for client {client_id}: {e}")
            
            # Wait before next transaction (1.2 seconds)
            await asyncio.sleep(1.2)
            
    except asyncio.CancelledError:
        logger.info(f"🛑 Stream generator cancelled for client {client_id} after {transaction_count} transactions")
        raise
    except Exception as e:
        logger.error(f"❌ Fatal error in stream for client {client_id}: {e}")
        raise