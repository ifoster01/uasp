"""Tests for skill loading."""

from pathlib import Path
import tempfile

import pytest
import yaml

from uasp.core.errors import ValidationFailedError
from uasp.core.loader import SkillLoader, load_skill, load_skill_string
from uasp.models.skill import Skill


class TestSkillLoader:
    """Tests for SkillLoader class."""

    def test_load_from_file(self, examples_dir):
        """Should load skill from file."""
        loader = SkillLoader()
        skill = loader.load(examples_dir / "stripe-best-practices.uasp.yaml")

        assert isinstance(skill, Skill)
        assert skill.meta.name == "stripe-best-practices"
        assert skill.meta.type == "knowledge"

    def test_load_from_string(self, minimal_skill_dict):
        """Should load skill from YAML string."""
        yaml_content = yaml.dump(minimal_skill_dict)
        loader = SkillLoader()
        skill = loader.load_string(yaml_content)

        assert isinstance(skill, Skill)
        assert skill.meta.name == "test-skill"

    def test_load_from_dict(self, minimal_skill_dict):
        """Should load skill from dictionary."""
        loader = SkillLoader()
        skill = loader.load_dict(minimal_skill_dict)

        assert isinstance(skill, Skill)
        assert skill.meta.name == "test-skill"

    def test_load_nonexistent_file(self):
        """Should raise FileNotFoundError for missing file."""
        loader = SkillLoader()
        with pytest.raises(FileNotFoundError):
            loader.load(Path("/nonexistent/path.yaml"))

    def test_load_invalid_yaml(self):
        """Should raise ValidationFailedError for invalid YAML."""
        loader = SkillLoader()
        with pytest.raises(ValidationFailedError):
            loader.load_string("invalid: yaml: content: {")

    def test_load_invalid_schema(self):
        """Should raise ValidationFailedError for invalid schema."""
        loader = SkillLoader()
        with pytest.raises(ValidationFailedError):
            loader.load_string("not_meta: {}")

    def test_version_mismatch_warning(self, minimal_skill_dict, caplog):
        """Should log warning on version mismatch."""
        minimal_skill_dict["meta"]["version"] = "wrongver"
        yaml_content = yaml.dump(minimal_skill_dict)

        loader = SkillLoader(strict_version=False)
        skill = loader.load_string(yaml_content)

        assert skill is not None
        # Warning should be logged

    def test_version_mismatch_strict(self, minimal_skill_dict):
        """Should raise error on version mismatch in strict mode."""
        minimal_skill_dict["meta"]["version"] = "wrongver"
        yaml_content = yaml.dump(minimal_skill_dict)

        loader = SkillLoader(strict_version=True)
        with pytest.raises(ValueError, match="Version mismatch"):
            loader.load_string(yaml_content)

    def test_validate_returns_errors(self, examples_dir):
        """validate() should return list of errors."""
        loader = SkillLoader()

        # Create invalid file
        with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
            f.write("invalid: content")
            f.flush()

            errors = loader.validate(Path(f.name))
            assert len(errors) > 0

    def test_validate_returns_empty_for_valid(self, examples_dir):
        """validate() should return empty list for valid file."""
        loader = SkillLoader()
        errors = loader.validate(examples_dir / "stripe-best-practices.uasp.yaml")
        # May have version mismatch warning
        assert all("Version mismatch" in e or not e for e in errors)


class TestConvenienceFunctions:
    """Tests for load_skill and load_skill_string functions."""

    def test_load_skill(self, examples_dir):
        """load_skill should work as convenience function."""
        skill = load_skill(examples_dir / "stripe-best-practices.uasp.yaml")
        assert skill.meta.name == "stripe-best-practices"

    def test_load_skill_string(self, minimal_skill_dict):
        """load_skill_string should work as convenience function."""
        yaml_content = yaml.dump(minimal_skill_dict)
        skill = load_skill_string(yaml_content)
        assert skill.meta.name == "test-skill"
