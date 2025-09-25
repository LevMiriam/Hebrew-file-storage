
# Railway-optimized Dockerfile: build backend & frontend, serve static from backend
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# Copy backend source
COPY backend/ ./backend/

# Install frontend dependencies and build
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Copy frontend build to backend for static serving
RUN mkdir -p backend/build && cp -r frontend/build/* backend/build/

# Create uploads directory
RUN mkdir -p uploads

# Expose PORT for Railway
# Use $PORT in CMD to ensure we listen on Railway's assigned port
# DO NOT specify a port here - Railway will set this in the environment
EXPOSE $PORT

# Start backend
CMD ["node", "backend/index.js"]