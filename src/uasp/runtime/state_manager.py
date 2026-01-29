"""State management for UASP skills (Section 9.3)."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class StateEntity:
    """Represents the current state of an entity."""

    name: str
    value: Any = None
    valid: bool = False

    def __repr__(self) -> str:
        status = "valid" if self.valid else "invalid"
        return f"StateEntity({self.name!r}, {status})"


class StateManager:
    """
    Manages state entities for a skill (Section 9.3).

    Tracks entity validity and checks command requirements.
    """

    def __init__(self, skill_dict: dict[str, Any]):
        """
        Initialize state manager with a skill definition.

        Args:
            skill_dict: Parsed skill dictionary
        """
        self.skill = skill_dict
        self.entities: dict[str, StateEntity] = {}
        self._initialize_entities()

    def _initialize_entities(self) -> None:
        """Initialize state entities from skill definition."""
        state = self.skill.get("state", {})
        for entity_def in state.get("entities", []):
            name = entity_def["name"]
            self.entities[name] = StateEntity(name=name)

    def create(self, entity_name: str, value: Any = None) -> None:
        """
        Mark a state entity as created with a value.

        Args:
            entity_name: Name of the entity to create
            value: Optional value for the entity
        """
        if entity_name not in self.entities:
            # Create entity even if not predefined
            self.entities[entity_name] = StateEntity(name=entity_name)

        self.entities[entity_name].value = value
        self.entities[entity_name].valid = True
        logger.debug(f"State created: {entity_name}")

    def invalidate(self, entity_name: str) -> None:
        """
        Mark a state entity as invalid.

        Args:
            entity_name: Name of the entity to invalidate
        """
        if entity_name in self.entities:
            self.entities[entity_name].valid = False
            logger.debug(f"State invalidated: {entity_name}")

    def is_valid(self, entity_name: str) -> bool:
        """
        Check if a state entity is valid.

        Args:
            entity_name: Name of the entity to check

        Returns:
            True if entity exists and is valid
        """
        entity = self.entities.get(entity_name)
        return entity is not None and entity.valid

    def get_value(self, entity_name: str) -> Any:
        """
        Get the value of a state entity.

        Args:
            entity_name: Name of the entity

        Returns:
            Entity value or None if not found/invalid
        """
        entity = self.entities.get(entity_name)
        if entity and entity.valid:
            return entity.value
        return None

    def check_requires(self, command_name: str) -> list[str]:
        """
        Check if a command's requirements are met.

        Args:
            command_name: Name of the command to check

        Returns:
            List of missing/invalid requirements (empty if all met)
        """
        cmd = self.skill.get("commands", {}).get(command_name, {})
        requires = cmd.get("requires", [])

        missing = []
        for req in requires:
            if not self.is_valid(req):
                missing.append(req)

        return missing

    def apply_effects(self, command_name: str, result: Any = None) -> None:
        """
        Apply a command's state effects.

        Args:
            command_name: Name of the command that was executed
            result: Result of command execution (used for creates)
        """
        cmd = self.skill.get("commands", {}).get(command_name, {})

        # Handle creates
        for entity in cmd.get("creates", []):
            self.create(entity, result)

        # Handle invalidates
        for entity in cmd.get("invalidates", []):
            self.invalidate(entity)

    def get_status(self) -> dict[str, dict[str, Any]]:
        """
        Get the current status of all state entities.

        Returns:
            Dictionary mapping entity names to their status
        """
        return {
            name: {
                "valid": entity.valid,
                "has_value": entity.value is not None,
            }
            for name, entity in self.entities.items()
        }

    def reset(self) -> None:
        """Reset all state entities to invalid."""
        for entity in self.entities.values():
            entity.valid = False
            entity.value = None
        logger.debug("State reset")

    def get_entity_definition(self, entity_name: str) -> dict[str, Any] | None:
        """
        Get the definition of a state entity from the skill.

        Args:
            entity_name: Name of the entity

        Returns:
            Entity definition dictionary or None if not found
        """
        state = self.skill.get("state", {})
        for entity_def in state.get("entities", []):
            if entity_def["name"] == entity_name:
                return entity_def
        return None

    def check_invalidation_conditions(
        self, entity_name: str, context: dict[str, Any]
    ) -> bool:
        """
        Check if any invalidation conditions are met for an entity.

        Args:
            entity_name: Name of the entity to check
            context: Context dictionary with current state

        Returns:
            True if entity should be invalidated
        """
        entity_def = self.get_entity_definition(entity_name)
        if not entity_def:
            return False

        # For now, just return False - invalidation conditions
        # are typically checked by the executor based on command effects
        return False
