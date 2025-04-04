# Google Docs MCP Server

A Model Context Protocol (MCP) server for Google Docs API, allowing language models to create, search, append to, and update Google Docs.

## Features

- **Search Docs**: Search for Google Docs in Drive with custom queries
- **Create Doc**: Create new Google Docs with optional initial content
- **Append to Doc**: Append content to the end of an existing Google Doc
- **Update Doc**: Replace content in an existing Google Doc with new content

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm
- Google Cloud Platform account with the Google Drive and Google Docs APIs enabled

### Installation

1. Clone this repository:
   ```
   git clone <repository-url>
   cd google-docs-mcp-server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up Google API credentials:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project (or select an existing one)
   - Enable the Google Drive API and Google Docs API
   - Create OAuth 2.0 credentials (Desktop application)
   - Download the credentials JSON file and save it as `credentials.json` in the project root

4. Get authentication tokens:
   ```
   node get-refresh-token.js
   ```
   Follow the browser prompts to authorize the application. This will create a `token.json` file.

5. Build the server:
   ```
   npm run build
   ```

### Building the Extism Plugin

The server uses an Extism WebAssembly plugin to interact with the Google Docs API. To build the plugin:

```
cd extism-plugin
npm install
npm run build
```

This will create the plugin.wasm file in the dist directory.

## Usage

### Running the Server

Start the MCP server:

```
npm start
```

Or with explicit node command:

```
node build/index.js
```

### Testing the Plugin Directly

You can test the Extism plugin directly using the Extism CLI:

```
cd extism-plugin
extism call --wasi --allow-host www.googleapis.com --allow-host docs.googleapis.com --config GOOGLE_ACCESS_TOKEN=<your-access-token> dist/plugin.wasm describe
```

To search for docs:

```
extism call --wasi --allow-host www.googleapis.com --allow-host docs.googleapis.com --config GOOGLE_ACCESS_TOKEN=<your-access-token> dist/plugin.wasm call --input '{"toolId": "search_docs", "arguments": {"query": "name contains \"report\""}}'
```

To create a new doc:

```
extism call --wasi --allow-host www.googleapis.com --allow-host docs.googleapis.com --config GOOGLE_ACCESS_TOKEN=<your-access-token> dist/plugin.wasm call --input '{"toolId": "create_doc", "arguments": {"title": "My New Document", "content": "Initial content"}}'
```

## License

MIT 