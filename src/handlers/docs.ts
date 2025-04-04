import { google } from 'googleapis';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * Search for Google Docs in Drive
 */
export async function handleSearchDocs(args: any) {
  try {
    const { accessToken, query, maxResults = 10 } = args;
    if (!accessToken) {
      throw new McpError(ErrorCode.InvalidParams, 'Access token is required');
    }
    if (!query) {
      throw new McpError(ErrorCode.InvalidParams, 'Query is required');
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    const drive = google.drive({ version: 'v3', auth });
    
    // Construct query to search for Google Docs only
    const fullQuery = `mimeType='application/vnd.google-apps.document' and ${query}`;
    
    const response = await drive.files.list({
      q: fullQuery,
      pageSize: maxResults,
      fields: 'files(id, name, description, createdTime, modifiedTime, webViewLink)',
    });
    
    return response.data.files || [];
  } catch (error: any) {
    if (error instanceof McpError) {
      throw error;
    }
    
    console.error('Error searching docs:', error);
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to search docs: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Create a new Google Doc
 */
export async function handleCreateDoc(args: any) {
  try {
    const { accessToken, title, content = '', parentFolderId } = args;
    if (!accessToken) {
      throw new McpError(ErrorCode.InvalidParams, 'Access token is required');
    }
    if (!title) {
      throw new McpError(ErrorCode.InvalidParams, 'Title is required');
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    const drive = google.drive({ version: 'v3', auth });
    const docs = google.docs({ version: 'v1', auth });
    
    // Create the document metadata
    const fileMetadata: any = {
      name: title,
      mimeType: 'application/vnd.google-apps.document',
    };
    
    // Add parent folder if specified
    if (parentFolderId) {
      fileMetadata.parents = [parentFolderId];
    }
    
    // Create the document
    const file = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });
    
    const documentId = file.data.id;
    
    // Add content if provided
    if (content && documentId) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: {
                  index: 1,
                },
                text: content,
              },
            },
          ],
        },
      });
    }
    
    return {
      id: documentId,
      title,
      message: 'Document created successfully',
      url: `https://docs.google.com/document/d/${documentId}/edit`,
    };
  } catch (error: any) {
    if (error instanceof McpError) {
      throw error;
    }
    
    console.error('Error creating doc:', error);
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to create document: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Append content to an existing Google Doc
 */
export async function handleAppendToDoc(args: any) {
  try {
    const { accessToken, documentId, content } = args;
    if (!accessToken) {
      throw new McpError(ErrorCode.InvalidParams, 'Access token is required');
    }
    if (!documentId) {
      throw new McpError(ErrorCode.InvalidParams, 'Document ID is required');
    }
    if (!content) {
      throw new McpError(ErrorCode.InvalidParams, 'Content is required');
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    const docs = google.docs({ version: 'v1', auth });
    
    // Get the document to find the end index
    const document = await docs.documents.get({
      documentId,
    });
    
    // Get the end index of the document
    const endIndex = document.data.body?.content?.[document.data.body.content.length - 1]?.endIndex || 1;
    
    // Append content
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: {
                index: endIndex - 1,
              },
              text: content,
            },
          },
        ],
      },
    });
    
    return {
      documentId,
      message: 'Content appended successfully',
      url: `https://docs.google.com/document/d/${documentId}/edit`,
    };
  } catch (error: any) {
    if (error instanceof McpError) {
      throw error;
    }
    
    console.error('Error appending to doc:', error);
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to append to document: ${error.message || 'Unknown error'}`
    );
  }
}

/**
 * Update content in an existing Google Doc
 */
export async function handleUpdateDoc(args: any) {
  try {
    const { accessToken, documentId, content, startIndex = 1, endIndex } = args;
    if (!accessToken) {
      throw new McpError(ErrorCode.InvalidParams, 'Access token is required');
    }
    if (!documentId) {
      throw new McpError(ErrorCode.InvalidParams, 'Document ID is required');
    }
    if (!content) {
      throw new McpError(ErrorCode.InvalidParams, 'Content is required');
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    const docs = google.docs({ version: 'v1', auth });
    
    let finalEndIndex = endIndex;
    
    // If no end index is provided, get the end of the document
    if (!finalEndIndex) {
      const document = await docs.documents.get({
        documentId,
      });
      
      finalEndIndex = document.data.body?.content?.[document.data.body.content.length - 1]?.endIndex || 1;
    }
    
    // Update content by first deleting the range, then inserting new content
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [
          {
            deleteContentRange: {
              range: {
                startIndex,
                endIndex: finalEndIndex,
              },
            },
          },
          {
            insertText: {
              location: {
                index: startIndex,
              },
              text: content,
            },
          },
        ],
      },
    });
    
    return {
      documentId,
      message: 'Document updated successfully',
      url: `https://docs.google.com/document/d/${documentId}/edit`,
    };
  } catch (error: any) {
    if (error instanceof McpError) {
      throw error;
    }
    
    console.error('Error updating doc:', error);
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to update document: ${error.message || 'Unknown error'}`
    );
  }
} 