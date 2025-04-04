/**
 * This script helps obtain Google OAuth 2.0 tokens.
 * It sets up a local server to handle the OAuth 2.0 authorization flow and obtains
 * access and refresh tokens for the Google Drive and Google Docs APIs.
 */
const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const open = require('open');

// Load client secrets
let credentials;
try {
  const content = fs.readFileSync(path.join(__dirname, 'credentials.json'), 'utf8');
  credentials = JSON.parse(content);
} catch (err) {
  console.error('Error loading client secrets file:', err);
  console.error('You need a credentials.json file from the Google Cloud Console.');
  console.error('Go to https://console.cloud.google.com/ and create a project with the Drive API enabled.');
  console.error('Then create OAuth credentials and download the JSON file as credentials.json');
  process.exit(1);
}

// Create an OAuth2 client
const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0] || 'http://localhost:3000');

// Generate the authorization URL
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/documents'
  ],
  prompt: 'consent' // Force to get a refresh token
});

console.log('Authorizing. Opening browser...');

// Open the authorization URL in the browser
open(authUrl);

// Create a server to handle the callback
const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = url.parse(req.url, true);
    
    if (parsedUrl.pathname === '/') {
      const code = parsedUrl.query.code;
      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('Missing authorization code');
        return;
      }

      // Exchange the authorization code for tokens
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);

      // Save the tokens
      fs.writeFileSync(path.join(__dirname, 'token.json'), JSON.stringify(tokens, null, 2));

      // Display the tokens in the browser response
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <h1>Authentication successful!</h1>
        <p>You can close this window and return to the terminal.</p>
        <h2>Your tokens:</h2>
        <pre>${JSON.stringify(tokens, null, 2)}</pre>
      `);

      console.log('\nAuthentication successful!');
      console.log('Access token:', tokens.access_token);
      console.log('Refresh token:', tokens.refresh_token);
      console.log('Tokens saved to token.json');
      
      // Close the server after successful authentication
      setTimeout(() => server.close(() => process.exit(0)), 2000);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('Not found');
    }
  } catch (err) {
    console.error('Error processing auth callback:', err);
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(`Error: ${err.message}`);
  }
});

// Start the server
server.listen(3000, () => {
  console.log('Waiting for authentication...');
}); 