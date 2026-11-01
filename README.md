# designport

designport is a compatible client for the Figma REST API, packaged
as an MCP server and a small CLI. It is an independent client for
the same public upstream API (`https://api.figma.com/v1`) — it is
not a copy of Figma's hosted OAuth remote MCP server, and none of
that server's OAuth tool surface (design context, screenshots,
metadata, variable definitions, code-connect, FigJam, or
design-system rules) is reproduced here.

The subset covers reading design files: fetch a file or specific
nodes, render nodes to images, list image fills, styles, and
components, browse team projects and project files, and read or
post comments on a file.

Authentication is a Figma personal access token, sent as the
`X-Figma-Token` header. Set `FIGMA_PERSONAL_ACCESS_TOKEN` before
starting the server; a call made without it fails with an error
naming the variable. The API base can be overridden with
`FIGMA_API_BASE`.

## Install

```bash
npx @reneturcios/designport get_file <file_key>
docker run -i ghcr.io/cloudcorprecords/designport
```

## CLI

```bash
designport get_file <file_key> --depth 2
designport get_file_nodes <file_key> 1:2,3:4
designport get_images <file_key> 1:2 --format png --scale 2
designport get_file_styles <file_key>
designport get_team_projects <team_id>
designport list_project_files <project_id>
designport post_comment <file_key> "Looks good"
designport --version
```

Exit codes: `0` success, `1` API error, `2` usage error.

## MCP server

```bash
npx -y @reneturcios/designport mcp
```

```json
{
  "mcpServers": {
    "designport": {
      "command": "npx",
      "args": ["-y", "@reneturcios/designport", "mcp"],
      "env": { "FIGMA_PERSONAL_ACCESS_TOKEN": "your-token" }
    }
  }
}
```

### Tools

| Tool | Input | Figma endpoint |
| --- | --- | --- |
| `get_file` | `file_key`, `version`?, `depth`? | `GET /files/{key}` |
| `get_file_nodes` | `file_key`, `node_ids`, `depth`?, `version`? | `GET /files/{key}/nodes` |
| `get_images` | `file_key`, `node_ids`, `format`?, `scale`? | `GET /images/{key}` |
| `get_image_fills` | `file_key` | `GET /files/{key}/images` |
| `get_file_styles` | `file_key` | `GET /files/{key}/styles` |
| `get_file_components` | `file_key` | `GET /files/{key}/components` |
| `get_team_projects` | `team_id` | `GET /teams/{id}/projects` |
| `list_project_files` | `project_id` | `GET /projects/{id}/files` |
| `get_comments` | `file_key` | `GET /files/{key}/comments` |
| `post_comment` | `file_key`, `message`, `client_meta`? | `POST /files/{key}/comments` |

`node_ids` is a comma-separated string of node IDs, sent as the
API's `ids` parameter. `post_comment`'s optional `client_meta` is
a string containing a JSON-encoded object — for example
`'{"x":10,"y":20}'` — which is parsed and sent as the API's
`client_meta` object; keeping it a string keeps the tool schema
simple.

Out of scope for this subset: the variables API, dev resources,
library assets and search, webhooks, activity logs, and payments.

## Development

```bash
npm install
npm run build
npm test
```

Tests run entirely on fake-fetch fixtures; no network and no real
token are used.

## License

MIT — see `LICENSE`.
