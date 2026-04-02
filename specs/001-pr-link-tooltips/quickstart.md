# Quickstart: PR Link Tooltips

**Date**: 2026-03-13
**Feature**: 001-pr-link-tooltips

## Prerequisites

- Node.js 20+ (LTS)
- npm
- Chrome and/or Firefox (for manual testing)

## Setup

```bash
# Clone and enter the project
git clone https://github.com/mturley/sensible-github-extension.git
cd sensible-github-extension

# Install dependencies
npm install
```

## Development

```bash
# Start development mode (Chrome)
npm run dev

# Start development mode (Firefox)
npm run dev:firefox
```

WXT provides hot-reload during development. The extension will be loaded automatically in a temporary browser profile.

## Build

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

Build output goes to `.output/chrome-mv3/` and `.output/firefox-mv2/`.

## Load Extension Manually

### Chrome
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `.output/chrome-mv3/` directory

### Firefox
1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select any file in `.output/firefox-mv2/` directory

## Verify It Works

1. Load the extension in your browser
2. Navigate to any non-GitHub page that contains a link to a public GitHub PR (e.g., a Jira issue with a PR link)
3. You should see a small colored icon appear next to the PR link indicating its state
4. Hover over the link to see the tooltip with detailed PR information

## Project Structure

```
src/
├── entrypoints/          # WXT entrypoints (content, background, popup)
│   ├── background/       # Service worker for API calls and caching
│   ├── content/          # Content script, icon injector, tooltip
│   └── popup/            # Browser action popup with settings
├── services/             # Business logic (GitHub API, cache, storage)
│   └── github/           # REST client, GraphQL client, types, queries
├── utils/                # Pure utility functions
└── assets/               # Static assets (icons)

specs/                    # Feature specifications and planning docs
```

## Key Configuration

- **No token needed**: The extension works out of the box for public repos using the unauthenticated GitHub REST API (60 requests/hour)
- **Optional PAT**: Click the extension icon > enter a GitHub Personal Access Token for higher rate limits (5,000/hour) and private repo support
