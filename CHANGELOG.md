# Changelog

## 0.1.0 (2026-10-26)

- Initial release.
- MCP server (`designport mcp`, stdio) and CLI with ten tools for
  the Figma REST API: `get_file`, `get_file_nodes`, `get_images`,
  `get_image_fills`, `get_file_styles`, `get_file_components`,
  `get_team_projects`, `list_project_files`, `get_comments`, and
  `post_comment`.
- Compatible client for the same upstream Figma REST API — not a
  copy of Figma's hosted OAuth remote MCP server; that server's
  OAuth tool surface is intentionally not reproduced.
- Auth is the `X-Figma-Token: <FIGMA_PERSONAL_ACCESS_TOKEN>`
  header; the base URL can be overridden with `FIGMA_API_BASE`.
  A missing token is an error naming
  `FIGMA_PERSONAL_ACCESS_TOKEN`.
- `post_comment`'s `client_meta` is a JSON-string parameter that
  is parsed to an object before sending.
- All HTTP goes through an injectable fetch function, so tests run
  on fixtures with no network access.
