<!--
Sync Impact Report
- Version change: N/A → 1.0.0 (initial ratification)
- Added principles: I. Cross-Browser Compatibility, II. Minimal Permissions,
  III. Non-Intrusive UI, IV. Privacy-First, V. Graceful Degradation
- Added sections: Technology Constraints, Development Workflow
- Templates requiring updates:
  - .specify/templates/plan-template.md ✅ no changes needed (generic)
  - .specify/templates/spec-template.md ✅ no changes needed (generic)
  - .specify/templates/tasks-template.md ✅ no changes needed (generic)
  - README.md ✅ no changes needed
- Follow-up TODOs: none
-->

# Sensible GitHub Extension Constitution

## Core Principles

### I. Cross-Browser Compatibility

The extension MUST work on both Chrome (Manifest V3) and Firefox.
Shared logic MUST be browser-agnostic; browser-specific code MUST be
isolated behind a platform abstraction layer. Every feature MUST be
tested on both browsers before it is considered complete.

### II. Minimal Permissions

The extension MUST request only the permissions it needs to function.
Host permissions MUST be scoped as narrowly as possible — prefer
`activeTab` or specific match patterns over broad `<all_urls>` access.
Any new permission MUST be justified in the PR description.

### III. Non-Intrusive UI

Injected UI elements MUST NOT break the layout or functionality of the
host page. Styles MUST be scoped (e.g., Shadow DOM or namespaced CSS)
to prevent leaking into or inheriting from the host page. The extension
MUST provide a way for users to dismiss or disable overlays on any site.

### IV. Privacy-First

The extension MUST NOT collect telemetry or analytics. Network requests
MUST go only to the GitHub API (or a user-configured GitHub Enterprise
instance) and nowhere else. User tokens MUST be stored using the
browser's secure storage API and MUST NOT be logged or transmitted to
third parties.

### V. Graceful Degradation

The extension MUST handle GitHub API failures, rate limits, and missing
data without crashing or producing uncaught errors. When PR data is
unavailable, the extension MUST fall back to showing the plain link
with no visual disruption. Unauthenticated users MUST still see public
PR information where the API allows it.

## Technology Constraints

- **Extension APIs**: WebExtensions API (cross-browser baseline);
  Chrome-specific APIs permitted only behind the platform abstraction.
- **Manifest**: Manifest V3 for Chrome; Manifest V2 or V3 for Firefox
  as supported.
- **Build tooling**: A single build pipeline MUST produce artifacts for
  both browsers.
- **Dependencies**: Minimize runtime dependencies. Prefer native
  browser APIs over third-party libraries. Any added dependency MUST be
  justified by significant complexity reduction.

## Development Workflow

- All changes require a PR with at least a self-review before merging.
- Commit messages MUST be descriptive and reference relevant context.
- Lint and type-check (if applicable) MUST pass before a PR is merged.
- Manual smoke testing on both Chrome and Firefox is required for UI
  changes until automated cross-browser tests are in place.

## Governance

This constitution defines the non-negotiable standards for the PR Info
Extension project. All PRs and code reviews MUST verify compliance with
these principles. Amendments require updating this file, incrementing
the version, and documenting the change in the Sync Impact Report at
the top of this document.

Versioning follows semver:
- **MAJOR**: Principle removed or fundamentally redefined.
- **MINOR**: New principle or section added, or material expansion.
- **PATCH**: Wording clarifications, typo fixes, non-semantic changes.

**Version**: 1.0.0 | **Ratified**: 2026-03-13 | **Last Amended**: 2026-03-13
