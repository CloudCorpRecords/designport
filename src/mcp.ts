/**
 * designport MCP server. Defined core subset of 10 Figma REST tools.
 *
 * Low-level Server API with explicit inputSchema literals identical
 * to the fixture (the McpServer+zod path injects $schema /
 * additionalProperties and breaks parity). Zod validates call args.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  baseFromEnv,
  getComments,
  getFile,
  getFileComponents,
  getFileNodes,
  getFileStyles,
  getImages,
  getImageFills,
  getTeamProjects,
  listProjectFiles,
  postComment,
  tokenFromEnv,
  VERSION,
} from "./designport.js";
import type { FetchFn } from "./types.js";

const FileArgs = z.object({ file_key: z.string(), version: z.string().optional(), depth: z.number().optional() });
const NodesArgs = z.object({ file_key: z.string(), node_ids: z.string(), depth: z.number().optional(), version: z.string().optional() });
const ImagesArgs = z.object({ file_key: z.string(), node_ids: z.string(), format: z.string().optional(), scale: z.number().optional() });
const FileKeyArgs = z.object({ file_key: z.string() });
const TeamArgs = z.object({ team_id: z.string() });
const ProjectArgs = z.object({ project_id: z.string() });
const PostCommentArgs = z.object({ file_key: z.string(), message: z.string(), client_meta: z.string().optional() });

const TOOLS = [
  {
    name: "get_file",
    description: "Get a Figma file's document tree by file key.",
    inputSchema: {
      type: "object" as const,
      properties: { file_key: { type: "string", description: "Figma file key identifying the file to retrieve." }, version: { type: "string", description: "Optional specific version of the file to retrieve, identified by its version ID." }, depth: { type: "number", description: "Optional depth of the document tree to return, as a number of levels." } },
      required: ["file_key"],
    },
  },
  {
    name: "get_file_nodes",
    description: "Get specific nodes from a Figma file by comma-separated node IDs.",
    inputSchema: {
      type: "object" as const,
      properties: { file_key: { type: "string", description: "Figma file key identifying the file containing the nodes." }, node_ids: { type: "string", description: "Comma-separated list of node IDs to retrieve from the file." }, depth: { type: "number", description: "Optional depth of the node subtrees to return, as a number of levels." }, version: { type: "string", description: "Optional specific version of the file to read the nodes from, identified by its version ID." } },
      required: ["file_key", "node_ids"],
    },
  },
  {
    name: "get_images",
    description: "Render nodes of a Figma file to image URLs in a format and scale.",
    inputSchema: {
      type: "object" as const,
      properties: { file_key: { type: "string", description: "Figma file key identifying the file containing the nodes to render." }, node_ids: { type: "string", description: "Comma-separated list of node IDs to render as images." }, format: { type: "string", description: "Optional output format for the rendered images, such as png, jpg, svg, or pdf." }, scale: { type: "number", description: "Optional scale factor for the rendered images." } },
      required: ["file_key", "node_ids"],
    },
  },
  {
    name: "get_image_fills",
    description: "Get the image fills referenced by a Figma file.",
    inputSchema: {
      type: "object" as const,
      properties: { file_key: { type: "string", description: "Figma file key identifying the file whose image fills to return." } },
      required: ["file_key"],
    },
  },
  {
    name: "get_file_styles",
    description: "Get the styles published in a Figma file.",
    inputSchema: {
      type: "object" as const,
      properties: { file_key: { type: "string", description: "Figma file key identifying the file whose published styles to return." } },
      required: ["file_key"],
    },
  },
  {
    name: "get_file_components",
    description: "Get the components published in a Figma file.",
    inputSchema: {
      type: "object" as const,
      properties: { file_key: { type: "string", description: "Figma file key identifying the file whose published components to return." } },
      required: ["file_key"],
    },
  },
  {
    name: "get_team_projects",
    description: "List the projects belonging to a Figma team.",
    inputSchema: {
      type: "object" as const,
      properties: { team_id: { type: "string", description: "Figma team ID whose projects to list." } },
      required: ["team_id"],
    },
  },
  {
    name: "list_project_files",
    description: "List the files in a Figma project.",
    inputSchema: {
      type: "object" as const,
      properties: { project_id: { type: "string", description: "Figma project ID whose files to list." } },
      required: ["project_id"],
    },
  },
  {
    name: "get_comments",
    description: "Get the comments on a Figma file.",
    inputSchema: {
      type: "object" as const,
      properties: { file_key: { type: "string", description: "Figma file key identifying the file whose comments to return." } },
      required: ["file_key"],
    },
  },
  {
    name: "post_comment",
    description: "Post a comment to a Figma file; client_meta is an optional JSON-string encoding an object.",
    inputSchema: {
      type: "object" as const,
      properties: { file_key: { type: "string", description: "Figma file key identifying the file to post the comment to." }, message: { type: "string", description: "Text of the comment to post." }, client_meta: { type: "string", description: "Optional JSON-string encoding an object with client metadata for the comment, such as its position." } },
      required: ["file_key", "message"],
    },
  },
];

function textResult(value: unknown) {
  return { content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] };
}
function errorResult(err: unknown) {
  return { content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }], isError: true };
}

const server = new Server({ name: "designport", version: VERSION }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const fetchFn = globalThis.fetch as unknown as FetchFn;
  const token = tokenFromEnv();
  const base = baseFromEnv();
  try {
    switch (name) {
      case "get_file": return textResult(await getFile(fetchFn, FileArgs.parse(args ?? {}), token, base));
      case "get_file_nodes": return textResult(await getFileNodes(fetchFn, NodesArgs.parse(args ?? {}), token, base));
      case "get_images": return textResult(await getImages(fetchFn, ImagesArgs.parse(args ?? {}), token, base));
      case "get_image_fills": return textResult(await getImageFills(fetchFn, FileKeyArgs.parse(args ?? {}), token, base));
      case "get_file_styles": return textResult(await getFileStyles(fetchFn, FileKeyArgs.parse(args ?? {}), token, base));
      case "get_file_components": return textResult(await getFileComponents(fetchFn, FileKeyArgs.parse(args ?? {}), token, base));
      case "get_team_projects": return textResult(await getTeamProjects(fetchFn, TeamArgs.parse(args ?? {}), token, base));
      case "list_project_files": return textResult(await listProjectFiles(fetchFn, ProjectArgs.parse(args ?? {}), token, base));
      case "get_comments": return textResult(await getComments(fetchFn, FileKeyArgs.parse(args ?? {}), token, base));
      case "post_comment": return textResult(await postComment(fetchFn, PostCommentArgs.parse(args ?? {}), token, base));
    }
  } catch (err) {
    return errorResult(err);
  }
  throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
});

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
}
void main();
