const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const slugify = require('slugify');

// Ensure downloads directory exists
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');

// YouTube URL validation regex
const YOUTUBE_URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

/**
 * Validates if a URL is a valid YouTube URL
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid YouTube URL
 */
function isValidYouTubeUrl(url) {
  return YOUTUBE_URL_REGEX.test(url);
}

/**
 * Executes a shell command using spawn and returns a promise
 * @param {string} command - The command to execute
 * @param {string[]} args - Command arguments
 * @param {Object} options - Spawn options
 * @returns {Promise} - Promise that resolves with stdout or rejects with stderr
 */
function executeCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { ...options, stdio: ['pipe', 'pipe', 'pipe'] });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
    
    process.on('error', (error) => {
      reject(new Error(`Failed to start process: ${error.message}`));
    });
  });
}

/**
 * Gets video metadata using ffprobe
 * @param {string} filePath - Path to the video file
 * @returns {Promise<Object>} - Video metadata including duration
 */
async function getVideoMetadata(filePath) {
  try {
    const output = await executeCommand('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ]);
    
    const metadata = JSON.parse(output);
    const duration = parseFloat(metadata.format.duration);
    
    return {
      duration,
      format: metadata.format,
      streams: metadata.streams
    };
  } catch (error) {
    throw new Error(`Failed to get video metadata: ${error.message}`);
  }
}

/**
 * Generates a unique filename with timestamp to prevent overwrites
 * @param {string} title - Video title
 * @returns {string} - Slug-safe filename
 */
function generateUniqueFilename(title) {
  const timestamp = Date.now();
  const slugTitle = slugify(title, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g
  });
  
  return `${slugTitle}-${timestamp}`;
}

/**
 * Gets YouTube video title using yt-dlp
 * @param {string} url - YouTube URL
 * @returns {Promise<string>} - Video title
 */
async function getVideoTitle(url) {
  try {
    const output = await executeCommand('yt-dlp', [
      '--get-title',
      url
    ]);
    
    return output.trim();
  } catch (error) {
    console.warn('Could not get video title, using default:', error.message);
    return 'youtube-video';
  }
}

/**
 * Downloads and processes YouTube video
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function downloadVideo(req, res) {
  try {
    const { url } = req.body;
    
    // Validate input
    if (!url) {
      return res.status(400).json({
        status: 'error',
        message: 'YouTube URL is required'
      });
    }
    
    if (!isValidYouTubeUrl(url)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid YouTube URL format'
      });
    }
    
    // Ensure downloads directory exists
    try {
      await fs.access(DOWNLOADS_DIR);
    } catch {
      await fs.mkdir(DOWNLOADS_DIR, { recursive: true });
    }
    
    console.log(`Starting download for URL: ${url}`);
    
    // Get video title for filename generation
    const videoTitle = await getVideoTitle(url);
    const filename = generateUniqueFilename(videoTitle);
    
    const tempVideoPath = path.join(DOWNLOADS_DIR, `${filename}-temp.mp4`);
    const finalVideoPath = path.join(DOWNLOADS_DIR, `${filename}-video.mp4`);
    const audioPath = path.join(DOWNLOADS_DIR, `${filename}-audio.wav`);
    
    // Step 1: Download video using yt-dlp (prefer H.264 for browser compatibility)
    console.log('Downloading video with yt-dlp...');
    await executeCommand('yt-dlp', [
      '-f', 'bestvideo[vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio[ext=m4a]',
      '--merge-output-format', 'mp4',
      '-o', tempVideoPath,
      url
    ], { cwd: DOWNLOADS_DIR });
    
    // Step 2: Extract video-only file (no audio) and ensure H.264 encoding
    console.log('Extracting video stream...');
    
    // Check if the video is already H.264
    const probeResult = await executeCommand('ffprobe', [
      '-v', 'quiet',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name',
      '-of', 'csv=p=0',
      tempVideoPath
    ]);
    
    const codecName = probeResult.trim();
    console.log(`Source video codec: ${codecName}`);
    
    if (codecName === 'h264') {
      // Video is already H.264, just copy without re-encoding
      await executeCommand('ffmpeg', [
        '-i', tempVideoPath,
        '-an', // Remove audio
        '-c:v', 'copy', // Copy video codec without re-encoding
        '-y', // Overwrite output file
        finalVideoPath
      ]);
    } else {
      // Re-encode to H.264 for browser compatibility
      console.log(`Converting ${codecName} to H.264 for browser compatibility...`);
      await executeCommand('ffmpeg', [
        '-i', tempVideoPath,
        '-an', // Remove audio
        '-c:v', 'libx264', // Encode to H.264
        '-preset', 'fast', // Fast encoding preset
        '-crf', '23', // Good quality/size balance
        '-y', // Overwrite output file
        finalVideoPath
      ]);
    }
    
    // Step 3: Extract audio-only file as WAV
    console.log('Extracting audio stream...');
    await executeCommand('ffmpeg', [
      '-i', tempVideoPath,
      '-vn', // Remove video
      '-acodec', 'pcm_s16le', // PCM 16-bit little-endian
      '-ar', '48000', // Sample rate 48kHz
      '-y', // Overwrite output file
      audioPath
    ]);
    
    // Step 4: Get metadata
    console.log('Getting video metadata...');
    const metadata = await getVideoMetadata(tempVideoPath);
    
    // Step 5: Clean up temporary file
    try {
      await fs.unlink(tempVideoPath);
    } catch (error) {
      console.warn('Could not delete temporary file:', error.message);
    }
    
    // Step 6: Return success response
    res.json({
      status: 'success',
      videoFile: `${filename}-video.mp4`,
      audioFile: `${filename}-audio.wav`,
      duration: metadata.duration,
      filename: filename,
      title: videoTitle,
      downloadPath: DOWNLOADS_DIR
    });
    
    console.log(`Successfully processed video: ${filename}`);
    
  } catch (error) {
    console.error('Download/processing error:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to download and process video',
      error: error.message,
      stderr: error.message
    });
  }
}

/**
 * Lists all downloaded files
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function listDownloads(req, res) {
  try {
    const files = await fs.readdir(DOWNLOADS_DIR);
    
    // Group files by base filename
    const downloads = {};
    files.forEach(file => {
      const match = file.match(/^(.+)-(video|audio)\.(mp4|wav)$/);
      if (match) {
        const [, basename, type, ext] = match;
        if (!downloads[basename]) {
          downloads[basename] = {};
        }
        downloads[basename][type] = file;
      }
    });
    
    res.json({
      status: 'success',
      downloads: downloads,
      downloadPath: DOWNLOADS_DIR
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to list downloads',
      error: error.message
    });
  }
}

module.exports = {
  downloadVideo,
  listDownloads,
  isValidYouTubeUrl,
  generateUniqueFilename
}; 