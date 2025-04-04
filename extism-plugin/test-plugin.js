/**
 * Simple test script for the Google Docs Extism plugin.
 * This can be used to test that the plugin is working correctly.
 */
const fs = require('fs');
const { Plugin } = require('@extism/extism');

async function main() {
  try {
    // Load the plugin from the wasm file
    const wasmPath = './dist/plugin.wasm';
    const wasm = fs.readFileSync(wasmPath);
    
    // Create a new plugin instance
    const plugin = new Plugin(wasm, {
      wasi: true,
      allowedHosts: ['www.googleapis.com', 'docs.googleapis.com']
    });

    // Configure with the access token 
    // (You would need to replace this with a valid token)
    plugin.setConfig('GOOGLE_ACCESS_TOKEN', 'YOUR_ACCESS_TOKEN');

    // Test the describe function
    const describeResult = plugin.call('describe');
    console.log('Available tools:', JSON.parse(describeResult.toString()));

    // Example test call - search for docs with "report" in the name
    const callResult = plugin.call('call', JSON.stringify({
      toolId: 'search_docs',
      arguments: {
        query: 'name contains "report"'
      }
    }));
    
    console.log('Search result:', JSON.parse(callResult.toString()));
    
  } catch (error) {
    console.error('Error testing plugin:', error);
  }
}

main().catch(console.error); 