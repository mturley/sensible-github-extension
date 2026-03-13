# Feature Specification: PR Link Tooltips

**Feature Branch**: `001-pr-link-tooltips`
**Created**: 2026-03-13
**Status**: Draft
**Input**: User description: "Detect GitHub PR links on any webpage and display inline status icons and hover tooltips with detailed PR information"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See PR State at a Glance (Priority: P1)

A user is browsing a Jira issue that contains links to GitHub pull requests. Without clicking any link or leaving the page, they can immediately see the state of each PR via a small icon injected next to the link — open (green), merged (purple), closed (red), or draft (gray dashed). This eliminates the need to open each PR link just to check whether it's been merged or is still in progress.

**Why this priority**: This is the core value proposition. Even without the tooltip, status icons alone save significant context-switching time and are the minimum viable feature.

**Independent Test**: Navigate to any page containing a GitHub PR link to a public repository. The link should display a colored icon indicating the PR's current state.

**Acceptance Scenarios**:

1. **Given** a page with a link to an open PR on a public repo, **When** the page finishes loading, **Then** a green "open" icon appears next to the link.
2. **Given** a page with a link to a merged PR, **When** the page finishes loading, **Then** a purple "merged" icon appears next to the link.
3. **Given** a page with a link to a closed (not merged) PR, **When** the page finishes loading, **Then** a red "closed" icon appears next to the link.
4. **Given** a page with a link to a draft PR, **When** the page finishes loading, **Then** a gray dashed "draft" icon appears next to the link.
5. **Given** a page on github.com, **When** the page loads, **Then** the extension does nothing (no icons injected).
6. **Given** a page with a link to a private repo PR, **When** the page loads, **Then** no icon is shown for that link (API returns 404, extension fails silently).

---

### User Story 2 - View Detailed PR Info on Hover (Priority: P2)

A user hovers over a GitHub PR link (which already has a status icon from US1). A tooltip appears showing detailed information about the PR: title, author, current state, CI status, reviewer summary, the most recent comment or review summary, and how long ago it was created/updated. The user can quickly assess whether the PR needs attention without navigating to GitHub.

**Why this priority**: The tooltip is the primary detailed-information feature, but it depends on the link detection and icon infrastructure from US1. It transforms the extension from "glanceable status" to "full context without leaving the page."

**Independent Test**: Hover over any PR link with a status icon. A tooltip appears within 1 second showing the PR's detailed information. Moving the mouse away dismisses the tooltip.

**Acceptance Scenarios**:

1. **Given** a PR link with a status icon, **When** the user hovers over the link, **Then** a tooltip appears showing the PR title, number, author, state, and repository name.
2. **Given** the tooltip is visible, **When** the user moves the mouse away from the link and tooltip, **Then** the tooltip disappears.
3. **Given** a PR with passing CI checks, **When** the tooltip is shown, **Then** it displays a green checkmark for CI status.
4. **Given** a PR with failing CI checks, **When** the tooltip is shown, **Then** it displays a red X for CI status.
5. **Given** a PR with pending CI checks, **When** the tooltip is shown, **Then** it displays a yellow dot for CI status.
6. **Given** a PR with reviews, **When** the tooltip is shown, **Then** it displays a summary of reviewer activity (e.g., "2 approved, 1 changes requested, 1 pending").
7. **Given** a PR with comments or review summaries, **When** the tooltip is shown, **Then** it displays the most recent comment or review summary text, including the author and relative timestamp.
8. **Given** a PR with no comments or reviews, **When** the tooltip is shown, **Then** the recent comment section is omitted (not shown as empty).

---

### User Story 3 - View Review Timeline with Staleness (Priority: P3)

A user wants to understand not just the current review state but the review history — specifically whether reviews are still current or have become stale due to new commits being pushed after the review. The tooltip (from US2) includes a review timeline section showing each reviewer's status, when they reviewed, and whether new commits have been pushed since their review (making the review "stale").

**Why this priority**: This is the advanced insight that distinguishes this extension from a simple status badge. It brings the nuanced review-staleness logic (inspired by the PR reviews dashboard) directly into the tooltip, but it requires US1 and US2 infrastructure first.

**Independent Test**: Hover over a PR link for a PR that has reviews and subsequent commits. The tooltip's review section shows which reviews are stale (reviewed an older commit) vs. current (reviewed the latest commit).

**Acceptance Scenarios**:

1. **Given** a PR where a reviewer approved and no new commits were pushed after, **When** the tooltip is shown, **Then** the reviewer's approval appears as current (not stale).
2. **Given** a PR where a reviewer approved but new commits were pushed after their review, **When** the tooltip is shown, **Then** the reviewer's approval appears as stale (visually distinguished, e.g., dimmed or with a warning indicator).
3. **Given** a PR where changes were requested and the author has not pushed new commits since, **When** the tooltip is shown, **Then** the "changes requested" status appears as current (author has not yet addressed feedback).
4. **Given** a PR where changes were requested and the author subsequently pushed new commits, **When** the tooltip is shown, **Then** the "changes requested" status appears as stale (author may have addressed feedback).
5. **Given** a PR with multiple reviewers in different states, **When** the tooltip is shown, **Then** each reviewer's status and staleness is shown independently.

---

### User Story 4 - Extension Popup and Settings (Priority: P4)

A user clicks the extension icon in the browser toolbar. A popup appears showing the extension's current status (enabled/disabled) and a toggle to enable or disable it for the current site. The user can also access a settings page to configure behavior like whether to show icons, whether to show tooltips, and which sites to exclude.

**Why this priority**: Settings and per-site controls are important for user experience but are not needed for the core functionality. The extension should work out of the box with sensible defaults.

**Independent Test**: Click the extension icon, toggle the extension off for the current site, and verify PR link icons disappear. Toggle back on and verify they reappear.

**Acceptance Scenarios**:

1. **Given** the extension is installed, **When** the user clicks the extension icon in the toolbar, **Then** a popup appears showing the current enabled/disabled state for the active site.
2. **Given** the popup is open, **When** the user toggles the extension off for the current site, **Then** all PR icons and tooltips are removed from the page immediately.
3. **Given** the extension was disabled for a site, **When** the user navigates to that site again, **Then** the extension remains disabled (setting persists).
4. **Given** the settings page is open, **When** the user adds a site to the exclusion list, **Then** the extension does not activate on that site.

---

### Edge Cases

- What happens when a page has dozens of PR links? The extension MUST batch or throttle API requests to avoid hitting GitHub's unauthenticated rate limit (60 requests/hour). Links beyond the rate limit MUST be left undecorated rather than causing errors.
- What happens when the GitHub API is unreachable? The extension MUST fail silently — no error popups, no broken page layout. PR links remain as plain links.
- What happens when a PR link uses a non-standard format (e.g., shortened URL, API URL, or link with extra path segments)? The extension MUST only match canonical PR URL patterns (`github.com/{owner}/{repo}/pull/{number}`).
- What happens when the page content changes dynamically (e.g., SPA navigation, AJAX-loaded content on Jira)? The extension MUST observe DOM mutations and process newly added PR links.
- What happens when multiple links point to the same PR? The extension MUST reuse cached data rather than making duplicate API requests.
- What happens when the user navigates away and returns? Cached PR data MUST be reused if still fresh (within a reasonable TTL).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Extension MUST detect links matching the pattern `https://github.com/{owner}/{repo}/pull/{number}` on any non-GitHub webpage.
- **FR-002**: Extension MUST NOT activate on any page hosted on `github.com`.
- **FR-003**: Extension MUST inject a state icon (open, merged, closed, draft) next to each detected PR link.
- **FR-004**: Extension MUST display a tooltip on hover showing PR title, number, author, repository, state, CI status, creation date, and last update date.
- **FR-005**: Extension MUST show a reviewer summary in the tooltip including each reviewer's name, review state, and whether their review is stale (submitted before the latest commit).
- **FR-016**: Extension MUST show the most recent comment or review summary in the tooltip, including the comment author, relative timestamp, and a preview of the comment body. This includes both regular issue comments and review summary comments, whichever is most recent. If no comments or reviews exist, this section MUST be omitted.
- **FR-006**: Extension MUST use only unauthenticated GitHub API calls, restricting functionality to public repositories.
- **FR-007**: Extension MUST abstract the data-fetching layer so that authenticated API access can be added later without changing the UI or business logic.
- **FR-008**: Extension MUST cache API responses to minimize redundant requests and respect rate limits.
- **FR-009**: Extension MUST handle API errors, rate limiting, and unreachable endpoints gracefully — no user-visible errors, no broken page layout.
- **FR-010**: Extension MUST observe DOM mutations to detect PR links added dynamically after initial page load.
- **FR-011**: Extension MUST scope all injected styles to prevent conflicts with the host page (e.g., via Shadow DOM or CSS namespacing).
- **FR-012**: Extension MUST work on both Chrome (Manifest V3) and Firefox.
- **FR-013**: Extension MUST provide a browser action popup with a toggle to enable/disable the extension per site.
- **FR-014**: Extension MUST persist per-site enable/disable preferences across browser sessions.
- **FR-015**: Extension MUST determine review staleness by comparing each review's commit SHA against the PR's current HEAD commit SHA.

### Key Entities

- **PR Link**: A detected anchor element on a webpage whose href matches a GitHub PR URL pattern. Attributes: owner, repo, PR number, original URL.
- **PR Data**: Fetched metadata about a pull request. Attributes: title, number, author, state (open/closed/merged), draft status, head commit SHA, CI rollup status, creation timestamp, last update timestamp, most recent comment (author, body preview, timestamp, type: comment or review summary).
- **Review Entry**: A single review or review request on a PR. Attributes: reviewer username, review state (approved/changes_requested/commented/pending), submitted timestamp, reviewed commit SHA, staleness flag (derived from comparing reviewed commit SHA to head commit SHA).
- **Site Preference**: User's per-site configuration. Attributes: hostname, enabled/disabled flag.
- **API Cache Entry**: Cached response from the GitHub API. Attributes: cache key (owner/repo/number), PR data, timestamp, TTL.

## Assumptions

- The unauthenticated GitHub API rate limit of 60 requests per hour per IP is acceptable for initial use. Users with many PR links open will see some links left undecorated.
- PR links on pages follow the standard canonical format. Non-standard formats (API URLs, shortened links) are out of scope for the initial release.
- The extension does not need to handle GitHub Enterprise URLs initially (only `github.com`).
- Tooltip styling will use a neutral design that does not attempt to replicate GitHub's exact look and feel, to avoid trademark concerns and to work well across diverse host page styles.
- The "review staleness" logic compares the review's commit OID against the PR's head ref OID, consistent with the approach used in the PR reviews dashboard.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can identify the state of a GitHub PR (open, merged, closed, draft) without leaving the current page, within 3 seconds of page load.
- **SC-002**: Users can view detailed PR information (title, author, CI status, reviewers) via a hover tooltip without navigating to GitHub.
- **SC-003**: The extension processes PR links on a typical page (1-10 links) without any user-perceptible delay or layout shift on the host page.
- **SC-004**: The extension operates within GitHub's unauthenticated rate limit for typical usage (browsing 5-10 pages per hour with 1-5 PR links each).
- **SC-005**: The extension works identically on Chrome and Firefox with the same feature set.
- **SC-006**: Users can disable the extension for specific sites and have that preference persist across browser sessions.
