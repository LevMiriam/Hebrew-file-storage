
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

# Expose backend port - Railway will override this with PORT env
EXPOSE 3001

# Start backend
CMD ["node", "backend/index.js"]