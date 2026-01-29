"""Tests for schema validation."""

import pytest

from uasp.schema.validator import SchemaValidationError, SchemaValidator, ValidationResult


class TestSchemaValidator:
    """Tests for SchemaValidator class."""

    def test_valid_minimal_skill(self, minimal_skill_dict):
        """Should validate a minimal valid skill."""
        result = SchemaValidator.validate(minimal_skill_dict)
        assert result.valid is True
        assert len(result.errors) == 0

    def test_valid_knowledge_skill(self, knowledge_skill_dict):
        """Should validate a full knowledge skill."""
        result = SchemaValidator.validate(knowledge_skill_dict)
        assert result.valid is True

    def test_valid_cli_skill(self, cli_skill_dict):
        """Should validate a full CLI skill."""
        result = SchemaValidator.validate(cli_skill_dict)
        assert result.valid is True

    def test_missing_meta(self):
        """Should fail when meta is missing."""
        result = SchemaValidator.validate({})
        assert result.valid is False
        assert any("meta" in str(e) for e in result.errors)

    def test_missing_required_meta_fields(self):
        """Should fail when required meta fields are missing."""
        result = SchemaValidator.validate({"meta": {}})
        assert result.valid is False

    def test_invalid_name_pattern(self):
        """Should fail when name doesn't match pattern."""
        skill = {
            "meta": {
                "name": "Invalid Name!",
                "version": "00000000",
                "type": "knowledge",
            }
        }
        result = SchemaValidator.validate(skill)
        assert result.valid is False

    def test_invalid_type(self):
        """Should fail when type is invalid."""
        skill = {
            "meta": {
                "name": "test-skill",
                "version": "00000000",
                "type": "invalid",
            }
        }
        result = SchemaValidator.validate(skill)
        assert result.valid is False

    def test_validate_or_raise_valid(self, minimal_skill_dict):
        """Should not raise for valid skill."""
        SchemaValidator.validate_or_raise(minimal_skill_dict)

    def test_validate_or_raise_invalid(self):
        """Should raise SchemaValidationError for invalid skill."""
        with pytest.raises(SchemaValidationError):
            SchemaValidator.validate_or_raise({})

    def test_get_best_error(self):
        """Should return the most relevant error message."""
        error = SchemaValidator.get_best_error({})
        assert error is not None
        assert "meta" in error.lower()

    def test_get_best_error_valid(self, minimal_skill_dict):
        """Should return None for valid skill."""
        error = SchemaValidator.get_best_error(minimal_skill_dict)
        assert error is None


class TestValidationResult:
    """Tests for ValidationResult class."""

    def test_bool_valid(self):
        """Should be truthy when valid."""
        result = ValidationResult(valid=True, errors=[])
        assert bool(result) is True

    def test_bool_invalid(self):
        """Should be falsy when invalid."""
        from uasp.schema.validator import ValidationError

        result = ValidationResult(
            valid=False, errors=[ValidationError("test error")]
        )
        assert bool(result) is False

    def test_str_valid(self):
        """Should return success message when valid."""
        result = ValidationResult(valid=True, errors=[])
        assert "passed" in str(result).lower()

    def test_str_invalid(self):
        """Should include error count when invalid."""
        from uasp.schema.validator import ValidationError

        result = ValidationResult(
            valid=False,
            errors=[ValidationError("error 1"), ValidationError("error 2")],
        )
        assert "2" in str(result)
