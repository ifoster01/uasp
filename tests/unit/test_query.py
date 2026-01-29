"""Tests for query engine."""

import pytest

from uasp.core.errors import PathNotFoundError
from uasp.core.query import QueryEngine, QueryResult, query_skill


class TestQueryEngine:
    """Tests for QueryEngine class."""

    def test_query_simple_path(self, knowledge_skill_dict):
        """Should query simple dot path."""
        result = QueryEngine.query(knowledge_skill_dict, "meta.name")
        assert result.found is True
        assert result.value == "knowledge-skill"

    def test_query_nested_path(self, knowledge_skill_dict):
        """Should query nested dot path."""
        result = QueryEngine.query(knowledge_skill_dict, "constraints.never")
        assert result.found is True
        assert "do bad things" in result.value

    def test_query_not_found(self, knowledge_skill_dict):
        """Should return found=False for missing path."""
        result = QueryEngine.query(knowledge_skill_dict, "nonexistent.path")
        assert result.found is False

    def test_query_list_by_name(self, cli_skill_dict):
        """Should query list items by name property."""
        result = QueryEngine.query(cli_skill_dict, "state.entities.session")
        assert result.found is True
        assert result.value["name"] == "session"

    def test_query_dict_key(self, cli_skill_dict):
        """Should query dict by key."""
        result = QueryEngine.query(cli_skill_dict, "commands.init")
        assert result.found is True
        assert result.value["syntax"] == "tool init [--config <path>]"

    def test_query_with_filters(self, knowledge_skill_dict):
        """Should filter list results."""
        result = QueryEngine.query(
            knowledge_skill_dict,
            "decisions",
            {"when": "*condition A*"},
        )
        assert result.found is True
        assert len(result.value) == 1
        assert result.value[0]["when"] == "condition A"

    def test_query_filter_glob(self, knowledge_skill_dict):
        """Should support glob patterns in filters."""
        result = QueryEngine.query(
            knowledge_skill_dict,
            "decisions",
            {"when": "*condition*"},
        )
        assert result.found is True
        assert len(result.value) == 2  # Both decisions match

    def test_query_or_raise_found(self, knowledge_skill_dict):
        """query_or_raise should return value when found."""
        value = QueryEngine.query_or_raise(knowledge_skill_dict, "meta.name")
        assert value == "knowledge-skill"

    def test_query_or_raise_not_found(self, knowledge_skill_dict):
        """query_or_raise should raise PathNotFoundError."""
        with pytest.raises(PathNotFoundError):
            QueryEngine.query_or_raise(knowledge_skill_dict, "nonexistent")

    def test_list_paths(self, minimal_skill_dict):
        """Should list all queryable paths."""
        paths = QueryEngine.list_paths(minimal_skill_dict)
        assert "meta" in paths
        assert "meta.name" in paths
        assert "meta.version" in paths


class TestParseQueryString:
    """Tests for parse_query_string function."""

    def test_simple_query(self):
        """Should parse simple query string."""
        skill, path, filters = QueryEngine.parse_query_string("stripe:constraints.never")
        assert skill == "stripe"
        assert path == "constraints.never"
        assert filters == {}

    def test_query_with_filter(self):
        """Should parse query with filter."""
        skill, path, filters = QueryEngine.parse_query_string("stripe:decisions?when=*Charges*")
        assert skill == "stripe"
        assert path == "decisions"
        assert filters == {"when": "*Charges*"}

    def test_query_multiple_filters(self):
        """Should parse query with multiple filters."""
        skill, path, filters = QueryEngine.parse_query_string("skill:path?a=1&b=2")
        assert filters == {"a": "1", "b": "2"}

    def test_invalid_format(self):
        """Should raise ValueError for invalid format."""
        with pytest.raises(ValueError):
            QueryEngine.parse_query_string("no-colon")


class TestQueryResult:
    """Tests for QueryResult class."""

    def test_to_dict(self):
        """Should convert to dictionary."""
        result = QueryResult(
            skill="test",
            path="meta.name",
            found=True,
            value="test-skill",
        )
        d = result.to_dict()
        assert d["skill"] == "test"
        assert d["path"] == "meta.name"
        assert d["found"] is True
        assert d["value"] == "test-skill"

    def test_to_dict_not_found(self):
        """Should exclude value when not found."""
        result = QueryResult(
            skill="test",
            path="missing",
            found=False,
        )
        d = result.to_dict()
        assert "value" not in d


class TestQuerySkillFunction:
    """Tests for query_skill convenience function."""

    def test_returns_dict(self, knowledge_skill_dict):
        """Should return dictionary result."""
        result = query_skill(knowledge_skill_dict, "meta.name")
        assert isinstance(result, dict)
        assert result["found"] is True
        assert result["value"] == "knowledge-skill"
