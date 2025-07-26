const express = require('express');
const cors = require('cors');
const path = require('path');
const { downloadVideo, listDownloads } = require('./downloadController');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'YouTube Cue Point Editor',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.post('/api/download', downloadVideo);
app.get('/api/downloads', listDownloads);

// Serve static files from downloads directory
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// Serve built frontend in production
if (isProduction) {
  // Serve static files from frontend build
  app.use(express.static(path.join(__dirname, 'frontend/dist')));
  
  // Handle React Router - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    // Skip API routes and downloads
    if (req.path.startsWith('/api/') || req.path.startsWith('/downloads/') || req.path.startsWith('/health')) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'API endpoint not found',
        path: req.path 
      });
    }
    res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
  });
} else {
  // Development mode - show API info
  app.get('/', (req, res) => {
    res.json({
      message: 'YouTube Cue Point Editor API',
      status: 'running',
      environment: 'development',
      endpoints: {
        health: '/health',
        download: 'POST /api/download',
        downloads: 'GET /api/downloads',
        files: 'GET /downloads/:filename'
      },
      frontend: 'Run `npm run dev:frontend` in a separate terminal'
    });
  });
  
  // 404 handler for development
  app.use('*', (req, res) => {
    res.status(404).json({
      status: 'error',
      message: 'Endpoint not found',
      path: req.originalUrl
    });
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 YouTube Cue Point Editor running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Downloads will be stored in: ${path.join(__dirname, 'downloads')}`);
  
  if (isProduction) {
    console.log(`📱 Frontend: http://localhost:${PORT}`);
  } else {
    console.log(`🔧 Backend API: http://localhost:${PORT}`);
    console.log(`📱 Frontend: Run 'npm run dev:frontend' for development`);
  }
  
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📥 Download endpoint: http://localhost:${PORT}/api/download`);
  
  // Check for required dependencies
  console.log('\n📋 Required system dependencies:');
  console.log('   - yt-dlp (install: pip install yt-dlp)');
  console.log('   - ffmpeg (install: brew install ffmpeg on macOS)');
  console.log('   - ffprobe (usually comes with ffmpeg)');
});

module.exports = app;
