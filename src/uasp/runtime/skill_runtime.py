"""Main runtime for managing UASP skills (Section 9.2)."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from uasp.core.errors import SkillNotFoundError
from uasp.core.loader import SkillLoader
from uasp.core.query import QueryEngine, QueryResult
from uasp.core.version import calculate_version
from uasp.models.skill import Skill
from uasp.runtime.executor import CommandExecutor
from uasp.runtime.state_manager import StateManager

logger = logging.getLogger(__name__)


class SkillRuntime:
    """
    Main runtime for managing UASP skills (Section 9.2).

    Handles:
    - Loading and caching skill definitions
    - Query routing and caching
    - State management per skill
    - Command execution
    """

    def __init__(self, strict_version: bool = False):
        """
        Initialize the skill runtime.

        Args:
            strict_version: If True, raise error on version mismatch
        """
        self.skills: dict[str, dict[str, Any]] = {}  # Raw skill dicts
        self.models: dict[str, Skill] = {}  # Pydantic models
        self.state: dict[str, StateManager] = {}  # State per skill
        self.cache: dict[str, QueryResult] = {}  # Query result cache
        self.loader = SkillLoader(strict_version=strict_version)

    def load_skill(self, path: Path | str) -> str:
        """
        Load a skill from a YAML file.

        Args:
            path: Path to the .uasp.yaml file

        Returns:
            The loaded skill's name

        Raises:
            FileNotFoundError: If file doesn't exist
            ValidationFailedError: If validation fails
        """
        skill_model = self.loader.load(path)
        skill_dict = skill_model.to_dict()
        name = skill_model.meta.name

        self.skills[name] = skill_dict
        self.models[name] = skill_model
        self.state[name] = StateManager(skill_dict)

        logger.info(f"Loaded skill: {name} (version: {skill_model.meta.version})")
        return name

    def load_skill_string(self, yaml_content: str) -> str:
        """
        Load a skill from a YAML string.

        Args:
            yaml_content: YAML content to parse

        Returns:
            The loaded skill's name
        """
        skill_model = self.loader.load_string(yaml_content)
        skill_dict = skill_model.to_dict()
        name = skill_model.meta.name

        self.skills[name] = skill_dict
        self.models[name] = skill_model
        self.state[name] = StateManager(skill_dict)

        logger.info(f"Loaded skill: {name} (version: {skill_model.meta.version})")
        return name

    def unload_skill(self, skill_name: str) -> bool:
        """
        Unload a skill from the runtime.

        Args:
            skill_name: Name of the skill to unload

        Returns:
            True if skill was unloaded, False if not found
        """
        if skill_name not in self.skills:
            return False

        del self.skills[skill_name]
        del self.models[skill_name]
        del self.state[skill_name]

        # Clear cached queries for this skill
        self.cache = {
            k: v for k, v in self.cache.items() if not k.startswith(f"{skill_name}:")
        }

        logger.info(f"Unloaded skill: {skill_name}")
        return True

    def get_skill(self, skill_name: str) -> dict[str, Any]:
        """
        Get a loaded skill's raw dictionary.

        Args:
            skill_name: Name of the skill

        Returns:
            Skill dictionary

        Raises:
            SkillNotFoundError: If skill is not loaded
        """
        if skill_name not in self.skills:
            raise SkillNotFoundError(skill_name)
        return self.skills[skill_name]

    def get_skill_model(self, skill_name: str) -> Skill:
        """
        Get a loaded skill's Pydantic model.

        Args:
            skill_name: Name of the skill

        Returns:
            Skill model

        Raises:
            SkillNotFoundError: If skill is not loaded
        """
        if skill_name not in self.models:
            raise SkillNotFoundError(skill_name)
        return self.models[skill_name]

    def query(
        self,
        skill_name: str,
        path: str,
        filters: dict[str, str] | None = None,
        use_cache: bool = True,
    ) -> QueryResult:
        """
        Query a skill by path.

        Args:
            skill_name: Name of the skill to query
            path: Dot-separated path
            filters: Optional key-value filters
            use_cache: Whether to use cached results

        Returns:
            QueryResult with found status and value

        Raises:
            SkillNotFoundError: If skill is not loaded
        """
        if skill_name not in self.skills:
            raise SkillNotFoundError(skill_name)

        # Build cache key
        filter_str = "&".join(f"{k}={v}" for k, v in sorted((filters or {}).items()))
        cache_key = f"{skill_name}:{path}?{filter_str}"

        if use_cache and cache_key in self.cache:
            logger.debug(f"Cache hit: {cache_key}")
            return self.cache[cache_key]

        # Execute query
        skill_dict = self.skills[skill_name]
        result = QueryEngine.query(skill_dict, path, filters, skill_name)

        # Cache result
        if use_cache:
            self.cache[cache_key] = result

        return result

    def query_string(
        self,
        query: str,
        use_cache: bool = True,
    ) -> QueryResult:
        """
        Query using the full query string format.

        Args:
            query: Full query string (e.g., "skill:path?filter=value")
            use_cache: Whether to use cached results

        Returns:
            QueryResult with found status and value
        """
        skill_name, path, filters = QueryEngine.parse_query_string(query)
        return self.query(skill_name, path, filters, use_cache)

    def execute(
        self,
        skill_name: str,
        command_path: str,
        args: dict[str, Any] | None = None,
        dry_run: bool = False,
        timeout: float | None = None,
    ):
        """
        Execute a command from a skill.

        Args:
            skill_name: Name of the skill
            command_path: Command path (e.g., "click", "record.start")
            args: Command arguments
            dry_run: If True, don't actually execute
            timeout: Execution timeout in seconds

        Returns:
            ExecutionResult

        Raises:
            SkillNotFoundError: If skill is not loaded
        """
        if skill_name not in self.skills:
            raise SkillNotFoundError(skill_name)

        executor = CommandExecutor(
            self.skills[skill_name],
            self.state[skill_name],
        )
        return executor.execute(command_path, args, dry_run, timeout)

    def get_state(self, skill_name: str) -> StateManager:
        """
        Get the state manager for a skill.

        Args:
            skill_name: Name of the skill

        Returns:
            StateManager for the skill

        Raises:
            SkillNotFoundError: If skill is not loaded
        """
        if skill_name not in self.state:
            raise SkillNotFoundError(skill_name)
        return self.state[skill_name]

    def get_manifest(self) -> dict[str, Any]:
        """
        Get a manifest of all loaded skills (Section 9.5).

        Returns:
            Manifest dictionary for session initialization
        """
        loaded_skills = []
        for name, skill in self.skills.items():
            meta = skill.get("meta", {})
            loaded_skills.append({
                "name": name,
                "version": meta.get("version", "unknown"),
                "type": meta.get("type", "unknown"),
                "description": meta.get("description", ""),
                "query_endpoint": f"skill:{name}",
            })

        return {
            "loaded_skills": loaded_skills,
            "query_syntax": "skill:<name>:<path>?<filters>",
        }

    def list_skills(self) -> list[str]:
        """
        List all loaded skill names.

        Returns:
            List of skill names
        """
        return list(self.skills.keys())

    def clear_cache(self) -> None:
        """Clear the query cache."""
        self.cache.clear()
        logger.debug("Query cache cleared")

    def reset_state(self, skill_name: str | None = None) -> None:
        """
        Reset state for one or all skills.

        Args:
            skill_name: Specific skill to reset, or None for all
        """
        if skill_name:
            if skill_name in self.state:
                self.state[skill_name].reset()
        else:
            for state_mgr in self.state.values():
                state_mgr.reset()
