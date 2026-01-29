# mermaid-diagrams

Create software diagrams using Mermaid syntax.

## Installation

```bash
npx @uasp/skills add https://github.com/ifoster01/uasp/agent-skills --skill mermaid-diagrams
```

## Type

`hybrid` - Knowledge guidelines with syntax reference

## Keywords

diagram, mermaid, flowchart, sequence, class diagram, erd, c4

## Overview

This skill provides comprehensive guidance for creating various types of software diagrams using Mermaid syntax, including diagram type selection and syntax reference.

## Diagram Type Selection

| Scenario | Diagram Type |
|----------|--------------|
| Domain modeling / OOP | `classDiagram` |
| API flows / Authentication | `sequenceDiagram` |
| Processes / Algorithms | `flowchart` |
| Database schema | `erDiagram` |
| System architecture | C4 diagrams |
| State machines | `stateDiagram` |
| Git branching | `gitGraph` |
| Project timeline | `gantt` |

## Key Constraints

- First line must declare diagram type
- Use `%%` for comments
- Never use `{}` in comments (breaks parser)

## Syntax Reference

The skill includes comprehensive reference for:

- Flowchart shapes, links, and subgraphs
- Sequence diagram messages, activation, and control flow
- Class diagram relationships and visibility
- ERD relationships and attributes
- C4 context, container, and component diagrams
- Styling and themes

## Version

`25aeb14f` (content-addressable hash)
