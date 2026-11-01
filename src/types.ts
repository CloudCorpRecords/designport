/**
 * designport types.
 *
 * Compatible client for the Figma REST API: files, nodes, images,
 * image fills, styles, components, team projects, project files,
 * and comments. HTTP access is described by a minimal response
 * surface so tests can inject a fake fetch.
 */

export interface GetFileOptions { file_key: string; version?: string; depth?: number }
export interface GetFileNodesOptions { file_key: string; node_ids: string; depth?: number; version?: string }
export interface GetImagesOptions { file_key: string; node_ids: string; format?: string; scale?: number }
export interface GetImageFillsOptions { file_key: string }
export interface GetFileStylesOptions { file_key: string }
export interface GetFileComponentsOptions { file_key: string }
export interface GetTeamProjectsOptions { team_id: string }
export interface ListProjectFilesOptions { project_id: string }
export interface GetCommentsOptions { file_key: string }
export interface PostCommentOptions { file_key: string; message: string; client_meta?: string }

export interface HttpResponse {
  ok: boolean;
  status: number;
  statusText?: string;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
}

export type FetchFn = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    redirect?: string;
  },
) => Promise<HttpResponse>;
