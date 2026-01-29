"""Tests for example skill files."""

import pytest

from uasp.core.loader import SkillLoader
from uasp.core.query import QueryEngine


class TestStripeExample:
    """Tests for stripe-best-practices example."""

    @pytest.fixture
    def skill(self, stripe_skill_path):
        """Load the Stripe skill."""
        return SkillLoader().load(stripe_skill_path)

    def test_loads_successfully(self, skill):
        """Should load without errors."""
        assert skill.meta.name == "stripe-best-practices"
        assert skill.meta.type == "knowledge"

    def test_has_constraints(self, skill):
        """Should have constraints section."""
        assert skill.constraints is not None
        assert len(skill.constraints.never) > 0
        assert len(skill.constraints.always) > 0
        assert len(skill.constraints.prefer) > 0

    def test_has_decisions(self, skill):
        """Should have decisions."""
        assert skill.decisions is not None
        assert len(skill.decisions) > 0

    def test_has_sources(self, skill):
        """Should have sources."""
        assert skill.sources is not None
        assert len(skill.sources) > 0

    def test_query_constraints(self, skill):
        """Should be queryable."""
        skill_dict = skill.to_dict()
        result = QueryEngine.query(skill_dict, "constraints.never")

        assert result.found is True
        assert "Charges API" in result.value


class TestMermaidExample:
    """Tests for mermaid-diagrams example."""

    @pytest.fixture
    def skill(self, mermaid_skill_path):
        """Load the Mermaid skill."""
        return SkillLoader().load(mermaid_skill_path)

    def test_loads_successfully(self, skill):
        """Should load without errors."""
        assert skill.meta.name == "mermaid-diagrams"
        assert skill.meta.type == "hybrid"

    def test_has_reference(self, skill):
        """Should have reference section."""
        assert skill.reference is not None
        assert len(skill.reference) > 0

    def test_has_decisions(self, skill):
        """Should have decisions."""
        assert skill.decisions is not None

    def test_query_reference(self, skill):
        """Should be able to query reference."""
        skill_dict = skill.to_dict()
        # Reference keys contain dots (e.g., "flowchart.direction") so we query at reference level
        result = QueryEngine.query(skill_dict, "reference")

        assert result.found is True
        assert "flowchart.direction" in result.value
        assert "syntax" in result.value["flowchart.direction"]


class TestAgentBrowserExample:
    """Tests for agent-browser example."""

    @pytest.fixture
    def skill(self, agent_browser_skill_path):
        """Load the agent-browser skill."""
        return SkillLoader().load(agent_browser_skill_path)

    def test_loads_successfully(self, skill):
        """Should load without errors."""
        assert skill.meta.name == "agent-browser"
        assert skill.meta.type == "cli"

    def test_has_state(self, skill):
        """Should have state section."""
        assert skill.state is not None
        assert len(skill.state.entities) > 0

    def test_has_commands(self, skill):
        """Should have commands."""
        assert skill.commands is not None
        assert len(skill.commands) > 0

    def test_has_global_flags(self, skill):
        """Should have global flags."""
        assert skill.global_flags is not None
        assert len(skill.global_flags) > 0

    def test_has_workflows(self, skill):
        """Should have workflows."""
        assert skill.workflows is not None
        assert len(skill.workflows) > 0

    def test_has_templates(self, skill):
        """Should have templates."""
        assert skill.templates is not None

    def test_has_environment(self, skill):
        """Should have environment variables."""
        assert skill.environment is not None

    def test_query_command(self, skill):
        """Should be able to query commands."""
        skill_dict = skill.to_dict()
        result = QueryEngine.query(skill_dict, "commands.click")

        assert result.found is True
        assert "syntax" in result.value
        assert "requires" in result.value

    def test_query_state_entity(self, skill):
        """Should be able to query state entities."""
        skill_dict = skill.to_dict()
        result = QueryEngine.query(skill_dict, "state.entities.refs")

        assert result.found is True
        assert result.value["name"] == "refs"

    def test_command_state_consistency(self, skill):
        """Commands should reference valid state entities."""
        skill_dict = skill.to_dict()
        entity_names = {e.name for e in skill.state.entities}

        for cmd_name, cmd in skill.commands.items():
            for req in cmd.requires:
                assert req in entity_names, f"Command {cmd_name} requires unknown entity {req}"
            for creates in cmd.creates:
                assert creates in entity_names, f"Command {cmd_name} creates unknown entity {creates}"
