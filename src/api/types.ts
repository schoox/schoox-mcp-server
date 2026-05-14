export interface SchooxClientConfig {
  baseUrl: string;
  apiKey: string;
  acadId: string;
  timeoutMs: number;
  maxRecords: number;
}

export interface ApiMeta {
  tool: string;
  action: string;
  returned: number;
  total_available?: number;
  truncated?: boolean;
  message?: string;
}

export interface RouteConfig {
  path: string;
  paginated: boolean;
  pathParams: string[];
}

export interface ToolSuccessResult {
  content: Array<{ type: "text"; text: string }>;
}

export interface ToolErrorResult {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
}
