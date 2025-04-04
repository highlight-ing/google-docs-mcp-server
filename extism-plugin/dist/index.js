"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  call: () => call,
  describe: () => describe
});
module.exports = __toCommonJS(src_exports);

// src/pdk.ts
var CallToolRequest = class {
  constructor(toolId, arguments_) {
    this.toolId = toolId;
    this.arguments = arguments_;
  }
  static fromJson(json) {
    return new CallToolRequest(json.toolId, json.arguments || {});
  }
  static toJson(request) {
    return {
      toolId: request.toolId,
      arguments: request.arguments
    };
  }
};
var CallToolResult = class {
  constructor(state, result, error) {
    this.state = state;
    this.result = result;
    this.error = error;
  }
  static fromJson(json) {
    return new CallToolResult(json.state, json.result, json.error);
  }
  static toJson(result) {
    const json = {
      state: result.state,
      result: result.result
    };
    if (result.error) {
      json.error = result.error;
    }
    return json;
  }
};
var Tool = class {
  constructor(id, label, description, parameters) {
    this.id = id;
    this.label = label;
    this.description = description;
    this.parameters = parameters;
  }
  static fromJson(json) {
    return new Tool(
      json.id,
      json.label,
      json.description,
      json.parameters || {}
    );
  }
  static toJson(tool) {
    return {
      id: tool.id,
      label: tool.label,
      description: tool.description,
      parameters: tool.parameters
    };
  }
};
var ListToolsResult = class {
  constructor(tools) {
    this.tools = tools;
  }
  static fromJson(json) {
    const tools = (json.tools || []).map((t) => Tool.fromJson(t));
    return new ListToolsResult(tools);
  }
  static toJson(result) {
    return {
      tools: result.tools.map((t) => Tool.toJson(t))
    };
  }
};

// src/handlers/docs.ts
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
function handleSearchDocs() {
  const accessToken = Config.get("GOOGLE_ACCESS_TOKEN");
  const args = getArgs();
  if (!args)
    return 1;
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
function handleCreateDoc() {
  const accessToken = Config.get("GOOGLE_ACCESS_TOKEN");
  const args = getArgs();
  if (!args)
    return 1;
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
    ...parentFolderId ? { parents: [parentFolderId] } : {}
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
function handleAppendToDoc() {
  const accessToken = Config.get("GOOGLE_ACCESS_TOKEN");
  const args = getArgs();
  if (!args)
    return 1;
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
function handleUpdateDoc() {
  const accessToken = Config.get("GOOGLE_ACCESS_TOKEN");
  const args = getArgs();
  if (!args)
    return 1;
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

// src/main.ts
function callImpl(request) {
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
        return new CallToolResult("success", parsedOutput, void 0);
      } catch (e) {
        return new CallToolResult("success", outputContent, void 0);
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
function describeImpl() {
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

// src/index.ts
function describe() {
  const output = describeImpl();
  const untypedOutput = ListToolsResult.toJson(output);
  Host.outputString(JSON.stringify(untypedOutput));
  return 0;
}
function call() {
  const untypedInput = JSON.parse(Host.inputString());
  const input = CallToolRequest.fromJson(untypedInput);
  const output = callImpl(input);
  const untypedOutput = CallToolResult.toJson(output);
  Host.outputString(JSON.stringify(untypedOutput));
  return 0;
}
//# sourceMappingURL=index.js.map
