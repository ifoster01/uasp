"""Pydantic models for UASP skill definitions."""

from __future__ import annotations

import re
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Preference(BaseModel):
    """Soft preference with context."""

    model_config = ConfigDict(extra="forbid")

    use: str = Field(..., description="Preferred approach")
    over: str = Field(..., description="Alternative to avoid")
    when: str | None = Field(None, description="Context when preference applies")


class Decision(BaseModel):
    """Conditional decision rule."""

    model_config = ConfigDict(extra="forbid")

    when: str = Field(..., description="Condition that triggers this decision")
    then: str = Field(..., description="Action or approach to take")
    ref: str | None = Field(None, description="Reference to source or documentation")


class StateEntity(BaseModel):
    """State entity with lifecycle rules."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., description="State entity identifier")
    format: str | None = Field(None, description="Format pattern (e.g., '@e{n}')")
    created_by: list[str] = Field(default_factory=list, description="Commands that create this state")
    consumed_by: list[str] = Field(default_factory=list, description="Commands that use this state")
    invalidated_by: list[str] = Field(
        default_factory=list, description="Conditions that invalidate this state"
    )
    properties: list[str] = Field(
        default_factory=list, description="Properties this state entity contains"
    )
    persisted_by: list[str] = Field(
        default_factory=list, description="Commands that persist this state"
    )
    restored_by: list[str] = Field(
        default_factory=list, description="Commands that restore this state"
    )


class Argument(BaseModel):
    """Command argument definition."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., description="Argument name")
    type: str = Field(..., description="Argument type (string, int, bool, ref, enum)")
    required: bool = Field(False, description="Whether argument is required")
    default: Any = Field(None, description="Default value")
    description: str | None = Field(None, description="Argument description")
    values: list[str] | None = Field(None, description="Allowed values for enum types")


class Flag(BaseModel):
    """Command flag definition."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., description="Flag name (e.g., '--verbose')")
    short: str | None = Field(None, description="Short form (e.g., '-v')")
    long: str | None = Field(None, description="Long form (e.g., '--verbose')")
    type: str = Field(..., description="Flag type (string, int, bool)")
    default: Any = Field(None, description="Default value")
    purpose: str | None = Field(None, description="What this flag does")
    env: str | None = Field(None, description="Environment variable that sets this flag")


class CommandVariant(BaseModel):
    """Command syntax variant."""

    model_config = ConfigDict(extra="forbid")

    syntax: str = Field(..., description="Variant syntax")
    purpose: str | None = Field(None, description="Purpose of this variant")


class Command(BaseModel):
    """Executable command definition."""

    model_config = ConfigDict(extra="forbid")

    syntax: str = Field(..., description="Command syntax template")
    description: str | None = Field(None, description="Command description")
    aliases: list[str] = Field(default_factory=list, description="Command aliases")
    args: list[Argument] = Field(default_factory=list, description="Command arguments")
    flags: list[Flag] = Field(default_factory=list, description="Command flags")
    returns: str | None = Field(None, description="What the command returns")
    requires: list[str] = Field(
        default_factory=list, description="Preconditions (state, prior commands)"
    )
    creates: list[str] = Field(
        default_factory=list, description="State entities this command creates"
    )
    invalidates: list[str] = Field(
        default_factory=list, description="State entities this command invalidates"
    )
    note: str | None = Field(None, description="Important usage note")
    variants: list[CommandVariant] = Field(default_factory=list, description="Syntax variants")
    example: str | None = Field(None, description="Example usage")


class WorkflowStep(BaseModel):
    """Step in a workflow."""

    model_config = ConfigDict(extra="forbid")

    cmd: str = Field(..., description="Command or action to execute")
    note: str | None = Field(None, description="Explanation of this step")
    optional: bool = Field(False, description="Whether this step is optional")


class Workflow(BaseModel):
    """Multi-step workflow definition."""

    model_config = ConfigDict(extra="forbid")

    description: str = Field(..., description="What this workflow accomplishes")
    invariants: list[str] = Field(
        default_factory=list, description="Rules that must hold throughout"
    )
    steps: list[WorkflowStep] = Field(..., description="Workflow steps")
    example: str | None = Field(None, description="Concrete example of the workflow")


class ReferenceEntry(BaseModel):
    """Queryable syntax reference entry."""

    model_config = ConfigDict(extra="allow")  # Allow additional string properties

    syntax: str | None = Field(None, description="Syntax pattern with placeholders")
    example: str | None = Field(None, description="Concrete example")
    notes: str | None = Field(None, description="Clarifications")
    values: list[str] | None = Field(None, description="Allowed values")


class Template(BaseModel):
    """Executable script template."""

    model_config = ConfigDict(extra="forbid")

    description: str = Field(..., description="Template description")
    usage: str | None = Field(None, description="How to use the template")
    args: list[Argument] = Field(default_factory=list, description="Template arguments")
    path: str | None = Field(None, description="Path to template file")
    inline: str | None = Field(None, description="Inline template content")


class EnvironmentVar(BaseModel):
    """Environment variable definition."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., description="Variable name")
    purpose: str = Field(..., description="What it configures")
    default: str | None = Field(None, description="Default value")


class Source(BaseModel):
    """External documentation reference."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(..., description="Unique source identifier")
    url: str | None = Field(None, description="URL for web resources")
    path: str | None = Field(None, description="Path for local files")
    use_for: str | None = Field(None, description="When to consult this source")


class Meta(BaseModel):
    """Skill metadata."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(..., description="Unique skill identifier")
    version: str = Field(..., description="Content hash of the skill definition")
    type: Literal["knowledge", "cli", "api", "hybrid"] = Field(
        ..., description="Primary skill type"
    )
    description: str | None = Field(None, max_length=500, description="Brief description")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not re.match(r"^[a-z][a-z0-9-]*$", v):
            raise ValueError("Name must be lowercase with hyphens, starting with a letter")
        return v


class Triggers(BaseModel):
    """Skill activation triggers."""

    model_config = ConfigDict(extra="forbid")

    keywords: list[str] = Field(
        default_factory=list, description="Words that suggest this skill applies"
    )
    intents: list[str] = Field(
        default_factory=list, description="User intents this skill addresses"
    )
    file_patterns: list[str] = Field(
        default_factory=list, description="File patterns that activate this skill"
    )


class Constraints(BaseModel):
    """Hard rules that must always be followed."""

    model_config = ConfigDict(extra="forbid")

    never: list[str] = Field(default_factory=list, description="Actions that must never be taken")
    always: list[str] = Field(default_factory=list, description="Actions that must always be taken")
    prefer: list[Preference] = Field(
        default_factory=list, description="Preferred approaches over alternatives"
    )


class State(BaseModel):
    """State management section."""

    model_config = ConfigDict(extra="forbid")

    entities: list[StateEntity] = Field(default_factory=list, description="State entities")


class Skill(BaseModel):
    """Complete UASP skill definition."""

    model_config = ConfigDict(extra="forbid")

    meta: Meta = Field(..., description="Skill metadata")
    triggers: Triggers | None = Field(None, description="Skill activation triggers")
    constraints: Constraints | None = Field(None, description="Hard rules")
    decisions: list[Decision] | None = Field(None, description="Conditional decisions")
    state: State | None = Field(None, description="State management")
    commands: dict[str, Command] | None = Field(None, description="Command definitions")
    global_flags: list[Flag] | None = Field(None, description="Flags that apply to all commands")
    workflows: dict[str, Workflow] | None = Field(None, description="Multi-step workflows")
    reference: dict[str, ReferenceEntry] | None = Field(
        None, description="Queryable syntax reference"
    )
    templates: dict[str, Template] | None = Field(None, description="Script templates")
    environment: list[EnvironmentVar] | None = Field(
        None, description="Environment variable config"
    )
    sources: list[Source] | None = Field(None, description="External documentation references")

    def to_dict(self) -> dict[str, Any]:
        """Convert skill to dictionary, excluding None values."""
        return self.model_dump(exclude_none=True)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Skill":
        """Create a Skill from a dictionary."""
        return cls.model_validate(data)
