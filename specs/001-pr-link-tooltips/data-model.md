# Data Model: PR Link Tooltips

**Date**: 2026-03-13
**Feature**: 001-pr-link-tooltips

## Entities

### PRLink

Detected anchor element on a webpage matching a GitHub PR URL pattern.

| Field | Type | Description |
|-------|------|-------------|
| owner | string | Repository owner (user or org) |
| repo | string | Repository name |
| number | number | Pull request number |
| url | string | Original full URL from the anchor href |

**Identity**: Unique by `(owner, repo, number)`. Multiple anchor elements may reference the same PR.

**Parsing**: Extracted from anchor `href` matching `https://github.com/{owner}/{repo}/pull/{number}`. Optional trailing path segments (e.g., `/files`, `/commits`) are ignored; the PR number is the significant identifier.

### PRData

Fetched metadata about a pull request. This is the normalized shape returned by both the REST and GraphQL clients.

| Field | Type | Description |
|-------|------|-------------|
| owner | string | Repository owner |
| repo | string | Repository name |
| number | number | PR number |
| title | string | PR title |
| author | string | Author's GitHub username |
| state | "open" \| "closed" \| "merged" | Current PR state |
| isDraft | boolean | Whether the PR is a draft |
| headSha | string | Current HEAD commit SHA |
| ciStatus | "success" \| "failure" \| "pending" \| "none" | Rollup CI/check status |
| createdAt | string (ISO 8601) | When the PR was created |
| updatedAt | string (ISO 8601) | When the PR was last updated |
| reviews | ReviewEntry[] | All reviews on the PR |
| latestComment | CommentPreview \| null | Most recent comment or review summary |
| fetchedAt | number (timestamp ms) | When this data was fetched (for cache TTL) |

**State derivation**: GitHub REST API returns `state: "open" | "closed"` plus a `merged` boolean. The normalized state combines these: if `merged` is true, state is `"merged"`; otherwise use the raw state.

**CI status derivation**: Derived from the check-runs/check-suites rollup. If any check has conclusion `"failure"`, status is `"failure"`. If all checks have conclusion `"success"`, status is `"success"`. If any are in-progress/queued, status is `"pending"`. If no checks exist, status is `"none"`.

### ReviewEntry

A single review on a PR.

| Field | Type | Description |
|-------|------|-------------|
| reviewer | string | Reviewer's GitHub username |
| state | "APPROVED" \| "CHANGES_REQUESTED" \| "COMMENTED" \| "DISMISSED" \| "PENDING" | Review state |
| submittedAt | string (ISO 8601) \| null | When the review was submitted (null for pending requests) |
| commitSha | string \| null | SHA of the commit that was reviewed (null for pending requests) |
| isStale | boolean | Derived: `commitSha !== prData.headSha` |

**Staleness rule**: A review is stale if the commit SHA it was submitted against does not match the PR's current HEAD SHA. This means new code has been pushed since the review.

**Deduplication**: If a reviewer has submitted multiple reviews, all are included (sorted by `submittedAt`). The UI may choose to show only the most recent per reviewer in a summary view, but the full list is available for the timeline view.

### CommentPreview

The most recent comment or review summary on a PR.

| Field | Type | Description |
|-------|------|-------------|
| author | string | Comment author's GitHub username |
| body | string | Full comment body text |
| bodyPreview | string | First 3 lines of body, truncated with ellipsis if longer |
| createdAt | string (ISO 8601) | When the comment was posted |
| type | "comment" \| "review" | Whether this is an issue comment or a review summary |

**Selection rule**: Compare the most recent issue comment's `createdAt` against the most recent review's `submittedAt`. Whichever is newer becomes the `latestComment`. If neither exists, `latestComment` is null.

### CacheEntry

In-memory cached PR data with TTL tracking.

| Field | Type | Description |
|-------|------|-------------|
| key | string | Cache key: `"{owner}/{repo}/{number}"` |
| data | PRData | The cached PR data |
| fetchedAt | number (timestamp ms) | When the data was fetched |

**TTL behavior**:
- **Page-load tier (5 minutes)**: On page load, if a cache entry exists and `now - fetchedAt < 300000ms`, use it without fetching. Otherwise fetch fresh data.
- **Hover tier (1 minute)**: When tooltip opens, if `now - fetchedAt < 60000ms`, show cached data only. If `>= 60000ms`, show cached data immediately AND trigger a background refresh. When refresh completes, update the cache entry and re-render the tooltip/icon if data changed.

### SitePreference

Per-site enable/disable setting.

| Field | Type | Description |
|-------|------|-------------|
| hostname | string | Site hostname (e.g., `issues.redhat.com`) |
| enabled | boolean | Whether the extension is active on this site |

**Storage**: Persisted in `browser.storage.local` as a map of `{ [hostname]: boolean }`.

**Default**: Extension is enabled on all non-GitHub sites unless explicitly disabled.

### UserConfig

Extension-wide configuration.

| Field | Type | Description |
|-------|------|-------------|
| pat | string \| null | GitHub PAT, encrypted with AES-GCM before storage |
| globalEnabled | boolean | Master enable/disable switch |

**Storage**: Persisted in `browser.storage.local`. The PAT is encrypted using the Web Crypto API before writing and decrypted on read.

## Relationships

```
PRLink (detected on page)
  └── maps to PRData (fetched from GitHub API, cached)
        ├── has many ReviewEntry (embedded)
        └── has one CommentPreview (embedded, nullable)

UserConfig (global settings)
  └── contains optional PAT (determines REST vs GraphQL mode)

SitePreference (per hostname)
  └── determines whether content script activates
```

## State Transitions

### PR Icon State

```
[Link Detected] → [Loading Placeholder] → [State Icon Shown]
                                        → [No Icon] (API error or private repo without token)
```

### Tooltip Data State

```
[Hover Start]
  ├── Cache hit, fresh (< 1 min) → [Show Cached Data]
  ├── Cache hit, stale (>= 1 min) → [Show Cached Data] + [Background Refresh] → [Update If Changed]
  └── Cache miss → [Show Loading] → [Show Fresh Data]
```

### API Mode

```
[No Token] → REST Client (unauthenticated, public repos only)
[Valid Token] → GraphQL Client (authenticated, all repos)
[Invalid Token] → GraphQL attempt fails → REST Client fallback + popup warning
```
