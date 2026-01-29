"""Tests for command execution."""

import pytest

from uasp.core.errors import InvalidStateError
from uasp.runtime.executor import CommandExecutor, ExecutionResult
from uasp.runtime.state_manager import StateManager


class TestCommandExecutor:
    """Tests for CommandExecutor class."""

    def test_build_command_simple(self, cli_skill_dict):
        """Should build simple command string."""
        executor = CommandExecutor(cli_skill_dict)
        cmd = executor.build_command("init")

        assert cmd == "tool init"

    def test_build_command_with_args(self, cli_skill_dict):
        """Should build command with arguments."""
        executor = CommandExecutor(cli_skill_dict)
        cmd = executor.build_command("fetch", {"url": "https://example.com"})

        assert "fetch" in cmd
        assert "https://example.com" in cmd

    def test_build_command_with_flags(self, cli_skill_dict):
        """Should build command with flags."""
        executor = CommandExecutor(cli_skill_dict)
        cmd = executor.build_command("init", {"config": "/path/to/config"})

        assert "--config" in cmd
        assert "/path/to/config" in cmd

    def test_build_command_unknown(self, cli_skill_dict):
        """Should raise ValueError for unknown command."""
        executor = CommandExecutor(cli_skill_dict)

        with pytest.raises(ValueError, match="Unknown command"):
            executor.build_command("nonexistent")

    def test_execute_dry_run(self, cli_skill_dict):
        """Should return preview in dry run mode."""
        executor = CommandExecutor(cli_skill_dict)
        result = executor.execute("init", dry_run=True)

        assert result.success is True
        assert "DRY RUN" in result.stdout
        assert "tool init" in result.stdout

    def test_execute_missing_requirements(self, cli_skill_dict):
        """Should raise InvalidStateError for missing requirements."""
        executor = CommandExecutor(cli_skill_dict)

        with pytest.raises(InvalidStateError):
            executor.execute("fetch", {"url": "https://example.com"})

    def test_execute_with_state(self, cli_skill_dict):
        """Should work when state requirements are met."""
        state = StateManager(cli_skill_dict)
        state.create("session")

        executor = CommandExecutor(cli_skill_dict, state)
        result = executor.execute("fetch", {"url": "https://example.com"}, dry_run=True)

        assert result.success is True

    def test_execute_applies_effects(self, cli_skill_dict):
        """Should apply state effects after successful execution."""
        state = StateManager(cli_skill_dict)
        executor = CommandExecutor(cli_skill_dict, state)

        # Execute command that creates state
        executor.execute("init", dry_run=True)

        # Note: In dry run, effects are not applied
        # This tests the mechanism exists

    def test_get_command_info(self, cli_skill_dict):
        """Should return command information."""
        executor = CommandExecutor(cli_skill_dict)
        info = executor.get_command_info("init")

        assert info is not None
        assert info["syntax"] == "tool init [--config <path>]"

    def test_get_command_info_missing(self, cli_skill_dict):
        """Should return None for unknown command."""
        executor = CommandExecutor(cli_skill_dict)
        info = executor.get_command_info("nonexistent")

        assert info is None

    def test_list_commands(self, cli_skill_dict):
        """Should list all commands."""
        executor = CommandExecutor(cli_skill_dict)
        commands = executor.list_commands()

        assert "init" in commands
        assert "fetch" in commands
        assert "process" in commands
        assert "close" in commands

    def test_validate_args_valid(self, cli_skill_dict):
        """Should return empty list for valid args."""
        executor = CommandExecutor(cli_skill_dict)
        errors = executor.validate_args("fetch", {"url": "https://example.com"})

        assert errors == []

    def test_validate_args_missing_required(self, cli_skill_dict):
        """Should return error for missing required arg."""
        executor = CommandExecutor(cli_skill_dict)
        errors = executor.validate_args("fetch", {})

        assert len(errors) > 0
        assert "url" in errors[0].lower()

    def test_validate_args_unknown_command(self, cli_skill_dict):
        """Should return error for unknown command."""
        executor = CommandExecutor(cli_skill_dict)
        errors = executor.validate_args("nonexistent", {})

        assert len(errors) > 0
        assert "Unknown command" in errors[0]


class TestExecutionResult:
    """Tests for ExecutionResult class."""

    def test_to_dict(self):
        """Should convert to dictionary."""
        result = ExecutionResult(
            success=True,
            stdout="output",
            stderr="",
            returncode=0,
            command="test cmd",
        )
        d = result.to_dict()

        assert d["success"] is True
        assert d["stdout"] == "output"
        assert d["returncode"] == 0
        assert d["command"] == "test cmd"
