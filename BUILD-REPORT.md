# BUILD-REPORT — designport (original: figma)

Built 2026-10-26 for the MCP Rebuild 100 program, Tier C core
subset. Local only; nothing pushed or published.

## Identity

- npm: `@reneturcios/designport`, bin `designport`, version 0.1.0
- Registry name: `io.github.CloudCorpRecords/designport`
  (matches package.json `mcpName`, server.json `name`, and the
  Dockerfile `io.modelcontextprotocol.server.name` label)
- server.json description: 87 chars (≤100, counted)
- server.json OCI package entry: no `version` field (version only
  in the tagged identifier `ghcr.io/cloudcorprecords/designport:0.1.0`)

## Subset scope

Per the program rule for proprietary remote servers, designport is
a compatible client for the same upstream Figma REST API
(`https://api.figma.com/v1`, header `X-Figma-Token:
<FIGMA_PERSONAL_ACCESS_TOKEN>`, base override `FIGMA_API_BASE`) —
NOT a copy of Figma's hosted OAuth remote MCP server. The fixture
(`harness/fixtures/figma-tools-original.json`) records this in its
`_source` and defines the 10-tool core subset:

| Tool | Endpoint |
| --- | --- |
| `get_file` | `GET /files/{file_key}` (`version`, `depth`) |
| `get_file_nodes` | `GET /files/{file_key}/nodes` (`ids` from comma-separated `node_ids`, `depth`, `version`) |
| `get_images` | `GET /images/{file_key}` (`ids`, `format`, `scale`) |
| `get_image_fills` | `GET /files/{file_key}/images` |
| `get_file_styles` | `GET /files/{file_key}/styles` |
| `get_file_components` | `GET /files/{file_key}/components` |
| `get_team_projects` | `GET /teams/{team_id}/projects` |
| `list_project_files` | `GET /projects/{project_id}/files` |
| `get_comments` | `GET /files/{file_key}/comments` |
| `post_comment` | `POST /files/{file_key}/comments` |

`post_comment`'s optional `client_meta` is a string parameter
containing a JSON-encoded object; it is parsed and sent as the
API's `client_meta` object (documented in README and code), which
keeps the tool schema simple.

Omitted groups (also in the fixture `_source`): the hosted remote
MCP's OAuth tool surface (`get_design_context`, `get_screenshot`,
`get_metadata`, `get_variable_defs`, code-connect tools, figjam,
design-system rules) — not reproduced; plus REST groups not
covered here: variables API, dev resources, library
assets/search, webhooks, activity logs, and payments.

Registered via the low-level MCP `Server` API with explicit
inputSchema literals identical to the fixture; zod validates call
arguments. All HTTP goes through an injectable `FetchFn`.

## Verification (all foreground, verified from disk/output)

- tsc: `npm run build` exit 0; `dist/cli.js` present;
  `node dist/cli.js --version` → `0.1.0`; unknown command prints
  Usage and exits 2
- Tests: 19/19 pass (`npm test`, fake fetch only — URL/method/
  X-Figma-Token header/body shaping, query params including
  comma-separated node IDs, `client_meta` JSON-string parsing and
  rejection, HTTP/connection errors, missing-token errors)
- Parity: fixture `harness/fixtures/figma-tools-original.json`
  vs live stdio rebuild via `harness/parity.py` →
  `parity_pct == 100.0`, identical 10/10, verdict PASS, output in
  `parity-out/parity.json`
- Missing-env stdio check: with `FIGMA_PERSONAL_ACCESS_TOKEN`
  unset, an initialize + `tools/call get_file` session returned
  `isError: true` with text naming `FIGMA_PERSONAL_ACCESS_TOKEN`

## Honest gaps

- No live call to api.figma.com was made or claimed; wire
  behaviour is proven against fake-fetch fixtures only, so
  upstream drift is unverified until the publish-wave live smoke.
- This reproduces none of the hosted remote MCP's design-context,
  screenshot, or code-generation behaviour — those tools require
  Figma's hosted OAuth surface and are out of scope by design.
- Lockfile flag: `package-lock.json` is a copy of the
  libdocs-remote lockfile with identity fields edited (name, bin).
  **Clean lockfile regeneration (no node_modules present) is
  required before publish** — fleet lesson 2026-10-25.
- mcpaudit / mcpvet / shipcheck pre-publish gate not run (belongs
  to the publish wave, per SCOREBOARD).
