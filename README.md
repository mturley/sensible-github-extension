# PR Info Extension

A browser extension for Chrome and Firefox that surfaces contextual information about GitHub pull requests inline on other websites. When you're browsing a page that contains links to GitHub PRs — such as a Jira board, a Confluence page, or a Slack thread — the extension detects those links and displays relevant PR metadata (status, reviewers, checks, merge state, etc.) directly alongside them, so you can stay in context without switching tabs.

## Features

- **Status Icons**: Colored icons next to PR links showing state (open/merged/closed/draft)
- **Hover Tooltips**: Detailed PR info on hover — title, author, CI status, reviewers, latest comment
- **Review Staleness**: Visual indicators for stale reviews (submitted before latest commits)
- **Per-Site Toggle**: Enable/disable the extension on individual websites
- **GitHub Token Support**: Optional PAT for higher rate limits and private repo access
- **Two-Tier Caching**: 5-minute page-load cache, 1-minute stale-while-revalidate on hover
- **Cross-Browser**: Works on Chrome (MV3) and Firefox

## Installation

### Development

```bash
# Install dependencies
npm install

# Start dev server (Chrome)
npm run dev

# Start dev server (Firefox)
npm run dev:firefox
```

### Build

```bash
# Build for Chrome
npm run build

# Build for Firefox
npm run build:firefox

# Build for both
npm run build:all

# Create distributable zip files
npm run zip
npm run zip:firefox
```

### Loading the Extension

**Chrome**: Go to `chrome://extensions`, enable Developer Mode, click "Load unpacked", and select `.output/chrome-mv3/`.

**Firefox**: Go to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", and select `.output/firefox-mv2/manifest.json`.

## Configuration

Click the extension icon to:
- Toggle the extension on/off for the current site
- Add a GitHub Personal Access Token (optional) for higher API rate limits and private repo support

## How It Works

The extension scans non-GitHub pages for links to GitHub pull requests. For each PR link found, it:

1. Injects a loading placeholder next to the link
2. Fetches PR data via GitHub's REST API (or GraphQL if a token is configured)
3. Replaces the placeholder with a colored status icon
4. Shows a detailed tooltip on hover with PR metadata, reviewer status, and latest comments

The extension never activates on github.com pages — it's designed for enhancing other websites with GitHub data.
