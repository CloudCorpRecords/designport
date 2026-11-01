#!/usr/bin/env node
/**
 * designport CLI. One subcommand per tool, plus `mcp` and `--version`.
 * FIGMA_PERSONAL_ACCESS_TOKEN is required. Exit: 0 ok, 1 error, 2 usage.
 */
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

function usage(): never {
  console.error(`Usage:
  designport get_file <file_key> [--version v] [--depth n]
  designport get_file_nodes <file_key> <node_ids> [--depth n] [--version v]
  designport get_images <file_key> <node_ids> [--format fmt] [--scale n]
  designport get_image_fills <file_key>
  designport get_file_styles <file_key>
  designport get_file_components <file_key>
  designport get_team_projects <team_id>
  designport list_project_files <project_id>
  designport get_comments <file_key>
  designport post_comment <file_key> <message...> [--client-meta json-string]
  designport mcp
  designport --version`);
  process.exit(2);
}
function flagValue(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx < 0 || idx + 1 >= args.length ? undefined : args[idx + 1];
}
function numFlag(args: string[], name: string): number | undefined {
  const raw = flagValue(args, name);
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}
function withoutFlags(args: string[], valueFlags: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (valueFlags.includes(args[i])) i++;
    else out.push(args[i]);
  }
  return out;
}
function print(v: unknown): void { console.log(typeof v === "string" ? v : JSON.stringify(v, null, 2)); }

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "--version" || cmd === "-v") { console.log(VERSION); return; }
  if (cmd === "mcp") { await import("./mcp.js"); return; }
  if (!cmd) usage();
  const fetchFn = globalThis.fetch as unknown as FetchFn;
  const token = tokenFromEnv();
  const base = baseFromEnv();
  try {
    switch (cmd) {
      case "get_file": if (!rest[0]) usage(); print(await getFile(fetchFn, { file_key: rest[0], version: flagValue(rest, "--version"), depth: numFlag(rest, "--depth") }, token, base)); break;
      case "get_file_nodes": if (!rest[0] || !rest[1]) usage(); print(await getFileNodes(fetchFn, { file_key: rest[0], node_ids: rest[1], depth: numFlag(rest, "--depth"), version: flagValue(rest, "--version") }, token, base)); break;
      case "get_images": if (!rest[0] || !rest[1]) usage(); print(await getImages(fetchFn, { file_key: rest[0], node_ids: rest[1], format: flagValue(rest, "--format"), scale: numFlag(rest, "--scale") }, token, base)); break;
      case "get_image_fills": if (!rest[0]) usage(); print(await getImageFills(fetchFn, { file_key: rest[0] }, token, base)); break;
      case "get_file_styles": if (!rest[0]) usage(); print(await getFileStyles(fetchFn, { file_key: rest[0] }, token, base)); break;
      case "get_file_components": if (!rest[0]) usage(); print(await getFileComponents(fetchFn, { file_key: rest[0] }, token, base)); break;
      case "get_team_projects": if (!rest[0]) usage(); print(await getTeamProjects(fetchFn, { team_id: rest[0] }, token, base)); break;
      case "list_project_files": if (!rest[0]) usage(); print(await listProjectFiles(fetchFn, { project_id: rest[0] }, token, base)); break;
      case "get_comments": if (!rest[0]) usage(); print(await getComments(fetchFn, { file_key: rest[0] }, token, base)); break;
      case "post_comment": {
        const positional = withoutFlags(rest, ["--client-meta"]);
        if (!positional[0] || !positional[1]) usage();
        print(await postComment(fetchFn, { file_key: positional[0], message: positional.slice(1).join(" "), client_meta: flagValue(rest, "--client-meta") }, token, base)); break;
      }
      default: usage();
    }
  } catch (err) {
    console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
void main();
