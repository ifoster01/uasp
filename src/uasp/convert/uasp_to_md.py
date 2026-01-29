"""UASP to Markdown generation (Section 7.2)."""

from __future__ import annotations

from typing import Any, Literal

import yaml

from uasp.convert.prompts import get_enhancement_prompt
from uasp.core.errors import ConversionError


LLMProvider = Literal["anthropic", "openai", "gemini", "openrouter"]


class MarkdownGenerator:
    """
    Generates human-readable Markdown documentation from UASP skills (Section 7.2).

    The Markdown output follows a consistent structure that mirrors
    the UASP sections while being optimized for human readability.

    Optionally uses an LLM to enhance the output with richer explanations
    and examples while preserving technical accuracy.
    """

    def __init__(
        self,
        include_version: bool = True,
        llm_provider: LLMProvider | None = None,
        api_key: str | None = None,
        model: str | None = None,
    ):
        """
        Initialize the generator.

        Args:
            include_version: Whether to include version info in output
            llm_provider: LLM provider for enhanced output ("anthropic", "openai", "gemini", "openrouter")
            api_key: API key for LLM provider (or uses environment variable)
            model: Model to use (provider-specific default if not specified)
        """
        self.include_version = include_version
        self.llm_provider = llm_provider
        self.api_key = api_key
        self.model = model or (self._default_model() if llm_provider else None)
        self._client: Any = None

    def _default_model(self) -> str:
        """Get the default model for the provider."""
        if self.llm_provider == "anthropic":
            return "claude-sonnet-4-20250514"
        elif self.llm_provider == "openai":
            return "gpt-4o"
        elif self.llm_provider == "gemini":
            return "gemini-2.0-flash"
        elif self.llm_provider == "openrouter":
            return "anthropic/claude-sonnet-4"
        else:
            return "gpt-4o"

    def _get_client(self) -> Any:
        """Get or create the LLM client."""
        if self._client is not None:
            return self._client

        if self.llm_provider == "anthropic":
            try:
                import anthropic
            except ImportError:
                raise ConversionError(
                    "anthropic package not installed. Install with: pip install anthropic"
                )
            self._client = anthropic.Anthropic(api_key=self.api_key)
        elif self.llm_provider == "openai":
            try:
                import openai
            except ImportError:
                raise ConversionError(
                    "openai package not installed. Install with: pip install openai"
                )
            self._client = openai.OpenAI(api_key=self.api_key)
        elif self.llm_provider == "gemini":
            try:
                import google.generativeai as genai
            except ImportError:
                raise ConversionError(
                    "google-generativeai package not installed. Install with: pip install google-generativeai"
                )
            genai.configure(api_key=self.api_key)
            self._client = genai.GenerativeModel(self.model)
        elif self.llm_provider == "openrouter":
            try:
                import openai
            except ImportError:
                raise ConversionError(
                    "openai package not installed. Install with: pip install openai"
                )
            self._client = openai.OpenAI(
                api_key=self.api_key,
                base_url="https://openrouter.ai/api/v1",
            )
        else:
            raise ConversionError(f"Unsupported LLM provider: {self.llm_provider}")

        return self._client

    def _call_llm(self, prompt: str) -> str:
        """Call the LLM with the given prompt."""
        client = self._get_client()

        if self.llm_provider == "anthropic":
            response = client.messages.create(
                model=self.model,
                max_tokens=8192,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.content[0].text
        elif self.llm_provider == "gemini":
            # Gemini client is already the model instance
            response = client.generate_content(prompt)
            return response.text
        elif self.llm_provider in ("openai", "openrouter"):
            # Both OpenAI and OpenRouter use the OpenAI client interface
            response = client.chat.completions.create(
                model=self.model,
                max_tokens=8192,
                messages=[{"role": "user", "content": prompt}],
            )
            return response.choices[0].message.content or ""
        else:
            raise ConversionError(f"Unsupported LLM provider: {self.llm_provider}")

    def _enhance_with_llm(self, skill_dict: dict[str, Any], template_markdown: str) -> str:
        """
        Enhance template-generated markdown using LLM.

        Args:
            skill_dict: The original skill dictionary
            template_markdown: The template-generated markdown

        Returns:
            Enhanced markdown string
        """
        uasp_yaml = yaml.dump(skill_dict, default_flow_style=False, sort_keys=False)
        prompt = get_enhancement_prompt(uasp_yaml, template_markdown)

        try:
            return self._call_llm(prompt)
        except Exception as e:
            raise ConversionError(f"LLM enhancement failed: {e}")

    def generate(self, skill_dict: dict[str, Any]) -> str:
        """
        Generate Markdown documentation from a skill definition.

        Args:
            skill_dict: Parsed skill dictionary

        Returns:
            Markdown string
        """
        # Generate base markdown using templates
        template_markdown = self._generate_template(skill_dict)

        # Optionally enhance with LLM
        if self.llm_provider:
            return self._enhance_with_llm(skill_dict, template_markdown)

        return template_markdown

    def _generate_template(self, skill_dict: dict[str, Any]) -> str:
        """
        Generate template-based Markdown (no LLM).

        Args:
            skill_dict: Parsed skill dictionary

        Returns:
            Template-generated markdown string
        """
        sections: list[str] = []

        # Header
        sections.append(self._generate_header(skill_dict))

        # Triggers
        if "triggers" in skill_dict:
            sections.append(self._generate_triggers(skill_dict["triggers"]))

        # Constraints
        if "constraints" in skill_dict:
            sections.append(self._generate_constraints(skill_dict["constraints"]))

        # Decisions
        if "decisions" in skill_dict:
            sections.append(self._generate_decisions(skill_dict["decisions"]))

        # State
        if "state" in skill_dict:
            sections.append(self._generate_state(skill_dict["state"]))

        # Commands
        if "commands" in skill_dict:
            sections.append(self._generate_commands(skill_dict))

        # Workflows
        if "workflows" in skill_dict:
            sections.append(self._generate_workflows(skill_dict["workflows"]))

        # Reference
        if "reference" in skill_dict:
            sections.append(self._generate_reference(skill_dict["reference"]))

        # Templates
        if "templates" in skill_dict:
            sections.append(self._generate_templates(skill_dict["templates"]))

        # Environment
        if "environment" in skill_dict:
            sections.append(self._generate_environment(skill_dict["environment"]))

        # Sources
        if "sources" in skill_dict:
            sections.append(self._generate_sources(skill_dict["sources"]))

        return "\n".join(filter(None, sections))

    def _generate_header(self, skill_dict: dict[str, Any]) -> str:
        """Generate the header section."""
        meta = skill_dict.get("meta", {})
        lines = [f"# {meta.get('name', 'Unnamed Skill')}"]

        if meta.get("description"):
            lines.append("")
            lines.append(meta["description"].strip())

        if self.include_version:
            lines.append("")
            lines.append(f"**Type:** {meta.get('type', 'unknown')}")
            lines.append(f"**Version:** {meta.get('version', 'unknown')}")

        lines.append("")
        return "\n".join(lines)

    def _generate_triggers(self, triggers: dict[str, Any]) -> str:
        """Generate the triggers section."""
        lines = ["## When to Use"]
        lines.append("")

        if triggers.get("keywords"):
            lines.append("**Keywords:** " + ", ".join(triggers["keywords"]))
            lines.append("")

        if triggers.get("intents"):
            lines.append("**Use this skill when you need to:**")
            for intent in triggers["intents"]:
                lines.append(f"- {intent}")
            lines.append("")

        if triggers.get("file_patterns"):
            lines.append("**File patterns:**")
            for pattern in triggers["file_patterns"]:
                lines.append(f"- `{pattern}`")
            lines.append("")

        return "\n".join(lines)

    def _generate_constraints(self, constraints: dict[str, Any]) -> str:
        """Generate the constraints/guidelines section."""
        lines = ["## Guidelines"]
        lines.append("")

        if constraints.get("never"):
            lines.append("### Never")
            lines.append("")
            for item in constraints["never"]:
                lines.append(f"- {item}")
            lines.append("")

        if constraints.get("always"):
            lines.append("### Always")
            lines.append("")
            for item in constraints["always"]:
                lines.append(f"- {item}")
            lines.append("")

        if constraints.get("prefer"):
            lines.append("### Preferences")
            lines.append("")
            for pref in constraints["prefer"]:
                line = f"- **Prefer** {pref['use']} **over** {pref['over']}"
                if pref.get("when"):
                    line += f" (when {pref['when']})"
                lines.append(line)
            lines.append("")

        return "\n".join(lines)

    def _generate_decisions(self, decisions: list[dict[str, Any]]) -> str:
        """Generate the decisions section."""
        lines = ["## Decision Rules"]
        lines.append("")

        for decision in decisions:
            lines.append(f"**When:** {decision['when']}")
            lines.append(f"**Then:** {decision['then']}")
            if decision.get("ref"):
                lines.append(f"**Reference:** `{decision['ref']}`")
            lines.append("")

        return "\n".join(lines)

    def _generate_state(self, state: dict[str, Any]) -> str:
        """Generate the state section."""
        entities = state.get("entities", [])
        if not entities:
            return ""

        lines = ["## State Management"]
        lines.append("")

        for entity in entities:
            lines.append(f"### `{entity['name']}`")
            lines.append("")

            if entity.get("format"):
                lines.append(f"**Format:** `{entity['format']}`")
                lines.append("")

            if entity.get("created_by"):
                lines.append(f"**Created by:** {', '.join(entity['created_by'])}")
            if entity.get("consumed_by"):
                lines.append(f"**Used by:** {', '.join(entity['consumed_by'])}")
            if entity.get("invalidated_by"):
                lines.append(f"**Invalidated by:** {', '.join(entity['invalidated_by'])}")
            if entity.get("properties"):
                lines.append(f"**Contains:** {', '.join(entity['properties'])}")

            lines.append("")

        return "\n".join(lines)

    def _generate_commands(self, skill_dict: dict[str, Any]) -> str:
        """Generate the commands section."""
        commands = skill_dict.get("commands", {})
        if not commands:
            return ""

        lines = ["## Commands"]
        lines.append("")

        # Global flags
        global_flags = skill_dict.get("global_flags", [])
        if global_flags:
            lines.append("### Global Flags")
            lines.append("")
            for flag in global_flags:
                desc = flag.get("purpose", "")
                lines.append(f"- `{flag['name']}`: {desc}")
            lines.append("")

        # Individual commands
        for name, cmd in commands.items():
            lines.append(f"### `{name}`")
            lines.append("")
            lines.append("```")
            lines.append(cmd["syntax"])
            lines.append("```")
            lines.append("")

            if cmd.get("description"):
                lines.append(cmd["description"])
                lines.append("")

            if cmd.get("aliases"):
                lines.append(f"**Aliases:** {', '.join(cmd['aliases'])}")
                lines.append("")

            if cmd.get("args"):
                lines.append("**Arguments:**")
                for arg in cmd["args"]:
                    req = "(required)" if arg.get("required") else "(optional)"
                    desc = arg.get("description", "")
                    lines.append(f"- `{arg['name']}` ({arg['type']}) {req}: {desc}")
                lines.append("")

            if cmd.get("flags"):
                lines.append("**Flags:**")
                for flag in cmd["flags"]:
                    name_parts = [flag["name"]]
                    if flag.get("short"):
                        name_parts.insert(0, flag["short"])
                    if flag.get("long") and flag.get("long") != flag["name"]:
                        name_parts.append(flag["long"])
                    names = ", ".join(f"`{n}`" for n in name_parts)
                    purpose = flag.get("purpose", "")
                    lines.append(f"- {names}: {purpose}")
                lines.append("")

            if cmd.get("returns"):
                lines.append(f"**Returns:** {cmd['returns']}")
                lines.append("")

            if cmd.get("requires"):
                lines.append(f"**Requires:** {', '.join(cmd['requires'])}")
            if cmd.get("creates"):
                lines.append(f"**Creates:** {', '.join(cmd['creates'])}")
            if cmd.get("invalidates"):
                lines.append(f"**Invalidates:** {', '.join(cmd['invalidates'])}")

            if cmd.get("note"):
                lines.append("")
                lines.append(f"> **Note:** {cmd['note']}")

            lines.append("")

        return "\n".join(lines)

    def _generate_workflows(self, workflows: dict[str, Any]) -> str:
        """Generate the workflows section."""
        if not workflows:
            return ""

        lines = ["## Workflows"]
        lines.append("")

        for name, workflow in workflows.items():
            title = name.replace("_", " ").title()
            lines.append(f"### {title}")
            lines.append("")
            lines.append(workflow["description"])
            lines.append("")

            if workflow.get("invariants"):
                lines.append("**Invariants:**")
                for inv in workflow["invariants"]:
                    lines.append(f"- {inv}")
                lines.append("")

            lines.append("**Steps:**")
            for i, step in enumerate(workflow["steps"], 1):
                optional = " *(optional)*" if step.get("optional") else ""
                note = f" — {step['note']}" if step.get("note") else ""
                lines.append(f"{i}. `{step['cmd']}`{note}{optional}")
            lines.append("")

            if workflow.get("example"):
                lines.append("**Example:**")
                lines.append("```bash")
                lines.append(workflow["example"].strip())
                lines.append("```")
                lines.append("")

        return "\n".join(lines)

    def _generate_reference(self, reference: dict[str, Any]) -> str:
        """Generate the reference section."""
        if not reference:
            return ""

        lines = ["## Syntax Reference"]
        lines.append("")

        for name, entry in reference.items():
            lines.append(f"### `{name}`")
            lines.append("")

            if entry.get("syntax"):
                lines.append("```")
                lines.append(entry["syntax"])
                lines.append("```")
                lines.append("")

            if entry.get("notes"):
                lines.append(entry["notes"])
                lines.append("")

            if entry.get("values"):
                lines.append(f"**Values:** {', '.join(entry['values'])}")
                lines.append("")

            if entry.get("example"):
                lines.append("**Example:**")
                lines.append("```")
                lines.append(entry["example"].strip())
                lines.append("```")
                lines.append("")

            # Handle additional string properties
            for key, value in entry.items():
                if key not in ("syntax", "example", "notes", "values") and isinstance(value, str):
                    lines.append(f"- `{key}`: `{value}`")
            lines.append("")

        return "\n".join(lines)

    def _generate_templates(self, templates: dict[str, Any]) -> str:
        """Generate the templates section."""
        if not templates:
            return ""

        lines = ["## Templates"]
        lines.append("")

        for name, template in templates.items():
            lines.append(f"### {name}")
            lines.append("")
            lines.append(template["description"])
            lines.append("")

            if template.get("usage"):
                lines.append(f"**Usage:** `{template['usage']}`")
                lines.append("")

            if template.get("args"):
                lines.append("**Arguments:**")
                for arg in template["args"]:
                    req = "(required)" if arg.get("required") else "(optional)"
                    lines.append(f"- `{arg['name']}` ({arg['type']}) {req}")
                lines.append("")

            if template.get("path"):
                lines.append(f"**Path:** `{template['path']}`")
            if template.get("inline"):
                lines.append("**Script:**")
                lines.append("```bash")
                lines.append(template["inline"].strip())
                lines.append("```")

            lines.append("")

        return "\n".join(lines)

    def _generate_environment(self, environment: list[dict[str, Any]]) -> str:
        """Generate the environment variables section."""
        if not environment:
            return ""

        lines = ["## Environment Variables"]
        lines.append("")

        for env in environment:
            lines.append(f"### `{env['name']}`")
            lines.append("")
            lines.append(env["purpose"])
            if env.get("default"):
                lines.append(f"**Default:** `{env['default']}`")
            lines.append("")

        return "\n".join(lines)

    def _generate_sources(self, sources: list[dict[str, Any]]) -> str:
        """Generate the sources/references section."""
        if not sources:
            return ""

        lines = ["## References"]
        lines.append("")

        for source in sources:
            if source.get("url"):
                lines.append(f"- [{source['id']}]({source['url']})")
            elif source.get("path"):
                lines.append(f"- `{source['id']}`: `{source['path']}`")
            else:
                lines.append(f"- `{source['id']}`")

            if source.get("use_for"):
                lines.append(f"  - {source['use_for']}")

        lines.append("")
        return "\n".join(lines)


def generate_markdown(skill_dict: dict[str, Any]) -> str:
    """
    Convenience function to generate Markdown from a skill definition.

    Args:
        skill_dict: Parsed skill dictionary

    Returns:
        Markdown string
    """
    return MarkdownGenerator().generate(skill_dict)
