"""Tests for version hash calculation."""

import pytest

from uasp.core.version import calculate_version, update_version, verify_version


class TestCalculateVersion:
    """Tests for calculate_version function."""

    def test_deterministic_output(self, minimal_skill_dict):
        """Version hash should be deterministic."""
        hash1 = calculate_version(minimal_skill_dict)
        hash2 = calculate_version(minimal_skill_dict)
        assert hash1 == hash2

    def test_returns_8_char_hex(self, minimal_skill_dict):
        """Version hash should be 8 hex characters."""
        version = calculate_version(minimal_skill_dict)
        assert len(version) == 8
        assert all(c in "0123456789abcdef" for c in version)

    def test_excludes_version_field(self, minimal_skill_dict):
        """Version calculation should exclude the version field."""
        skill1 = minimal_skill_dict.copy()
        skill1["meta"] = {**skill1["meta"], "version": "aaaaaaaa"}

        skill2 = minimal_skill_dict.copy()
        skill2["meta"] = {**skill2["meta"], "version": "bbbbbbbb"}

        assert calculate_version(skill1) == calculate_version(skill2)

    def test_changes_with_content(self, minimal_skill_dict):
        """Version should change when content changes."""
        version1 = calculate_version(minimal_skill_dict)

        modified = minimal_skill_dict.copy()
        modified["meta"] = {**modified["meta"], "description": "Modified description"}
        version2 = calculate_version(modified)

        assert version1 != version2

    def test_sorted_keys(self, minimal_skill_dict):
        """Version should be the same regardless of key order."""
        skill1 = {
            "meta": {"name": "test", "version": "x", "type": "knowledge"},
            "triggers": {"keywords": ["a", "b"]},
        }
        skill2 = {
            "triggers": {"keywords": ["a", "b"]},
            "meta": {"type": "knowledge", "name": "test", "version": "y"},
        }

        assert calculate_version(skill1) == calculate_version(skill2)


class TestVerifyVersion:
    """Tests for verify_version function."""

    def test_valid_version(self, minimal_skill_dict):
        """Should return True for correct version."""
        # First calculate the correct version
        correct_version = calculate_version(minimal_skill_dict)
        minimal_skill_dict["meta"]["version"] = correct_version

        is_valid, stored, calculated = verify_version(minimal_skill_dict)
        assert is_valid is True
        assert stored == calculated

    def test_invalid_version(self, minimal_skill_dict):
        """Should return False for incorrect version."""
        minimal_skill_dict["meta"]["version"] = "wrongver"

        is_valid, stored, calculated = verify_version(minimal_skill_dict)
        assert is_valid is False
        assert stored == "wrongver"
        assert calculated != "wrongver"


class TestUpdateVersion:
    """Tests for update_version function."""

    def test_updates_version(self, minimal_skill_dict):
        """Should update version to correct value."""
        minimal_skill_dict["meta"]["version"] = "00000000"

        updated = update_version(minimal_skill_dict)

        is_valid, _, _ = verify_version(updated)
        assert is_valid is True

    def test_preserves_other_fields(self, minimal_skill_dict):
        """Should preserve all other fields."""
        updated = update_version(minimal_skill_dict)

        assert updated["meta"]["name"] == minimal_skill_dict["meta"]["name"]
        assert updated["meta"]["type"] == minimal_skill_dict["meta"]["type"]

    def test_returns_new_dict(self, minimal_skill_dict):
        """Should return a new dict, not modify in place."""
        original_version = minimal_skill_dict["meta"]["version"]
        updated = update_version(minimal_skill_dict)

        assert minimal_skill_dict["meta"]["version"] == original_version
        assert updated is not minimal_skill_dict
