"""
Tests for the configuration management functionality.
"""

import pytest
import os
from pathlib import Path
from unittest.mock import patch

from ifc_json_chunking.config import Config


class TestConfig:
    """Test cases for Config class."""

    @pytest.mark.unit
    def test_default_config(self):
        """Test default configuration values."""
        config = Config()
        
        assert config.chunk_size_mb == 10
        assert config.max_chunks == 1000
        assert config.overlap_percentage == 0.1
        assert config.max_workers == 4
        assert config.timeout_seconds == 300
        assert config.log_level == "INFO"
        assert config.log_format == "json"
        assert config.environment == "development"
        assert config.debug is False

    @pytest.mark.unit
    def test_config_with_custom_values(self):
        """Test configuration with custom values."""
        config = Config(
            chunk_size_mb=20,
            max_chunks=500,
            overlap_percentage=0.2,
            max_workers=8,
            timeout_seconds=600,
            log_level="DEBUG",
            log_format="console",
            environment="production",
            debug=True
        )
        
        assert config.chunk_size_mb == 20
        assert config.max_chunks == 500
        assert config.overlap_percentage == 0.2
        assert config.max_workers == 8
        assert config.timeout_seconds == 600
        assert config.log_level == "DEBUG"
        assert config.log_format == "console"
        assert config.environment == "production"
        assert config.debug is True

    @pytest.mark.unit
    def test_config_from_environment_variables(self):
        """Test configuration loading from environment variables."""
        env_vars = {
            "CHUNK_SIZE_MB": "15",
            "MAX_CHUNKS": "2000",
            "OVERLAP_PERCENTAGE": "0.15",
            "MAX_WORKERS": "6",
            "TIMEOUT_SECONDS": "450",
            "LOG_LEVEL": "WARNING",
            "LOG_FORMAT": "console",
            "ENVIRONMENT": "staging",
            "DEBUG": "true"
        }
        
        with patch.dict(os.environ, env_vars):
            config = Config()
            
            assert config.chunk_size_mb == 15
            assert config.max_chunks == 2000
            assert config.overlap_percentage == 0.15
            assert config.max_workers == 6
            assert config.timeout_seconds == 450
            assert config.log_level == "WARNING"
            assert config.log_format == "console"
            assert config.environment == "staging"
            assert config.debug is True

    @pytest.mark.unit
    def test_config_validation_positive_values(self):
        """Test configuration validation for positive values."""
        # These should not raise exceptions
        Config(chunk_size_mb=1, max_chunks=1, max_workers=1, timeout_seconds=1)

    @pytest.mark.unit
    def test_config_validation_chunk_size_error(self):
        """Test configuration validation for invalid chunk size."""
        with pytest.raises(ValueError, match="chunk_size_mb must be positive"):
            Config(chunk_size_mb=0)

    @pytest.mark.unit
    def test_config_validation_max_chunks_error(self):
        """Test configuration validation for invalid max chunks."""
        with pytest.raises(ValueError, match="max_chunks must be positive"):
            Config(max_chunks=-1)

    @pytest.mark.unit
    def test_config_validation_overlap_percentage_error(self):
        """Test configuration validation for invalid overlap percentage."""
        with pytest.raises(ValueError, match="overlap_percentage must be between 0 and 1"):
            Config(overlap_percentage=1.5)
        
        with pytest.raises(ValueError, match="overlap_percentage must be between 0 and 1"):
            Config(overlap_percentage=-0.1)

    @pytest.mark.unit
    def test_config_validation_max_workers_error(self):
        """Test configuration validation for invalid max workers."""
        with pytest.raises(ValueError, match="max_workers must be positive"):
            Config(max_workers=0)

    @pytest.mark.unit
    def test_config_validation_timeout_error(self):
        """Test configuration validation for invalid timeout."""
        with pytest.raises(ValueError, match="timeout_seconds must be positive"):
            Config(timeout_seconds=-1)

    @pytest.mark.unit
    def test_config_to_dict(self):
        """Test configuration conversion to dictionary."""
        config = Config(
            chunk_size_mb=5,
            max_chunks=100,
            log_level="DEBUG",
            environment="test"
        )
        
        config_dict = config.to_dict()
        
        assert isinstance(config_dict, dict)
        assert config_dict["chunk_size_mb"] == 5
        assert config_dict["max_chunks"] == 100
        assert config_dict["log_level"] == "DEBUG"
        assert config_dict["environment"] == "test"
        assert "output_directory" in config_dict
        assert "temp_directory" in config_dict

    @pytest.mark.unit
    def test_config_string_representation(self):
        """Test string representation of configuration."""
        config = Config(environment="test", chunk_size_mb=25)
        
        str_repr = str(config)
        assert "Config" in str_repr
        assert "environment=test" in str_repr
        assert "chunk_size_mb=25" in str_repr

    @pytest.mark.unit
    def test_config_directories_created(self, tmp_path: Path):
        """Test that configuration creates required directories."""
        output_dir = tmp_path / "output"
        temp_dir = tmp_path / "temp"
        
        config = Config(
            output_directory=output_dir,
            temp_directory=temp_dir
        )
        
        assert output_dir.exists()
        assert temp_dir.exists()
        assert output_dir.is_dir()
        assert temp_dir.is_dir()

    @pytest.mark.unit
    def test_config_from_file_placeholder(self, tmp_path: Path):
        """Test configuration loading from file (placeholder)."""
        config_file = tmp_path / "config.json"
        config_file.write_text('{"chunk_size_mb": 30}')
        
        # Currently returns default config - this will be expanded
        config = Config.from_file(config_file)
        assert isinstance(config, Config)

    @pytest.mark.unit
    def test_config_from_nonexistent_file(self, tmp_path: Path):
        """Test configuration loading from non-existent file."""
        config_file = tmp_path / "nonexistent_config.json"
        
        # Should return default config without error
        config = Config.from_file(config_file)
        assert isinstance(config, Config)

    @pytest.mark.unit
    def test_config_edge_case_values(self):
        """Test configuration with edge case values."""
        config = Config(
            overlap_percentage=0.0,  # Minimum valid value
            chunk_size_mb=1,         # Minimum chunk size
            max_workers=1            # Single worker
        )
        
        assert config.overlap_percentage == 0.0
        assert config.chunk_size_mb == 1
        assert config.max_workers == 1

    @pytest.mark.unit
    def test_config_maximum_overlap(self):
        """Test configuration with maximum overlap percentage."""
        config = Config(overlap_percentage=1.0)  # Maximum valid value
        assert config.overlap_percentage == 1.0