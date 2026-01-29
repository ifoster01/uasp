"""Markdown to UASP conversion (Section 7.1)."""

from __future__ import annotations

import re
from typing import Any, Literal

import yaml

from uasp.convert.prompts import get_conversion_prompt
from uasp.core.errors import ConversionError, ConsistencyError
from uasp.core.loader import SkillLoader
from uasp.core.version import calculate_version
from uasp.schema.validator import SchemaValidator


LLMProvider = Literal["anthropic", "openai", "gemini", "openrouter"]


class MarkdownConverter:
    """
    Converts Markdown skill definitions to UASP format (Section 7.1).

    Uses LLM-based conversion with structured prompts to extract
    semantic meaning from Markdown.
    """

    def __init__(
        self,
        llm_provider: LLMProvider,
        api_key: str | None = None,
        model: str | None = None,
    ):
        """
        Initialize the converter.

        Args:
            llm_provider: LLM provider to use ("anthropic", "openai", "gemini", or "openrouter")
            api_key: API key (or uses environment variable)
            model: Model to use (provider-specific default if not specified)
        """
        self.llm_provider = llm_provider
        self.api_key = api_key
        self.model = model or self._default_model()
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

    def convert(self, markdown_content: str) -> ConversionResult:
        """
        Convert Markdown content to UASP format.

        Args:
            markdown_content: The Markdown skill definition

        Returns:
            ConversionResult with the UASP skill and any warnings
        """
        # Get the conversion prompt
        prompt = get_conversion_prompt(markdown_content)

        # Call the LLM
        try:
            yaml_output = self._call_llm(prompt)
        except Exception as e:
            raise ConversionError(f"LLM call failed: {e}")

        # Post-process the output
        return self._post_process(yaml_output, markdown_content)

    def _call_llm(self, prompt: str) -> str:
        """Call the LLM with the conversion prompt."""
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

    def _post_process(
        self,
        yaml_output: str,
        source: str,
    ) -> "ConversionResult":
        """
        Post-process the LLM output (Section 7.1.5).

        Args:
            yaml_output: Raw YAML output from LLM
            source: Original source for error context

        Returns:
            ConversionResult with validated skill
        """
        warnings: list[str] = []

        # Extract YAML from markdown code blocks if present
        yaml_output = self._extract_yaml(yaml_output)

        # Parse YAML
        try:
            skill_dict = yaml.safe_load(yaml_output)
        except yaml.YAMLError as e:
            raise ConversionError(f"Invalid YAML output: {e}", source=source)

        if not isinstance(skill_dict, dict):
            raise ConversionError("LLM output did not parse to a dictionary", source=source)

        # Validate against schema
        result = SchemaValidator.validate(skill_dict)
        if not result.valid:
            # Try to fix common issues
            skill_dict, fix_warnings = self._try_fix_schema_errors(skill_dict, result.errors)
            warnings.extend(fix_warnings)

            # Re-validate
            result = SchemaValidator.validate(skill_dict)
            if not result.valid:
                error_msgs = [str(e) for e in result.errors]
                raise ConversionError(
                    f"Schema validation failed: {'; '.join(error_msgs)}",
                    source=source,
                )

        # Calculate version hash
        skill_dict["meta"]["version"] = calculate_version(skill_dict)

        # Check internal consistency
        consistency_warnings = self._check_internal_references(skill_dict)
        warnings.extend(consistency_warnings)

        return ConversionResult(
            skill=skill_dict,
            yaml_output=yaml.dump(skill_dict, default_flow_style=False, sort_keys=False),
            warnings=warnings,
            valid=True,
        )

    def _extract_yaml(self, text: str) -> str:
        """Extract YAML from markdown code blocks if present."""
        # Try to find YAML in code blocks
        patterns = [
            r"```yaml\s*\n(.*?)\n```",
            r"```\s*\n(.*?)\n```",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.DOTALL)
            if match:
                return match.group(1)

        # Return as-is if no code blocks
        return text

    def _try_fix_schema_errors(
        self,
        skill_dict: dict[str, Any],
        errors: list[Any],
    ) -> tuple[dict[str, Any], list[str]]:
        """
        Try to fix common schema errors.

        Returns:
            Tuple of (fixed_dict, warnings)
        """
        warnings: list[str] = []

        # Ensure meta section exists
        if "meta" not in skill_dict:
            skill_dict["meta"] = {
                "name": "unnamed-skill",
                "version": "00000000",
                "type": "knowledge",
            }
            warnings.append("Added missing meta section")

        # Ensure required meta fields
        meta = skill_dict["meta"]
        if "name" not in meta:
            meta["name"] = "unnamed-skill"
            warnings.append("Added default skill name")
        if "version" not in meta:
            meta["version"] = "00000000"
        if "type" not in meta:
            meta["type"] = "knowledge"
            warnings.append("Defaulted to knowledge type")

        # Fix name format
        if not re.match(r"^[a-z][a-z0-9-]*$", meta["name"]):
            original = meta["name"]
            meta["name"] = re.sub(r"[^a-z0-9-]", "-", original.lower())
            meta["name"] = re.sub(r"-+", "-", meta["name"]).strip("-")
            if not meta["name"] or not meta["name"][0].isalpha():
                meta["name"] = "skill-" + meta["name"]
            warnings.append(f"Fixed skill name: {original} -> {meta['name']}")

        # Fix type if invalid
        valid_types = ["knowledge", "cli", "api", "hybrid"]
        if meta["type"] not in valid_types:
            meta["type"] = "knowledge"
            warnings.append(f"Invalid type, defaulted to knowledge")

        return skill_dict, warnings

    def _check_internal_references(self, skill_dict: dict[str, Any]) -> list[str]:
        """
        Check internal consistency of references.

        Returns:
            List of warning messages
        """
        warnings: list[str] = []

        # Collect defined entities
        entity_names = {
            e["name"] for e in skill_dict.get("state", {}).get("entities", [])
        }
        source_ids = {s["id"] for s in skill_dict.get("sources", [])}

        # Check command references to state entities
        for cmd_name, cmd in skill_dict.get("commands", {}).items():
            for entity in cmd.get("requires", []):
                if entity_names and entity not in entity_names:
                    warnings.append(
                        f"Command '{cmd_name}' requires undefined entity '{entity}'"
                    )
            for entity in cmd.get("creates", []):
                if entity_names and entity not in entity_names:
                    warnings.append(
                        f"Command '{cmd_name}' creates undefined entity '{entity}'"
                    )

        # Check decision references
        for i, decision in enumerate(skill_dict.get("decisions", [])):
            ref = decision.get("ref")
            if ref and source_ids and ref not in source_ids:
                warnings.append(f"Decision {i} references undefined source '{ref}'")

        return warnings


class ConversionResult:
    """Result of Markdown to UASP conversion."""

    def __init__(
        self,
        skill: dict[str, Any],
        yaml_output: str,
        warnings: list[str],
        valid: bool,
    ):
        self.skill = skill
        self.yaml_output = yaml_output
        self.warnings = warnings
        self.valid = valid

    def to_dict(self) -> dict[str, Any]:
        """Convert result to dictionary."""
        return {
            "valid": self.valid,
            "skill": self.skill,
            "warnings": self.warnings,
        }
