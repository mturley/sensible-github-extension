# Implementation Plan: PR Link Tooltips

**Branch**: `001-pr-link-tooltips` | **Date**: 2026-03-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-pr-link-tooltips/spec.md`

## Summary

Build a cross-browser extension (Chrome MV3 + Firefox) that detects GitHub PR links on non-GitHub webpages, injects status icons, and displays hover tooltips with detailed PR information including review staleness. Uses WXT + TypeScript with an abstracted data layer supporting unauthenticated REST (public repos) and authenticated GraphQL (private repos, higher rate limits).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Primary Dependencies**: WXT (build framework), webextension-polyfill, Web Crypto API (token encryption)
**Storage**: browser.storage.local (settings, encrypted PAT), in-memory cache (PR data with TTL)
**Testing**: Vitest (unit), Playwright (cross-browser integration)
**Target Platform**: Chrome (Manifest V3) + Firefox (MV3/MV2 as supported)
**Project Type**: Browser extension
**Performance Goals**: Icons visible within 3 seconds of page load; tooltip appears within 1 second of hover
**Constraints**: 60 req/hour unauthenticated REST limit; 4 calls per PR in REST mode; extension must not break host page layout
**Scale/Scope**: 1-15 PR links per page typical; single user, single browser instance

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Cross-Browser Compatibility | PASS | WXT produces both Chrome and Firefox builds from single codebase; webextension-polyfill for API compat; Playwright tests both browsers |
| II. Minimal Permissions | PASS | Uses `activeTab` + specific `github.com` API host permission; no `<all_urls>` |
| III. Non-Intrusive UI | PASS | Shadow DOM for all injected elements; per-site disable toggle; loading placeholder prevents layout shift |
| IV. Privacy-First | PASS | No telemetry; requests only to GitHub API; PAT encrypted in storage.local; never logged or exposed in DOM |
| V. Graceful Degradation | PASS | Silent failure on API errors; plain links when data unavailable; unauthenticated fallback when token invalid |

## Project Structure

### Documentation (this feature)

```text
specs/001-pr-link-tooltips/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── entrypoints/
│   ├── background/           # Service worker / background script
│   │   └── index.ts          # Message handling, API orchestration
│   ├── content/              # Content script (injected into pages)
│   │   ├── index.ts          # Link detection, DOM mutation observer
│   │   ├── icon-injector.ts  # Status icon injection (Shadow DOM)
│   │   └── tooltip.ts        # Tooltip rendering (Shadow DOM)
│   └── popup/                # Browser action popup
│       ├── index.html
│       ├── index.ts
│       └── settings.ts       # PAT config, per-site toggles
├── services/
│   ├── github/
│   │   ├── types.ts          # Shared PR data types
│   │   ├── client.ts         # Abstraction layer interface
│   │   ├── rest-client.ts    # Unauthenticated REST implementation
│   │   ├── graphql-client.ts # Authenticated GraphQL implementation
│   │   └── queries.ts        # GraphQL query definitions
│   ├── cache.ts              # Two-tier cache (5-min page / 1-min hover)
│   ├── storage.ts            # Settings, PAT encryption/storage
│   └── review-staleness.ts   # Review staleness computation
├── utils/
│   ├── pr-url-parser.ts      # GitHub PR URL detection and parsing
│   ├── relative-time.ts      # Relative timestamp formatting
│   └── crypto.ts             # AES-GCM encrypt/decrypt for PAT
└── assets/
    └── icons/                # Extension icons (16, 32, 48, 128)

tests/
├── unit/
│   ├── pr-url-parser.test.ts
│   ├── cache.test.ts
│   ├── review-staleness.test.ts
│   ├── rest-client.test.ts
│   └── graphql-client.test.ts
└── integration/
    ├── link-detection.spec.ts    # Playwright: both browsers
    ├── tooltip-display.spec.ts   # Playwright: both browsers
    └── settings.spec.ts          # Playwright: both browsers
```

**Structure Decision**: Single extension project using WXT's entrypoints convention. Content scripts, background worker, and popup are separate entrypoints. Shared services and utilities are in `src/services/` and `src/utils/`. WXT handles manifest generation and build output for both browsers.

## Complexity Tracking

No constitution violations to justify.
