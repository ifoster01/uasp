"""Version hash calculation for UASP skills (Section 3.3)."""

from __future__ import annotations

import hashlib
import json
from typing import Any


def calculate_version(skill_dict: dict[str, Any]) -> str:
    """
    Calculate the version hash of a skill definition.

    The version is a truncated SHA-256 hash of the normalized skill content,
    excluding the version field itself.

    Args:
        skill_dict: The parsed skill definition dictionary

    Returns:
        8-character hexadecimal hash string

    Example:
        >>> skill = {"meta": {"name": "test", "version": "00000000", "type": "knowledge"}}
        >>> calculate_version(skill)
        'a1b2c3d4'
    """
    # Create a copy without the version field
    skill_copy = _deep_copy_without_version(skill_dict)

    # Normalize to JSON with sorted keys for deterministic output
    normalized = json.dumps(skill_copy, sort_keys=True, separators=(",", ":"))

    # Calculate SHA-256 hash and truncate to 8 characters
    full_hash = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    return full_hash[:8]


def _deep_copy_without_version(skill_dict: dict[str, Any]) -> dict[str, Any]:
    """
    Create a deep copy of the skill dict with the version field removed from meta.

    Args:
        skill_dict: The skill dictionary to copy

    Returns:
        Copy of skill_dict with meta.version removed
    """
    result: dict[str, Any] = {}

    for key, value in skill_dict.items():
        if key == "meta":
            # Copy meta but exclude version
            result["meta"] = {k: v for k, v in value.items() if k != "version"}
        else:
            # Deep copy other values
            result[key] = _deep_copy_value(value)

    return result


def _deep_copy_value(value: Any) -> Any:
    """Create a deep copy of a value."""
    if isinstance(value, dict):
        return {k: _deep_copy_value(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [_deep_copy_value(item) for item in value]
    else:
        return value


def verify_version(skill_dict: dict[str, Any]) -> tuple[bool, str, str]:
    """
    Verify that a skill's version hash is correct.

    Args:
        skill_dict: The parsed skill definition dictionary

    Returns:
        Tuple of (is_valid, stored_version, calculated_version)
    """
    stored = skill_dict.get("meta", {}).get("version", "")
    calculated = calculate_version(skill_dict)
    return (stored == calculated, stored, calculated)


def update_version(skill_dict: dict[str, Any]) -> dict[str, Any]:
    """
    Update a skill's version hash to the correct value.

    Args:
        skill_dict: The parsed skill definition dictionary

    Returns:
        New dictionary with updated version
    """
    result = _deep_copy_value(skill_dict)
    result["meta"]["version"] = calculate_version(skill_dict)
    return result
