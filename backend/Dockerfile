FROM python:3.11-slim

WORKDIR /app/backend
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/*.py ./
COPY backend/models ./models
COPY cassava_ai_outputs_fast /app/cassava_ai_outputs_fast

ENV CASSAVA_MODEL_PATH=/app/cassava_ai_outputs_fast/cassava_best_model.compat.keras
ENV LOCAL_MODEL_PATH=/app/backend/models/plant-disease.pt
ENV AGROVISION_DB_PATH=/data/agrovision.db
RUN mkdir -p /data

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
