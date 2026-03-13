export interface PRLink {
  owner: string;
  repo: string;
  number: number;
  url: string;
}

export interface PRData {
  owner: string;
  repo: string;
  number: number;
  title: string;
  author: string;
  state: "open" | "closed" | "merged";
  isDraft: boolean;
  headSha: string;
  ciStatus: "success" | "failure" | "pending" | "none";
  createdAt: string;
  updatedAt: string;
  reviews: ReviewEntry[];
  latestComment: CommentPreview | null;
  fetchedAt: number;
}

export interface ReviewEntry {
  reviewer: string;
  state:
    | "APPROVED"
    | "CHANGES_REQUESTED"
    | "COMMENTED"
    | "DISMISSED"
    | "PENDING";
  submittedAt: string | null;
  commitSha: string | null;
  isStale: boolean;
}

export interface CommentPreview {
  author: string;
  body: string;
  bodyPreview: string;
  createdAt: string;
  type: "comment" | "review";
}

export interface CacheEntry {
  key: string;
  data: PRData;
  fetchedAt: number;
}

export interface SitePreference {
  hostname: string;
  enabled: boolean;
}

export interface UserConfig {
  pat: string | null;
  globalEnabled: boolean;
}

export interface GitHubClient {
  fetchPR(owner: string, repo: string, number: number): Promise<PRData>;
}

export type BackgroundMessage =
  | { type: "fetchPR"; owner: string; repo: string; number: number }
  | { type: "toggleSite"; hostname: string; enabled: boolean }
  | { type: "getConfig" }
  | { type: "configChanged" };

export type BackgroundResponse =
  | { type: "prData"; data: PRData }
  | { type: "error"; message: string }
  | { type: "config"; config: UserConfig };
