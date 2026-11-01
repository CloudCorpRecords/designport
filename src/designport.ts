/**
 * designport core: a compatible client for the Figma REST API
 * (https://api.figma.com/v1), covering a defined core subset.
 *
 * This is NOT a copy of Figma's hosted OAuth remote MCP server; it
 * is an independent client for the same public REST API, using a
 * personal access token sent as `X-Figma-Token:
 * <FIGMA_PERSONAL_ACCESS_TOKEN>`. The API base can be overridden
 * with FIGMA_API_BASE. A missing token is an error naming
 * FIGMA_PERSONAL_ACCESS_TOKEN.
 *
 * `post_comment`'s optional `client_meta` is a JSON-string param:
 * when supplied it must parse to a JSON object, which is sent as
 * the Figma API's `client_meta` object. Keeping it a string keeps
 * the tool schema simple.
 *
 * All HTTP goes through an injected FetchFn so the wire handling is
 * fully testable offline.
 *
 * Omitted on purpose (see BUILD-REPORT): the hosted remote MCP's
 * OAuth tool surface (get_design_context, get_screenshot,
 * get_metadata, get_variable_defs, code-connect tools, figjam,
 * design-system rules), plus REST groups not covered here:
 * variables API, dev resources, library assets/search, webhooks,
 * activity logs, and payments.
 */
import type {
  FetchFn,
  GetCommentsOptions,
  GetFileComponentsOptions,
  GetFileNodesOptions,
  GetFileOptions,
  GetFileStylesOptions,
  GetImagesOptions,
  GetImageFillsOptions,
  GetTeamProjectsOptions,
  ListProjectFilesOptions,
  PostCommentOptions,
} from "./types.js";

export const VERSION = "0.1.0";
export const DEFAULT_BASE = "https://api.figma.com/v1";

export function tokenFromEnv(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const raw = env.FIGMA_PERSONAL_ACCESS_TOKEN;
  const v = typeof raw === "string" ? raw.trim() : "";
  return v ? v : undefined;
}

export function baseFromEnv(
  env: Record<string, string | undefined> = process.env,
): string {
  const raw = env.FIGMA_API_BASE;
  const v = typeof raw === "string" ? raw.trim().replace(/\/+$/, "") : "";
  return v ? v : DEFAULT_BASE;
}

function requireToken(token?: string): string {
  const v = typeof token === "string" ? token.trim() : "";
  if (!v) throw new Error("FIGMA_PERSONAL_ACCESS_TOKEN is not set: a Figma personal access token is required (set the FIGMA_PERSONAL_ACCESS_TOKEN environment variable)");
  return v;
}

function requireString(value: unknown, name: string): string {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) throw new Error(`${name} must be a non-empty string`);
  return v;
}

function qs(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    if (typeof v === "number" && !Number.isFinite(v)) continue;
    if (typeof v === "string" && !v.trim()) continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

async function request(
  fetchFn: FetchFn,
  token: string | undefined,
  method: string,
  path: string,
  body?: Record<string, unknown>,
  base: string = DEFAULT_BASE,
): Promise<unknown> {
  const auth = requireToken(token);
  const headers: Record<string, string> = {
    "X-Figma-Token": auth,
    Accept: "application/json",
  };
  let payload: string | undefined;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetchFn(`${base}${path}`, { method, headers, body: payload });
  } catch (err) {
    throw new Error(`Failed to reach Figma API at ${base}: ${err instanceof Error ? err.message : String(err)}`);
  }
  const text = await response.text();
  if (!response.ok) {
    const detail = text.trim().slice(0, 200);
    throw new Error(`Figma API request failed: HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}${detail ? `: ${detail}` : ""}`);
  }
  if (!text.trim()) return { ok: true, status: response.status };
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function getFile(fetchFn: FetchFn, opts: GetFileOptions, token?: string, base?: string): Promise<unknown> {
  const key = requireString(opts.file_key, "file_key");
  return request(fetchFn, token, "GET", `/files/${encodeURIComponent(key)}${qs({ version: opts.version, depth: opts.depth })}`, undefined, base);
}

export async function getFileNodes(fetchFn: FetchFn, opts: GetFileNodesOptions, token?: string, base?: string): Promise<unknown> {
  const key = requireString(opts.file_key, "file_key");
  const ids = requireString(opts.node_ids, "node_ids");
  return request(fetchFn, token, "GET", `/files/${encodeURIComponent(key)}/nodes${qs({ ids, depth: opts.depth, version: opts.version })}`, undefined, base);
}

export async function getImages(fetchFn: FetchFn, opts: GetImagesOptions, token?: string, base?: string): Promise<unknown> {
  const key = requireString(opts.file_key, "file_key");
  const ids = requireString(opts.node_ids, "node_ids");
  return request(fetchFn, token, "GET", `/images/${encodeURIComponent(key)}${qs({ ids, format: opts.format, scale: opts.scale })}`, undefined, base);
}

export async function getImageFills(fetchFn: FetchFn, opts: GetImageFillsOptions, token?: string, base?: string): Promise<unknown> {
  const key = requireString(opts.file_key, "file_key");
  return request(fetchFn, token, "GET", `/files/${encodeURIComponent(key)}/images`, undefined, base);
}

export async function getFileStyles(fetchFn: FetchFn, opts: GetFileStylesOptions, token?: string, base?: string): Promise<unknown> {
  const key = requireString(opts.file_key, "file_key");
  return request(fetchFn, token, "GET", `/files/${encodeURIComponent(key)}/styles`, undefined, base);
}

export async function getFileComponents(fetchFn: FetchFn, opts: GetFileComponentsOptions, token?: string, base?: string): Promise<unknown> {
  const key = requireString(opts.file_key, "file_key");
  return request(fetchFn, token, "GET", `/files/${encodeURIComponent(key)}/components`, undefined, base);
}

export async function getTeamProjects(fetchFn: FetchFn, opts: GetTeamProjectsOptions, token?: string, base?: string): Promise<unknown> {
  const id = requireString(opts.team_id, "team_id");
  return request(fetchFn, token, "GET", `/teams/${encodeURIComponent(id)}/projects`, undefined, base);
}

export async function listProjectFiles(fetchFn: FetchFn, opts: ListProjectFilesOptions, token?: string, base?: string): Promise<unknown> {
  const id = requireString(opts.project_id, "project_id");
  return request(fetchFn, token, "GET", `/projects/${encodeURIComponent(id)}/files`, undefined, base);
}

export async function getComments(fetchFn: FetchFn, opts: GetCommentsOptions, token?: string, base?: string): Promise<unknown> {
  const key = requireString(opts.file_key, "file_key");
  return request(fetchFn, token, "GET", `/files/${encodeURIComponent(key)}/comments`, undefined, base);
}

export async function postComment(fetchFn: FetchFn, opts: PostCommentOptions, token?: string, base?: string): Promise<unknown> {
  const key = requireString(opts.file_key, "file_key");
  const message = requireString(opts.message, "message");
  const body: Record<string, unknown> = { message };
  if (typeof opts.client_meta === "string" && opts.client_meta.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(opts.client_meta);
    } catch {
      throw new Error("client_meta must be a JSON-string encoding an object");
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("client_meta must be a JSON-string encoding an object");
    }
    body.client_meta = parsed;
  }
  return request(fetchFn, token, "POST", `/files/${encodeURIComponent(key)}/comments`, body, base);
}
