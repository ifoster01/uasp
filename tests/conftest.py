"""Pytest fixtures for UASP tests."""

from pathlib import Path

import pytest
import yaml


@pytest.fixture
def fixtures_dir() -> Path:
    """Return path to fixtures directory."""
    return Path(__file__).parent / "fixtures"


@pytest.fixture
def examples_dir() -> Path:
    """Return path to examples directory."""
    return Path(__file__).parent.parent / "examples"


@pytest.fixture
def minimal_skill_dict() -> dict:
    """Return a minimal valid skill dictionary."""
    return {
        "meta": {
            "name": "test-skill",
            "version": "00000000",
            "type": "knowledge",
            "description": "A test skill",
        }
    }


@pytest.fixture
def knowledge_skill_dict() -> dict:
    """Return a knowledge skill dictionary."""
    return {
        "meta": {
            "name": "knowledge-skill",
            "version": "00000000",
            "type": "knowledge",
            "description": "A knowledge skill for testing",
        },
        "triggers": {
            "keywords": ["test", "example"],
            "intents": ["test something", "run examples"],
        },
        "constraints": {
            "never": ["do bad things", "skip validation"],
            "always": ["validate input", "log errors"],
            "prefer": [
                {"use": "option A", "over": "option B", "when": "condition X"},
            ],
        },
        "decisions": [
            {"when": "condition A", "then": "do action A"},
            {"when": "condition B", "then": "do action B", "ref": "source:ref"},
        ],
        "sources": [
            {"id": "source:ref", "url": "https://example.com/docs"},
        ],
    }


@pytest.fixture
def cli_skill_dict() -> dict:
    """Return a CLI skill dictionary."""
    return {
        "meta": {
            "name": "cli-skill",
            "version": "00000000",
            "type": "cli",
            "description": "A CLI skill for testing",
        },
        "state": {
            "entities": [
                {
                    "name": "session",
                    "created_by": ["init"],
                    "invalidated_by": ["close"],
                },
                {
                    "name": "data",
                    "created_by": ["fetch"],
                    "consumed_by": ["process"],
                    "invalidated_by": ["clear"],
                },
            ],
        },
        "global_flags": [
            {"name": "--verbose", "short": "-v", "type": "bool", "purpose": "verbose output"},
            {"name": "--config", "type": "string", "purpose": "config file path"},
        ],
        "commands": {
            "init": {
                "syntax": "tool init [--config <path>]",
                "description": "Initialize the tool",
                "creates": ["session"],
            },
            "fetch": {
                "syntax": "tool fetch <url>",
                "args": [
                    {"name": "url", "type": "string", "required": True},
                ],
                "requires": ["session"],
                "creates": ["data"],
            },
            "process": {
                "syntax": "tool process",
                "requires": ["data"],
            },
            "close": {
                "syntax": "tool close",
                "invalidates": ["session", "data"],
            },
        },
        "workflows": {
            "basic": {
                "description": "Basic workflow",
                "steps": [
                    {"cmd": "init"},
                    {"cmd": "fetch <url>"},
                    {"cmd": "process"},
                    {"cmd": "close"},
                ],
            },
        },
    }


@pytest.fixture
def stripe_skill_path(examples_dir: Path) -> Path:
    """Return path to stripe best practices example."""
    return examples_dir / "stripe-best-practices.uasp.yaml"


@pytest.fixture
def mermaid_skill_path(examples_dir: Path) -> Path:
    """Return path to mermaid diagrams example."""
    return examples_dir / "mermaid-diagrams.uasp.yaml"


@pytest.fixture
def agent_browser_skill_path(examples_dir: Path) -> Path:
    """Return path to agent browser example."""
    return examples_dir / "agent-browser.uasp.yaml"
