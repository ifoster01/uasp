"""Schema validation for UASP skill definitions."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft7Validator, ValidationError
from jsonschema.exceptions import best_match


class SchemaValidator:
    """Validates UASP skill definitions against the JSON Schema."""

    _schema: dict[str, Any] | None = None
    _validator: Draft7Validator | None = None

    @classmethod
    def get_schema(cls) -> dict[str, Any]:
        """Load and cache the UASP JSON Schema."""
        if cls._schema is None:
            schema_path = Path(__file__).parent / "skill.json"
            with open(schema_path) as f:
                cls._schema = json.load(f)
        return cls._schema

    @classmethod
    def get_validator(cls) -> Draft7Validator:
        """Get the cached JSON Schema validator."""
        if cls._validator is None:
            cls._validator = Draft7Validator(cls.get_schema())
        return cls._validator

    @classmethod
    def validate(cls, skill_dict: dict[str, Any]) -> ValidationResult:
        """
        Validate a skill dictionary against the UASP schema.

        Args:
            skill_dict: The parsed skill definition to validate

        Returns:
            ValidationResult with success status and any errors
        """
        validator = cls.get_validator()
        errors = list(validator.iter_errors(skill_dict))

        if not errors:
            return ValidationResult(valid=True, errors=[])

        # Convert errors to a more useful format
        formatted_errors = []
        for error in errors:
            formatted_errors.append(
                ValidationError(
                    message=error.message,
                    path=list(error.absolute_path),
                    schema_path=list(error.absolute_schema_path),
                )
            )

        return ValidationResult(valid=False, errors=formatted_errors)

    @classmethod
    def validate_or_raise(cls, skill_dict: dict[str, Any]) -> None:
        """
        Validate a skill dictionary, raising an exception on failure.

        Args:
            skill_dict: The parsed skill definition to validate

        Raises:
            SchemaValidationError: If validation fails
        """
        result = cls.validate(skill_dict)
        if not result.valid:
            raise SchemaValidationError(result.errors)

    @classmethod
    def get_best_error(cls, skill_dict: dict[str, Any]) -> str | None:
        """
        Get the most relevant validation error message.

        Args:
            skill_dict: The parsed skill definition to validate

        Returns:
            The most relevant error message, or None if valid
        """
        validator = cls.get_validator()
        errors = list(validator.iter_errors(skill_dict))
        if not errors:
            return None

        best = best_match(errors)
        if best:
            path = ".".join(str(p) for p in best.absolute_path) if best.absolute_path else "root"
            return f"At '{path}': {best.message}"
        return errors[0].message


class ValidationError:
    """Represents a schema validation error."""

    def __init__(
        self,
        message: str,
        path: list[str | int] | None = None,
        schema_path: list[str | int] | None = None,
    ):
        self.message = message
        self.path = path or []
        self.schema_path = schema_path or []

    def __str__(self) -> str:
        path_str = ".".join(str(p) for p in self.path) if self.path else "root"
        return f"At '{path_str}': {self.message}"

    def __repr__(self) -> str:
        return f"ValidationError(message={self.message!r}, path={self.path!r})"


class ValidationResult:
    """Result of schema validation."""

    def __init__(self, valid: bool, errors: list[ValidationError]):
        self.valid = valid
        self.errors = errors

    def __bool__(self) -> bool:
        return self.valid

    def __str__(self) -> str:
        if self.valid:
            return "Validation passed"
        error_msgs = [str(e) for e in self.errors]
        return f"Validation failed with {len(self.errors)} error(s):\n" + "\n".join(error_msgs)


class SchemaValidationError(Exception):
    """Raised when schema validation fails."""

    def __init__(self, errors: list[ValidationError]):
        self.errors = errors
        error_msgs = [str(e) for e in errors]
        super().__init__(f"Schema validation failed:\n" + "\n".join(error_msgs))
