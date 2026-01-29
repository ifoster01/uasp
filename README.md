# Unified Agent Skills Protocol (UASP)

A structured, machine-readable format for defining agent skills optimized for LLM consumption.

## Problem

Current agent skill definitions use Markdown prose optimized for human readability. This creates inefficiencies for LLMs:

| Issue | Impact |
|-------|--------|
| Unstructured prose | Requires full document scanning to find relevant information |
| Ambiguous instructions | Multiple interpretations possible |
| No query interface | Cannot retrieve specific information without parsing |
| Mixed concerns | Syntax, constraints, workflows, and examples interleaved |
| Version drift | Documentation diverges from actual behavior |

## Solution

UASP provides:

- **O(1) lookup** - Query specific sections instead of scanning entire documents
- **Explicit state modeling** - Lifecycle rules prevent invalid operations
- **Structured constraints** - Clear `never`, `always`, and `prefer` rules
- **Content-addressable versioning** - Hash-based versions detect compatibility changes
- **Composable skills** - Reference other skills by ID

## Skill Types

| Type | Purpose | Key Sections |
|------|---------|--------------|
| `knowledge` | Guide behavior and decisions | `constraints`, `decisions`, `sources` |
| `cli` | Define command-line tools | `commands`, `workflows`, `state`, `templates` |
| `api` | Define API integrations | `commands`, `state`, `reference` |
| `hybrid` | Combine knowledge + execution | All sections as needed |

## Quick Example

```yaml
meta:
  name: my-skill
  version: "a3f2b1c9"
  type: knowledge
  description: Brief description for skill discovery

triggers:
  keywords: [payment, checkout]
  intents:
    - process payments

constraints:
  never:
    - Use deprecated APIs
  always:
    - Validate input before submission
  prefer:
    - use: NewAPI
      over: LegacyAPI
      when: building new integrations

decisions:
  - when: user wants deprecated feature
    then: advise migration to new approach
    ref: docs:migration-guide
```

## Query Interface

Query skills using path-based lookups:

```
skill-name:constraints.never     → List of prohibited actions
skill-name:commands.click        → Click command specification
skill-name:workflows.login       → Full workflow definition
skill-name:decisions?when=*API*  → Decisions matching "API"
```

## File Format

Skills are stored as YAML with `.uasp.yaml` extension:

```
my-skill.uasp.yaml
```

## Documentation

See [uasp-specification.md](./uasp-specification.md) for the complete specification including:

- Full JSON Schema definition
- Section specifications
- Conversion rules from Markdown
- Implementation guidelines
- Complete examples for each skill type

## Status

**Version:** 1.0.0-draft
**Status:** Draft Specification

## License

[Add your license here]
