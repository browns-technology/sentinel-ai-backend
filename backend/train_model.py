import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib

def create_training_data():
    print("Generating training data...")
    np.random.seed(42)
    n_samples = 10000
    
    # Normal transactions
    normal_data = {
        'amount': np.random.lognormal(3.5, 0.8, int(n_samples * 0.85)),
        'hour': np.random.choice(range(8, 23), int(n_samples * 0.85)),
        'velocity': np.random.exponential(2, int(n_samples * 0.85)),
        'geo_distance': np.random.exponential(100, int(n_samples * 0.85)),
        'is_fraud': np.zeros(int(n_samples * 0.85))
    }
    
    # Anomalous transactions
    anomaly_data = {
        'amount': np.random.uniform(1000, 5000, int(n_samples * 0.15)),
        'hour': np.random.choice([2, 3, 4, 5], int(n_samples * 0.15)),
        'velocity': np.random.uniform(8, 15, int(n_samples * 0.15)),
        'geo_distance': np.random.uniform(1000, 5000, int(n_samples * 0.15)),
        'is_fraud': np.ones(int(n_samples * 0.15))
    }
    
    df_normal = pd.DataFrame(normal_data)
    df_anomaly = pd.DataFrame(anomaly_data)
    df = pd.concat([df_normal, df_anomaly], ignore_index=True)
    
    return df

def train_model():
    print("Training Isolation Forest model...")
    
    df = create_training_data()
    X = df.drop('is_fraud', axis=1)
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    model = IsolationForest(
        contamination=0.15,
        random_state=42,
        n_estimators=100
    )
    model.fit(X_scaled)
    
    model_data = {
        'model': model,
        'scaler': scaler,
        'feature_names': list(X.columns)
    }
    
    joblib.dump(model_data, 'data/trained_model.pkl')
    
    predictions = model.predict(X_scaled)
    anomalies = (predictions == -1).sum()
    
    print(f"✓ Model trained successfully!")
    print(f"  - Training samples: {len(X)}")
    print(f"  - Detected anomalies: {anomalies} ({anomalies/len(X)*100:.1f}%)")
    print(f"  - Model saved to: data/trained_model.pkl")

if __name__ == "__main__":
    train_model()