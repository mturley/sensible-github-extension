# Tasks: PR Link Tooltips

**Input**: Design documents from `/specs/001-pr-link-tooltips/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize WXT project, configure TypeScript, install dependencies

- [ ] T001 Initialize WXT project with TypeScript and install dependencies (wxt, webextension-polyfill, @types/webextension-polyfill) in package.json
- [ ] T002 Configure TypeScript strict mode in tsconfig.json
- [ ] T003 [P] Configure ESLint and Prettier for TypeScript in .eslintrc and .prettierrc
- [ ] T004 [P] Create extension icons (16, 32, 48, 128px) in src/assets/icons/
- [ ] T005 Configure WXT for dual-browser builds (Chrome MV3 + Firefox) in wxt.config.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

- [ ] T006 Define shared TypeScript types (PRLink, PRData, ReviewEntry, CommentPreview, CacheEntry, SitePreference, UserConfig) in src/services/github/types.ts
- [ ] T007 [P] Implement PR URL parser — detect and extract owner/repo/number from GitHub PR link hrefs, ignore non-PR URLs and github.com host check in src/utils/pr-url-parser.ts
- [ ] T008 [P] Implement relative time formatter (e.g., "2 hours ago", "3 days ago") in src/utils/relative-time.ts
- [ ] T009 [P] Implement AES-GCM encrypt/decrypt utilities using Web Crypto API in src/utils/crypto.ts
- [ ] T010 Implement storage service — read/write UserConfig (with PAT encryption) and SitePreference map to browser.storage.local in src/services/storage.ts
- [ ] T011 Implement two-tier cache manager — in-memory cache with 5-minute page-load TTL and 1-minute hover stale-while-revalidate threshold in src/services/cache.ts
- [ ] T012 Define GitHub API client interface (fetchPR method returning PRData) in src/services/github/client.ts
- [ ] T013 Implement unauthenticated REST client — 4 calls per PR (pulls, reviews, check-runs, comments), normalize response to PRData shape in src/services/github/rest-client.ts
- [ ] T014 [P] Define GraphQL query for PR data (metadata, reviews with commit OID, CI status, latest comment) in src/services/github/queries.ts
- [ ] T015 Implement authenticated GraphQL client — single query per PR, normalize response to PRData shape, fallback to REST on auth failure in src/services/github/graphql-client.ts
- [ ] T016 Implement client factory in src/services/github/client.ts — returns REST or GraphQL client based on whether a PAT is configured in storage
- [ ] T017 Implement background service worker — handle messages from content script (fetch PR data via client, return cached or fresh PRData), manage rate limiting and request throttling in src/entrypoints/background/index.ts

**Checkpoint**: Foundation ready — all shared services, API clients, and background worker operational. User story implementation can now begin.

---

## Phase 3: User Story 1 - See PR State at a Glance (Priority: P1)

**Goal**: Detect GitHub PR links on non-GitHub pages and inject colored status icons (open/green, merged/purple, closed/red, draft/gray) next to each link.

**Independent Test**: Navigate to any non-GitHub page with a public PR link. A colored state icon should appear next to the link within 3 seconds.

### Implementation for User Story 1

- [ ] T018 [US1] Implement content script entry point — on page load, check if current page is github.com (skip if so), check site preference (skip if disabled), scan DOM for PR links using pr-url-parser, send fetch requests to background worker for each unique PR in src/entrypoints/content/index.ts
- [ ] T019 [US1] Implement DOM mutation observer in src/entrypoints/content/index.ts — watch for dynamically added anchor elements, detect new PR links, trigger fetch for any not already processed
- [ ] T020 [US1] Implement icon injector — create Shadow DOM host element next to each PR link, render loading placeholder (gray dot), replace with colored state icon (open/merged/closed/draft) when PRData arrives, handle error state (remove placeholder silently) in src/entrypoints/content/icon-injector.ts
- [ ] T021 [US1] Wire content script to background worker — send PR link data via browser.runtime.sendMessage, receive PRData response, pass to icon injector for rendering in src/entrypoints/content/index.ts
- [ ] T022 [US1] Handle page-load cache integration — before sending fetch message to background, check if cache has fresh data (< 5 min) and use it directly; deduplicate requests for the same PR across multiple links in src/entrypoints/content/index.ts

**Checkpoint**: User Story 1 complete — PR links on non-GitHub pages show colored status icons. Extension does nothing on github.com. Private repo links silently show no icon (without token). Loading placeholders prevent layout shift.

---

## Phase 4: User Story 2 - View Detailed PR Info on Hover (Priority: P2)

**Goal**: Show a tooltip on hover over PR links displaying title, author, state, CI status, reviewer summary, most recent comment, and timestamps.

**Independent Test**: Hover over a PR link with a status icon. A tooltip appears within 1 second showing detailed PR info. Moving away dismisses it.

### Implementation for User Story 2

- [ ] T023 [US2] Implement tooltip component — create Shadow DOM container, render PR metadata (title, number, author, repo, state icon, CI status indicator, created/updated relative timestamps), reviewer summary section, and latest comment preview (3 lines with ellipsis) in src/entrypoints/content/tooltip.ts
- [ ] T024 [US2] Implement tooltip positioning — position tooltip near the hovered link, ensure it stays within viewport bounds, handle edge cases (link near page edges) in src/entrypoints/content/tooltip.ts
- [ ] T025 [US2] Implement tooltip show/hide logic — show on mouseenter of PR link or icon, hide on mouseleave of both link and tooltip (with small delay to allow moving to tooltip), prevent multiple tooltips from appearing simultaneously in src/entrypoints/content/tooltip.ts
- [ ] T026 [US2] Implement stale-while-revalidate on hover — when tooltip opens, if cached data is older than 1 minute, show cached data immediately and send background refresh request; when fresh data arrives, update tooltip content and icon in place if data changed in src/entrypoints/content/index.ts
- [ ] T027 [US2] Style the tooltip — neutral design with scoped CSS inside Shadow DOM, CI status indicators (green checkmark, red X, yellow dot), reviewer state badges, comment preview section with author and relative timestamp in src/entrypoints/content/tooltip.ts

**Checkpoint**: User Story 2 complete — hovering over PR links shows a detailed tooltip. Stale-while-revalidate refreshes data in background. Tooltip styling is isolated from host page.

---

## Phase 5: User Story 3 - View Review Timeline with Staleness (Priority: P3)

**Goal**: Enhance the tooltip's reviewer section to show per-reviewer staleness — whether each review was submitted before or after the latest commit push.

**Independent Test**: Hover over a PR with reviews and subsequent commits. Stale reviews appear visually dimmed or marked compared to current reviews.

### Implementation for User Story 3

- [ ] T028 [US3] Implement review staleness computation — for each ReviewEntry, compare commitSha against PRData.headSha to derive isStale flag in src/services/review-staleness.ts
- [ ] T029 [US3] Enhance tooltip reviewer section — show each reviewer's name, review state (approved/changes_requested/commented), relative timestamp, and staleness indicator (dimmed or warning badge for stale reviews) in src/entrypoints/content/tooltip.ts
- [ ] T030 [US3] Handle multiple reviews per reviewer — show the most recent review per reviewer in the summary view, with staleness computed against that most recent review in src/services/review-staleness.ts

**Checkpoint**: User Story 3 complete — tooltip shows per-reviewer staleness. Stale reviews are visually distinguished from current reviews.

---

## Phase 6: User Story 4 - Extension Popup and Settings (Priority: P4)

**Goal**: Provide a browser action popup with per-site enable/disable toggle and a settings page for PAT configuration and site exclusion list.

**Independent Test**: Click extension icon, toggle off for current site, verify icons disappear. Enter a PAT in settings, verify private repo PR links are decorated.

### Implementation for User Story 4

- [ ] T031 [US4] Create popup HTML structure with current site status display and enable/disable toggle in src/entrypoints/popup/index.html
- [ ] T032 [US4] Implement popup logic — read current tab URL, look up site preference, toggle enabled/disabled state, persist to storage, send message to content script to add/remove icons immediately in src/entrypoints/popup/index.ts
- [ ] T033 [US4] Implement settings page — PAT input field (masked), save/clear PAT buttons, site exclusion list management in src/entrypoints/popup/settings.ts
- [ ] T034 [US4] Implement PAT validation — on save, attempt a lightweight GitHub API call to verify token validity, show success/error feedback in src/entrypoints/popup/settings.ts
- [ ] T035 [US4] Implement invalid token indicator — when background worker detects auth failure, store a flag; popup reads flag and shows non-intrusive warning that the token needs attention in src/entrypoints/popup/index.ts
- [ ] T036 [US4] Wire popup toggle to content script — when user disables extension for a site, send message to content script to remove all injected icons and tooltips from the page immediately in src/entrypoints/content/index.ts
- [ ] T037 [US4] Style popup and settings — clean, minimal UI scoped to popup HTML, consistent with extension icon design in src/entrypoints/popup/index.html

**Checkpoint**: User Story 4 complete — popup shows per-site toggle, settings allow PAT configuration. Token validation provides feedback. Invalid token triggers fallback with warning.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements that affect multiple user stories

- [ ] T038 [P] Verify extension builds and loads correctly on Chrome (Manifest V3)
- [ ] T039 [P] Verify extension builds and loads correctly on Firefox
- [ ] T040 Manual smoke test on both browsers — test all 4 user stories end-to-end
- [ ] T041 [P] Update README.md with installation instructions, feature overview, and development setup
- [ ] T042 Review and update quickstart.md with actual npm scripts and verified commands in specs/001-pr-link-tooltips/quickstart.md
- [ ] T043 Audit rate limiting behavior — verify throttling works correctly with unauthenticated API on a page with many PR links

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 (Phase 4)**: Depends on User Story 1 (uses icon injector infrastructure and content script wiring)
- **User Story 3 (Phase 5)**: Depends on User Story 2 (enhances the tooltip from US2)
- **User Story 4 (Phase 6)**: Depends on Foundational phase; can start in parallel with US1-US3 but full integration testing requires US1
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 — builds tooltip on top of icon/link infrastructure
- **User Story 3 (P3)**: Depends on US2 — enhances the tooltip's reviewer section
- **User Story 4 (P4)**: Can start after Foundational — popup/settings are independent, but toggle integration with content script requires US1

### Within Each User Story

- Content script entry point before UI components
- UI components before wiring/integration
- Core rendering before styling

### Parallel Opportunities

- Setup: T003 and T004 can run in parallel
- Foundational: T007, T008, T009 can all run in parallel; T014 can run in parallel with T013
- US4 can be started in parallel with US2/US3 (popup is independent infrastructure)
- Polish: T038, T039, T041 can all run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Load extension, navigate to a page with PR links, verify icons appear
5. Demo/ship MVP if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Ship (MVP — status icons!)
3. Add User Story 2 → Test independently → Ship (tooltips on hover!)
4. Add User Story 3 → Test independently → Ship (review staleness!)
5. Add User Story 4 → Test independently → Ship (popup settings + PAT!)
6. Polish → Final validation on both browsers

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- US2 and US3 are sequential (tooltip → staleness enhancement) but US4 can be parallelized
