/**
 * Types and classes for interacting with the Extism PDK
 */

/**
 * Represents a request to call a specific tool with arguments
 */
export class CallToolRequest {
  constructor(public toolId: string, public arguments: Record<string, any>) {}

  static fromJson(json: any): CallToolRequest {
    return new CallToolRequest(json.toolId, json.arguments || {});
  }

  static toJson(request: CallToolRequest): any {
    return {
      toolId: request.toolId,
      arguments: request.arguments,
    };
  }
}

/**
 * Represents the result of a tool call
 */
export class CallToolResult {
  constructor(
    public state: 'success' | 'error',
    public result: any,
    public error?: string
  ) {}

  static fromJson(json: any): CallToolResult {
    return new CallToolResult(json.state, json.result, json.error);
  }

  static toJson(result: CallToolResult): any {
    const json: Record<string, any> = {
      state: result.state,
      result: result.result,
    };
    if (result.error) {
      json.error = result.error;
    }
    return json;
  }
}

/**
 * Represents a tool's metadata and parameter schema
 */
export class Tool {
  constructor(
    public id: string,
    public label: string,
    public description: string,
    public parameters: Record<string, any> = {}
  ) {}

  static fromJson(json: any): Tool {
    return new Tool(
      json.id,
      json.label,
      json.description,
      json.parameters || {}
    );
  }

  static toJson(tool: Tool): any {
    return {
      id: tool.id,
      label: tool.label,
      description: tool.description,
      parameters: tool.parameters,
    };
  }
}

/**
 * Represents the result of listing available tools
 */
export class ListToolsResult {
  constructor(public tools: Tool[]) {}

  static fromJson(json: any): ListToolsResult {
    const tools = (json.tools || []).map((t: any) => Tool.fromJson(t));
    return new ListToolsResult(tools);
  }

  static toJson(result: ListToolsResult): any {
    return {
      tools: result.tools.map((t) => Tool.toJson(t)),
    };
  }
} 