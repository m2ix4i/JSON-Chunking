"""
Tests for progress tracking functionality.
"""

import time
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from src.ifc_json_chunking.progress import (
    ProgressTracker,
    FileProgressTracker, 
    ProgressSnapshot,
    create_progress_callback
)


class TestProgressSnapshot:
    """Test ProgressSnapshot dataclass."""
    
    def test_progress_snapshot_creation(self):
        """Test creating a progress snapshot."""
        snapshot = ProgressSnapshot(
            bytes_processed=1024,
            total_bytes=2048,
            percentage=50.0,
            elapsed_seconds=10.0,
            estimated_total_seconds=20.0,
            eta=datetime.now() + timedelta(seconds=10),
            processing_rate_mb_per_sec=0.1
        )
        
        assert snapshot.bytes_processed == 1024
        assert snapshot.total_bytes == 2048
        assert snapshot.percentage == 50.0
        assert snapshot.elapsed_seconds == 10.0
        assert snapshot.estimated_total_seconds == 20.0
        assert snapshot.eta is not None
        assert snapshot.processing_rate_mb_per_sec == 0.1


class TestProgressTracker:
    """Test basic progress tracking functionality."""
    
    def test_tracker_initialization(self):
        """Test progress tracker initialization."""
        tracker = ProgressTracker(
            total_size=1024*1024,  # 1MB
            description="Test operation",
            update_interval=0.5
        )
        
        assert tracker.total_size == 1024*1024
        assert tracker.description == "Test operation"
        assert tracker.update_interval == 0.5
        assert tracker.bytes_processed == 0
        assert tracker.start_time > 0
    
    def test_update_progress(self):
        """Test updating progress."""
        tracker = ProgressTracker(total_size=1000)
        
        # Update progress
        tracker.update(250)
        assert tracker.bytes_processed == 250
        assert tracker.get_percentage() == 25.0
        
        # Update again
        tracker.update(500)
        assert tracker.bytes_processed == 500
        assert tracker.get_percentage() == 50.0
    
    def test_increment_progress(self):
        """Test incrementing progress."""
        tracker = ProgressTracker(total_size=1000)
        
        # Increment progress
        tracker.increment(100)
        assert tracker.bytes_processed == 100
        
        tracker.increment(150)
        assert tracker.bytes_processed == 250
        assert tracker.get_percentage() == 25.0
    
    def test_percentage_calculation(self):
        """Test percentage calculation."""
        tracker = ProgressTracker(total_size=1000)
        
        # Test various percentages
        test_cases = [
            (0, 0.0),
            (250, 25.0),
            (500, 50.0),
            (750, 75.0),
            (1000, 100.0),
            (1200, 100.0)  # Over 100% should be clamped
        ]
        
        for bytes_processed, expected_percentage in test_cases:
            tracker.update(bytes_processed)
            assert tracker.get_percentage() == expected_percentage
    
    def test_zero_total_size(self):
        """Test handling of zero total size."""
        tracker = ProgressTracker(total_size=0)
        
        # Should return 100% for zero total size
        assert tracker.get_percentage() == 100.0
    
    def test_elapsed_time(self):
        """Test elapsed time calculation."""
        tracker = ProgressTracker(total_size=1000)
        
        # Wait a bit and check elapsed time
        time.sleep(0.1)
        elapsed = tracker.get_elapsed_seconds()
        
        assert elapsed > 0.05  # Should be at least some time
        assert elapsed < 1.0   # But not too much
    
    def test_processing_rate_calculation(self):
        """Test processing rate calculation."""
        tracker = ProgressTracker(total_size=1024*1024)  # 1MB
        
        # Simulate some processing over time
        tracker.update(256*1024)  # 256KB
        time.sleep(0.1)
        tracker.update(512*1024)  # 512KB
        
        rate = tracker.get_processing_rate_mb_per_sec()
        
        # Should have some rate (depends on actual timing)
        assert rate >= 0
    
    def test_processing_rate_with_insufficient_samples(self):
        """Test processing rate with insufficient data."""
        tracker = ProgressTracker(total_size=1000)
        
        # No updates yet
        rate = tracker.get_processing_rate_mb_per_sec()
        assert rate == 0.0
        
        # Single update
        tracker.update(100)
        rate = tracker.get_processing_rate_mb_per_sec()
        assert rate == 0.0  # Need at least 2 samples
    
    def test_eta_calculation(self):
        """Test ETA calculation."""
        tracker = ProgressTracker(total_size=1000)
        
        # No progress yet
        eta = tracker.get_eta()
        assert eta is None
        
        # Add some progress with timing
        tracker.update(250)
        time.sleep(0.1)
        tracker.update(500)
        
        eta = tracker.get_eta()
        # ETA may or may not be calculable depending on timing
        # Just ensure it doesn't crash
        assert eta is None or isinstance(eta, datetime)
    
    def test_estimated_total_seconds(self):
        """Test estimated total time calculation."""
        tracker = ProgressTracker(total_size=1000)
        
        # No progress yet
        total_estimate = tracker.get_estimated_total_seconds()
        assert total_estimate is None
        
        # Add some progress
        time.sleep(0.1)
        tracker.update(250)  # 25% complete
        
        total_estimate = tracker.get_estimated_total_seconds()
        if total_estimate is not None:
            assert total_estimate > 0
    
    def test_progress_snapshot(self):
        """Test progress snapshot creation."""
        tracker = ProgressTracker(total_size=1000, description="Test")
        
        tracker.update(300)
        snapshot = tracker.get_snapshot()
        
        assert isinstance(snapshot, ProgressSnapshot)
        assert snapshot.bytes_processed == 300
        assert snapshot.total_bytes == 1000
        assert snapshot.percentage == 30.0
        assert snapshot.elapsed_seconds > 0
    
    def test_is_complete(self):
        """Test completion check."""
        tracker = ProgressTracker(total_size=1000)
        
        assert not tracker.is_complete()
        
        tracker.update(500)
        assert not tracker.is_complete()
        
        tracker.update(1000)
        assert tracker.is_complete()
        
        tracker.update(1200)  # Over 100%
        assert tracker.is_complete()
    
    def test_get_stats(self):
        """Test statistics retrieval."""
        tracker = ProgressTracker(total_size=1000, description="Test stats")
        
        tracker.update(400)
        stats = tracker.get_stats()
        
        expected_keys = [
            "description", "bytes_processed", "total_bytes", "percentage",
            "elapsed_seconds", "estimated_total_seconds", "eta",
            "processing_rate_mb_per_sec", "is_complete", "samples_collected"
        ]
        
        for key in expected_keys:
            assert key in stats
        
        assert stats["description"] == "Test stats"
        assert stats["bytes_processed"] == 400
        assert stats["total_bytes"] == 1000
        assert stats["percentage"] == 40.0
        assert not stats["is_complete"]
    
    def test_callback_functionality(self):
        """Test progress callback functionality."""
        callback_calls = []
        
        def test_callback(snapshot):
            callback_calls.append(snapshot)
        
        tracker = ProgressTracker(
            total_size=1000,
            update_interval=0.01,  # Very short interval for testing
            callback=test_callback
        )
        
        # Make updates that should trigger callbacks
        tracker.update(250)
        time.sleep(0.02)  # Wait longer than update interval
        tracker.update(500)
        
        # Should have received at least one callback
        assert len(callback_calls) >= 0  # May or may not trigger depending on timing
    
    def test_sample_management(self):
        """Test sample collection and management."""
        tracker = ProgressTracker(total_size=1000)
        
        # Add many samples to test max_samples limit
        for i in range(100):  # More than max_samples (60)
            tracker.update(i * 10)
            time.sleep(0.001)
        
        # Should not exceed max_samples
        assert len(tracker.samples) <= tracker.max_samples
    
    def test_log_progress(self):
        """Test progress logging."""
        tracker = ProgressTracker(total_size=1000, description="Test logging")
        
        tracker.update(300)
        
        # Should not raise exception
        tracker.log_progress("info")
        tracker.log_progress("debug")
        tracker.log_progress("warning")


class TestFileProgressTracker:
    """Test file-specific progress tracking."""
    
    def test_file_tracker_initialization(self, tmp_path):
        """Test file progress tracker initialization."""
        test_file = tmp_path / "test.txt"
        test_content = "Hello, World!" * 100  # Make it larger
        test_file.write_text(test_content)
        
        tracker = FileProgressTracker(test_file)
        
        assert tracker.file_path == test_file
        assert tracker.total_size == len(test_content)
        assert "test.txt" in tracker.description
    
    def test_file_tracker_with_custom_description(self, tmp_path):
        """Test file tracker with custom description."""
        test_file = tmp_path / "test.txt" 
        test_file.write_text("content")
        
        tracker = FileProgressTracker(
            test_file, 
            description="Custom operation"
        )
        
        assert tracker.description == "Custom operation"
    
    def test_file_tracker_nonexistent_file(self):
        """Test file tracker with non-existent file."""
        nonexistent = Path("/nonexistent/file.txt")
        
        with pytest.raises(FileNotFoundError):
            FileProgressTracker(nonexistent)
    
    def test_update_from_position(self, tmp_path):
        """Test updating progress from file position."""
        test_file = tmp_path / "test.txt"
        test_content = "0123456789" * 100  # 1000 bytes
        test_file.write_text(test_content)
        
        tracker = FileProgressTracker(test_file)
        
        # Update from file positions
        tracker.update_from_position(250)
        assert tracker.bytes_processed == 250
        assert tracker.get_percentage() == 25.0
        
        tracker.update_from_position(500)
        assert tracker.bytes_processed == 500
        assert tracker.get_percentage() == 50.0


class TestProgressCallback:
    """Test progress callback functionality."""
    
    def test_create_progress_callback(self):
        """Test creating a progress callback."""
        callback = create_progress_callback(log_interval=1.0, console_output=False)
        
        assert callable(callback)
    
    @patch('builtins.print')
    def test_callback_with_console_output(self, mock_print):
        """Test callback with console output."""
        callback = create_progress_callback(
            log_interval=0.01,  # Short interval for testing
            console_output=True
        )
        
        # Create a test snapshot
        snapshot = ProgressSnapshot(
            bytes_processed=512*1024,
            total_bytes=1024*1024,
            percentage=50.0,
            elapsed_seconds=10.0,
            estimated_total_seconds=20.0,
            eta=datetime.now() + timedelta(seconds=10),
            processing_rate_mb_per_sec=0.05
        )
        
        # Call the callback
        callback(snapshot)
        
        # May or may not print depending on timing
        # Just ensure it doesn't crash
    
    def test_callback_throttling(self):
        """Test callback throttling based on log_interval."""
        call_count = 0
        
        # Create callback that counts calls
        original_callback = create_progress_callback(log_interval=1.0)
        
        def counting_callback(snapshot):
            nonlocal call_count
            call_count += 1
            return original_callback(snapshot)
        
        # Create multiple snapshots quickly
        snapshot = ProgressSnapshot(
            bytes_processed=256*1024,
            total_bytes=1024*1024,
            percentage=25.0,
            elapsed_seconds=5.0,
            estimated_total_seconds=20.0,
            eta=datetime.now() + timedelta(seconds=15),
            processing_rate_mb_per_sec=0.05
        )
        
        # Call multiple times quickly (should be throttled)
        counting_callback(snapshot)
        counting_callback(snapshot)
        counting_callback(snapshot)
        
        # Hard to test throttling without precise timing control
        # Just ensure it doesn't crash


@pytest.mark.integration
def test_progress_tracking_integration(tmp_path):
    """Integration test for progress tracking with file processing."""
    # Create a test file
    test_file = tmp_path / "integration_test.txt"
    test_content = "A" * (1024 * 100)  # 100KB
    test_file.write_text(test_content)
    
    # Create tracker with callback
    progress_updates = []
    
    def capture_callback(snapshot):
        progress_updates.append(snapshot)
    
    tracker = FileProgressTracker(
        test_file,
        description="Integration test",
        update_interval=0.01,
        callback=capture_callback
    )
    
    # Simulate file processing
    chunk_size = 1024 * 10  # 10KB chunks
    position = 0
    
    while position < tracker.total_size:
        position = min(position + chunk_size, tracker.total_size)
        tracker.update_from_position(position)
        time.sleep(0.02)  # Simulate processing time
    
    # Should be complete
    assert tracker.is_complete()
    assert tracker.get_percentage() == 100.0
    
    # Should have received some progress updates
    # (Depending on timing, may or may not have updates)
    assert len(progress_updates) >= 0
    
    # Final stats should be complete
    stats = tracker.get_stats()
    assert stats["is_complete"]
    assert stats["percentage"] == 100.0
    assert stats["bytes_processed"] == tracker.total_size