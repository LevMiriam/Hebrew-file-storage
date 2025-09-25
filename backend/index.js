const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development-only-change-in-production';

// Set production environment for Railway
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Database connection - Railway vs Local
let pool;
if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
  // Railway/Production - use xxxxxction string only
  pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });
} else {
  // Local Docker - use individual env vars
  pool = new Pool({
    user: process.env.DB_USER || 'fileapp',
    host: process.env.DB_HOST || 'postgres',  
    database: process.env.DB_NAME || 'fileapp',
    password: process.env.DB_PASSWORD || 'password123',
    port: process.env.DB_PORT || 5432,
    ssl: false
  });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Serve frontend static build (for Railway)
const frontendBuildPath = path.join(__dirname, 'build');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

// Create uploads directory if it doesn't exist
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration for file uploads with Hebrew support
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Ensure proper UTF-8 handling for Hebrew filenames
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    
    // Create a safe filename while preserving Hebrew characters
    const safeBaseName = baseName.replace(/[<>:"/\\|?*]/g, '_');
    const finalName = `${uniqueSuffix}_${safeBaseName}${extension}`;
    
    cb(null, finalName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Ensure proper UTF-8 handling for Hebrew filenames
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, true);
  }
});

// Initialize database
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type VARCHAR(100),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// User registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, passwordHash]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, username, email, password_hash FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload file
app.post('/api/files/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { filename, originalname, path: filePath, size, mimetype } = req.file;

    // Save file info to database
    const result = await pool.query(
      'INSERT INTO files (filename, original_name, file_path, file_size, mime_type, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [filename, originalname, filePath, size, mimetype, req.user.userId]
    );

    const fileRecord = result.rows[0];

    res.status(201).json({
      message: 'File uploaded successfully',
      file: {
        id: fileRecord.id,
        filename: fileRecord.filename,
        originalName: fileRecord.original_name,
        size: fileRecord.file_size,
        mimeType: fileRecord.mime_type,
        uploadedAt: fileRecord.uploaded_at
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Get user files
app.get('/api/files', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, filename, original_name, file_size, mime_type, uploaded_at FROM files WHERE user_id = $1 ORDER BY uploaded_at DESC',
      [req.user.userId]
    );

    const files = result.rows.map(file => ({
      id: file.id,
      filename: file.filename,
      originalName: file.original_name,
      size: file.file_size,
      mimeType: file.mime_type,
      uploadedAt: file.uploaded_at
    }));

    res.json({ files });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Failed to retrieve files' });
  }
});

// Download file
app.get('/api/files/:id/download', authenticateToken, async (req, res) => {
  try {
    const fileId = req.params.id;

    // Get file info from database
    const result = await pool.query(
      'SELECT filename, original_name, file_path, user_id FROM files WHERE id = $1',
      [fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];

    // Check if user owns the file
    if (file.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filePath = path.resolve(file.file_path);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // Send file
    res.download(filePath, file.original_name);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'File download failed' });
  }
});

// Delete file
app.delete('/api/files/:id', authenticateToken, async (req, res) => {
  try {
    const fileId = req.params.id;

    // Get file info from database
    const result = await pool.query(
      'SELECT file_path, user_id FROM files WHERE id = $1',
      [fileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = result.rows[0];

    // Check if user owns the file
    if (file.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete file from database
    await pool.query('DELETE FROM files WHERE id = $1', [fileId]);

    // Delete file from disk
    const filePath = path.resolve(file.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'File deletion failed' });
  }
});

// Start server
async function startServer() {
  try {
    console.log('🔄 Starting server...');
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🔗 Database URL exists:', !!process.env.DATABASE_URL);
    console.log('� POSTGRES_URL exists:', !!process.env.POSTGRES_URL);
    console.log('�🗝️  JWT Secret exists:', !!process.env.JWT_SECRET);
    console.log('📊 Using Railway config:', !!(process.env.DATABASE_URL || process.env.POSTGRES_URL));
    
    await initDatabase();
    
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📁 Upload directory: ${uploadDir}`);
      console.log(`🔗 API available at http://localhost:${PORT}/api`);
    });
    
    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();