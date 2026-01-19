FROM python:3.11-slim

WORKDIR /app

# Install system build deps required to build pandas/scipy from source
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc g++ gfortran python3-dev pkg-config \
    libopenblas-dev liblapack-dev ninja-build meson cython \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /tmp/requirements.txt
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r /tmp/requirements.txt

COPY /app
RUN mkdir -p /app/data && python /app/train_model.py || echo "Model training failed or skipped"

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
