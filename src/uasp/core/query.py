"""Query engine for UASP skills (Section 6)."""

from __future__ import annotations

import fnmatch
import re
from dataclasses import dataclass, field
from typing import Any

from uasp.core.errors import PathNotFoundError


@dataclass
class QueryResult:
    """Result of a skill query."""

    skill: str
    path: str
    found: bool
    value: Any = None
    filters: dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Convert result to dictionary format."""
        result: dict[str, Any] = {
            "skill": self.skill,
            "path": self.path,
            "found": self.found,
        }
        if self.found:
            result["value"] = self.value
        if self.filters:
            result["filters"] = self.filters
        return result


class QueryEngine:
    """
    Query engine for UASP skills.

    Supports path-based queries with optional filters:
        skill_name:path.to.section?filter=value

    Query Examples:
        - stripe:constraints.never
        - stripe:decisions?when=*Charges*
        - agent-browser:commands.click
        - agent-browser:state.entities?name=ref
    """

    @staticmethod
    def parse_query_string(query: str) -> tuple[str, str, dict[str, str]]:
        """
        Parse a query string into components.

        Format: skill_name:path[?filter=value&filter2=value2]

        Args:
            query: Full query string

        Returns:
            Tuple of (skill_name, path, filters_dict)

        Example:
            >>> QueryEngine.parse_query_string("stripe:decisions?when=*Charges*")
            ('stripe', 'decisions', {'when': '*Charges*'})
        """
        # Split skill name and rest
        if ":" not in query:
            raise ValueError(f"Invalid query format, expected 'skill:path': {query}")

        parts = query.split(":", 1)
        skill_name = parts[0]
        path_and_filters = parts[1]

        # Split path and filters
        filters: dict[str, str] = {}
        if "?" in path_and_filters:
            path, filter_str = path_and_filters.split("?", 1)
            # Parse filters
            for pair in filter_str.split("&"):
                if "=" in pair:
                    key, value = pair.split("=", 1)
                    filters[key] = value
        else:
            path = path_and_filters

        return skill_name, path, filters

    @staticmethod
    def query(
        skill_dict: dict[str, Any],
        path: str,
        filters: dict[str, str] | None = None,
        skill_name: str = "",
    ) -> QueryResult:
        """
        Query a skill definition by path.

        Args:
            skill_dict: Parsed skill dictionary
            path: Dot-separated path (e.g., "commands.click")
            filters: Optional key-value filters for list items
            skill_name: Skill name for result metadata

        Returns:
            QueryResult with found status and value

        Example:
            >>> skill = {"commands": {"click": {"syntax": "click @ref"}}}
            >>> result = QueryEngine.query(skill, "commands.click")
            >>> result.value
            {'syntax': 'click @ref'}
        """
        if not skill_name:
            skill_name = skill_dict.get("meta", {}).get("name", "unknown")

        segments = path.split(".") if path else []
        current: Any = skill_dict

        # Traverse the path
        for i, segment in enumerate(segments):
            if isinstance(current, dict):
                if segment in current:
                    current = current[segment]
                else:
                    return QueryResult(
                        skill=skill_name,
                        path=path,
                        found=False,
                        filters=filters or {},
                    )
            elif isinstance(current, list):
                # Search list by name or id
                matches = [
                    x
                    for x in current
                    if isinstance(x, dict)
                    and (x.get("name") == segment or x.get("id") == segment)
                ]
                if len(matches) == 1:
                    current = matches[0]
                elif len(matches) > 1:
                    current = matches
                else:
                    # Try numeric index
                    try:
                        idx = int(segment)
                        if 0 <= idx < len(current):
                            current = current[idx]
                        else:
                            return QueryResult(
                                skill=skill_name,
                                path=path,
                                found=False,
                                filters=filters or {},
                            )
                    except ValueError:
                        return QueryResult(
                            skill=skill_name,
                            path=path,
                            found=False,
                            filters=filters or {},
                        )
            else:
                # Can't traverse further
                return QueryResult(
                    skill=skill_name,
                    path=path,
                    found=False,
                    filters=filters or {},
                )

        # Apply filters if we have a list result
        if filters and isinstance(current, list):
            current = QueryEngine._apply_filters(current, filters)

        return QueryResult(
            skill=skill_name,
            path=path,
            found=True,
            value=current,
            filters=filters or {},
        )

    @staticmethod
    def _apply_filters(
        items: list[Any], filters: dict[str, str]
    ) -> list[Any]:
        """
        Apply filters to a list of items.

        Supports glob patterns with * wildcard for string matching.

        Args:
            items: List of dictionaries to filter
            filters: Key-value pairs to match

        Returns:
            Filtered list
        """
        result = items

        for key, pattern in filters.items():
            result = [
                item
                for item in result
                if isinstance(item, dict)
                and QueryEngine._matches_pattern(item.get(key, ""), pattern)
            ]

        return result

    @staticmethod
    def _matches_pattern(value: Any, pattern: str) -> bool:
        """
        Check if a value matches a glob pattern.

        Args:
            value: Value to check (will be converted to string)
            pattern: Glob pattern with * wildcard

        Returns:
            True if matches
        """
        if not isinstance(value, str):
            value = str(value) if value is not None else ""

        # Use fnmatch for glob-style matching (case-insensitive)
        return fnmatch.fnmatch(value.lower(), pattern.lower())

    @staticmethod
    def query_or_raise(
        skill_dict: dict[str, Any],
        path: str,
        filters: dict[str, str] | None = None,
        skill_name: str = "",
    ) -> Any:
        """
        Query a skill and raise an error if not found.

        Args:
            skill_dict: Parsed skill dictionary
            path: Dot-separated path
            filters: Optional filters
            skill_name: Skill name for error messages

        Returns:
            The queried value

        Raises:
            PathNotFoundError: If the path doesn't exist
        """
        result = QueryEngine.query(skill_dict, path, filters, skill_name)
        if not result.found:
            raise PathNotFoundError(path, skill_name or "unknown")
        return result.value

    @staticmethod
    def list_paths(skill_dict: dict[str, Any], prefix: str = "") -> list[str]:
        """
        List all queryable paths in a skill.

        Args:
            skill_dict: Parsed skill dictionary
            prefix: Path prefix for recursion

        Returns:
            List of all valid query paths
        """
        paths: list[str] = []

        if isinstance(skill_dict, dict):
            for key, value in skill_dict.items():
                current_path = f"{prefix}.{key}" if prefix else key
                paths.append(current_path)

                if isinstance(value, dict):
                    paths.extend(QueryEngine.list_paths(value, current_path))
                elif isinstance(value, list) and value:
                    # For lists, show structure of first item if it's a dict
                    if isinstance(value[0], dict):
                        paths.extend(QueryEngine.list_paths(value[0], f"{current_path}[0]"))

        return paths


def query_skill(
    skill_dict: dict[str, Any],
    path: str,
    filters: dict[str, str] | None = None,
) -> dict[str, Any]:
    """
    Query a skill definition by path.

    This is the simple function interface from Section 6.4 of the spec.

    Args:
        skill_dict: Parsed skill dictionary
        path: Dot-separated path (e.g., "commands.click")
        filters: Optional key-value filters

    Returns:
        Query result dictionary with 'found', 'path', and optionally 'value'
    """
    result = QueryEngine.query(skill_dict, path, filters)
    return result.to_dict()
