"""Tests for CLI commands."""

from pathlib import Path

import pytest
from click.testing import CliRunner

from uasp.cli.main import cli


@pytest.fixture
def runner():
    """Create CLI runner."""
    return CliRunner()


class TestValidateCommand:
    """Tests for validate command."""

    def test_validate_valid_file(self, runner, examples_dir):
        """Should pass for valid skill."""
        result = runner.invoke(cli, ["validate", str(examples_dir / "stripe-best-practices.uasp.yaml")])
        assert result.exit_code == 0
        assert "is valid" in result.output or "✓" in result.output

    def test_validate_invalid_file(self, runner, tmp_path):
        """Should fail for invalid skill."""
        invalid = tmp_path / "invalid.yaml"
        invalid.write_text("not_valid: yaml content")

        result = runner.invoke(cli, ["validate", str(invalid)])
        assert result.exit_code == 1

    def test_validate_json_output(self, runner, examples_dir):
        """Should output JSON when requested."""
        result = runner.invoke(
            cli,
            ["validate", str(examples_dir / "stripe-best-practices.uasp.yaml"), "--json"],
        )
        assert result.exit_code == 0
        assert '"valid": true' in result.output


class TestQueryCommand:
    """Tests for query command."""

    def test_query_simple_path(self, runner, examples_dir):
        """Should query simple path."""
        result = runner.invoke(
            cli,
            ["query", str(examples_dir / "stripe-best-practices.uasp.yaml"), "meta.name"],
        )
        assert result.exit_code == 0
        assert "stripe-best-practices" in result.output

    def test_query_nested_path(self, runner, examples_dir):
        """Should query nested path."""
        result = runner.invoke(
            cli,
            ["query", str(examples_dir / "stripe-best-practices.uasp.yaml"), "constraints.never"],
        )
        assert result.exit_code == 0
        assert "Charges API" in result.output

    def test_query_not_found(self, runner, examples_dir):
        """Should fail for missing path."""
        result = runner.invoke(
            cli,
            ["query", str(examples_dir / "stripe-best-practices.uasp.yaml"), "nonexistent.path"],
        )
        assert result.exit_code == 1
        assert "not found" in result.output.lower()

    def test_query_json_output(self, runner, examples_dir):
        """Should output JSON when requested."""
        result = runner.invoke(
            cli,
            ["query", str(examples_dir / "stripe-best-practices.uasp.yaml"), "meta.type", "--json"],
        )
        assert result.exit_code == 0
        assert '"found": true' in result.output


class TestInfoCommand:
    """Tests for info command."""

    def test_info_display(self, runner, examples_dir):
        """Should display skill info."""
        result = runner.invoke(
            cli,
            ["info", str(examples_dir / "stripe-best-practices.uasp.yaml")],
        )
        assert result.exit_code == 0
        assert "stripe-best-practices" in result.output
        assert "knowledge" in result.output

    def test_info_json(self, runner, examples_dir):
        """Should output JSON when requested."""
        result = runner.invoke(
            cli,
            ["info", str(examples_dir / "stripe-best-practices.uasp.yaml"), "--json"],
        )
        assert result.exit_code == 0
        assert '"name": "stripe-best-practices"' in result.output


class TestHashCommand:
    """Tests for hash command."""

    def test_hash_check(self, runner, examples_dir):
        """Should check version hash."""
        result = runner.invoke(
            cli,
            ["hash", str(examples_dir / "stripe-best-practices.uasp.yaml")],
        )
        assert result.exit_code == 0
        # Should show valid hash

    def test_hash_json(self, runner, examples_dir):
        """Should output JSON when requested."""
        result = runner.invoke(
            cli,
            ["hash", str(examples_dir / "stripe-best-practices.uasp.yaml"), "--json"],
        )
        assert result.exit_code == 0
        assert '"calculated_version"' in result.output


class TestConvertCommand:
    """Tests for convert command."""

    def test_convert_to_markdown(self, runner, examples_dir, tmp_path):
        """Should convert UASP to Markdown."""
        output = tmp_path / "output.md"
        result = runner.invoke(
            cli,
            [
                "convert",
                str(examples_dir / "stripe-best-practices.uasp.yaml"),
                "--to",
                "md",
                "-o",
                str(output),
            ],
        )
        assert result.exit_code == 0
        assert output.exists()
        content = output.read_text()
        assert "# stripe-best-practices" in content


class TestPathsCommand:
    """Tests for paths command."""

    def test_list_paths(self, runner, examples_dir):
        """Should list queryable paths."""
        result = runner.invoke(
            cli,
            ["paths", str(examples_dir / "stripe-best-practices.uasp.yaml")],
        )
        assert result.exit_code == 0
        assert "meta" in result.output
        assert "constraints" in result.output
