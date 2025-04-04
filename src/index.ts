#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { 
  handleSearchDocs,
  handleCreateDoc,
  handleAppendToDoc,
  handleUpdateDoc
} from './handlers/docs.js';

class GoogleDocsServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'google-docs-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_docs',
          description: 'Search for Google Docs in Drive',
          inputSchema: {
            type: 'object',
            properties: {
              accessToken: {
                type: 'string',
                description: 'Google API access token',
              },
              query: {
                type: 'string',
                description: 'Search query string',
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of docs to return (default: 10)',
              },
            },
            required: ['accessToken', 'query']
          },
        },
        {
          name: 'create_doc',
          description: 'Create a new Google Doc',
          inputSchema: {
            type: 'object',
            properties: {
              accessToken: {
                type: 'string',
                description: 'Google API access token',
              },
              title: {
                type: 'string',
                description: 'Document title',
              },
              content: {
                type: 'string',
                description: 'Initial document content',
              },
              parentFolderId: {
                type: 'string',
                description: 'Parent folder ID',
              },
            },
            required: ['accessToken', 'title']
          },
        },
        {
          name: 'append_to_doc',
          description: 'Append content to an existing Google Doc',
          inputSchema: {
            type: 'object',
            properties: {
              accessToken: {
                type: 'string',
                description: 'Google API access token',
              },
              documentId: {
                type: 'string',
                description: 'Document ID to update',
              },
              content: {
                type: 'string',
                description: 'Content to append',
              },
            },
            required: ['accessToken', 'documentId', 'content']
          },
        },
        {
          name: 'update_doc',
          description: 'Update content in an existing Google Doc',
          inputSchema: {
            type: 'object',
            properties: {
              accessToken: {
                type: 'string',
                description: 'Google API access token',
              },
              documentId: {
                type: 'string',
                description: 'Document ID to update',
              },
              content: {
                type: 'string',
                description: 'New document content',
              },
              startIndex: {
                type: 'number',
                description: 'Start index for the update',
              },
              endIndex: {
                type: 'number',
                description: 'End index for the update',
              },
            },
            required: ['accessToken', 'documentId', 'content']
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      let result;
      
      switch (request.params.name) {
        case 'search_docs':
          result = await handleSearchDocs(request.params.arguments);
          break;
        case 'create_doc':
          result = await handleCreateDoc(request.params.arguments);
          break;
        case 'append_to_doc':
          result = await handleAppendToDoc(request.params.arguments);
          break;
        case 'update_doc':
          result = await handleUpdateDoc(request.params.arguments);
          break;
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }

      // Return the result in the format expected by MCP SDK
      return { output: result };
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Google Docs MCP server running on stdio');
  }
}

const server = new GoogleDocsServer();
server.run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 