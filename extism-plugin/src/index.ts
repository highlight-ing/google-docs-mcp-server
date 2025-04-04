/**
 * Main entry point for the Google Docs MCP Extism Plugin.
 * This file exports WebAssembly compatible functions that serve as entry points
 * for interacting with the Google Docs API through the Extism runtime.
 */
import * as main from "./main";
import { CallToolRequest, CallToolResult, ListToolsResult } from "./pdk";

/**
 * Call function - main entry point for tool invocation
 */
export function call(): number {
  const untypedInput = JSON.parse(Host.inputString());
  const input = CallToolRequest.fromJson(untypedInput);

  const output = main.callImpl(input);

  const untypedOutput = CallToolResult.toJson(output);
  Host.outputString(JSON.stringify(untypedOutput));

  return 0;
}

/**
 * Describe function - returns metadata about available tools
 */
export function describe(): number {
  const result = main.describeImpl();
  Host.outputString(JSON.stringify(ListToolsResult.toJson(result)));
  return 0;
} 