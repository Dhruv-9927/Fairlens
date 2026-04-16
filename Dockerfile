# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Serve the backend + frontend via FastAPI
FROM python:3.11-slim
WORKDIR /app

# Copy the backend requirements and install them
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend application code
COPY backend/ .

# Copy the datasets directory
COPY datasets/ /app/datasets

# Copy the pre-built React frontend into a static directory inside the backend app
COPY --from=frontend-builder /app/frontend/dist /app/static

# Cloud Run injects the PORT environment variable (default 8080)
EXPOSE 8080

# Command to run the application using uvicorn
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:=8080}"]
