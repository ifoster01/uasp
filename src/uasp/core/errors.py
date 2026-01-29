"""Error types for UASP operations (Section 9.6)."""

from __future__ import annotations

from typing import Any


class UASPError(Exception):
    """Base exception for all UASP errors."""

    code: str = "UASP_ERROR"

    def __init__(self, message: str, **details: Any):
        self.message = message
        self.details = details
        super().__init__(message)

    def to_dict(self) -> dict[str, Any]:
        """Convert error to dictionary format."""
        result: dict[str, Any] = {
            "code": self.code,
            "message": self.message,
        }
        if self.details:
            result["details"] = self.details
        return result


class SkillNotFoundError(UASPError):
    """Raised when a skill is not loaded."""

    code = "SKILL_NOT_FOUND"

    def __init__(self, name: str):
        super().__init__(f"Skill '{name}' is not loaded", name=name)


class PathNotFoundError(UASPError):
    """Raised when a query path doesn't exist in a skill."""

    code = "PATH_NOT_FOUND"

    def __init__(self, path: str, skill_name: str):
        super().__init__(
            f"Path '{path}' not found in skill '{skill_name}'",
            path=path,
            skill=skill_name,
        )


class InvalidStateError(UASPError):
    """Raised when required state is invalid or missing."""

    code = "INVALID_STATE"

    def __init__(self, entity: str, missing: list[str] | None = None):
        msg = f"Required state '{entity}' is invalid or missing"
        super().__init__(msg, entity=entity, missing=missing or [])


class ValidationFailedError(UASPError):
    """Raised when skill validation fails."""

    code = "VALIDATION_FAILED"

    def __init__(self, errors: list[str]):
        msg = f"Skill definition failed schema validation with {len(errors)} error(s)"
        super().__init__(msg, errors=errors)


class CommandFailedError(UASPError):
    """Raised when command execution fails."""

    code = "COMMAND_FAILED"

    def __init__(
        self,
        command: str,
        returncode: int,
        stderr: str | None = None,
        stdout: str | None = None,
    ):
        msg = f"Command '{command}' failed with return code {returncode}"
        super().__init__(
            msg,
            command=command,
            returncode=returncode,
            stderr=stderr,
            stdout=stdout,
        )


class ConversionError(UASPError):
    """Raised when skill conversion fails."""

    code = "CONVERSION_FAILED"

    def __init__(self, message: str, source: str | None = None):
        super().__init__(message, source=source)


class ConsistencyError(UASPError):
    """Raised when internal references are inconsistent."""

    code = "CONSISTENCY_ERROR"

    def __init__(self, warnings: list[str]):
        msg = f"Skill has {len(warnings)} consistency issue(s)"
        super().__init__(msg, warnings=warnings)
