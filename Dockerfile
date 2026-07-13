# Stage 1: Build the React frontend
FROM node:20 as frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup Python backend and serve
FROM python:3.11-slim
WORKDIR /app

# Install FFmpeg for video compression
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Install backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Set the working directory to backend where main.py is located
WORKDIR /app/backend

# Railway automatically sets the $PORT environment variable
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
