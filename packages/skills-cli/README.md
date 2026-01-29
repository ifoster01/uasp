# @uasp/skills

CLI tool for managing UASP agent skills.

## Installation

```bash
# Use directly with npx
npx @uasp/skills <command>

# Or install globally
npm install -g @uasp/skills
```

## Commands

### Add a skill

Install a skill from a GitHub registry:

```bash
# Install a specific skill
npx @uasp/skills add https://github.com/ifoster01/uasp/agent-skills --skill agent-browser

# Install all skills from a registry
npx @uasp/skills add https://github.com/ifoster01/uasp/agent-skills --all
```

### List installed skills

```bash
npx @uasp/skills list

# Output as JSON
npx @uasp/skills list --json
```

### Remove a skill

```bash
npx @uasp/skills remove agent-browser
```

### Search for skills

```bash
npx @uasp/skills search browser

# Search a specific registry
npx @uasp/skills search payment --registry https://github.com/other/skills
```

### Initialize .agent directory

```bash
npx @uasp/skills init
```

## Directory Structure

After installing skills, your project will have:

```
.agent/
├── settings.json     # Configuration and installed skills
└── skills/
    └── skill-name/
        └── skill-name.uasp.yaml
```

## Settings Format

The `settings.json` file tracks installed skills:

```json
{
  "version": "1.0.0",
  "skills": {
    "installed": [
      {
        "name": "agent-browser",
        "version": "e3fbde81",
        "type": "cli",
        "path": ".agent/skills/agent-browser/agent-browser.uasp.yaml",
        "enabled": true,
        "installedAt": "2026-01-29T00:00:00Z",
        "source": "ifoster01/uasp/agent-skills"
      }
    ]
  },
  "triggers": {
    "keywords": {
      "browser": ["agent-browser"],
      "web": ["agent-browser"]
    }
  }
}
```

## Programmatic Usage

```typescript
import { loadRegistry, searchSkills, installSkill } from '@uasp/skills';

// Load a registry
const registry = await loadRegistry('https://github.com/ifoster01/uasp/agent-skills');

// Search for skills
const results = searchSkills(registry, 'browser');

// Install a skill programmatically
const result = await installSkill(githubSource, skill);
```

## License

MIT
