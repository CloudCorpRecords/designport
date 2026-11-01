import { describe, it } from "node:test";
import assert from "node:assert/strict";
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
} from "../src/designport.js";
import type { FetchFn, HttpResponse } from "../src/types.js";

interface Captured { url?: string; init?: { method?: string; headers?: Record<string, string>; body?: string } }

function resp(body: string, opts: Partial<HttpResponse> = {}): HttpResponse {
  return { ok: true, status: 200, statusText: "OK", headers: { get: () => null }, text: async () => body, ...opts };
}
function fake(captured: Captured, body = '{"name":"File"}'): FetchFn {
  return async (url, init) => { captured.url = url; captured.init = init; return resp(body); };
}
const TOKEN = "fig-token";

describe("env helpers", () => {
  it("tokenFromEnv trims and returns undefined when absent", () => {
    assert.equal(tokenFromEnv({ FIGMA_PERSONAL_ACCESS_TOKEN: " t " }), "t");
    assert.equal(tokenFromEnv({}), undefined);
  });
  it("baseFromEnv defaults to the Figma v1 base and overrides", () => {
    assert.equal(baseFromEnv({}), "https://api.figma.com/v1");
    assert.equal(baseFromEnv({ FIGMA_API_BASE: "https://example.test/v1/" }), "https://example.test/v1");
  });
});

describe("missing token", () => {
  it("calls error naming FIGMA_PERSONAL_ACCESS_TOKEN when no token is set", async () => {
    await assert.rejects(() => getFile(fake({}), { file_key: "abc" }), /FIGMA_PERSONAL_ACCESS_TOKEN/);
    await assert.rejects(() => getComments(fake({}), { file_key: "abc" }), /FIGMA_PERSONAL_ACCESS_TOKEN/);
    await assert.rejects(() => postComment(fake({}), { file_key: "abc", message: "hi" }), /FIGMA_PERSONAL_ACCESS_TOKEN/);
  });
});

describe("file reads", () => {
  it("get_file GETs /files/{key} with X-Figma-Token and parses JSON", async () => {
    const c: Captured = {};
    const out = await getFile(fake(c, '{"name":"Homepage","version":"3"}'), { file_key: "abc123" }, TOKEN);
    assert.deepEqual(out, { name: "Homepage", version: "3" });
    assert.equal(c.url, "https://api.figma.com/v1/files/abc123");
    assert.equal(c.init?.method, "GET");
    assert.equal(c.init?.headers?.["X-Figma-Token"], "fig-token");
  });
  it("get_file shapes version and depth query params", async () => {
    const c: Captured = {};
    await getFile(fake(c), { file_key: "abc", version: "42", depth: 2 }, TOKEN);
    assert.equal(c.url, "https://api.figma.com/v1/files/abc?version=42&depth=2");
  });
  it("get_file_nodes sends comma-separated ids as the ids param", async () => {
    const c: Captured = {};
    await getFileNodes(fake(c), { file_key: "abc", node_ids: "1:2,3:4", depth: 1 }, TOKEN);
    assert.equal(c.url, "https://api.figma.com/v1/files/abc/nodes?ids=1%3A2%2C3%3A4&depth=1");
  });
  it("get_images GETs /images/{key} with ids, format and scale", async () => {
    const c: Captured = {};
    await getImages(fake(c, '{"images":{"1:2":"https://x/y.png"}}'), { file_key: "abc", node_ids: "1:2", format: "png", scale: 2 }, TOKEN);
    assert.equal(c.url, "https://api.figma.com/v1/images/abc?ids=1%3A2&format=png&scale=2");
  });
  it("get_image_fills GETs /files/{key}/images", async () => {
    const c: Captured = {};
    await getImageFills(fake(c), { file_key: "abc" }, TOKEN);
    assert.equal(c.url, "https://api.figma.com/v1/files/abc/images");
  });
  it("get_file_styles GETs /files/{key}/styles", async () => {
    const c: Captured = {};
    await getFileStyles(fake(c), { file_key: "abc" }, TOKEN);
    assert.equal(c.url, "https://api.figma.com/v1/files/abc/styles");
  });
  it("get_file_components GETs /files/{key}/components", async () => {
    const c: Captured = {};
    await getFileComponents(fake(c), { file_key: "abc" }, TOKEN);
    assert.equal(c.url, "https://api.figma.com/v1/files/abc/components");
  });
  it("rejects empty file keys", async () => {
    await assert.rejects(() => getFile(fake({}), { file_key: " " }, TOKEN), /file_key/);
  });
});

describe("teams and projects", () => {
  it("get_team_projects GETs /teams/{id}/projects", async () => {
    const c: Captured = {};
    await getTeamProjects(fake(c), { team_id: "t7" }, TOKEN);
    assert.equal(c.url, "https://api.figma.com/v1/teams/t7/projects");
  });
  it("list_project_files GETs /projects/{id}/files", async () => {
    const c: Captured = {};
    await listProjectFiles(fake(c), { project_id: "p8" }, TOKEN);
    assert.equal(c.url, "https://api.figma.com/v1/projects/p8/files");
  });
});

describe("comments", () => {
  it("get_comments GETs /files/{key}/comments", async () => {
    const c: Captured = {};
    await getComments(fake(c, '{"comments":[]}'), { file_key: "abc" }, TOKEN);
    assert.equal(c.url, "https://api.figma.com/v1/files/abc/comments");
  });
  it("post_comment POSTs {message} as JSON", async () => {
    const c: Captured = {};
    await postComment(fake(c, '{"id":"c1"}'), { file_key: "abc", message: "Looks good" }, TOKEN);
    assert.equal(c.url, "https://api.figma.com/v1/files/abc/comments");
    assert.equal(c.init?.method, "POST");
    assert.equal(c.init?.headers?.["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(c.init?.body ?? "{}"), { message: "Looks good" });
  });
  it("post_comment parses a client_meta JSON-string into an object", async () => {
    const c: Captured = {};
    await postComment(fake(c), { file_key: "abc", message: "hi", client_meta: '{"x":10,"y":20}' }, TOKEN);
    assert.deepEqual(JSON.parse(c.init?.body ?? "{}"), { message: "hi", client_meta: { x: 10, y: 20 } });
  });
  it("post_comment rejects a non-object client_meta string", async () => {
    await assert.rejects(() => postComment(fake({}), { file_key: "abc", message: "hi", client_meta: "not json" }, TOKEN), /client_meta/);
    await assert.rejects(() => postComment(fake({}), { file_key: "abc", message: "hi", client_meta: "[1,2]" }, TOKEN), /client_meta/);
  });
});

describe("errors", () => {
  it("surfaces HTTP failures with status and detail", async () => {
    const failing: FetchFn = async () => resp("forbidden", { ok: false, status: 403, statusText: "Forbidden" });
    await assert.rejects(() => getFile(failing, { file_key: "abc" }, TOKEN), /HTTP 403.*forbidden/);
  });
  it("surfaces connection failures naming the base", async () => {
    const failing: FetchFn = async () => { throw new Error("dns failed"); };
    await assert.rejects(() => getComments(failing, { file_key: "abc" }, TOKEN), /Failed to reach Figma API.*dns failed/);
  });
});
