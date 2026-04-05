FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y \
    git curl wget \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m playwright install --with-deps chromium
COPY --from=frontend-builder /app/dist ./dist
COPY . .
RUN mkdir -p workspace/screenshots
EXPOSE 3000
CMD ["uvicorn", "server:app", \
     "--host", "0.0.0.0", "--port", "3000"]
