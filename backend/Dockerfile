# Use Debian-based slim (example)
FROM python:3.11-slim

WORKDIR /app

# Install system build dependencies required by some numeric packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      build-essential \
      gcc \
      gfortran \
      libopenblas-dev \
      liblapack-dev \
      pkg-config \
      python3-dev \
      && rm -rf /var/lib/apt/lists/*

# Upgrade pip tooling so pyproject builds succeed
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r /tmp/requirements.txt

# Copy app and create data dir
COPY backend/ /app
RUN mkdir -p /app/data && python /app/train_model.py || echo "Model training failed or skipped"

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
