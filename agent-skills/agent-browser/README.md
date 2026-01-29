# agent-browser

Browser automation for web testing, form filling, screenshots, and data extraction.

## Installation

```bash
npx @uasp/skills add https://github.com/ifoster01/uasp/agent-skills --skill agent-browser
```

## Type

`cli` - Command-line tool with state management

## Keywords

browser, web, scrape, screenshot, form, click, navigate, automate

## Overview

This skill provides comprehensive browser automation capabilities including:

- Navigation (open, back, forward, reload)
- Element interaction (click, fill, type, select, hover)
- Screenshots and PDF generation
- Session and state management
- Video recording

## Key Commands

| Command | Description |
|---------|-------------|
| `open <url>` | Navigate to a URL |
| `snapshot -i` | Get interactive element refs |
| `click <ref>` | Click an element |
| `fill <ref> <text>` | Fill an input field |
| `screenshot` | Capture page screenshot |
| `state save/load` | Persist/restore session |

## Usage Pattern

```bash
agent-browser open https://example.com
agent-browser snapshot -i
agent-browser click @e1
agent-browser snapshot -i
```

## Constraints

- Always snapshot before using refs
- Re-snapshot after navigation or DOM changes
- Close browser when done

## Version

`e3fbde81` (content-addressable hash)
