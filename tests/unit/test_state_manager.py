"""Tests for state management."""

import pytest

from uasp.runtime.state_manager import StateManager


class TestStateManager:
    """Tests for StateManager class."""

    def test_initialize_entities(self, cli_skill_dict):
        """Should initialize entities from skill definition."""
        manager = StateManager(cli_skill_dict)
        assert "session" in manager.entities
        assert "data" in manager.entities

    def test_create_entity(self, cli_skill_dict):
        """Should mark entity as valid with value."""
        manager = StateManager(cli_skill_dict)
        manager.create("session", {"id": "123"})

        assert manager.is_valid("session") is True
        assert manager.get_value("session") == {"id": "123"}

    def test_invalidate_entity(self, cli_skill_dict):
        """Should mark entity as invalid."""
        manager = StateManager(cli_skill_dict)
        manager.create("session", "test")
        manager.invalidate("session")

        assert manager.is_valid("session") is False

    def test_is_valid_missing(self, cli_skill_dict):
        """Should return False for non-existent entity."""
        manager = StateManager(cli_skill_dict)
        assert manager.is_valid("nonexistent") is False

    def test_get_value_invalid(self, cli_skill_dict):
        """Should return None for invalid entity."""
        manager = StateManager(cli_skill_dict)
        assert manager.get_value("session") is None

    def test_check_requires_met(self, cli_skill_dict):
        """Should return empty list when requirements are met."""
        manager = StateManager(cli_skill_dict)
        manager.create("session")

        missing = manager.check_requires("fetch")
        assert missing == []

    def test_check_requires_missing(self, cli_skill_dict):
        """Should return missing requirements."""
        manager = StateManager(cli_skill_dict)

        missing = manager.check_requires("fetch")
        assert "session" in missing

    def test_apply_effects_creates(self, cli_skill_dict):
        """Should create entities from command effects."""
        manager = StateManager(cli_skill_dict)
        manager.apply_effects("init", "result")

        assert manager.is_valid("session") is True

    def test_apply_effects_invalidates(self, cli_skill_dict):
        """Should invalidate entities from command effects."""
        manager = StateManager(cli_skill_dict)
        manager.create("session")
        manager.create("data")

        manager.apply_effects("close")

        assert manager.is_valid("session") is False
        assert manager.is_valid("data") is False

    def test_get_status(self, cli_skill_dict):
        """Should return status of all entities."""
        manager = StateManager(cli_skill_dict)
        manager.create("session", "test")

        status = manager.get_status()

        assert status["session"]["valid"] is True
        assert status["session"]["has_value"] is True
        assert status["data"]["valid"] is False

    def test_reset(self, cli_skill_dict):
        """Should reset all entities."""
        manager = StateManager(cli_skill_dict)
        manager.create("session", "test")
        manager.create("data", "test")

        manager.reset()

        assert manager.is_valid("session") is False
        assert manager.is_valid("data") is False

    def test_get_entity_definition(self, cli_skill_dict):
        """Should return entity definition from skill."""
        manager = StateManager(cli_skill_dict)
        definition = manager.get_entity_definition("session")

        assert definition is not None
        assert definition["name"] == "session"
        assert "init" in definition["created_by"]

    def test_get_entity_definition_missing(self, cli_skill_dict):
        """Should return None for undefined entity."""
        manager = StateManager(cli_skill_dict)
        definition = manager.get_entity_definition("nonexistent")

        assert definition is None

    def test_create_undefined_entity(self, cli_skill_dict):
        """Should allow creating entities not in definition."""
        manager = StateManager(cli_skill_dict)
        manager.create("dynamic", "value")

        assert manager.is_valid("dynamic") is True
        assert manager.get_value("dynamic") == "value"
