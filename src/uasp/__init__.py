"""
UASP - Unified Agent Skills Protocol

A structured, machine-readable format for agent skills that enables
O(1) lookup of specific information and supports all skill types.
"""

from uasp.core.loader import SkillLoader
from uasp.core.query import QueryEngine
from uasp.core.version import calculate_version
from uasp.models.skill import Skill
from uasp.runtime.executor import CommandExecutor
from uasp.runtime.skill_runtime import SkillRuntime
from uasp.runtime.state_manager import StateManager
from uasp.schema.validator import SchemaValidator

__version__ = "0.1.0"
__all__ = [
    "Skill",
    "SkillLoader",
    "SkillRuntime",
    "QueryEngine",
    "StateManager",
    "CommandExecutor",
    "SchemaValidator",
    "calculate_version",
]
