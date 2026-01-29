"""LLM prompt templates for UASP conversion (Section 7.1.4)."""

from __future__ import annotations


CONVERSION_RULES = '''
## Conversion Rules

### Rule 1: Determine Skill Type
Analyze the skill's primary purpose:
- Guidelines, best practices, or decision rules → type: "knowledge"
- CLI command definitions and workflows → type: "cli"
- HTTP/API endpoint definitions → type: "api"
- Combination of guidelines AND executable commands → type: "hybrid"

### Rule 2: Extract Constraints
Scan for prescriptive language and categorize:

**`constraints.never`** — Absolute prohibitions:
- Look for: "never", "do not", "don't", "avoid", "prohibited", "forbidden"
- Extract the action being prohibited, not the surrounding prose
- Preserve specificity

**`constraints.always`** — Mandatory requirements:
- Look for: "always", "must", "required", "ensure", "mandatory"
- Extract the required action concisely

**`constraints.prefer`** — Soft preferences:
- Look for: "prefer X over Y", "use X instead of Y", "X is recommended over Y"
- Structure as: {use: "preferred", over: "alternative", when: "context"}

### Rule 3: Extract Decisions
Identify conditional logic:
```yaml
decisions:
  - when: <condition in natural language>
    then: <action or recommendation>
    ref: <source_id if referenced>
```

### Rule 4: Extract Commands (CLI/API skills)
For each command, extract:
- syntax: "full command syntax template"
- args: list of arguments with name, type, required, description
- flags: list of flags with name, short, long, type, purpose
- returns: description of output
- requires/creates/invalidates: state entity references

### Rule 5: Extract State Entities
Identify stateful elements and their lifecycle:
- name: entity identifier
- created_by: commands that create it
- consumed_by: commands that use it
- invalidated_by: conditions that break it

### Rule 6: Extract Workflows
Multi-step procedures become workflows with:
- description: what this workflow accomplishes
- invariants: rules that must hold throughout
- steps: list of {cmd, note, optional} objects
- example: concrete example

### Rule 7: Extract Reference Syntax
For syntax patterns used in generation:
- syntax: pattern with {placeholders}
- example: concrete example
- notes: clarifications
- values: allowed values for enums

### Rule 8: Extract Sources
Link external documentation:
- id: unique identifier
- url: for web resources
- path: for local files
- use_for: when to consult this source

### Rule 9: Extract Environment Variables
- name: VAR_NAME
- purpose: what it configures
- default: if specified

### Rule 10: Extract Triggers
- keywords: words that suggest this skill applies
- intents: natural language descriptions of use cases
- file_patterns: glob patterns that activate this skill
'''

MD_TO_UASP_PROMPT = '''You are converting a Markdown skill definition to UASP format.

## Input
<markdown_skill>
{markdown_content}
</markdown_skill>

## Instructions
1. Read the entire skill document to understand its purpose
2. Determine the skill type (knowledge, cli, api, or hybrid)
3. Apply the conversion rules to extract each section
4. Output valid YAML matching the UASP schema

{conversion_rules}

## Output Format
Output ONLY valid YAML. Do not include explanations outside the YAML.
Use this structure:

```yaml
meta:
  name: skill-name  # lowercase with hyphens
  version: "00000000"  # placeholder, will be calculated
  type: knowledge|cli|api|hybrid
  description: |
    Brief description (max 500 chars)

# Include only sections that have content:
triggers:
  keywords: []
  intents: []
  file_patterns: []

constraints:
  never: []
  always: []
  prefer: []

decisions: []

state:
  entities: []

commands: {{}}

global_flags: []

workflows: {{}}

reference: {{}}

templates: {{}}

environment: []

sources: []
```

Output the YAML now:'''


SECTION_MAPPING_GUIDE = '''
## Section Mapping Guide

| Content Type | UASP Section | Indicators |
|--------------|--------------|------------|
| Prohibitions | `constraints.never` | "Never", "Do not", "Avoid", "Don't" |
| Requirements | `constraints.always` | "Always", "Must", "Required", "Ensure" |
| Preferences | `constraints.prefer` | "Prefer X over Y", "Use X instead of Y" |
| Conditional rules | `decisions` | "If...then", "When...do" |
| CLI syntax | `commands` | Command examples, flag descriptions |
| Syntax patterns | `reference` | Code generation patterns, DSL syntax |
| Multi-step processes | `workflows` | Numbered steps, sequences |
| External links | `sources` | URLs, documentation references |
| Env vars | `environment` | $VAR_NAME, environment configuration |
| Activation signals | `triggers` | Keywords, file patterns |
'''


def get_conversion_prompt(markdown_content: str) -> str:
    """
    Get the full prompt for converting Markdown to UASP.

    Args:
        markdown_content: The Markdown content to convert

    Returns:
        Complete prompt string
    """
    return MD_TO_UASP_PROMPT.format(
        markdown_content=markdown_content,
        conversion_rules=CONVERSION_RULES,
    )


UASP_TO_MD_ENHANCEMENT_PROMPT = '''You are enhancing technical documentation for a skill definition.

Given this UASP skill (structured YAML) and its template-generated markdown,
improve the markdown to be more human-readable:

1. Add clear explanations for each section
2. Provide practical examples for commands and workflows
3. Explain the "why" behind constraints and decisions
4. Use friendly, instructive language
5. Keep all technical accuracy intact
6. Preserve all section headings and structure
7. Do not remove any information from the template

UASP Source:
```yaml
{uasp_yaml}
```

Template Markdown:
{template_markdown}

Output ONLY the enhanced markdown, no preamble or code fences around the output.'''


def get_enhancement_prompt(uasp_yaml: str, template_markdown: str) -> str:
    """
    Get the prompt for enhancing template-generated markdown with LLM.

    Args:
        uasp_yaml: The original UASP YAML content
        template_markdown: The template-generated markdown

    Returns:
        Complete prompt string for enhancement
    """
    return UASP_TO_MD_ENHANCEMENT_PROMPT.format(
        uasp_yaml=uasp_yaml,
        template_markdown=template_markdown,
    )
