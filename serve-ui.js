// Simple HTTP server to serve YUGA Engine UI
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    // Default to YUGA_COMPLETE_APP.html
    let filePath = req.url === '/' ? '/YUGA_COMPLETE_APP.html' : req.url;
    filePath = path.join(__dirname, filePath);
    
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║           🎮 YUGA ENGINE UI SERVER RUNNING! 🎮            ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`✅ Server running at: http://localhost:${PORT}`);
    console.log('');
    console.log('📱 Open in your browser:');
    console.log(`   http://localhost:${PORT}`);
    console.log('');
    console.log('🎨 Available Pages:');
    console.log('   / or /YUGA_ENGINE_UI_DEMO.html - Main Engine UI');
    console.log('   /backend/public/index.html - API Dashboard');
    console.log('   /backend/public/engine-ui.html - Alternative UI');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
    console.log('');
});
