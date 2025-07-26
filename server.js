const express = require('express');
const cors = require('cors');
const path = require('path');
const { downloadVideo, listDownloads } = require('./downloadController');

const app = express();
const PORT = process.env.PORT || 3001;

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
    service: 'YouTube Cue Point Editor Backend'
  });
});

// API Routes
app.post('/api/download', downloadVideo);
app.get('/api/downloads', listDownloads);

// Serve static files from downloads directory
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

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
  console.log(`🚀 YouTube Cue Point Editor Backend running on port ${PORT}`);
  console.log(`📁 Downloads will be stored in: ${path.join(__dirname, 'downloads')}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📥 Download endpoint: http://localhost:${PORT}/api/download`);
  
  // Check for required dependencies
  console.log('\n📋 Required system dependencies:');
  console.log('   - yt-dlp (install: pip install yt-dlp)');
  console.log('   - ffmpeg (install: brew install ffmpeg on macOS)');
  console.log('   - ffprobe (usually comes with ffmpeg)');
});

module.exports = app; 