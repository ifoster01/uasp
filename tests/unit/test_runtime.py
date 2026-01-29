"""Tests for skill runtime."""

import pytest

from uasp.core.errors import SkillNotFoundError
from uasp.runtime.skill_runtime import SkillRuntime


class TestSkillRuntime:
    """Tests for SkillRuntime class."""

    def test_load_skill(self, examples_dir):
        """Should load skill and return name."""
        runtime = SkillRuntime()
        name = runtime.load_skill(examples_dir / "stripe-best-practices.uasp.yaml")

        assert name == "stripe-best-practices"
        assert name in runtime.skills

    def test_load_multiple_skills(self, examples_dir):
        """Should load multiple skills."""
        runtime = SkillRuntime()
        runtime.load_skill(examples_dir / "stripe-best-practices.uasp.yaml")
        runtime.load_skill(examples_dir / "mermaid-diagrams.uasp.yaml")

        assert len(runtime.skills) == 2

    def test_unload_skill(self, examples_dir):
        """Should unload skill."""
        runtime = SkillRuntime()
        runtime.load_skill(examples_dir / "stripe-best-practices.uasp.yaml")

        result = runtime.unload_skill("stripe-best-practices")

        assert result is True
        assert "stripe-best-practices" not in runtime.skills

    def test_unload_skill_not_found(self):
        """Should return False for unloaded skill."""
        runtime = SkillRuntime()
        result = runtime.unload_skill("nonexistent")

        assert result is False

    def test_get_skill(self, examples_dir):
        """Should get skill dictionary."""
        runtime = SkillRuntime()
        runtime.load_skill(examples_dir / "stripe-best-practices.uasp.yaml")

        skill = runtime.get_skill("stripe-best-practices")

        assert skill["meta"]["name"] == "stripe-best-practices"

    def test_get_skill_not_found(self):
        """Should raise SkillNotFoundError."""
        runtime = SkillRuntime()

        with pytest.raises(SkillNotFoundError):
            runtime.get_skill("nonexistent")

    def test_get_skill_model(self, examples_dir):
        """Should get Pydantic model."""
        runtime = SkillRuntime()
        runtime.load_skill(examples_dir / "stripe-best-practices.uasp.yaml")

        model = runtime.get_skill_model("stripe-best-practices")

        assert model.meta.name == "stripe-best-practices"

    def test_query(self, examples_dir):
        """Should query loaded skill."""
        runtime = SkillRuntime()
        runtime.load_skill(examples_dir / "stripe-best-practices.uasp.yaml")

        result = runtime.query("stripe-best-practices", "meta.type")

        assert result.found is True
        assert result.value == "knowledge"

    def test_query_with_filters(self, examples_dir):
        """Should query with filters."""
        runtime = SkillRuntime()
        runtime.load_skill(examples_dir / "stripe-best-practices.uasp.yaml")

        result = runtime.query(
            "stripe-best-practices",
            "decisions",
            {"when": "*Charges*"},
        )

        assert result.found is True
        assert len(result.value) > 0

    def test_query_caching(self, examples_dir):
        """Should cache query results."""
        runtime = SkillRuntime()
        runtime.load_skill(examples_dir / "stripe-best-practices.uasp.yaml")

        # First query
        result1 = runtime.query("stripe-best-practices", "meta.name")
        # Second query (should use cache)
        result2 = runtime.query("stripe-best-practices", "meta.name")

        assert result1.value == result2.value
        assert len(runtime.cache) > 0

    def test_query_not_loaded(self):
        """Should raise SkillNotFoundError for unloaded skill."""
        runtime = SkillRuntime()

        with pytest.raises(SkillNotFoundError):
            runtime.query("nonexistent", "meta.name")

    def test_query_string(self, examples_dir):
        """Should parse and execute query string."""
        runtime = SkillRuntime()
        runtime.load_skill(examples_dir / "stripe-best-practices.uasp.yaml")

        result = runtime.query_string("stripe-best-practices:meta.type")

        assert result.found is True
        assert result.value == "knowledge"

    def test_get_manifest(self, examples_dir):
        """Should return skill manifest."""
        runtime = SkillRuntime()
        runtime.load_skill(examples_dir / "stripe-best-practices.uasp.yaml")
        runtime.load_skill(examples_dir / "mermaid-diagrams.uasp.yaml")

        manifest = runtime.get_manifest()

        assert "loaded_skills" in manifest
        assert len(manifest["loaded_skills"]) == 2
        assert "query_syntax" in manifest

    def test_list_skills(self, examples_dir):
        """Should list loaded skill names."""
        runtime = SkillRuntime()
        runtime.load_skill(examples_dir / "stripe-best-practices.uasp.yaml")
        runtime.load_skill(examples_dir / "mermaid-diagrams.uasp.yaml")

        names = runtime.list_skills()

        assert "stripe-best-practices" in names
        assert "mermaid-diagrams" in names

    def test_clear_cache(self, examples_dir):
        """Should clear query cache."""
        runtime = SkillRuntime()
        runtime.load_skill(examples_dir / "stripe-best-practices.uasp.yaml")
        runtime.query("stripe-best-practices", "meta.name")

        assert len(runtime.cache) > 0

        runtime.clear_cache()

        assert len(runtime.cache) == 0

    def test_reset_state(self, examples_dir):
        """Should reset state for skill."""
        runtime = SkillRuntime()
        runtime.load_skill(examples_dir / "agent-browser.uasp.yaml")

        state = runtime.get_state("agent-browser")
        state.create("refs", "test")

        runtime.reset_state("agent-browser")

        assert not state.is_valid("refs")

    def test_get_state(self, examples_dir):
        """Should return state manager for skill."""
        runtime = SkillRuntime()
        runtime.load_skill(examples_dir / "agent-browser.uasp.yaml")

        state = runtime.get_state("agent-browser")

        assert state is not None
        assert "refs" in state.entities
