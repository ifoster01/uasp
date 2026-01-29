"""Tests for conversion tools."""

import pytest

from uasp.convert.uasp_to_md import MarkdownGenerator, generate_markdown, LLMProvider


class TestMarkdownGenerator:
    """Tests for MarkdownGenerator class."""

    def test_generate_header(self, minimal_skill_dict):
        """Should generate skill header."""
        generator = MarkdownGenerator()
        md = generator.generate(minimal_skill_dict)

        assert "# test-skill" in md
        assert "knowledge" in md

    def test_generate_constraints(self, knowledge_skill_dict):
        """Should generate constraints section."""
        generator = MarkdownGenerator()
        md = generator.generate(knowledge_skill_dict)

        assert "## Guidelines" in md
        assert "### Never" in md
        assert "do bad things" in md
        assert "### Always" in md
        assert "### Preferences" in md

    def test_generate_decisions(self, knowledge_skill_dict):
        """Should generate decisions section."""
        generator = MarkdownGenerator()
        md = generator.generate(knowledge_skill_dict)

        assert "## Decision Rules" in md
        assert "**When:**" in md
        assert "**Then:**" in md

    def test_generate_commands(self, cli_skill_dict):
        """Should generate commands section."""
        generator = MarkdownGenerator()
        md = generator.generate(cli_skill_dict)

        assert "## Commands" in md
        assert "### `init`" in md
        assert "tool init" in md

    def test_generate_workflows(self, cli_skill_dict):
        """Should generate workflows section."""
        generator = MarkdownGenerator()
        md = generator.generate(cli_skill_dict)

        assert "## Workflows" in md
        assert "**Steps:**" in md

    def test_generate_triggers(self, knowledge_skill_dict):
        """Should generate triggers section."""
        generator = MarkdownGenerator()
        md = generator.generate(knowledge_skill_dict)

        assert "## When to Use" in md
        assert "Keywords:" in md

    def test_include_version_option(self, minimal_skill_dict):
        """Should respect include_version option."""
        generator = MarkdownGenerator(include_version=False)
        md = generator.generate(minimal_skill_dict)

        assert "**Version:**" not in md

    def test_generator_without_llm(self, minimal_skill_dict):
        """Should generate markdown without LLM (existing behavior)."""
        generator = MarkdownGenerator()
        md = generator.generate(minimal_skill_dict)

        # Verify template-based generation still works
        assert "# test-skill" in md
        assert generator.llm_provider is None
        assert generator._client is None

    def test_generator_with_llm_params(self):
        """Should initialize with LLM parameters."""
        generator = MarkdownGenerator(
            llm_provider="anthropic",
            api_key="test-key",
            model="claude-sonnet-4-20250514",
        )

        assert generator.llm_provider == "anthropic"
        assert generator.api_key == "test-key"
        assert generator.model == "claude-sonnet-4-20250514"

    def test_generator_default_models(self):
        """Should use provider-specific default models."""
        anthropic_gen = MarkdownGenerator(llm_provider="anthropic")
        openai_gen = MarkdownGenerator(llm_provider="openai")
        gemini_gen = MarkdownGenerator(llm_provider="gemini")
        openrouter_gen = MarkdownGenerator(llm_provider="openrouter")

        assert "claude" in anthropic_gen.model.lower()
        assert "gpt" in openai_gen.model.lower()
        assert "gemini" in gemini_gen.model.lower()
        assert "claude" in openrouter_gen.model.lower()

    def test_generate_state(self, cli_skill_dict):
        """Should generate state section."""
        generator = MarkdownGenerator()
        md = generator.generate(cli_skill_dict)

        assert "## State Management" in md
        assert "session" in md


class TestGenerateMarkdownFunction:
    """Tests for generate_markdown convenience function."""

    def test_generate_markdown(self, minimal_skill_dict):
        """Should generate markdown."""
        md = generate_markdown(minimal_skill_dict)

        assert "# test-skill" in md


class TestMarkdownConverterBasic:
    """Basic tests for MarkdownConverter that don't require LLM."""

    def test_import(self):
        """Should import without LLM packages."""
        from uasp.convert.md_to_uasp import MarkdownConverter

        # Just verify import works
        assert MarkdownConverter is not None

    def test_init_without_key(self):
        """Should initialize without API key."""
        from uasp.convert.md_to_uasp import MarkdownConverter

        converter = MarkdownConverter(llm_provider="anthropic")
        assert converter.llm_provider == "anthropic"

    def test_default_models(self):
        """Should have correct default models."""
        from uasp.convert.md_to_uasp import MarkdownConverter

        anthropic_converter = MarkdownConverter(llm_provider="anthropic")
        openai_converter = MarkdownConverter(llm_provider="openai")
        gemini_converter = MarkdownConverter(llm_provider="gemini")
        openrouter_converter = MarkdownConverter(llm_provider="openrouter")

        assert "claude" in anthropic_converter.model.lower()
        assert "gpt" in openai_converter.model.lower()
        assert "gemini" in gemini_converter.model.lower()
        assert "claude" in openrouter_converter.model.lower()
