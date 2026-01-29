# UASP Agent Skills

This directory contains official UASP-format skills that can be installed via the `@uasp/skills` CLI.

## Installation

```bash
npx @uasp/skills add https://github.com/ifoster01/uasp/agent-skills --skill <skill-name>
```

## Available Skills

| Skill | Type | Description |
|-------|------|-------------|
| [agent-browser](./agent-browser/) | CLI | Browser automation for web testing, form filling, screenshots, and data extraction |
| [stripe-best-practices](./stripe-best-practices/) | Knowledge | Best practices for building Stripe payment integrations |
| [mermaid-diagrams](./mermaid-diagrams/) | Hybrid | Create software diagrams using Mermaid syntax |

## Skill Types

- **knowledge** - Guidelines and decision rules (no executable commands)
- **cli** - Command-line tool definitions with syntax and state management
- **api** - HTTP/API integration definitions
- **hybrid** - Combined knowledge guidance with executable commands

## Contributing

See the [_template](./_template/) directory for creating new skills.

1. Fork this repository
2. Create a new directory for your skill
3. Add your `.uasp.yaml` file following the template
4. Submit a pull request

## Format Specification

Skills use the UASP (Universal Agent Skill Protocol) YAML format. See the [main documentation](../docs/) for the full specification.
