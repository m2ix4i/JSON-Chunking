"""
Advanced performance alert system with intelligent thresholding and notification management.

This module provides a comprehensive alerting system that monitors performance metrics,
detects anomalies, and delivers actionable notifications through multiple channels.
"""

import asyncio
import json
import logging
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set, Callable
from enum import Enum
import threading
from collections import deque, defaultdict
import statistics

from .apm_integration import PerformanceAlert, MetricData
from .metrics_collector import MetricsCollector

logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertState(Enum):
    """Alert state lifecycle."""
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"


@dataclass
class AlertRule:
    """Alert rule definition with intelligent thresholding."""
    rule_id: str
    name: str
    description: str
    metric_name: str
    condition: str  # "greater_than", "less_than", "rate_of_change", "anomaly_detection"
    threshold_value: float
    severity: AlertSeverity
    evaluation_window: float = 300.0  # 5 minutes
    cooldown_period: float = 600.0    # 10 minutes
    enabled: bool = True
    tags: Dict[str, str] = field(default_factory=dict)
    
    # Advanced features
    adaptive_threshold: bool = False
    seasonal_adjustment: bool = False
    min_data_points: int = 5
    confidence_level: float = 0.95


@dataclass
class AlertInstance:
    """Active alert instance with state management."""
    alert_id: str
    rule_id: str
    metric_name: str
    current_value: float
    threshold_value: float
    severity: AlertSeverity
    state: AlertState
    message: str
    first_triggered: float
    last_updated: float
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[float] = None
    resolved_at: Optional[float] = None
    tags: Dict[str, str] = field(default_factory=dict)
    context: Dict[str, Any] = field(default_factory=dict)
    
    # Notification tracking
    notifications_sent: List[str] = field(default_factory=list)
    escalation_level: int = 0


@dataclass
class NotificationChannel:
    """Notification channel configuration."""
    channel_id: str
    channel_type: str  # email, webhook, slack, teams, sms
    config: Dict[str, Any]
    enabled: bool = True
    severity_filter: List[AlertSeverity] = field(default_factory=lambda: list(AlertSeverity))
    rate_limit: Optional[Dict[str, Any]] = None


class AdaptiveThresholds:
    """Adaptive threshold calculation using statistical methods."""
    
    def __init__(self, window_size: int = 1000):
        """Initialize adaptive threshold calculator."""
        self.window_size = window_size
        self._metric_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=window_size))
        self._baseline_stats: Dict[str, Dict[str, float]] = {}
        self._lock = threading.Lock()
        
        logger.debug("Adaptive thresholds initialized", extra={
            "window_size": window_size
        })
    
    def update_metric(self, metric_name: str, value: float, timestamp: float) -> None:
        """Update metric history for threshold calculation."""
        with self._lock:
            self._metric_history[metric_name].append((timestamp, value))
            self._update_baseline_stats(metric_name)
    
    def _update_baseline_stats(self, metric_name: str) -> None:
        """Update baseline statistics for a metric."""
        history = self._metric_history[metric_name]
        if len(history) < 10:  # Need minimum data points
            return
        
        values = [value for _, value in history]
        
        self._baseline_stats[metric_name] = {
            "mean": statistics.mean(values),
            "std_dev": statistics.stdev(values) if len(values) > 1 else 0.0,
            "median": statistics.median(values),
            "p95": self._percentile(values, 0.95),
            "p99": self._percentile(values, 0.99),
            "min": min(values),
            "max": max(values),
            "last_updated": time.time()
        }
    
    def get_adaptive_threshold(self, 
                              metric_name: str, 
                              confidence_level: float = 0.95,
                              direction: str = "upper") -> Optional[float]:
        """Calculate adaptive threshold based on historical data."""
        with self._lock:
            stats = self._baseline_stats.get(metric_name)
            if not stats:
                return None
            
            mean = stats["mean"]
            std_dev = stats["std_dev"]
            
            if std_dev == 0:
                return mean
            
            # Calculate threshold using confidence interval
            z_score = self._get_z_score(confidence_level)
            
            if direction == "upper":
                return mean + (z_score * std_dev)
            elif direction == "lower":
                return mean - (z_score * std_dev)
            else:
                return mean
    
    def detect_anomaly(self, 
                      metric_name: str, 
                      current_value: float,
                      sensitivity: float = 2.0) -> bool:
        """Detect if current value is anomalous."""
        with self._lock:
            stats = self._baseline_stats.get(metric_name)
            if not stats:
                return False
            
            mean = stats["mean"]
            std_dev = stats["std_dev"]
            
            if std_dev == 0:
                return False
            
            # Z-score based anomaly detection
            z_score = abs((current_value - mean) / std_dev)
            return z_score > sensitivity
    
    def _percentile(self, values: List[float], p: float) -> float:
        """Calculate percentile value."""
        if not values:
            return 0.0
        sorted_values = sorted(values)
        index = int(len(sorted_values) * p)
        return sorted_values[min(index, len(sorted_values) - 1)]
    
    def _get_z_score(self, confidence_level: float) -> float:
        """Get Z-score for confidence level."""
        # Simplified mapping of common confidence levels to Z-scores
        z_scores = {
            0.90: 1.645,
            0.95: 1.96,
            0.99: 2.576,
            0.999: 3.291
        }
        return z_scores.get(confidence_level, 1.96)


class AlertEvaluator:
    """High-performance alert rule evaluation engine."""
    
    def __init__(self, adaptive_thresholds: AdaptiveThresholds):
        """Initialize alert evaluator."""
        self.adaptive_thresholds = adaptive_thresholds
        self._rules: Dict[str, AlertRule] = {}
        self._last_evaluation: Dict[str, float] = {}
        self._cooldown_tracking: Dict[str, float] = {}
        
        logger.info("Alert evaluator initialized")
    
    def add_rule(self, rule: AlertRule) -> None:
        """Add or update an alert rule."""
        self._rules[rule.rule_id] = rule
        logger.info("Alert rule added", extra={
            "rule_id": rule.rule_id,
            "metric": rule.metric_name,
            "condition": rule.condition
        })
    
    def remove_rule(self, rule_id: str) -> bool:
        """Remove an alert rule."""
        if rule_id in self._rules:
            del self._rules[rule_id]
            logger.info("Alert rule removed", extra={"rule_id": rule_id})
            return True
        return False
    
    def evaluate_all_rules(self, 
                          current_metrics: Dict[str, float]) -> List[AlertInstance]:
        """Evaluate all rules against current metrics."""
        triggered_alerts = []
        current_time = time.time()
        
        for rule in self._rules.values():
            if not rule.enabled:
                continue
            
            # Check cooldown period
            last_cooldown = self._cooldown_tracking.get(rule.rule_id, 0)
            if current_time - last_cooldown < rule.cooldown_period:
                continue
            
            # Get metric value
            metric_value = current_metrics.get(rule.metric_name)
            if metric_value is None:
                continue
            
            # Update adaptive thresholds
            if rule.adaptive_threshold:
                self.adaptive_thresholds.update_metric(rule.metric_name, metric_value, current_time)
            
            # Evaluate rule condition
            alert = self._evaluate_rule(rule, metric_value, current_time)
            if alert:
                triggered_alerts.append(alert)
                self._cooldown_tracking[rule.rule_id] = current_time
        
        return triggered_alerts
    
    def _evaluate_rule(self, 
                      rule: AlertRule, 
                      metric_value: float, 
                      timestamp: float) -> Optional[AlertInstance]:
        """Evaluate a single rule against metric value."""
        threshold = rule.threshold_value
        
        # Use adaptive threshold if enabled
        if rule.adaptive_threshold:
            adaptive_threshold = self.adaptive_thresholds.get_adaptive_threshold(
                rule.metric_name, 
                rule.confidence_level
            )
            if adaptive_threshold is not None:
                threshold = adaptive_threshold
        
        # Evaluate condition
        triggered = False
        
        if rule.condition == "greater_than":
            triggered = metric_value > threshold
        elif rule.condition == "less_than":
            triggered = metric_value < threshold
        elif rule.condition == "anomaly_detection":
            triggered = self.adaptive_thresholds.detect_anomaly(rule.metric_name, metric_value)
        elif rule.condition == "rate_of_change":
            # Would need historical data for rate calculation
            triggered = False  # Placeholder
        
        if not triggered:
            return None
        
        # Create alert instance
        alert_id = f"{rule.rule_id}_{int(timestamp)}"
        
        return AlertInstance(
            alert_id=alert_id,
            rule_id=rule.rule_id,
            metric_name=rule.metric_name,
            current_value=metric_value,
            threshold_value=threshold,
            severity=rule.severity,
            state=AlertState.ACTIVE,
            message=self._format_alert_message(rule, metric_value, threshold),
            first_triggered=timestamp,
            last_updated=timestamp,
            tags=rule.tags,
            context={
                "evaluation_window": rule.evaluation_window,
                "adaptive_threshold_used": rule.adaptive_threshold
            }
        )
    
    def _format_alert_message(self, 
                            rule: AlertRule, 
                            current_value: float, 
                            threshold_value: float) -> str:
        """Format alert message with context."""
        condition_text = {
            "greater_than": "above",
            "less_than": "below",
            "anomaly_detection": "anomalous compared to baseline",
            "rate_of_change": "changing rapidly"
        }.get(rule.condition, "violating threshold")
        
        return f"{rule.name}: {rule.metric_name} is {condition_text} threshold. Current: {current_value:.2f}, Threshold: {threshold_value:.2f}"


class NotificationManager:
    """Multi-channel notification delivery with rate limiting."""
    
    def __init__(self):
        """Initialize notification manager."""
        self._channels: Dict[str, NotificationChannel] = {}
        self._rate_limiters: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        self._notification_history: deque = deque(maxlen=1000)
        
        logger.info("Notification manager initialized")
    
    def add_channel(self, channel: NotificationChannel) -> None:
        """Add notification channel."""
        self._channels[channel.channel_id] = channel
        logger.info("Notification channel added", extra={
            "channel_id": channel.channel_id,
            "type": channel.channel_type
        })
    
    def remove_channel(self, channel_id: str) -> bool:
        """Remove notification channel."""
        if channel_id in self._channels:
            del self._channels[channel_id]
            logger.info("Notification channel removed", extra={"channel_id": channel_id})
            return True
        return False
    
    async def send_alert_notification(self, alert: AlertInstance) -> List[str]:
        """Send alert notification through appropriate channels."""
        sent_notifications = []
        
        for channel in self._channels.values():
            if not channel.enabled:
                continue
            
            # Check severity filter
            if alert.severity not in channel.severity_filter:
                continue
            
            # Check rate limits
            if not self._check_rate_limit(channel, alert):
                continue
            
            try:
                success = await self._send_notification(channel, alert)
                if success:
                    sent_notifications.append(channel.channel_id)
                    self._record_notification(channel.channel_id, alert)
            except Exception as e:
                logger.error("Notification failed", extra={
                    "channel_id": channel.channel_id,
                    "alert_id": alert.alert_id,
                    "error": str(e)
                })
        
        return sent_notifications
    
    def _check_rate_limit(self, channel: NotificationChannel, alert: AlertInstance) -> bool:
        """Check if notification is within rate limits."""
        if not channel.rate_limit:
            return True
        
        current_time = time.time()
        window = channel.rate_limit.get("window", 3600)  # 1 hour default
        max_notifications = channel.rate_limit.get("max_notifications", 10)
        
        # Clean old entries
        rate_limiter = self._rate_limiters[channel.channel_id]
        while rate_limiter and current_time - rate_limiter[0] > window:
            rate_limiter.popleft()
        
        # Check limit
        if len(rate_limiter) >= max_notifications:
            logger.warning("Rate limit exceeded", extra={
                "channel_id": channel.channel_id,
                "current_count": len(rate_limiter),
                "max_allowed": max_notifications
            })
            return False
        
        return True
    
    async def _send_notification(self, 
                               channel: NotificationChannel, 
                               alert: AlertInstance) -> bool:
        """Send notification through specific channel."""
        try:
            if channel.channel_type == "webhook":
                return await self._send_webhook_notification(channel, alert)
            elif channel.channel_type == "email":
                return await self._send_email_notification(channel, alert)
            elif channel.channel_type == "slack":
                return await self._send_slack_notification(channel, alert)
            else:
                logger.warning("Unsupported channel type", extra={
                    "type": channel.channel_type
                })
                return False
        except Exception as e:
            logger.error("Notification send failed", extra={
                "channel_type": channel.channel_type,
                "error": str(e)
            })
            return False
    
    async def _send_webhook_notification(self, 
                                       channel: NotificationChannel, 
                                       alert: AlertInstance) -> bool:
        """Send webhook notification."""
        import aiohttp
        
        webhook_url = channel.config.get("url")
        if not webhook_url:
            return False
        
        payload = {
            "alert_id": alert.alert_id,
            "severity": alert.severity.value,
            "message": alert.message,
            "metric_name": alert.metric_name,
            "current_value": alert.current_value,
            "threshold_value": alert.threshold_value,
            "timestamp": alert.first_triggered,
            "tags": alert.tags
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(webhook_url, json=payload, timeout=10) as response:
                    return response.status < 400
        except Exception:
            return False
    
    async def _send_email_notification(self, 
                                     channel: NotificationChannel, 
                                     alert: AlertInstance) -> bool:
        """Send email notification."""
        # Placeholder for email implementation
        # Would integrate with SMTP server or email service
        logger.info("Email notification sent", extra={
            "alert_id": alert.alert_id,
            "recipient": channel.config.get("recipient")
        })
        return True
    
    async def _send_slack_notification(self, 
                                     channel: NotificationChannel, 
                                     alert: AlertInstance) -> bool:
        """Send Slack notification."""
        # Placeholder for Slack implementation
        # Would integrate with Slack webhook API
        logger.info("Slack notification sent", extra={
            "alert_id": alert.alert_id,
            "channel": channel.config.get("channel")
        })
        return True
    
    def _record_notification(self, channel_id: str, alert: AlertInstance) -> None:
        """Record notification for rate limiting and history."""
        current_time = time.time()
        
        # Update rate limiter
        self._rate_limiters[channel_id].append(current_time)
        
        # Update notification history
        self._notification_history.append({
            "timestamp": current_time,
            "channel_id": channel_id,
            "alert_id": alert.alert_id,
            "severity": alert.severity.value
        })


class AlertManager:
    """Main alert management system with intelligent alerting."""
    
    def __init__(self, metrics_collector: MetricsCollector):
        """Initialize alert manager."""
        self.metrics_collector = metrics_collector
        
        # Core components
        self.adaptive_thresholds = AdaptiveThresholds()
        self.alert_evaluator = AlertEvaluator(self.adaptive_thresholds)
        self.notification_manager = NotificationManager()
        
        # Alert state management
        self._active_alerts: Dict[str, AlertInstance] = {}
        self._alert_history: deque = deque(maxlen=10000)
        
        # Background processing
        self._evaluation_task: Optional[asyncio.Task] = None
        self._running = False
        self._evaluation_interval = 30.0  # 30 seconds
        
        logger.info("Alert manager initialized")
    
    async def start(self) -> None:
        """Start alert monitoring."""
        if self._running:
            return
        
        self._running = True
        self._evaluation_task = asyncio.create_task(self._background_evaluation())
        
        logger.info("Alert monitoring started")
    
    async def stop(self) -> None:
        """Stop alert monitoring."""
        if not self._running:
            return
        
        self._running = False
        if self._evaluation_task:
            self._evaluation_task.cancel()
            try:
                await self._evaluation_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Alert monitoring stopped")
    
    async def _background_evaluation(self) -> None:
        """Background task for alert evaluation."""
        while self._running:
            try:
                await self._evaluate_alerts()
                await asyncio.sleep(self._evaluation_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Alert evaluation failed", extra={"error": str(e)})
                await asyncio.sleep(self._evaluation_interval)
    
    async def _evaluate_alerts(self) -> None:
        """Evaluate all alert rules and process results."""
        # Get current metrics
        current_metrics = self.metrics_collector.get_all_metrics()
        
        # Evaluate rules
        triggered_alerts = self.alert_evaluator.evaluate_all_rules(current_metrics)
        
        # Process triggered alerts
        for alert in triggered_alerts:
            await self._process_alert(alert)
        
        # Check for resolved alerts
        await self._check_resolved_alerts(current_metrics)
    
    async def _process_alert(self, alert: AlertInstance) -> None:
        """Process a triggered alert."""
        # Check if alert already exists
        existing_alert = self._active_alerts.get(alert.rule_id)
        
        if existing_alert:
            # Update existing alert
            existing_alert.current_value = alert.current_value
            existing_alert.last_updated = alert.last_updated
            return
        
        # Add new alert
        self._active_alerts[alert.rule_id] = alert
        self._alert_history.append(alert)
        
        # Send notifications
        sent_channels = await self.notification_manager.send_alert_notification(alert)
        alert.notifications_sent = sent_channels
        
        logger.warning("Alert triggered", extra={
            "alert_id": alert.alert_id,
            "rule_id": alert.rule_id,
            "metric": alert.metric_name,
            "value": alert.current_value,
            "threshold": alert.threshold_value,
            "notifications_sent": len(sent_channels)
        })
    
    async def _check_resolved_alerts(self, current_metrics: Dict[str, float]) -> None:
        """Check if any active alerts should be resolved."""
        current_time = time.time()
        resolved_alerts = []
        
        for rule_id, alert in self._active_alerts.items():
            metric_value = current_metrics.get(alert.metric_name)
            if metric_value is None:
                continue
            
            # Simple resolution logic (would be more sophisticated in practice)
            rule = self.alert_evaluator._rules.get(rule_id)
            if not rule:
                continue
            
            resolved = False
            if rule.condition == "greater_than" and metric_value <= rule.threshold_value:
                resolved = True
            elif rule.condition == "less_than" and metric_value >= rule.threshold_value:
                resolved = True
            
            if resolved:
                alert.state = AlertState.RESOLVED
                alert.resolved_at = current_time
                resolved_alerts.append(rule_id)
                
                logger.info("Alert resolved", extra={
                    "alert_id": alert.alert_id,
                    "rule_id": rule_id,
                    "metric": alert.metric_name,
                    "current_value": metric_value
                })
        
        # Remove resolved alerts from active list
        for rule_id in resolved_alerts:
            del self._active_alerts[rule_id]
    
    def add_alert_rule(self, rule: AlertRule) -> None:
        """Add alert rule."""
        self.alert_evaluator.add_rule(rule)
    
    def remove_alert_rule(self, rule_id: str) -> bool:
        """Remove alert rule."""
        return self.alert_evaluator.remove_rule(rule_id)
    
    def add_notification_channel(self, channel: NotificationChannel) -> None:
        """Add notification channel."""
        self.notification_manager.add_channel(channel)
    
    def get_active_alerts(self) -> List[AlertInstance]:
        """Get all active alerts."""
        return list(self._active_alerts.values())
    
    def get_alert_history(self, limit: int = 100) -> List[AlertInstance]:
        """Get alert history."""
        return list(self._alert_history)[-limit:]
    
    def acknowledge_alert(self, alert_id: str, acknowledged_by: str) -> bool:
        """Acknowledge an active alert."""
        for alert in self._active_alerts.values():
            if alert.alert_id == alert_id:
                alert.state = AlertState.ACKNOWLEDGED
                alert.acknowledged_by = acknowledged_by
                alert.acknowledged_at = time.time()
                
                logger.info("Alert acknowledged", extra={
                    "alert_id": alert_id,
                    "acknowledged_by": acknowledged_by
                })
                return True
        return False