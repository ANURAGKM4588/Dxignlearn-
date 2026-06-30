const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ico': 'image/x-icon',
  '.apk': 'application/vnd.android.package-archive',
};

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  req.on('error', (err) => {
    console.error('Request stream error:', err);
  });
  
  res.on('error', (err) => {
    console.error('Response stream error:', err);
  });
  
  try {
    // Strip query parameters and hash, then decode URI
    const urlPath = req.url.split('?')[0].split('#')[0];
    const decodedPath = decodeURIComponent(urlPath === '/' ? '/index.html' : urlPath);
    let filePath = path.join(__dirname, decodedPath);
    
    // Support directory index files (e.g. /studentportal/ -> /studentportal/index.html)
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      if (!urlPath.endsWith('/')) {
        res.writeHead(301, { 'Location': urlPath + '/' });
        return res.end();
      }
      filePath = path.join(filePath, 'index.html');
    }
    
    // Safety check: ensure filePath stays within workspace
    if (!filePath.startsWith(__dirname)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }
    
    const ext = path.extname(filePath).toLowerCase();
    
    fs.readFile(filePath, (err, data) => {
      if (err) {
        console.error(`Error reading ${filePath}:`, err.message);
        if (!res.headersSent) {
          res.writeHead(404);
          res.end('Not found');
        }
        return;
      }
      if (!res.headersSent) {
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
      }
    });
  } catch (err) {
    console.error('Request handler error:', err);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  }
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

