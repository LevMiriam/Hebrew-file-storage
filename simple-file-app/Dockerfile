# Multi-stage build for Railway deployment
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files for backend
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# Copy backend source
COPY backend/ ./backend/

# Copy package files for frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

# Copy frontend source and build
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Install serve globally
RUN npm install -g serve

# Copy docker-compose file
COPY docker-compose.yml ./

# Create uploads directory
RUN mkdir -p uploads

# Expose ports
EXPOSE 3000 3001 5432

# Default command - will be overridden by Railway
CMD ["node", "backend/index.js"]