"""Command execution for UASP skills (Section 9.4)."""

from __future__ import annotations

import logging
import re
import shlex
import subprocess
from dataclasses import dataclass
from typing import Any

from uasp.core.errors import CommandFailedError, InvalidStateError
from uasp.runtime.state_manager import StateManager

logger = logging.getLogger(__name__)


@dataclass
class ExecutionResult:
    """Result of command execution."""

    success: bool
    stdout: str
    stderr: str
    returncode: int
    command: str

    def to_dict(self) -> dict[str, Any]:
        """Convert result to dictionary."""
        return {
            "success": self.success,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "returncode": self.returncode,
            "command": self.command,
        }


class CommandExecutor:
    """
    Executes commands defined in UASP skills (Section 9.4).

    Handles:
    - Building command strings from templates
    - Checking state requirements
    - Applying state effects after execution
    - Dry-run mode for previewing commands
    """

    def __init__(
        self,
        skill_dict: dict[str, Any],
        state_manager: StateManager | None = None,
    ):
        """
        Initialize the command executor.

        Args:
            skill_dict: Parsed skill dictionary
            state_manager: Optional state manager (created if not provided)
        """
        self.skill = skill_dict
        self.state = state_manager or StateManager(skill_dict)

    def execute(
        self,
        command_path: str,
        args: dict[str, Any] | None = None,
        dry_run: bool = False,
        timeout: float | None = None,
    ) -> ExecutionResult:
        """
        Execute a command with arguments.

        Args:
            command_path: Command path (e.g., "click", "record.start")
            args: Dictionary of argument values
            dry_run: If True, build command but don't execute
            timeout: Execution timeout in seconds

        Returns:
            ExecutionResult with stdout, stderr, returncode

        Raises:
            InvalidStateError: If required state is missing
            CommandFailedError: If execution fails and not dry_run
        """
        args = args or {}
        cmd_def = self.skill.get("commands", {}).get(command_path)

        if not cmd_def:
            return ExecutionResult(
                success=False,
                stdout="",
                stderr=f"Unknown command: {command_path}",
                returncode=1,
                command="",
            )

        # Check requirements
        missing = self.state.check_requires(command_path)
        if missing:
            raise InvalidStateError(
                missing[0],
                missing=missing,
            )

        # Build the command string
        cmd_str = self._build_command(cmd_def, args)
        logger.debug(f"Built command: {cmd_str}")

        if dry_run:
            return ExecutionResult(
                success=True,
                stdout=f"[DRY RUN] Would execute: {cmd_str}",
                stderr="",
                returncode=0,
                command=cmd_str,
            )

        # Execute the command
        try:
            result = subprocess.run(
                cmd_str,
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout,
            )

            success = result.returncode == 0
            exec_result = ExecutionResult(
                success=success,
                stdout=result.stdout,
                stderr=result.stderr,
                returncode=result.returncode,
                command=cmd_str,
            )

            # Apply state effects if successful
            if success:
                self.state.apply_effects(command_path, result.stdout)

            return exec_result

        except subprocess.TimeoutExpired as e:
            return ExecutionResult(
                success=False,
                stdout=e.stdout or "" if hasattr(e, "stdout") else "",
                stderr=f"Command timed out after {timeout}s",
                returncode=-1,
                command=cmd_str,
            )
        except Exception as e:
            return ExecutionResult(
                success=False,
                stdout="",
                stderr=str(e),
                returncode=-1,
                command=cmd_str,
            )

    def build_command(
        self,
        command_path: str,
        args: dict[str, Any] | None = None,
    ) -> str:
        """
        Build a command string without executing it.

        Args:
            command_path: Command path (e.g., "click", "record.start")
            args: Dictionary of argument values

        Returns:
            The command string that would be executed
        """
        args = args or {}
        cmd_def = self.skill.get("commands", {}).get(command_path)

        if not cmd_def:
            raise ValueError(f"Unknown command: {command_path}")

        return self._build_command(cmd_def, args)

    def _build_command(
        self,
        cmd_def: dict[str, Any],
        args: dict[str, Any],
    ) -> str:
        """
        Build a command string from template and arguments.

        Args:
            cmd_def: Command definition dictionary
            args: Argument values

        Returns:
            Built command string
        """
        syntax = cmd_def["syntax"]

        # Apply global flags first
        for flag in self.skill.get("global_flags", []):
            flag_name = flag["name"]
            # Check for flag in args (with or without --)
            arg_key = flag_name.lstrip("-")
            if arg_key in args:
                value = args[arg_key]
                if flag["type"] == "bool":
                    if value:
                        syntax = f"{syntax} {flag_name}"
                else:
                    syntax = f"{syntax} {flag_name} {shlex.quote(str(value))}"

        # Apply command-specific flags
        for flag in cmd_def.get("flags", []):
            flag_name = flag.get("long") or flag["name"]
            arg_key = flag_name.lstrip("-")
            if arg_key in args:
                value = args[arg_key]
                if flag["type"] == "bool":
                    if value:
                        # Use short form if available
                        use_name = flag.get("short") or flag_name
                        syntax = f"{syntax} {use_name}"
                else:
                    syntax = f"{syntax} {flag_name} {shlex.quote(str(value))}"

        # Apply positional arguments
        for arg in cmd_def.get("args", []):
            arg_name = arg["name"]
            placeholder = f"<{arg_name}>"
            if arg_name in args:
                value = args[arg_name]
                # Handle list values
                if isinstance(value, list):
                    value = " ".join(shlex.quote(str(v)) for v in value)
                else:
                    value = shlex.quote(str(value))
                syntax = syntax.replace(placeholder, value)
            elif arg.get("default") is not None:
                syntax = syntax.replace(placeholder, shlex.quote(str(arg["default"])))

        # Clean up unfilled optional blocks (e.g., [--flag <value>], [<optional>])
        syntax = re.sub(r"\s*\[[^\]]*<[^>]+>[^\]]*\]", "", syntax)
        # Remove unfilled required placeholders (they'll cause errors anyway)
        syntax = re.sub(r"\s*<[^>]+>", "", syntax)

        return syntax.strip()

    def get_command_info(self, command_path: str) -> dict[str, Any] | None:
        """
        Get information about a command.

        Args:
            command_path: Command path

        Returns:
            Command definition or None if not found
        """
        return self.skill.get("commands", {}).get(command_path)

    def list_commands(self) -> list[str]:
        """
        List all available commands.

        Returns:
            List of command paths
        """
        return list(self.skill.get("commands", {}).keys())

    def validate_args(
        self,
        command_path: str,
        args: dict[str, Any],
    ) -> list[str]:
        """
        Validate arguments for a command.

        Args:
            command_path: Command path
            args: Arguments to validate

        Returns:
            List of validation errors (empty if valid)
        """
        errors: list[str] = []
        cmd_def = self.skill.get("commands", {}).get(command_path)

        if not cmd_def:
            return [f"Unknown command: {command_path}"]

        # Check required arguments
        for arg in cmd_def.get("args", []):
            if arg.get("required", False) and arg["name"] not in args:
                errors.append(f"Missing required argument: {arg['name']}")

        # Check argument types
        for arg in cmd_def.get("args", []):
            if arg["name"] in args:
                value = args[arg["name"]]
                arg_type = arg.get("type", "string")

                if arg_type == "int":
                    try:
                        int(value)
                    except (ValueError, TypeError):
                        errors.append(f"Argument '{arg['name']}' must be an integer")
                elif arg_type == "bool":
                    if not isinstance(value, bool):
                        errors.append(f"Argument '{arg['name']}' must be a boolean")
                elif arg_type == "enum":
                    allowed = arg.get("values", [])
                    if allowed and value not in allowed:
                        errors.append(
                            f"Argument '{arg['name']}' must be one of: {', '.join(allowed)}"
                        )

        return errors
