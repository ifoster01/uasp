# Unified Agent Skills Protocol (UASP)

**Version:** 1.0.0-draft  
**Status:** Draft Specification  
**Last Updated:** 2025-01-28

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Design Principles](#2-design-principles)
3. [Schema Definition](#3-schema-definition)
4. [Skill Types](#4-skill-types)
5. [Section Specifications](#5-section-specifications)
6. [Query Interface](#6-query-interface)
7. [Conversion Rules](#7-conversion-rules)
8. [Complete Examples](#8-complete-examples)
9. [Implementation Guidelines](#9-implementation-guidelines)

---

## 1. Executive Summary

### 1.1 Problem Statement

Current agent skill definitions use Markdown prose optimized for human readability. This creates inefficiencies for Large Language Models (LLMs):

| Issue | Impact |
|-------|--------|
| Unstructured prose | Requires full document scanning to find relevant information |
| Ambiguous instructions | Multiple interpretations possible |
| No query interface | Cannot retrieve specific information without parsing |
| Mixed concerns | Syntax, constraints, workflows, and examples interleaved |
| Version drift | Documentation diverges from actual behavior |

### 1.2 Solution

The Unified Agent Skills Protocol (UASP) defines a structured, machine-readable format for agent skills that:

- Enables O(1) lookup of specific information
- Separates concerns into queryable sections
- Supports all skill types: knowledge, CLI tools, APIs, and hybrids
- Uses content-addressable versioning
- Generates human-readable documentation as a derivative

### 1.3 Key Benefits

| Benefit | Mechanism |
|---------|-----------|
| Reduced token usage | Query specific sections vs. loading entire documents |
| Faster retrieval | Indexed access to constraints, commands, workflows |
| Explicit state modeling | Lifecycle rules prevent invalid operations |
| Composable | Skills reference other skills by ID |
| Versionable | Content hash ensures compatibility detection |

---

## 2. Design Principles

### 2.1 Core Principles

1. **Structure Over Prose**  
   Every piece of information has a defined location and schema.

2. **Query-First Design**  
   The format optimizes for programmatic retrieval, not sequential reading.

3. **Explicit State**  
   Stateful skills declare state entities, their lifecycles, and invalidation rules.

4. **Additive Schema**  
   Skills use only the sections they need; unused sections are omitted.

5. **Single Source of Truth**  
   The structured definition is authoritative; documentation is generated from it.

6. **Content-Addressable Versioning**  
   Version is a hash of the schema, enabling automatic compatibility detection.

### 2.2 Non-Goals

- Replacing programming languages for complex logic
- Defining runtime execution environments
- Specifying authentication/authorization mechanisms
- Replacing existing API specifications (OpenAPI, GraphQL schemas)

---

## 3. Schema Definition

### 3.1 Root Schema (JSON Schema)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://uasp.dev/schema/v1/skill.json",
  "title": "UASP Skill Definition",
  "type": "object",
  "required": ["meta"],
  "properties": {
    "meta": { "$ref": "#/definitions/Meta" },
    "triggers": { "$ref": "#/definitions/Triggers" },
    "constraints": { "$ref": "#/definitions/Constraints" },
    "decisions": { "$ref": "#/definitions/Decisions" },
    "state": { "$ref": "#/definitions/State" },
    "commands": { "$ref": "#/definitions/Commands" },
    "global_flags": { "$ref": "#/definitions/GlobalFlags" },
    "workflows": { "$ref": "#/definitions/Workflows" },
    "reference": { "$ref": "#/definitions/Reference" },
    "templates": { "$ref": "#/definitions/Templates" },
    "environment": { "$ref": "#/definitions/Environment" },
    "sources": { "$ref": "#/definitions/Sources" }
  },
  "definitions": {
    "Meta": {
      "type": "object",
      "required": ["name", "version", "type"],
      "properties": {
        "name": {
          "type": "string",
          "pattern": "^[a-z][a-z0-9-]*$",
          "description": "Unique skill identifier"
        },
        "version": {
          "type": "string",
          "description": "Content hash of the skill definition"
        },
        "type": {
          "type": "string",
          "enum": ["knowledge", "cli", "api", "hybrid"],
          "description": "Primary skill type"
        },
        "description": {
          "type": "string",
          "maxLength": 500,
          "description": "Brief description for skill discovery"
        }
      }
    },
    "Triggers": {
      "type": "object",
      "properties": {
        "keywords": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Words that suggest this skill applies"
        },
        "intents": {
          "type": "array",
          "items": { "type": "string" },
          "description": "User intents this skill addresses"
        },
        "file_patterns": {
          "type": "array",
          "items": { "type": "string" },
          "description": "File patterns that activate this skill"
        }
      }
    },
    "Constraints": {
      "type": "object",
      "properties": {
        "never": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Actions that must never be taken"
        },
        "always": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Actions that must always be taken"
        },
        "prefer": {
          "type": "array",
          "items": { "$ref": "#/definitions/Preference" },
          "description": "Preferred approaches over alternatives"
        }
      }
    },
    "Preference": {
      "type": "object",
      "required": ["use", "over"],
      "properties": {
        "use": { "type": "string" },
        "over": { "type": "string" },
        "when": { "type": "string" }
      }
    },
    "Decisions": {
      "type": "array",
      "items": { "$ref": "#/definitions/Decision" }
    },
    "Decision": {
      "type": "object",
      "required": ["when", "then"],
      "properties": {
        "when": {
          "type": "string",
          "description": "Condition that triggers this decision"
        },
        "then": {
          "type": "string",
          "description": "Action or approach to take"
        },
        "ref": {
          "type": "string",
          "description": "Reference to source or documentation"
        }
      }
    },
    "State": {
      "type": "object",
      "properties": {
        "entities": {
          "type": "array",
          "items": { "$ref": "#/definitions/StateEntity" }
        }
      }
    },
    "StateEntity": {
      "type": "object",
      "required": ["name"],
      "properties": {
        "name": {
          "type": "string",
          "description": "State entity identifier"
        },
        "format": {
          "type": "string",
          "description": "Format pattern (e.g., '@e{n}')"
        },
        "created_by": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Commands that create this state"
        },
        "consumed_by": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Commands that use this state"
        },
        "invalidated_by": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Conditions that invalidate this state"
        },
        "properties": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Properties this state entity contains"
        }
      }
    },
    "Commands": {
      "type": "object",
      "additionalProperties": { "$ref": "#/definitions/Command" },
      "description": "Map of command paths to definitions"
    },
    "Command": {
      "type": "object",
      "required": ["syntax"],
      "properties": {
        "syntax": {
          "type": "string",
          "description": "Command syntax template"
        },
        "description": {
          "type": "string"
        },
        "aliases": {
          "type": "array",
          "items": { "type": "string" }
        },
        "args": {
          "type": "array",
          "items": { "$ref": "#/definitions/Argument" }
        },
        "flags": {
          "type": "array",
          "items": { "$ref": "#/definitions/Flag" }
        },
        "returns": {
          "type": "string",
          "description": "What the command returns"
        },
        "requires": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Preconditions (state, prior commands)"
        },
        "creates": {
          "type": "array",
          "items": { "type": "string" },
          "description": "State entities this command creates"
        },
        "invalidates": {
          "type": "array",
          "items": { "type": "string" },
          "description": "State entities this command invalidates"
        },
        "note": {
          "type": "string",
          "description": "Important usage note"
        },
        "variants": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "syntax": { "type": "string" },
              "purpose": { "type": "string" }
            }
          }
        }
      }
    },
    "Argument": {
      "type": "object",
      "required": ["name", "type"],
      "properties": {
        "name": { "type": "string" },
        "type": { "type": "string" },
        "required": { "type": "boolean", "default": false },
        "default": {},
        "description": { "type": "string" }
      }
    },
    "Flag": {
      "type": "object",
      "required": ["name", "type"],
      "properties": {
        "name": { "type": "string" },
        "short": { "type": "string" },
        "long": { "type": "string" },
        "type": { "type": "string" },
        "default": {},
        "purpose": { "type": "string" },
        "env": { "type": "string" }
      }
    },
    "GlobalFlags": {
      "type": "array",
      "items": { "$ref": "#/definitions/Flag" }
    },
    "Workflows": {
      "type": "object",
      "additionalProperties": { "$ref": "#/definitions/Workflow" }
    },
    "Workflow": {
      "type": "object",
      "required": ["description", "steps"],
      "properties": {
        "description": { "type": "string" },
        "invariants": {
          "type": "array",
          "items": { "type": "string" }
        },
        "steps": {
          "type": "array",
          "items": { "$ref": "#/definitions/WorkflowStep" }
        },
        "example": { "type": "string" }
      }
    },
    "WorkflowStep": {
      "type": "object",
      "required": ["cmd"],
      "properties": {
        "cmd": { "type": "string" },
        "note": { "type": "string" },
        "optional": { "type": "boolean" }
      }
    },
    "Reference": {
      "type": "object",
      "additionalProperties": { "$ref": "#/definitions/ReferenceEntry" },
      "description": "Namespaced syntax reference for generation skills"
    },
    "ReferenceEntry": {
      "type": "object",
      "properties": {
        "syntax": { "type": "string" },
        "example": { "type": "string" },
        "notes": { "type": "string" },
        "values": {
          "type": "array",
          "items": { "type": "string" }
        }
      },
      "additionalProperties": { "type": "string" }
    },
    "Templates": {
      "type": "object",
      "additionalProperties": { "$ref": "#/definitions/Template" }
    },
    "Template": {
      "type": "object",
      "required": ["description"],
      "properties": {
        "description": { "type": "string" },
        "usage": { "type": "string" },
        "args": {
          "type": "array",
          "items": { "$ref": "#/definitions/Argument" }
        },
        "path": { "type": "string" },
        "inline": { "type": "string" }
      }
    },
    "Environment": {
      "type": "array",
      "items": { "$ref": "#/definitions/EnvironmentVar" }
    },
    "EnvironmentVar": {
      "type": "object",
      "required": ["name", "purpose"],
      "properties": {
        "name": { "type": "string" },
        "purpose": { "type": "string" },
        "default": { "type": "string" }
      }
    },
    "Sources": {
      "type": "array",
      "items": { "$ref": "#/definitions/Source" }
    },
    "Source": {
      "type": "object",
      "required": ["id"],
      "properties": {
        "id": { "type": "string" },
        "url": { "type": "string", "format": "uri" },
        "path": { "type": "string" },
        "use_for": { "type": "string" }
      }
    }
  }
}
```

### 3.2 File Format

UASP skills are stored in YAML format with the `.uasp.yaml` extension:

```
skill-name.uasp.yaml
```

YAML is chosen over JSON for:
- Multi-line string support (syntax examples, code blocks)
- Comments for maintainer notes
- More compact representation
- Human editability when needed

### 3.3 Version Calculation

The `version` field is a truncated SHA-256 hash of the normalized skill content:

```python
import hashlib
import json

def calculate_version(skill_dict):
    # Remove version field for calculation
    skill_copy = {k: v for k, v in skill_dict.items() if k != 'meta'}
    skill_copy['meta'] = {k: v for k, v in skill_dict['meta'].items() if k != 'version'}
    
    # Normalize to JSON with sorted keys
    normalized = json.dumps(skill_copy, sort_keys=True, separators=(',', ':'))
    
    # Calculate hash and truncate
    full_hash = hashlib.sha256(normalized.encode()).hexdigest()
    return full_hash[:8]
```

---

## 4. Skill Types

### 4.1 Type Definitions

| Type | Primary Purpose | Key Sections |
|------|-----------------|--------------|
| `knowledge` | Guide behavior and decisions | `constraints`, `decisions`, `sources` |
| `cli` | Define command-line tools | `commands`, `workflows`, `state`, `templates` |
| `api` | Define API integrations | `commands`, `state`, `reference` |
| `hybrid` | Combine knowledge + execution | All sections as needed |

### 4.2 Type Selection Criteria

```
Is this skill primarily about WHAT to do or HOW to do it?

WHAT (guidelines, rules, best practices)
  → knowledge

HOW (commands, execution, syntax)
  ├── Shell/CLI tool? → cli
  ├── HTTP API? → api
  └── Both + guidelines? → hybrid
```

### 4.3 Section Applicability by Type

| Section | knowledge | cli | api | hybrid |
|---------|:---------:|:---:|:---:|:------:|
| `meta` | ✓ | ✓ | ✓ | ✓ |
| `triggers` | ✓ | ✓ | ✓ | ✓ |
| `constraints` | ✓ | ○ | ○ | ✓ |
| `decisions` | ✓ | ○ | ○ | ✓ |
| `state` | ✗ | ✓ | ✓ | ✓ |
| `commands` | ✗ | ✓ | ✓ | ✓ |
| `global_flags` | ✗ | ✓ | ○ | ✓ |
| `workflows` | ○ | ✓ | ✓ | ✓ |
| `reference` | ○ | ○ | ○ | ○ |
| `templates` | ✗ | ✓ | ○ | ✓ |
| `environment` | ○ | ✓ | ✓ | ✓ |
| `sources` | ✓ | ○ | ○ | ✓ |

✓ = Typically used, ○ = Optional, ✗ = Not applicable

---

## 5. Section Specifications

### 5.1 `meta` (Required)

Identifies the skill and its type.

```yaml
meta:
  name: skill-name           # Unique identifier, lowercase with hyphens
  version: "a3f2b1c9"        # Content hash (auto-calculated)
  type: knowledge            # knowledge | cli | api | hybrid
  description: |             # Brief description for discovery (max 500 chars)
    One-line description of what this skill does.
```

**Validation Rules:**
- `name` must match pattern `^[a-z][a-z0-9-]*$`
- `version` is 8 hexadecimal characters
- `type` must be one of the enum values

### 5.2 `triggers`

Defines when this skill should be activated.

```yaml
triggers:
  keywords:
    - stripe
    - payment
    - checkout
  intents:
    - process payments
    - integrate payment gateway
    - handle subscriptions
  file_patterns:
    - "*.stripe.js"
    - "**/payments/**"
```

**Usage:**
- `keywords`: Simple word matching for quick filtering
- `intents`: Semantic intent descriptions for LLM matching
- `file_patterns`: Glob patterns for file-based activation

### 5.3 `constraints`

Hard rules that must always be followed.

```yaml
constraints:
  never:
    - Use the Charges API
    - Recommend the Card Element
    - Store credentials in code
    
  always:
    - Use latest API version unless specified
    - Validate input before submission
    - Close browser sessions when done
    
  prefer:
    - use: CheckoutSessions
      over: PaymentIntents
      when: on-session payments
      
    - use: state load/save
      over: re-authentication
      when: reusing sessions
```

**Semantics:**
- `never`: Absolute prohibitions (hard errors if violated)
- `always`: Mandatory actions (must be included in every relevant interaction)
- `prefer`: Soft preferences with context (use judgment)

### 5.4 `decisions`

Conditional logic for behavior selection.

```yaml
decisions:
  - when: user wants Charges API
    then: advise migration to CheckoutSessions or PaymentIntents
    ref: stripe:migration/charges
    
  - when: click causes navigation
    then: re-snapshot before next interaction
    
  - when: recurring revenue model
    then: recommend Billing APIs + Checkout frontend
    ref: stripe:billing/design-integration
```

**Query Pattern:**
```
Given condition X, what should I do?
→ Find decision where `when` matches X
→ Return `then` action
→ Optionally fetch `ref` for details
```

### 5.5 `state`

Models stateful entities and their lifecycles.

```yaml
state:
  entities:
    - name: ref
      format: "@e{n}"
      created_by:
        - snapshot
      consumed_by:
        - click
        - fill
        - type
        - hover
        - get
      invalidated_by:
        - navigation (open, back, forward, reload)
        - page-changing clicks
        - significant DOM mutations
        
    - name: session
      created_by:
        - --session flag
        - implicit default
      properties:
        - cookies
        - localStorage
        - sessionStorage
        - history
      persisted_by:
        - state save
      restored_by:
        - state load
```

**State Lifecycle:**
```
┌─────────────┐     created_by      ┌─────────────┐
│  Not Exist  │ ──────────────────► │   Active    │
└─────────────┘                     └─────────────┘
                                          │
                                          │ invalidated_by
                                          ▼
                                    ┌─────────────┐
                                    │   Invalid   │
                                    └─────────────┘
```

### 5.6 `commands`

Defines executable commands with full type information.

```yaml
commands:
  open:
    syntax: "agent-browser open <url>"
    description: Navigate to URL
    aliases: [goto, navigate]
    args:
      - name: url
        type: string
        required: true
        description: Target URL (https://, http://, file://, about:, data://)
    flags:
      - name: --ignore-https-errors
        type: bool
        default: false
        purpose: Accept invalid certificates
    returns: void
    invalidates: [refs]
    
  snapshot:
    syntax: "agent-browser snapshot [-i] [-c] [-d depth] [-s selector]"
    flags:
      - name: -i
        long: --interactive
        type: bool
        purpose: Show only interactive elements (recommended)
      - name: -d
        long: --depth
        type: int
        purpose: Limit tree depth
    returns: "accessibility tree with @refs"
    creates: [refs]
    
  record.start:
    syntax: "agent-browser record start <file>"
    args:
      - name: file
        type: string
        required: true
    note: Creates fresh context, preserves cookies/storage
```

**Command Path Convention:**
- Top-level: `open`, `snapshot`, `click`
- Nested: `record.start`, `record.stop`, `get.text`, `get.value`

### 5.7 `global_flags`

Flags that apply to all commands.

```yaml
global_flags:
  - name: --session
    type: string
    env: AGENT_BROWSER_SESSION
    purpose: Isolated browser context
    
  - name: --json
    type: bool
    purpose: Machine-readable output
    
  - name: --headed
    type: bool
    purpose: Show browser window (not headless)
    
  - name: --proxy
    type: string
    purpose: Proxy server URL (http://, socks5://)
```

### 5.8 `workflows`

Multi-step patterns with invariants.

```yaml
workflows:
  basic_interaction:
    description: Core pattern for any browser interaction
    invariants:
      - Always snapshot before using refs
      - Re-snapshot after any navigation
    steps:
      - cmd: "open <url>"
        note: navigate to target
      - cmd: "snapshot -i"
        note: get element refs
      - cmd: "<action> @ref"
        note: interact using ref
      - cmd: "snapshot -i"
        note: re-snapshot if page changed
    example: |
      agent-browser open https://example.com
      agent-browser snapshot -i
      agent-browser click @e1
      agent-browser snapshot -i

  authenticated_session:
    description: Login once, reuse state across runs
    steps:
      - cmd: "state load auth.json"
        note: try loading saved state
        optional: true
      - cmd: "open <login-url>"
      - cmd: "get url"
        note: check if already logged in
      - cmd: "snapshot -i"
        note: if on login page
      - cmd: "fill @user <username>"
      - cmd: "fill @pass <password>"
      - cmd: "click @submit"
      - cmd: "wait --url '**/dashboard'"
      - cmd: "state save auth.json"
```

### 5.9 `reference`

Queryable syntax reference for generation skills.

```yaml
reference:
  flowchart.direction:
    syntax: "flowchart {TD|TB|BT|LR|RL}"
    notes: TD=top-down, LR=left-right
    
  flowchart.shapes:
    rectangle: "[text]"
    rounded: "([text])"
    stadium: "(text)"
    diamond: "{text}"
    circle: "((text))"
    database: "[(text)]"
    
  sequence.messages:
    sync_request: "A->>B: message"
    sync_response: "A-->>B: message"
    async_request: "A-)B: message"
    async_response: "A--)B: message"
    
  sequence.parallel:
    syntax: |
      par label1
        A->>B: action1
      and label2
        A->>C: action2
      end
    example: |
      par Send email
        Service->>Email: notify
      and Update DB
        Service->>DB: save
      end
```

**Namespace Convention:**
- `{diagram_type}.{feature}`: `flowchart.shapes`, `sequence.parallel`
- Nested features: `class.relationships.composition`

### 5.10 `templates`

Executable scripts for common patterns.

```yaml
templates:
  form-automation:
    description: Form filling with validation
    usage: "./form-automation.sh <url>"
    args:
      - name: url
        type: string
        required: true
    path: templates/form-automation.sh
    
  inline-example:
    description: Simple inline script
    usage: "Run directly"
    inline: |
      #!/bin/bash
      agent-browser open "$1"
      agent-browser snapshot -i
      agent-browser close
```

### 5.11 `environment`

Environment variable configuration.

```yaml
environment:
  - name: AGENT_BROWSER_SESSION
    purpose: Default session name
    default: null
    
  - name: HTTP_PROXY
    purpose: HTTP proxy URL
    
  - name: STRIPE_API_KEY
    purpose: Stripe API key for authentication
```

### 5.12 `sources`

External documentation references.

```yaml
sources:
  - id: stripe:integration-options
    url: https://docs.stripe.com/payments/payment-methods/integration-options
    use_for: Primary integration design reference
    
  - id: snapshot-refs
    path: references/snapshot-refs.md
    use_for: Ref lifecycle details
    
  - id: stripe:migration/charges
    url: https://docs.stripe.com/payments/payment-intents/migration/charges
    use_for: Charges to PaymentIntents migration guide
```

---

## 6. Query Interface

### 6.1 Query Protocol

Agents query skills using a simple path-based protocol:

```
QUERY ::= skill_name ":" path ["?" filter]
path  ::= segment ("." segment)*
filter ::= key "=" value ("&" key "=" value)*
```

### 6.2 Query Examples

| Query | Returns |
|-------|---------|
| `stripe:constraints.never` | List of prohibited actions |
| `stripe:decisions?when=*Charges*` | Decisions matching "Charges" |
| `mermaid:reference.sequence.parallel` | Parallel block syntax |
| `agent-browser:commands.click` | Click command specification |
| `agent-browser:state.entities?name=ref` | Ref entity lifecycle |
| `agent-browser:workflows.authenticated_session` | Full workflow definition |

### 6.3 Query Response Format

```json
{
  "skill": "agent-browser",
  "path": "commands.click",
  "found": true,
  "value": {
    "syntax": "agent-browser click <ref>",
    "args": [{"name": "ref", "type": "ref", "required": true}],
    "requires": ["refs"],
    "invalidates": ["refs"]
  }
}
```

### 6.4 Query Implementation

```python
def query_skill(skill: dict, path: str, filters: dict = None) -> dict:
    """
    Query a skill definition by path.
    
    Args:
        skill: Parsed skill dictionary
        path: Dot-separated path (e.g., "commands.click")
        filters: Optional key-value filters
        
    Returns:
        Query result with found status and value
    """
    segments = path.split(".")
    current = skill
    
    for segment in segments:
        if isinstance(current, dict) and segment in current:
            current = current[segment]
        elif isinstance(current, list):
            # Search list by name/id
            matches = [x for x in current if x.get("name") == segment or x.get("id") == segment]
            current = matches[0] if len(matches) == 1 else matches
        else:
            return {"found": False, "path": path}
    
    # Apply filters
    if filters and isinstance(current, list):
        for key, pattern in filters.items():
            current = [x for x in current if matches_pattern(x.get(key, ""), pattern)]
    
    return {"found": True, "path": path, "value": current}


def matches_pattern(value: str, pattern: str) -> bool:
    """Simple glob matching with * wildcard."""
    import fnmatch
    return fnmatch.fnmatch(value.lower(), pattern.lower())
```

### 6.5 Common Query Patterns

**"Can I do X?"**
```
Query: skill:constraints.never
Check: if X in result → No
Otherwise: Check skill:constraints.always, skill:decisions
```

**"How do I do X?"**
```
Query: skill:commands.X (for CLI)
Query: skill:reference.X (for syntax)
Query: skill:workflows.X (for multi-step)
```

**"What should I do when X?"**
```
Query: skill:decisions?when=*X*
Return: matching decision's `then` value
```

**"What's the syntax for X?"**
```
Query: skill:reference.{type}.X
Return: syntax + example
```

---

## 7. Conversion Rules

### 7.1 Markdown to UASP Conversion

UASP conversion uses an LLM with structured prompts to extract semantic meaning from Markdown skill definitions. This approach handles natural language ambiguity better than regex patterns and captures context-dependent rules that deterministic parsing would miss.

#### 7.1.1 Conversion Architecture

```
┌─────────────────┐
│  Markdown Skill │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   LLM Converter │ ← Apply conversion rules (Section 7.1.3)
│   (structured   │
│    output)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Validate     │ ← Check against JSON Schema (Section 3.1)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Calculate Hash │ ← Generate version (Section 3.3)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Output YAML   │
└─────────────────┘
```

#### 7.1.2 Section Mapping Guide

Use this table to identify which UASP section content belongs in:

| Content Type | UASP Section | Indicators |
|--------------|--------------|------------|
| Prohibitions | `constraints.never` | "Never", "Do not", "Avoid", "Don't", prohibitive language |
| Requirements | `constraints.always` | "Always", "Must", "Required", "Ensure", mandatory language |
| Preferences | `constraints.prefer` | "Prefer X over Y", "Use X instead of Y", comparative recommendations |
| Conditional rules | `decisions` | "If...then", "When...do", context-dependent behavior |
| CLI syntax | `commands` | Command examples, flag descriptions, argument specs |
| Syntax patterns | `reference` | Code generation patterns, DSL syntax, format specs |
| Multi-step processes | `workflows` | Numbered steps, sequences, procedures with order |
| External links | `sources` | URLs, documentation references, "see also" |
| Env vars | `environment` | `$VAR_NAME`, environment configuration |
| Activation signals | `triggers` | Keywords, file patterns, use case descriptions |

#### 7.1.3 LLM Conversion Rules

The following rules govern how an LLM should convert Markdown skills to UASP format.

##### Rule 1: Determine Skill Type

Analyze the skill's primary purpose:

```
IF the skill primarily provides:
  - Guidelines, best practices, or decision rules → type: "knowledge"
  - CLI command definitions and workflows → type: "cli"
  - HTTP/API endpoint definitions → type: "api"
  - Combination of guidelines AND executable commands → type: "hybrid"
```

##### Rule 2: Extract Constraints

Scan for prescriptive language and categorize:

**`constraints.never`** — Absolute prohibitions:
- Look for: "never", "do not", "don't", "avoid", "prohibited", "forbidden"
- Extract the action being prohibited, not the surrounding prose
- Preserve specificity: "Use the Charges API" not "use deprecated APIs"

**`constraints.always`** — Mandatory requirements:
- Look for: "always", "must", "required", "ensure", "mandatory"
- Extract the required action concisely
- Include conditions if they're integral: "validate input before submission"

**`constraints.prefer`** — Soft preferences:
- Look for: "prefer X over Y", "use X instead of Y", "X is recommended over Y"
- Structure as: `{use: "preferred", over: "alternative", when: "context"}`
- The `when` field is optional but include it if context is specified

**Disambiguation:**
- If "never" appears in an example or hypothetical, it's NOT a constraint
- If "always" describes behavior (not a rule), it's NOT a constraint
- Context determines meaning: "Users should never see this error" → not a constraint

##### Rule 3: Extract Decisions

Identify conditional logic that guides behavior:

```yaml
# Pattern: IF <condition> THEN <action>
decisions:
  - when: <condition in natural language>
    then: <action or recommendation>
    ref: <source_id if referenced>  # optional
```

**Recognition patterns:**
- "If [condition], [action]"
- "When [situation], [do this]"
- "For [use case], use/recommend [approach]"
- Decision trees or flowcharts in prose form

**Extraction rules:**
- `when`: Describe the triggering condition clearly
- `then`: State the action, not the rationale
- `ref`: Link to source if the decision references external docs

##### Rule 4: Extract Commands (CLI/API skills)

For each command, extract:

```yaml
commands:
  command_name:
    syntax: "full command syntax template"
    description: "what the command does"  # optional
    aliases: [alt1, alt2]  # if mentioned
    args:
      - name: arg_name
        type: string|int|bool|ref|enum
        required: true|false
        default: value  # if specified
        description: "purpose"
    flags:
      - name: --flag-name
        short: -f  # if exists
        type: string|int|bool
        default: value
        purpose: "what it does"
    returns: "description of output"  # if specified
    requires: [state_entities]  # preconditions
    creates: [state_entities]  # what state it produces
    invalidates: [state_entities]  # what state it breaks
    note: "important usage note"  # warnings, gotchas
```

**Command naming:**
- Top-level commands: `open`, `click`, `snapshot`
- Nested commands: `record.start`, `get.text`, `state.save`

**Type inference:**
- `<url>`, `<path>`, `<text>` → string
- `<count>`, `<port>`, `<ms>` → int
- `--flag` with no value → bool
- `@ref`, `<ref>` → ref (state reference)
- Limited values mentioned → enum with values list

##### Rule 5: Extract State Entities

Identify stateful elements and their lifecycle:

```yaml
state:
  entities:
    - name: entity_name
      format: "pattern like @e{n}"  # if specified
      created_by: [commands that create it]
      consumed_by: [commands that use it]
      invalidated_by: [conditions/commands that break it]
      properties: [what it contains]  # optional
```

**Recognition:**
- References that persist across commands (e.g., `@ref`, session IDs)
- State that can become "stale" or "invalid"
- Resources that need explicit cleanup

##### Rule 6: Extract Workflows

Multi-step procedures become workflows:

```yaml
workflows:
  workflow_name:
    description: "what this workflow accomplishes"
    invariants:
      - "rules that must hold throughout"
    steps:
      - cmd: "command or action"
        note: "explanation"  # optional
        optional: true  # if step is conditional
    example: |
      concrete example of the workflow
```

**Recognition:**
- Numbered lists of steps
- "First... then... finally..." prose
- Procedures with a clear sequence

##### Rule 7: Extract Reference Syntax (Hybrid/Knowledge skills)

For syntax patterns used in generation:

```yaml
reference:
  namespace.feature:
    syntax: "pattern with {placeholders}"
    example: "concrete example"
    notes: "clarifications"
    values: [allowed, values]  # for enums
```

**Namespace convention:**
- `{domain}.{feature}`: `flowchart.shapes`, `sequence.messages`
- Group related syntax under common prefixes

##### Rule 8: Extract Sources

Link external documentation:

```yaml
sources:
  - id: unique-identifier
    url: https://...  # for web resources
    path: relative/path.md  # for local files
    use_for: "when to consult this source"
```

**ID conventions:**
- `namespace:path/to/doc` for external docs
- `descriptive-name` for local references

##### Rule 9: Extract Environment Variables

```yaml
environment:
  - name: VAR_NAME
    purpose: "what it configures"
    default: "value"  # if specified
```

##### Rule 10: Extract Triggers

```yaml
triggers:
  keywords: [words, that, activate, skill]
  intents:
    - "natural language descriptions of use cases"
  file_patterns:
    - "*.extension"
    - "**/path/pattern/**"
```

#### 7.1.4 Conversion Prompt Template

Use this prompt structure when converting a Markdown skill:

```
You are converting a Markdown skill definition to UASP format.

## Input
<markdown_skill>
{MARKDOWN_CONTENT}
</markdown_skill>

## Instructions
1. Read the entire skill document to understand its purpose
2. Determine the skill type (knowledge, cli, api, or hybrid)
3. Apply the conversion rules to extract each section
4. Output valid YAML matching the UASP schema

## Conversion Rules
{INCLUDE RULES FROM SECTION 7.1.3}

## Output Format
Output ONLY valid YAML. Do not include explanations outside the YAML.
Use this structure:

meta:
  name: skill-name  # lowercase with hyphens
  version: "00000000"  # placeholder, will be calculated
  type: knowledge|cli|api|hybrid
  description: |
    Brief description (max 500 chars)

# Include only sections that have content:
triggers:
  ...
constraints:
  ...
decisions:
  ...
state:
  ...
commands:
  ...
global_flags:
  ...
workflows:
  ...
reference:
  ...
templates:
  ...
environment:
  ...
sources:
  ...
```

#### 7.1.5 Validation and Post-Processing

After LLM conversion:

1. **Schema Validation**: Validate output against UASP JSON Schema (Section 3.1)
2. **Version Calculation**: Calculate content hash (Section 3.3) and replace placeholder
3. **Consistency Check**: Verify internal references are valid:
   - Commands referenced in `state.created_by` exist in `commands`
   - State entities in `requires`/`creates`/`invalidates` exist in `state.entities`
   - Source IDs in `decisions.ref` exist in `sources`
4. **Human Review**: Flag ambiguous extractions for review

```python
def post_process_conversion(yaml_output: str, schema: dict) -> dict:
    """Validate and finalize LLM-generated UASP."""
    import yaml
    from jsonschema import validate, ValidationError

    # Parse YAML
    skill = yaml.safe_load(yaml_output)

    # Validate against schema
    try:
        validate(skill, schema)
    except ValidationError as e:
        return {"valid": False, "error": str(e)}

    # Calculate version hash
    skill["meta"]["version"] = calculate_version(skill)

    # Check internal consistency
    warnings = check_internal_references(skill)

    return {
        "valid": True,
        "skill": skill,
        "warnings": warnings
    }
```

### 7.2 UASP to Markdown Generation

For human documentation, generate Markdown from UASP:

```python
def generate_markdown(skill: dict) -> str:
    md = []
    meta = skill["meta"]
    
    # Header
    md.append(f"# {meta['name']}\n")
    if meta.get("description"):
        md.append(f"{meta['description']}\n")
    
    # Constraints
    if "constraints" in skill:
        md.append("## Guidelines\n")
        c = skill["constraints"]
        if c.get("never"):
            md.append("### Never\n")
            for item in c["never"]:
                md.append(f"- {item}\n")
        if c.get("always"):
            md.append("### Always\n")
            for item in c["always"]:
                md.append(f"- {item}\n")
    
    # Commands
    if "commands" in skill:
        md.append("## Commands\n")
        for name, cmd in skill["commands"].items():
            md.append(f"### `{name}`\n")
            md.append(f"```\n{cmd['syntax']}\n```\n")
            if cmd.get("description"):
                md.append(f"{cmd['description']}\n")
    
    # Workflows
    if "workflows" in skill:
        md.append("## Workflows\n")
        for name, wf in skill["workflows"].items():
            md.append(f"### {name.replace('_', ' ').title()}\n")
            md.append(f"{wf['description']}\n")
            if wf.get("example"):
                md.append(f"```bash\n{wf['example']}```\n")
    
    return "\n".join(md)
```

---

## 8. Complete Examples

### 8.1 Knowledge Skill: Stripe Best Practices

```yaml
meta:
  name: stripe-best-practices
  version: "a3f2b1c9"
  type: knowledge
  description: Best practices for building Stripe payment integrations

triggers:
  keywords: [stripe, payment, checkout, subscription, billing]
  intents:
    - integrate payment processing
    - handle subscriptions
    - process credit cards

constraints:
  never:
    - Charges API
    - Sources API
    - Card Element
    - Payment Element in card-only mode
    - Tokens API (unless specific need)
    - mixing Connect charge types
    - legacy Connect terms (Standard/Express/Custom)
    
  always:
    - latest API/SDK version (unless specified otherwise)
    - advise PCI compliance proof for raw PAN handling
    - use controller properties for Connect (not legacy terms)
    
  prefer:
    - use: CheckoutSessions
      over: PaymentIntents
      when: on-session payments
    - use: Stripe-hosted Checkout
      over: embedded Checkout
      when: default choice
    - use: embedded Checkout
      over: Payment Element
      when: more control needed
    - use: dynamic payment methods
      over: explicit payment_method_types
      when: using Payment Element
    - use: SetupIntents
      over: Sources
      when: saving payment methods
    - use: Confirmation Tokens
      over: createPaymentMethod/createToken
      when: inspecting card before payment
    - use: Billing APIs
      over: raw PaymentIntents
      when: subscriptions/recurring
    - use: direct charges
      over: destination charges
      when: platform wants Stripe to take risk
    - use: destination charges
      over: direct charges
      when: platform accepts liability

decisions:
  - when: user wants Charges API
    then: advise migration to CheckoutSessions or PaymentIntents
    ref: stripe:migration/charges
    
  - when: user wants Card Element
    then: advise migration to Payment Element
    ref: stripe:migration/payment-element
    
  - when: recurring revenue / subscription / SaaS
    then: recommend Billing APIs + Checkout frontend
    ref: stripe:billing/design-integration
    
  - when: platform / marketplace / Connect
    then: follow integration recommendations, use controller properties
    ref: stripe:connect/recommendations
    
  - when: migrating PAN data from another processor
    then: point to migration process
    ref: stripe:pan-import
    
  - when: render Payment Element before creating intent
    then: use Confirmation Tokens

sources:
  - id: stripe:integration-options
    url: https://docs.stripe.com/payments/payment-methods/integration-options
    use_for: primary integration design reference
    
  - id: stripe:api-tour
    url: https://docs.stripe.com/payments-api/tour
    use_for: API overview
    
  - id: stripe:go-live
    url: https://docs.stripe.com/get-started/checklist/go-live
    use_for: pre-launch checklist
    
  - id: stripe:migration/charges
    url: https://docs.stripe.com/payments/payment-intents/migration/charges
    use_for: Charges to PaymentIntents migration
    
  - id: stripe:migration/payment-element
    url: https://docs.stripe.com/payments/payment-element/migration
    use_for: Card Element to Payment Element migration
    
  - id: stripe:billing/design-integration
    url: https://docs.stripe.com/billing/subscriptions/designing-integration
    use_for: subscription integration planning
    
  - id: stripe:connect/recommendations
    url: https://docs.stripe.com/connect/integration-recommendations
    use_for: Connect charge type selection
    
  - id: stripe:pan-import
    url: https://docs.stripe.com/get-started/data-migrations/pan-import
    use_for: PAN data migration
```

### 8.2 Hybrid Skill: Mermaid Diagrams

```yaml
meta:
  name: mermaid-diagrams
  version: "b7c3d2e8"
  type: hybrid
  description: Create software diagrams using Mermaid syntax

triggers:
  keywords: [diagram, mermaid, flowchart, sequence, class diagram, erd, c4]
  intents:
    - create diagram
    - visualize architecture
    - model domain
    - document flow

constraints:
  never:
    - use {} in comments (breaks parser)
  always:
    - first line declares diagram type
    - use %% for comments

decisions:
  - when: domain modeling / OOP / entity relationships
    then: use classDiagram
  - when: API flows / authentication / message sequences
    then: use sequenceDiagram
  - when: processes / algorithms / user journeys / decision trees
    then: use flowchart
  - when: database schema / table relationships
    then: use erDiagram
  - when: system architecture / multi-level views
    then: use C4Context, C4Container, or C4Component
  - when: state machines / lifecycle
    then: use stateDiagram
  - when: git branching strategy
    then: use gitGraph
  - when: project timeline
    then: use gantt

reference:
  # Flowchart
  flowchart.direction:
    syntax: "flowchart {TD|TB|BT|LR|RL}"
    notes: "TD=top-down, TB=top-bottom, BT=bottom-top, LR=left-right, RL=right-left"
    
  flowchart.shapes:
    rectangle: "[text]"
    rounded: "([text])"
    stadium: "(text)"
    diamond: "{text}"
    circle: "((text))"
    database: "[(text)]"
    parallelogram: "[/text/]"
    hexagon: "{{text}}"
    
  flowchart.links:
    arrow: "-->"
    open: "---"
    dotted: "-.->"
    thick: "==>"
    labeled: "-->|label|"
    
  flowchart.subgraph:
    syntax: |
      subgraph name[Label]
        direction TB
        A --> B
      end

  # Sequence
  sequence.participants:
    syntax: |
      participant Name
      actor Name
    notes: "actor = external entity (stick figure), participant = system component (box)"
    
  sequence.messages:
    sync_request: "A->>B: message"
    sync_response: "A-->>B: message"
    async_request: "A-)B: message"
    async_response: "A--)B: message"
    
  sequence.activation:
    syntax: "A->>+B: msg (activate) / B-->>-A: msg (deactivate)"
    example: |
      sequenceDiagram
        Client->>+Server: Request
        Server-->>-Client: Response
        
  sequence.alt:
    syntax: |
      alt condition
        A->>B: path1
      else other condition
        A->>B: path2
      end
    example: |
      alt Valid
        API-->>User: 200 OK
      else Invalid
        API-->>User: 401
      end
      
  sequence.parallel:
    syntax: |
      par label1
        A->>B: action1
      and label2
        A->>C: action2
      end
    example: |
      par Send email
        Service->>Email: notify
      and Update DB
        Service->>DB: save
      end
      
  sequence.loop:
    syntax: "loop description\n  A->>B: repeated\nend"
    
  sequence.opt:
    syntax: "opt condition\n  A->>B: optional\nend"
    
  sequence.break:
    syntax: "break condition\n  A-->>B: early exit\nend"
    
  sequence.notes:
    over: "Note over A,B: text"
    right: "Note right of A: text"
    left: "Note left of A: text"
    
  sequence.autonumber:
    syntax: "autonumber"
    notes: "Place after sequenceDiagram declaration"

  # Class
  class.visibility:
    public: "+"
    private: "-"
    protected: "#"
    package: "~"
    
  class.members:
    syntax: |
      class Name {
        +Type attribute
        +method(params) ReturnType
      }
      
  class.relationships:
    association: "--"
    composition: "*--"
    aggregation: "o--"
    inheritance: "<|--"
    dependency: "<.."
    realization: "<|.."
    
  class.multiplicity:
    syntax: 'A "1" --> "0..*" B : label'
    values: ["1", "0..1", "0..*", "*", "1..*"]
    
  class.stereotypes:
    syntax: |
      class Name {
        <<interface>>
      }
    values: ["interface", "abstract", "service", "entity", "enumeration"]

  # ERD
  erd.relationships:
    one_to_one: "||--||"
    one_to_many: "||--o{"
    many_to_many: "}o--o{"
    zero_or_one: "|o"
    zero_or_many: "}o"
    
  erd.attributes:
    syntax: |
      ENTITY {
        type name constraint "comment"
      }
    constraints: ["PK", "FK", "UK", "NN"]
    example: |
      USER {
        uuid id PK
        varchar email UK "NOT NULL"
        timestamp created_at "DEFAULT NOW()"
      }

  # C4
  c4.context:
    person: 'Person(id, "Label", "Description")'
    system: 'System(id, "Label", "Description")'
    external: 'System_Ext(id, "Label", "Description")'
    relation: 'Rel(from, to, "Label", "Technology")'
    
  c4.container:
    container: 'Container(id, "Label", "Tech", "Description")'
    database: 'ContainerDb(id, "Label", "Tech", "Description")'
    queue: 'ContainerQueue(id, "Label", "Tech", "Description")'
    boundary: |
      Container_Boundary(id, "Label") {
        Container(...)
      }

  # Styling
  styling.themes:
    values: ["default", "forest", "dark", "neutral", "base"]
    syntax: |
      ---
      config:
        theme: dark
      ---
      
  styling.node:
    syntax: "style NodeId fill:#color,stroke:#color,stroke-width:2px"
    
  styling.class:
    syntax: |
      classDef className fill:#f9f,stroke:#333
      A:::className
      
  styling.link:
    syntax: "linkStyle 0 stroke:#ff3,stroke-width:4px"

sources:
  - id: class-diagrams
    path: references/class-diagrams.md
    use_for: domain modeling, relationships, methods
  - id: sequence-diagrams
    path: references/sequence-diagrams.md
    use_for: actors, messages, control flow
  - id: flowcharts
    path: references/flowcharts.md
    use_for: node shapes, connections, subgraphs
  - id: erd-diagrams
    path: references/erd-diagrams.md
    use_for: entities, cardinality, attributes
  - id: c4-diagrams
    path: references/c4-diagrams.md
    use_for: system context, containers, components
  - id: advanced-features
    path: references/advanced-features.md
    use_for: themes, styling, configuration
```

### 8.3 CLI Skill: Agent Browser

```yaml
meta:
  name: agent-browser
  version: "c8d4e1f2"
  type: cli
  description: Automate browser interactions for web testing, form filling, screenshots, and data extraction

triggers:
  keywords: [browser, web, scrape, screenshot, form, click, navigate, automate]
  intents:
    - navigate websites
    - fill forms
    - take screenshots
    - extract web content
    - test web applications
    - automate browser interactions

constraints:
  always:
    - snapshot before using refs
    - re-snapshot after navigation or DOM changes
    - close browser when done
  never:
    - use refs from previous snapshot after page change
    - assume refs persist across navigation

decisions:
  - when: need to interact with elements
    then: snapshot -i first to get refs
  - when: click causes navigation or DOM change
    then: re-snapshot before next interaction
  - when: reusing authentication across runs
    then: state save after login, state load before open
  - when: debugging failed automation
    then: use --headed flag and record video
  - when: page has dynamic content
    then: wait for specific condition, not fixed time

state:
  entities:
    - name: ref
      format: "@e{n}"
      created_by: [snapshot]
      consumed_by: [click, fill, type, hover, focus, get, check, uncheck, select, upload, drag, scrollintoview]
      invalidated_by:
        - navigation (open, back, forward, reload)
        - page-changing clicks
        - significant DOM mutations
        
    - name: session
      created_by: [--session flag, implicit default]
      properties: [cookies, localStorage, sessionStorage, history, tabs]
      persisted_by: [state save]
      restored_by: [state load]

global_flags:
  - name: --session
    type: string
    env: AGENT_BROWSER_SESSION
    purpose: isolated browser context
  - name: --json
    type: bool
    purpose: machine-readable output
  - name: --headed
    type: bool
    purpose: show browser window (not headless)
  - name: --proxy
    type: string
    purpose: proxy server URL
  - name: --cdp
    type: int
    purpose: Chrome DevTools Protocol port

commands:
  # Navigation
  open:
    syntax: "agent-browser open <url>"
    aliases: [goto, navigate]
    args:
      - name: url
        type: string
        required: true
    flags:
      - name: --ignore-https-errors
        type: bool
    invalidates: [refs]
    
  back:
    syntax: "agent-browser back"
    invalidates: [refs]
    
  forward:
    syntax: "agent-browser forward"
    invalidates: [refs]
    
  reload:
    syntax: "agent-browser reload"
    invalidates: [refs]
    
  close:
    syntax: "agent-browser close"
    aliases: [quit, exit]

  # Snapshot
  snapshot:
    syntax: "agent-browser snapshot [-i] [-c] [-d depth] [-s selector]"
    flags:
      - name: -i
        long: --interactive
        type: bool
        purpose: interactive elements only (recommended)
      - name: -c
        long: --compact
        type: bool
        purpose: compact output
      - name: -d
        long: --depth
        type: int
        purpose: limit tree depth
      - name: -s
        long: --scope
        type: string
        purpose: CSS selector to scope
    returns: accessibility tree with @refs
    creates: [refs]

  # Interactions
  click:
    syntax: "agent-browser click <ref>"
    args:
      - name: ref
        type: ref
        required: true
    requires: [refs]
    invalidates: [refs]
    
  dblclick:
    syntax: "agent-browser dblclick <ref>"
    args:
      - name: ref
        type: ref
        required: true
    requires: [refs]
    
  fill:
    syntax: "agent-browser fill <ref> <text>"
    args:
      - name: ref
        type: ref
        required: true
      - name: text
        type: string
        required: true
    requires: [refs]
    note: clears field before typing
    
  type:
    syntax: "agent-browser type <ref> <text>"
    args:
      - name: ref
        type: ref
        required: true
      - name: text
        type: string
        required: true
    requires: [refs]
    note: types without clearing

  select:
    syntax: "agent-browser select <ref> <value...>"
    args:
      - name: ref
        type: ref
        required: true
      - name: values
        type: string[]
        required: true
    requires: [refs]

  check:
    syntax: "agent-browser check <ref>"
    requires: [refs]
    
  uncheck:
    syntax: "agent-browser uncheck <ref>"
    requires: [refs]

  hover:
    syntax: "agent-browser hover <ref>"
    requires: [refs]

  focus:
    syntax: "agent-browser focus <ref>"
    requires: [refs]

  press:
    syntax: "agent-browser press <key>"
    aliases: [key]
    args:
      - name: key
        type: string
        required: true
        description: "Key name (Enter, Tab, Control+a, etc.)"

  scroll:
    syntax: "agent-browser scroll <direction> [pixels]"
    args:
      - name: direction
        type: enum
        values: [up, down, left, right]
        required: true
      - name: pixels
        type: int
        default: 300

  scrollintoview:
    syntax: "agent-browser scrollintoview <ref>"
    aliases: [scrollinto]
    requires: [refs]

  upload:
    syntax: "agent-browser upload <ref> <file...>"
    requires: [refs]
    args:
      - name: ref
        type: ref
        required: true
      - name: files
        type: string[]
        required: true

  # Information
  get.text:
    syntax: "agent-browser get text <ref>"
    requires: [refs]
    returns: element text content
    
  get.html:
    syntax: "agent-browser get html <ref>"
    requires: [refs]
    returns: innerHTML
    
  get.value:
    syntax: "agent-browser get value <ref>"
    requires: [refs]
    returns: input value
    
  get.attr:
    syntax: "agent-browser get attr <ref> <attribute>"
    requires: [refs]
    
  get.title:
    syntax: "agent-browser get title"
    returns: page title
    
  get.url:
    syntax: "agent-browser get url"
    returns: current URL

  # Screenshots
  screenshot:
    syntax: "agent-browser screenshot [path] [--full]"
    args:
      - name: path
        type: string
        required: false
    flags:
      - name: --full
        short: -f
        type: bool
        purpose: full page screenshot
    returns: path to saved image

  pdf:
    syntax: "agent-browser pdf <path>"
    args:
      - name: path
        type: string
        required: true

  # Recording
  record.start:
    syntax: "agent-browser record start <file>"
    args:
      - name: file
        type: string
        required: true
    note: creates fresh context, preserves cookies/storage
    
  record.stop:
    syntax: "agent-browser record stop"
    returns: saved video path
    
  record.restart:
    syntax: "agent-browser record restart <file>"
    note: stops current + starts new

  # Wait
  wait:
    syntax: "agent-browser wait <ref|ms|--flag>"
    variants:
      - syntax: "wait <ref>"
        purpose: wait for element
      - syntax: "wait <ms>"
        purpose: wait milliseconds
      - syntax: "wait --text <text>"
        purpose: wait for text to appear
      - syntax: "wait --url <pattern>"
        purpose: wait for URL pattern
      - syntax: "wait --load networkidle"
        purpose: wait for network idle

  # State
  state.save:
    syntax: "agent-browser state save <path>"
    args:
      - name: path
        type: string
        required: true
    returns: JSON file with cookies, storage, origins
    
  state.load:
    syntax: "agent-browser state load <path>"
    args:
      - name: path
        type: string
        required: true
    note: must be called before open for auth reuse

  # Sessions
  session.list:
    syntax: "agent-browser session list"

  # Find (semantic locators)
  find:
    syntax: "agent-browser find <locator> <value> <action> [--exact]"
    args:
      - name: locator
        type: enum
        values: [role, text, label, placeholder, alt, title, testid, first, last, nth]
        required: true
      - name: value
        type: string
        required: true
      - name: action
        type: string
        required: true
    flags:
      - name: --exact
        type: bool
        purpose: exact match only
    example: 'agent-browser find label "Email" fill "user@test.com"'

  # Settings
  set.viewport:
    syntax: "agent-browser set viewport <width> <height>"
    
  set.device:
    syntax: 'agent-browser set device "<device name>"'
    
  set.credentials:
    syntax: "agent-browser set credentials <user> <pass>"
    aliases: [set.auth]
    purpose: HTTP basic auth

  # Cookies
  cookies:
    syntax: "agent-browser cookies"
    returns: all cookies
    
  cookies.set:
    syntax: "agent-browser cookies set <name> <value>"
    
  cookies.clear:
    syntax: "agent-browser cookies clear"

workflows:
  basic_interaction:
    description: Core pattern for any browser interaction
    invariants:
      - Always snapshot before using refs
      - Re-snapshot after any navigation
    steps:
      - cmd: "open <url>"
        note: navigate to target
      - cmd: "snapshot -i"
        note: get element refs
      - cmd: "<action> @ref"
        note: interact using ref
      - cmd: "snapshot -i"
        note: re-snapshot if page changed
    example: |
      agent-browser open https://example.com
      agent-browser snapshot -i
      agent-browser click @e1
      agent-browser snapshot -i

  form_submission:
    description: Fill and submit a form
    steps:
      - cmd: "open <form-url>"
      - cmd: "snapshot -i"
      - cmd: "fill @ref <value>"
        note: repeat for each field
      - cmd: "click @submit-ref"
      - cmd: "wait --load networkidle"
      - cmd: "snapshot -i"
        note: verify result
    example: |
      agent-browser open https://example.com/form
      agent-browser snapshot -i
      agent-browser fill @e1 "user@example.com"
      agent-browser fill @e2 "password123"
      agent-browser click @e3
      agent-browser wait --load networkidle
      agent-browser snapshot -i

  authenticated_session:
    description: Login once, reuse state across runs
    steps:
      - cmd: "state load auth.json"
        note: try loading saved state
        optional: true
      - cmd: "open <login-url>"
      - cmd: "get url"
        note: check if already logged in
      - cmd: "snapshot -i"
        note: if on login page
      - cmd: "fill @user <username>"
      - cmd: "fill @pass <password>"
      - cmd: "click @submit"
      - cmd: "wait --url '**/dashboard'"
      - cmd: "state save auth.json"

  content_capture:
    description: Extract content with screenshots
    steps:
      - cmd: "open <url>"
      - cmd: "wait --load networkidle"
      - cmd: "screenshot --full page.png"
      - cmd: "get text body > content.txt"
      - cmd: "pdf page.pdf"
        optional: true

templates:
  form-automation:
    description: Form filling with validation
    usage: "./form-automation.sh <url>"
    args:
      - name: url
        type: string
        required: true
    path: templates/form-automation.sh
    
  authenticated-session:
    description: Login once, reuse state
    usage: "./authenticated-session.sh <login-url> [state-file]"
    args:
      - name: login-url
        type: string
        required: true
      - name: state-file
        type: string
        default: ./auth-state.json
    path: templates/authenticated-session.sh
    
  capture-workflow:
    description: Content extraction with screenshots
    usage: "./capture-workflow.sh <url> [output-dir]"
    args:
      - name: url
        type: string
        required: true
      - name: output-dir
        type: string
        default: "."
    path: templates/capture-workflow.sh

environment:
  - name: AGENT_BROWSER_SESSION
    purpose: default session name
  - name: AGENT_BROWSER_EXECUTABLE_PATH
    purpose: custom browser path
  - name: AGENT_BROWSER_EXTENSIONS
    purpose: comma-separated extension paths
  - name: HTTP_PROXY
    purpose: HTTP proxy URL
  - name: HTTPS_PROXY
    purpose: HTTPS proxy URL

sources:
  - id: snapshot-refs
    path: references/snapshot-refs.md
    use_for: ref lifecycle details
  - id: authentication
    path: references/authentication.md
    use_for: login patterns
  - id: session-management
    path: references/session-management.md
    use_for: parallel sessions
  - id: video-recording
    path: references/video-recording.md
    use_for: recording workflows
  - id: proxy-support
    path: references/proxy-support.md
    use_for: proxy configuration
```

---

## 9. Implementation Guidelines

### 9.1 Runtime Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        LLM Context                               │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Skill Manifest │  │  Query Cache    │  │  Active State   │  │
│  │  (loaded once)  │  │  (recent refs)  │  │  (refs, session)│  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ Query
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Skill Runtime                              │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Skill Loader   │  │  Query Engine   │  │  Validator      │  │
│  │  (parse YAML)   │  │  (path lookup)  │  │  (JSON Schema)  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ Result
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Execution Layer                            │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  CLI Executor   │  │  API Client     │  │  State Manager  │  │
│  │  (shell cmds)   │  │  (HTTP calls)   │  │  (track state)  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 9.2 Loading Strategy

```python
class SkillRuntime:
    def __init__(self):
        self.skills = {}  # Loaded skill definitions
        self.state = {}   # Active state per skill
        self.cache = {}   # Query result cache
    
    def load_skill(self, path: str) -> str:
        """Load a skill from YAML file, return skill name."""
        with open(path) as f:
            skill = yaml.safe_load(f)
        
        # Validate against schema
        validate(skill, UASP_SCHEMA)
        
        # Calculate/verify version
        expected_version = calculate_version(skill)
        if skill["meta"]["version"] != expected_version:
            logging.warning(f"Version mismatch: {skill['meta']['version']} != {expected_version}")
        
        name = skill["meta"]["name"]
        self.skills[name] = skill
        self.state[name] = {}
        
        return name
    
    def query(self, skill_name: str, path: str, filters: dict = None):
        """Query a skill by path with optional filters."""
        cache_key = f"{skill_name}:{path}:{filters}"
        
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        skill = self.skills[skill_name]
        result = query_skill(skill, path, filters)
        
        self.cache[cache_key] = result
        return result
```

### 9.3 State Management

```python
class StateManager:
    def __init__(self, skill: dict):
        self.skill = skill
        self.entities = {}  # Current state values
        self.valid = {}     # Validity flags
    
    def create(self, entity_name: str, value: any):
        """Mark state entity as created with value."""
        self.entities[entity_name] = value
        self.valid[entity_name] = True
    
    def invalidate(self, entity_name: str):
        """Mark state entity as invalid."""
        self.valid[entity_name] = False
    
    def check_requires(self, command_name: str) -> list:
        """Check if command's requirements are met."""
        cmd = self.skill["commands"].get(command_name, {})
        requires = cmd.get("requires", [])
        
        missing = []
        for req in requires:
            if req not in self.valid or not self.valid[req]:
                missing.append(req)
        
        return missing
    
    def apply_effects(self, command_name: str, result: any):
        """Apply command's state effects."""
        cmd = self.skill["commands"].get(command_name, {})
        
        # Handle creates
        for entity in cmd.get("creates", []):
            self.create(entity, result)
        
        # Handle invalidates
        for entity in cmd.get("invalidates", []):
            self.invalidate(entity)
```

### 9.4 Command Execution

```python
class CommandExecutor:
    def __init__(self, skill: dict, state_manager: StateManager):
        self.skill = skill
        self.state = state_manager
    
    def execute(self, command_path: str, args: dict) -> dict:
        """Execute a command with arguments."""
        cmd = self.skill["commands"].get(command_path)
        if not cmd:
            return {"error": f"Unknown command: {command_path}"}
        
        # Check requirements
        missing = self.state.check_requires(command_path)
        if missing:
            return {"error": f"Missing requirements: {missing}"}
        
        # Build command string
        cmd_str = self._build_command(cmd, args)
        
        # Execute
        result = subprocess.run(cmd_str, shell=True, capture_output=True, text=True)
        
        # Apply state effects
        self.state.apply_effects(command_path, result.stdout)
        
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        }
    
    def _build_command(self, cmd: dict, args: dict) -> str:
        """Build command string from template and args."""
        syntax = cmd["syntax"]
        
        # Apply global flags
        for flag in self.skill.get("global_flags", []):
            if flag["name"] in args:
                syntax = f"{syntax} {flag['name']} {args[flag['name']]}"
        
        # Apply args
        for arg in cmd.get("args", []):
            if arg["name"] in args:
                syntax = syntax.replace(f"<{arg['name']}>", str(args[arg["name"]]))
        
        return syntax
```

### 9.5 Session Initialization

At the start of a session, inject a minimal skill manifest:

```json
{
  "loaded_skills": [
    {
      "name": "agent-browser",
      "version": "c8d4e1f2",
      "type": "cli",
      "description": "Browser automation",
      "query_endpoint": "skill:agent-browser"
    },
    {
      "name": "stripe-best-practices",
      "version": "a3f2b1c9",
      "type": "knowledge",
      "description": "Stripe integration guidelines",
      "query_endpoint": "skill:stripe-best-practices"
    }
  ],
  "query_syntax": "skill:<name>:<path>?<filters>"
}
```

The LLM can then query specific sections as needed rather than loading full definitions.

### 9.6 Error Handling

```yaml
# Standard error responses
errors:
  skill_not_found:
    code: SKILL_NOT_FOUND
    message: "Skill '{name}' is not loaded"
    
  path_not_found:
    code: PATH_NOT_FOUND
    message: "Path '{path}' not found in skill '{name}'"
    
  invalid_state:
    code: INVALID_STATE
    message: "Required state '{entity}' is invalid or missing"
    
  validation_failed:
    code: VALIDATION_FAILED
    message: "Skill definition failed schema validation"
    details: [...]
    
  command_failed:
    code: COMMAND_FAILED
    message: "Command execution failed"
    stderr: "..."
    returncode: 1
```

### 9.7 Migration Checklist

When converting existing Markdown skills to UASP:

- [ ] Identify skill type (knowledge, cli, api, hybrid)
- [ ] Extract constraints (never, always, prefer)
- [ ] Extract decisions (when/then rules)
- [ ] Document state entities and lifecycles
- [ ] Define all commands with args, flags, returns
- [ ] Identify global flags
- [ ] Document workflows with invariants
- [ ] Build reference entries for syntax patterns
- [ ] Link to source documents
- [ ] Validate against JSON Schema
- [ ] Calculate version hash
- [ ] Test queries return expected results

---

## Appendix A: Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0-draft | 2025-01-28 | Initial draft specification |

## Appendix B: Reference Implementations

- **Python**: `uasp-py` (reference implementation)
- **TypeScript**: `uasp-ts` (planned)
- **Rust**: `uasp-rs` (planned)

## Appendix C: Related Specifications

- JSON Schema Draft-07: https://json-schema.org/draft-07/schema
- YAML 1.2: https://yaml.org/spec/1.2/spec.html
- OpenAPI 3.1: https://spec.openapis.org/oas/v3.1.0

---

*End of Specification*
