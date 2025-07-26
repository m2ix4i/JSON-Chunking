"""
Progress tracking for file processing operations.

This module provides comprehensive progress tracking capabilities for
long-running file processing operations with ETA calculations.
"""

import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Callable, Dict, Optional

import structlog

logger = structlog.get_logger(__name__)


@dataclass
class ProgressSnapshot:
    """Snapshot of progress tracking state."""

    bytes_processed: int
    total_bytes: int
    percentage: float
    elapsed_seconds: float
    estimated_total_seconds: Optional[float]
    eta: Optional[datetime]
    processing_rate_mb_per_sec: float


class ProgressTracker:
    """
    Track progress of file processing operations with ETA calculations.
    
    Provides real-time progress updates, ETA calculations, and performance
    metrics for long-running file processing operations.
    """

    def __init__(
        self,
        total_size: int,
        description: str = "Processing",
        update_interval: float = 1.0,
        callback: Optional[Callable[[ProgressSnapshot], None]] = None
    ):
        """
        Initialize progress tracker.
        
        Args:
            total_size: Total size in bytes to process
            description: Description of the operation
            update_interval: Minimum seconds between progress updates
            callback: Optional callback function for progress updates
        """
        self.total_size = total_size
        self.description = description
        self.update_interval = update_interval
        self.callback = callback

        # Progress state
        self.bytes_processed = 0
        self.start_time = time.time()
        self.last_update_time = self.start_time
        self.last_callback_time = self.start_time

        # Performance tracking
        self.samples = []  # List of (timestamp, bytes_processed) tuples
        self.max_samples = 60  # Keep last 60 samples for rate calculation

        logger.info(
            "ProgressTracker initialized",
            description=description,
            total_size_mb=total_size / (1024 * 1024),
            update_interval=update_interval
        )

    def update(self, bytes_processed: int) -> None:
        """
        Update progress with new bytes processed count.
        
        Args:
            bytes_processed: Total bytes processed so far
        """
        self.bytes_processed = bytes_processed
        current_time = time.time()

        # Add sample for rate calculation
        self.samples.append((current_time, bytes_processed))
        if len(self.samples) > self.max_samples:
            self.samples.pop(0)

        # Check if we should trigger callback
        if (current_time - self.last_callback_time >= self.update_interval
            and self.callback is not None):
            self.callback(self.get_snapshot())
            self.last_callback_time = current_time

        self.last_update_time = current_time

    def increment(self, bytes_delta: int) -> None:
        """
        Increment progress by the given number of bytes.
        
        Args:
            bytes_delta: Number of bytes to add to current progress
        """
        self.update(self.bytes_processed + bytes_delta)

    def get_percentage(self) -> float:
        """
        Get completion percentage.
        
        Returns:
            Percentage complete (0.0 to 100.0)
        """
        if self.total_size == 0:
            return 100.0
        return min(100.0, (self.bytes_processed / self.total_size) * 100.0)

    def get_elapsed_seconds(self) -> float:
        """Get elapsed time in seconds."""
        return time.time() - self.start_time

    def get_processing_rate_mb_per_sec(self) -> float:
        """
        Get current processing rate in MB/second.
        
        Uses recent samples to calculate a smoothed rate.
        
        Returns:
            Processing rate in MB/second
        """
        if len(self.samples) < 2:
            return 0.0

        # Use recent samples for rate calculation
        recent_samples = self.samples[-10:]  # Last 10 samples
        if len(recent_samples) < 2:
            return 0.0

        time_span = recent_samples[-1][0] - recent_samples[0][0]
        bytes_span = recent_samples[-1][1] - recent_samples[0][1]

        if time_span <= 0:
            return 0.0

        bytes_per_sec = bytes_span / time_span
        return bytes_per_sec / (1024 * 1024)  # Convert to MB/sec

    def get_eta(self) -> Optional[datetime]:
        """
        Get estimated time of completion.
        
        Returns:
            Estimated completion time, or None if cannot be calculated
        """
        if self.bytes_processed == 0 or self.total_size == 0:
            return None

        rate_mb_per_sec = self.get_processing_rate_mb_per_sec()
        if rate_mb_per_sec <= 0:
            return None

        remaining_bytes = self.total_size - self.bytes_processed
        remaining_mb = remaining_bytes / (1024 * 1024)
        estimated_seconds_remaining = remaining_mb / rate_mb_per_sec

        return datetime.now() + timedelta(seconds=estimated_seconds_remaining)

    def get_estimated_total_seconds(self) -> Optional[float]:
        """
        Get estimated total processing time in seconds.
        
        Returns:
            Estimated total time, or None if cannot be calculated
        """
        if self.bytes_processed == 0:
            return None

        elapsed = self.get_elapsed_seconds()
        percentage = self.get_percentage()

        if percentage <= 0:
            return None

        return elapsed * (100.0 / percentage)

    def get_snapshot(self) -> ProgressSnapshot:
        """
        Get current progress snapshot.
        
        Returns:
            ProgressSnapshot with current state
        """
        return ProgressSnapshot(
            bytes_processed=self.bytes_processed,
            total_bytes=self.total_size,
            percentage=self.get_percentage(),
            elapsed_seconds=self.get_elapsed_seconds(),
            estimated_total_seconds=self.get_estimated_total_seconds(),
            eta=self.get_eta(),
            processing_rate_mb_per_sec=self.get_processing_rate_mb_per_sec()
        )

    def is_complete(self) -> bool:
        """Check if processing is complete."""
        return self.bytes_processed >= self.total_size

    def get_stats(self) -> Dict[str, Any]:
        """
        Get comprehensive statistics.
        
        Returns:
            Dictionary with detailed progress statistics
        """
        snapshot = self.get_snapshot()

        return {
            "description": self.description,
            "bytes_processed": snapshot.bytes_processed,
            "total_bytes": snapshot.total_bytes,
            "percentage": snapshot.percentage,
            "elapsed_seconds": snapshot.elapsed_seconds,
            "estimated_total_seconds": snapshot.estimated_total_seconds,
            "eta": snapshot.eta.isoformat() if snapshot.eta else None,
            "processing_rate_mb_per_sec": snapshot.processing_rate_mb_per_sec,
            "is_complete": self.is_complete(),
            "samples_collected": len(self.samples)
        }

    def log_progress(self, level: str = "info") -> None:
        """
        Log current progress state.
        
        Args:
            level: Log level ("info", "debug", "warning")
        """
        stats = self.get_stats()

        log_func = getattr(logger, level, logger.info)
        log_func(
            "Progress update",
            **{k: v for k, v in stats.items() if k != "description"}
        )


class FileProgressTracker(ProgressTracker):
    """Progress tracker specifically for file processing operations."""

    def __init__(
        self,
        file_path: Path,
        description: Optional[str] = None,
        update_interval: float = 1.0,
        callback: Optional[Callable[[ProgressSnapshot], None]] = None
    ):
        """
        Initialize file progress tracker.
        
        Args:
            file_path: Path to file being processed
            description: Operation description (defaults to filename)
            update_interval: Minimum seconds between progress updates
            callback: Optional callback function for progress updates
        """
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        file_size = file_path.stat().st_size
        description = description or f"Processing {file_path.name}"

        super().__init__(file_size, description, update_interval, callback)

        self.file_path = file_path

        logger.info(
            "FileProgressTracker initialized",
            file_path=str(file_path),
            file_size_mb=file_size / (1024 * 1024)
        )

    def update_from_position(self, file_position: int) -> None:
        """
        Update progress based on current file position.
        
        Args:
            file_position: Current position in the file
        """
        self.update(file_position)


def create_progress_callback(
    log_interval: float = 5.0,
    console_output: bool = True
) -> Callable[[ProgressSnapshot], None]:
    """
    Create a standard progress callback function.
    
    Args:
        log_interval: Minimum seconds between log messages
        console_output: Whether to output to console
        
    Returns:
        Callback function suitable for ProgressTracker
    """
    last_log_time = 0.0

    def callback(snapshot: ProgressSnapshot) -> None:
        nonlocal last_log_time

        current_time = time.time()
        if current_time - last_log_time >= log_interval:
            logger.info(
                "Processing progress",
                percentage=round(snapshot.percentage, 1),
                processed_mb=round(snapshot.bytes_processed / (1024 * 1024), 1),
                total_mb=round(snapshot.total_bytes / (1024 * 1024), 1),
                rate_mb_per_sec=round(snapshot.processing_rate_mb_per_sec, 2),
                eta=snapshot.eta.strftime("%H:%M:%S") if snapshot.eta else "unknown"
            )

            if console_output:
                print(f"Progress: {snapshot.percentage:.1f}% "
                      f"({snapshot.bytes_processed/(1024*1024):.1f}/"
                      f"{snapshot.total_bytes/(1024*1024):.1f} MB) "
                      f"Rate: {snapshot.processing_rate_mb_per_sec:.2f} MB/s "
                      f"ETA: {snapshot.eta.strftime('%H:%M:%S') if snapshot.eta else 'unknown'}")

            last_log_time = current_time

    return callback
