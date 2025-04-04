import { CallToolRequest, CallToolResult, ListToolsResult, Tool } from './pdk';

/**
 * Helper function to get arguments from input
 */
function getArgs() {
  try {
    const input = Host.inputString();
    const args = JSON.parse(input);
    return args;
  } catch (err) {
    Host.outputString(JSON.stringify({ error: "Invalid JSON input" }));
    return null;
  }
}

/**
 * Handler for searching Google Docs in Drive
 */
export function handleSearchDocs() {
  const accessToken = Config.get("GOOGLE_ACCESS_TOKEN");
  const args = getArgs();
  if (!args) return 1;
  
  const { query, maxResults = 10 } = args;
  if (!query) {
    Host.outputString(
      JSON.stringify({
        error: "Missing required parameter: query"
      })
    );
    return 1;
  }
  
  const queryParam = encodeURIComponent(`mimeType='application/vnd.google-apps.document' and ${query}`);
  const maxResultsParam = `&pageSize=${maxResults}`;
  const fieldsParam = "&fields=files(id,name,description,createdTime,modifiedTime,webViewLink)";
  
  const response = Http.request({
    url: `https://www.googleapis.com/drive/v3/files?q=${queryParam}${maxResultsParam}${fieldsParam}`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  
  if (response.status !== 200) {
    Host.outputString(
      JSON.stringify({ error: `Failed to search docs: ${response.body}` })
    );
    return 1;
  }
  
  let data;
  try {
    data = JSON.parse(response.body);
  } catch (err) {
    Host.outputString(
      JSON.stringify({ error: "Invalid response from Google Drive API" })
    );
    return 1;
  }
  
  Host.outputString(JSON.stringify(data.files, null, 2));
  return 0;
}

/**
 * Handler for creating a new Google Doc
 */
export function handleCreateDoc() {
  const accessToken = Config.get("GOOGLE_ACCESS_TOKEN");
  const args = getArgs();
  if (!args) return 1;
  
  const { title, content = "", parentFolderId } = args;
  if (!title) {
    Host.outputString(
      JSON.stringify({
        error: "Missing required parameter: title"
      })
    );
    return 1;
  }
  
  const metadataResponse = Http.request({
    url: "https://www.googleapis.com/drive/v3/files",
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  }, JSON.stringify({
    name: title,
    mimeType: "application/vnd.google-apps.document",
    ...(parentFolderId ? { parents: [parentFolderId] } : {})
  }));
  
  if (metadataResponse.status !== 200) {
    Host.outputString(
      JSON.stringify({ error: `Failed to create document: ${metadataResponse.body}` })
    );
    return 1;
  }
  
  let docData;
  try {
    docData = JSON.parse(metadataResponse.body);
  } catch (err) {
    Host.outputString(
      JSON.stringify({ error: "Invalid response from Google Drive API" })
    );
    return 1;
  }
  
  const documentId = docData.id;
  
  if (content) {
    const updateResponse = Http.request({
      url: `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    }, JSON.stringify({
      requests: [
        {
          insertText: {
            location: {
              index: 1
            },
            text: content
          }
        }
      ]
    }));
    
    if (updateResponse.status !== 200) {
      Host.outputString(
        JSON.stringify({ error: `Failed to populate document content: ${updateResponse.body}` })
      );
      return 1;
    }
  }
  
  Host.outputString(
    JSON.stringify({
      id: documentId,
      title,
      message: "Document created successfully",
      url: `https://docs.google.com/document/d/${documentId}/edit`
    }, null, 2)
  );
  return 0;
}

/**
 * Handler for appending content to a Google Doc
 */
export function handleAppendToDoc() {
  const accessToken = Config.get("GOOGLE_ACCESS_TOKEN");
  const args = getArgs();
  if (!args) return 1;
  
  const { documentId, content } = args;
  if (!documentId || !content) {
    Host.outputString(
      JSON.stringify({
        error: "Missing required parameters: documentId and content are required"
      })
    );
    return 1;
  }
  
  const getDocResponse = Http.request({
    url: `https://docs.googleapis.com/v1/documents/${documentId}`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  
  if (getDocResponse.status !== 200) {
    Host.outputString(
      JSON.stringify({ error: `Failed to get document: ${getDocResponse.body}` })
    );
    return 1;
  }
  
  let docData;
  try {
    docData = JSON.parse(getDocResponse.body);
  } catch (err) {
    Host.outputString(
      JSON.stringify({ error: "Invalid response from Google Docs API" })
    );
    return 1;
  }
  
  const endIndex = docData.body.content[docData.body.content.length - 1].endIndex || 1;
  
  const updateResponse = Http.request({
    url: `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  }, JSON.stringify({
    requests: [
      {
        insertText: {
          location: {
            index: endIndex - 1
          },
          text: content
        }
      }
    ]
  }));
  
  if (updateResponse.status !== 200) {
    Host.outputString(
      JSON.stringify({ error: `Failed to append content: ${updateResponse.body}` })
    );
    return 1;
  }
  
  Host.outputString(
    JSON.stringify({
      documentId,
      message: "Content appended successfully",
      url: `https://docs.google.com/document/d/${documentId}/edit`
    }, null, 2)
  );
  return 0;
}

/**
 * Handler for updating content in a Google Doc
 */
export function handleUpdateDoc() {
  const accessToken = Config.get("GOOGLE_ACCESS_TOKEN");
  const args = getArgs();
  if (!args) return 1;
  
  const { documentId, content, startIndex = 1, endIndex } = args;
  if (!documentId || !content) {
    Host.outputString(
      JSON.stringify({
        error: "Missing required parameters: documentId and content are required"
      })
    );
    return 1;
  }
  
  let finalEndIndex = endIndex;
  if (!finalEndIndex) {
    const getDocResponse = Http.request({
      url: `https://docs.googleapis.com/v1/documents/${documentId}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    if (getDocResponse.status !== 200) {
      Host.outputString(
        JSON.stringify({ error: `Failed to get document: ${getDocResponse.body}` })
      );
      return 1;
    }
    
    let docData;
    try {
      docData = JSON.parse(getDocResponse.body);
    } catch (err) {
      Host.outputString(
        JSON.stringify({ error: "Invalid response from Google Docs API" })
      );
      return 1;
    }
    
    finalEndIndex = docData.body.content[docData.body.content.length - 1].endIndex || 1;
  }
  
  const updateResponse = Http.request({
    url: `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  }, JSON.stringify({
    requests: [
      {
        // First delete the content in the specified range
        deleteContentRange: {
          range: {
            startIndex,
            endIndex: finalEndIndex
          }
        }
      },
      {
        // Then insert the new content
        insertText: {
          location: {
            index: startIndex
          },
          text: content
        }
      }
    ]
  }));
  
  if (updateResponse.status !== 200) {
    Host.outputString(
      JSON.stringify({ error: `Failed to update document: ${updateResponse.body}` })
    );
    return 1;
  }
  
  Host.outputString(
    JSON.stringify({
      documentId,
      message: "Document updated successfully",
      url: `https://docs.google.com/document/d/${documentId}/edit`
    }, null, 2)
  );
  return 0;
}

/**
 * Implementation of the call function
 */
export function callImpl(request: CallToolRequest): CallToolResult {
  try {
    const originalInputString = Host.inputString;
    let outputContent = "";
    
    Host.inputString = () => JSON.stringify(request.arguments);
    
    const originalOutputString = Host.outputString;
    Host.outputString = (content) => {
      outputContent = content;
      return content;
    };
    
    let result = 1;
    
    switch (request.toolId) {
      case "search_docs":
        result = handleSearchDocs();
        break;
      case "create_doc":
        result = handleCreateDoc();
        break;
      case "append_to_doc":
        result = handleAppendToDoc();
        break;
      case "update_doc":
        result = handleUpdateDoc();
        break;
      default:
        Host.inputString = originalInputString;
        Host.outputString = originalOutputString;
        return new CallToolResult(
          "error",
          null,
          `Unknown tool: ${request.toolId}`
        );
    }
    
    Host.inputString = originalInputString;
    Host.outputString = originalOutputString;
    
    if (result === 0) {
      try {
        const parsedOutput = JSON.parse(outputContent);
        return new CallToolResult("success", parsedOutput, undefined);
      } catch (e) {
        return new CallToolResult("success", outputContent, undefined);
      }
    } else {
      try {
        const parsedError = JSON.parse(outputContent);
        return new CallToolResult(
          "error",
          null,
          parsedError.error || "Unknown error"
        );
      } catch (e) {
        return new CallToolResult(
          "error",
          null,
          "Failed to process Google Drive/Docs request"
        );
      }
    }
  } catch (err) {
    return new CallToolResult(
      "error",
      null,
      `Error: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Implementation of the describe function
 */
export function describeImpl(): ListToolsResult {
  const tools = [
    new Tool(
      "search_docs",
      "Search Docs",
      "Search for Google Docs in Drive",
      {
        query: {
          type: "string",
          description: "Search query string"
        },
        maxResults: {
          type: "number",
          description: "Maximum number of docs to return",
          optional: true
        }
      }
    ),
    new Tool(
      "create_doc",
      "Create Doc",
      "Create a new Google Doc",
      {
        title: {
          type: "string",
          description: "Document title"
        },
        content: {
          type: "string",
          description: "Initial document content",
          optional: true
        },
        parentFolderId: {
          type: "string",
          description: "Parent folder ID",
          optional: true
        }
      }
    ),
    new Tool(
      "append_to_doc",
      "Append to Doc",
      "Append content to an existing Google Doc",
      {
        documentId: {
          type: "string",
          description: "Document ID to update"
        },
        content: {
          type: "string",
          description: "Content to append"
        }
      }
    ),
    new Tool(
      "update_doc",
      "Update Doc",
      "Update content in an existing Google Doc",
      {
        documentId: {
          type: "string",
          description: "Document ID to update"
        },
        content: {
          type: "string",
          description: "New document content"
        },
        startIndex: {
          type: "number",
          description: "Start index for the update",
          optional: true
        },
        endIndex: {
          type: "number",
          description: "End index for the update",
          optional: true
        }
      }
    )
  ];
  
  return new ListToolsResult(tools);
} 