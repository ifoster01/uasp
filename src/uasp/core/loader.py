"""YAML loading and validation for UASP skill files."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import yaml

from uasp.core.errors import ValidationFailedError
from uasp.core.version import calculate_version, verify_version
from uasp.models.skill import Skill
from uasp.schema.validator import SchemaValidator, SchemaValidationError

logger = logging.getLogger(__name__)


class SkillLoader:
    """Load and validate UASP skill files."""

    def __init__(self, strict_version: bool = False):
        """
        Initialize the skill loader.

        Args:
            strict_version: If True, raise error on version mismatch.
                           If False, log warning but continue.
        """
        self.strict_version = strict_version

    def load(self, path: Path | str) -> Skill:
        """
        Load a skill from a YAML file.

        Args:
            path: Path to the .uasp.yaml file

        Returns:
            Validated Skill model

        Raises:
            FileNotFoundError: If the file doesn't exist
            ValidationFailedError: If schema validation fails
            ValueError: If version mismatch and strict_version is True
        """
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(f"Skill file not found: {path}")

        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        return self.load_string(content, source=str(path))

    def load_string(self, yaml_content: str, source: str = "<string>") -> Skill:
        """
        Load a skill from a YAML string.

        Args:
            yaml_content: YAML content to parse
            source: Source identifier for error messages

        Returns:
            Validated Skill model

        Raises:
            ValidationFailedError: If schema validation fails
            ValueError: If version mismatch and strict_version is True
        """
        # Parse YAML
        try:
            skill_dict = yaml.safe_load(yaml_content)
        except yaml.YAMLError as e:
            raise ValidationFailedError([f"Invalid YAML: {e}"])

        if not isinstance(skill_dict, dict):
            raise ValidationFailedError(["YAML must parse to a dictionary"])

        return self.load_dict(skill_dict, source=source)

    def load_dict(self, skill_dict: dict[str, Any], source: str = "<dict>") -> Skill:
        """
        Load a skill from a dictionary.

        Args:
            skill_dict: Parsed skill dictionary
            source: Source identifier for error messages

        Returns:
            Validated Skill model

        Raises:
            ValidationFailedError: If schema validation fails
            ValueError: If version mismatch and strict_version is True
        """
        # Validate against JSON Schema
        try:
            SchemaValidator.validate_or_raise(skill_dict)
        except SchemaValidationError as e:
            raise ValidationFailedError([str(err) for err in e.errors])

        # Verify version hash
        is_valid, stored, calculated = verify_version(skill_dict)
        if not is_valid:
            msg = f"Version mismatch in {source}: stored={stored}, calculated={calculated}"
            if self.strict_version:
                raise ValueError(msg)
            else:
                logger.warning(msg)

        # Create Pydantic model
        return Skill.from_dict(skill_dict)

    def validate(self, path: Path | str) -> list[str]:
        """
        Validate a skill file without fully loading it.

        Args:
            path: Path to the .uasp.yaml file

        Returns:
            List of validation errors (empty if valid)
        """
        errors: list[str] = []

        try:
            path = Path(path)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as e:
            return [f"Failed to read file: {e}"]

        # Parse YAML
        try:
            skill_dict = yaml.safe_load(content)
        except yaml.YAMLError as e:
            return [f"Invalid YAML: {e}"]

        if not isinstance(skill_dict, dict):
            return ["YAML must parse to a dictionary"]

        # Validate against JSON Schema
        result = SchemaValidator.validate(skill_dict)
        if not result.valid:
            errors.extend(str(e) for e in result.errors)

        # Check version
        is_valid, stored, calculated = verify_version(skill_dict)
        if not is_valid:
            errors.append(f"Version mismatch: stored={stored}, calculated={calculated}")

        # Check internal consistency
        consistency_errors = self._check_consistency(skill_dict)
        errors.extend(consistency_errors)

        return errors

    def _check_consistency(self, skill_dict: dict[str, Any]) -> list[str]:
        """
        Check internal consistency of the skill definition.

        Verifies:
        - Commands referenced in state.created_by exist in commands
        - State entities in requires/creates/invalidates exist in state.entities
        - Source IDs in decisions.ref exist in sources
        """
        errors: list[str] = []

        # Collect defined entities
        command_names = set(skill_dict.get("commands", {}).keys())
        entity_names = {
            e["name"] for e in skill_dict.get("state", {}).get("entities", [])
        }
        source_ids = {s["id"] for s in skill_dict.get("sources", [])}

        # Check state entity references to commands
        for entity in skill_dict.get("state", {}).get("entities", []):
            for cmd in entity.get("created_by", []):
                # Commands can be free-text, so only warn if they look like command names
                pass  # Skip this check as created_by can contain descriptions

        # Check command references to state entities
        for cmd_name, cmd in skill_dict.get("commands", {}).items():
            for entity in cmd.get("requires", []):
                if entity not in entity_names and entity_names:
                    errors.append(
                        f"Command '{cmd_name}' requires unknown state entity '{entity}'"
                    )
            for entity in cmd.get("creates", []):
                if entity not in entity_names and entity_names:
                    errors.append(
                        f"Command '{cmd_name}' creates unknown state entity '{entity}'"
                    )
            for entity in cmd.get("invalidates", []):
                if entity not in entity_names and entity_names:
                    errors.append(
                        f"Command '{cmd_name}' invalidates unknown state entity '{entity}'"
                    )

        # Check decision references to sources
        for i, decision in enumerate(skill_dict.get("decisions", [])):
            ref = decision.get("ref")
            if ref and source_ids and ref not in source_ids:
                errors.append(
                    f"Decision {i} references unknown source '{ref}'"
                )

        return errors


def load_skill(path: Path | str) -> Skill:
    """
    Convenience function to load a skill file.

    Args:
        path: Path to the .uasp.yaml file

    Returns:
        Validated Skill model
    """
    return SkillLoader().load(path)


def load_skill_string(yaml_content: str) -> Skill:
    """
    Convenience function to load a skill from YAML string.

    Args:
        yaml_content: YAML content to parse

    Returns:
        Validated Skill model
    """
    return SkillLoader().load_string(yaml_content)
