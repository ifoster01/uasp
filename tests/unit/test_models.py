"""Tests for Pydantic models."""

import pytest
from pydantic import ValidationError

from uasp.models.skill import (
    Argument,
    Command,
    Constraints,
    Decision,
    Flag,
    Meta,
    Preference,
    Skill,
    State,
    StateEntity,
    Triggers,
    Workflow,
    WorkflowStep,
)


class TestMeta:
    """Tests for Meta model."""

    def test_valid_meta(self):
        """Should accept valid meta."""
        meta = Meta(
            name="test-skill",
            version="00000000",
            type="knowledge",
            description="A test skill",
        )
        assert meta.name == "test-skill"

    def test_invalid_name(self):
        """Should reject invalid name pattern."""
        with pytest.raises(ValidationError):
            Meta(
                name="Invalid Name",
                version="00000000",
                type="knowledge",
            )

    def test_invalid_type(self):
        """Should reject invalid type."""
        with pytest.raises(ValidationError):
            Meta(
                name="test-skill",
                version="00000000",
                type="invalid",
            )

    def test_description_max_length(self):
        """Should reject description over 500 chars."""
        with pytest.raises(ValidationError):
            Meta(
                name="test-skill",
                version="00000000",
                type="knowledge",
                description="x" * 501,
            )


class TestPreference:
    """Tests for Preference model."""

    def test_valid_preference(self):
        """Should accept valid preference."""
        pref = Preference(use="option A", over="option B", when="condition X")
        assert pref.use == "option A"

    def test_optional_when(self):
        """Should accept preference without when."""
        pref = Preference(use="option A", over="option B")
        assert pref.when is None


class TestDecision:
    """Tests for Decision model."""

    def test_valid_decision(self):
        """Should accept valid decision."""
        decision = Decision(when="condition", then="action", ref="source:id")
        assert decision.when == "condition"

    def test_optional_ref(self):
        """Should accept decision without ref."""
        decision = Decision(when="condition", then="action")
        assert decision.ref is None


class TestStateEntity:
    """Tests for StateEntity model."""

    def test_valid_entity(self):
        """Should accept valid state entity."""
        entity = StateEntity(
            name="session",
            format="@s{n}",
            created_by=["init"],
            consumed_by=["use"],
            invalidated_by=["close"],
        )
        assert entity.name == "session"

    def test_minimal_entity(self):
        """Should accept minimal entity with just name."""
        entity = StateEntity(name="minimal")
        assert entity.created_by == []


class TestArgument:
    """Tests for Argument model."""

    def test_valid_argument(self):
        """Should accept valid argument."""
        arg = Argument(
            name="url",
            type="string",
            required=True,
            description="Target URL",
        )
        assert arg.name == "url"

    def test_default_required(self):
        """Should default required to False."""
        arg = Argument(name="optional", type="string")
        assert arg.required is False


class TestFlag:
    """Tests for Flag model."""

    def test_valid_flag(self):
        """Should accept valid flag."""
        flag = Flag(
            name="--verbose",
            short="-v",
            type="bool",
            purpose="Enable verbose output",
        )
        assert flag.name == "--verbose"


class TestCommand:
    """Tests for Command model."""

    def test_valid_command(self):
        """Should accept valid command."""
        cmd = Command(
            syntax="tool run <file>",
            description="Run the tool",
            args=[Argument(name="file", type="string", required=True)],
            flags=[Flag(name="--verbose", type="bool")],
        )
        assert cmd.syntax == "tool run <file>"

    def test_minimal_command(self):
        """Should accept command with just syntax."""
        cmd = Command(syntax="tool help")
        assert cmd.args == []
        assert cmd.flags == []


class TestWorkflow:
    """Tests for Workflow model."""

    def test_valid_workflow(self):
        """Should accept valid workflow."""
        workflow = Workflow(
            description="Test workflow",
            invariants=["rule 1"],
            steps=[
                WorkflowStep(cmd="step 1"),
                WorkflowStep(cmd="step 2", optional=True),
            ],
            example="example code",
        )
        assert len(workflow.steps) == 2


class TestSkill:
    """Tests for Skill model."""

    def test_valid_minimal_skill(self):
        """Should accept minimal skill."""
        skill = Skill(
            meta=Meta(name="test", version="00000000", type="knowledge"),
        )
        assert skill.meta.name == "test"

    def test_valid_full_skill(self):
        """Should accept full skill."""
        skill = Skill(
            meta=Meta(name="test", version="00000000", type="cli"),
            triggers=Triggers(keywords=["test"]),
            constraints=Constraints(never=["bad thing"]),
            decisions=[Decision(when="x", then="y")],
            state=State(entities=[StateEntity(name="session")]),
            commands={"run": Command(syntax="run")},
        )
        assert skill.commands is not None

    def test_to_dict(self, minimal_skill_dict):
        """Should convert to dict excluding None values."""
        skill = Skill.from_dict(minimal_skill_dict)
        d = skill.to_dict()

        assert "meta" in d
        assert "triggers" not in d  # None value excluded

    def test_from_dict(self, minimal_skill_dict):
        """Should create from dict."""
        skill = Skill.from_dict(minimal_skill_dict)

        assert skill.meta.name == "test-skill"
