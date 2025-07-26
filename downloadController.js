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
      reject(new Error(`Failed to start command: ${error.message}`));
    });
  });
}

/**
 * Generates a unique filename based on title and timestamp
 * @param {string} title - The video title
 * @returns {string} - Unique filename
 */
function generateUniqueFilename(title) {
  const slug = slugify(title, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g
  });
  
  // Limit length and add timestamp for uniqueness
  const truncatedSlug = slug.substring(0, 50);
  const timestamp = Date.now();
  
  return `${truncatedSlug}-${timestamp}`;
}

/**
 * Gets video duration using ffprobe
 * @param {string} filePath - Path to video file
 * @returns {Promise<number>} - Duration in seconds
 */
async function getVideoDuration(filePath) {
  try {
    const output = await executeCommand('ffprobe', [
      '-v', 'quiet',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      filePath
    ]);
    
    return parseFloat(output.trim());
  } catch (error) {
    console.warn('Could not get video duration:', error.message);
    return 0;
  }
}

/**
 * Gets YouTube video title using yt-dlp with bot evasion
 * @param {string} url - YouTube URL
 * @returns {Promise<string>} - Video title
 */
async function getVideoTitle(url) {
  try {
    const output = await executeCommand('yt-dlp', [
      '--get-title',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '--referer', 'https://www.youtube.com/',
      '--extractor-retries', '3',
      '--socket-timeout', '30',
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
    
    // Step 1: Download video using yt-dlp with enhanced bot evasion
    console.log('Downloading video with yt-dlp...');
    await executeCommand('yt-dlp', [
      '-f', 'bestvideo[vcodec^=avc1]+bestaudio[ext=m4a]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]',
      '--merge-output-format', 'mp4',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '--referer', 'https://www.youtube.com/',
      '--extractor-retries', '5',
      '--socket-timeout', '30',
      '--sleep-interval', '1',
      '--max-sleep-interval', '5',
      '--no-warnings',
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
        '-preset', 'medium', // Encoding speed vs quality trade-off
        '-crf', '23', // Quality setting (lower = better quality)
        '-y', // Overwrite output file
        finalVideoPath
      ]);
    }
    
    // Step 3: Extract audio to WAV format
    console.log('Extracting audio stream...');
    await executeCommand('ffmpeg', [
      '-i', tempVideoPath,
      '-vn', // Remove video
      '-acodec', 'pcm_s16le', // 16-bit PCM audio for consistency
      '-ar', '48000', // 48kHz sample rate for professional audio
      '-ac', '2', // Stereo
      '-y', // Overwrite output file
      audioPath
    ]);
    
    // Get video duration
    const duration = await getVideoDuration(finalVideoPath);
    
    // Clean up temporary file
    try {
      await fs.unlink(tempVideoPath);
    } catch (error) {
      console.warn('Could not delete temporary file:', error.message);
    }
    
    // Verify files were created successfully
    try {
      await fs.access(finalVideoPath);
      await fs.access(audioPath);
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create output files',
        error: error.message
      });
    }
    
    console.log(`Successfully processed video: ${filename}`);
    
    // Return success response
    res.json({
      status: 'success',
      videoFile: `${filename}-video.mp4`,
      audioFile: `${filename}-audio.wav`,
      duration: duration,
      filename: filename,
      title: videoTitle,
      downloadPath: DOWNLOADS_DIR
    });
    
  } catch (error) {
    console.error('Download error:', error);
    
    // Send detailed error response
    res.status(500).json({
      status: 'error',
      message: 'Failed to download and process video',
      error: error.message,
      stderr: error.message
    });
  }
}

/**
 * Lists all downloaded video/audio pairs
 * @param {Object} req - Express request object  
 * @param {Object} res - Express response object
 */
async function listDownloads(req, res) {
  try {
    // Ensure downloads directory exists
    try {
      await fs.access(DOWNLOADS_DIR);
    } catch {
      await fs.mkdir(DOWNLOADS_DIR, { recursive: true });
      return res.json({
        status: 'success',
        downloads: {},
        downloadPath: DOWNLOADS_DIR
      });
    }
    
    const files = await fs.readdir(DOWNLOADS_DIR);
    
    // Group files by filename prefix (everything before -video/-audio)
    const downloads = {};
    
    files.forEach(file => {
      if (file.endsWith('-video.mp4')) {
        const prefix = file.replace('-video.mp4', '');
        if (!downloads[prefix]) downloads[prefix] = {};
        downloads[prefix].video = file;
      } else if (file.endsWith('-audio.wav')) {
        const prefix = file.replace('-audio.wav', '');
        if (!downloads[prefix]) downloads[prefix] = {};
        downloads[prefix].audio = file;
      }
    });
    
    // Only return entries that have both video and audio
    const completeDownloads = {};
    Object.keys(downloads).forEach(prefix => {
      if (downloads[prefix].video && downloads[prefix].audio) {
        completeDownloads[prefix] = downloads[prefix];
      }
    });
    
    res.json({
      status: 'success',
      downloads: completeDownloads,
      downloadPath: DOWNLOADS_DIR
    });
    
  } catch (error) {
    console.error('List downloads error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list downloads',
      error: error.message
    });
  }
}

module.exports = {
  downloadVideo,
  listDownloads
};
