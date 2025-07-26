/**
 * Time formatting utilities for consistent time display across the application.
 */

/**
 * Formats a duration in seconds to a human-readable string.
 * @param seconds - Duration in seconds
 * @returns Formatted duration string (e.g., "2m 30s", "45.5s")
 */
export const formatDuration = (seconds: number): string => 
  seconds < 60 
    ? `${seconds.toFixed(1)}s`
    : `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;

/**
 * Formats a timestamp to a localized date string.
 * @param timestamp - ISO timestamp string
 * @param locale - Locale string (default: 'de-DE')
 * @returns Formatted date string
 */
export const formatTimestamp = (timestamp: string, locale: string = 'de-DE'): string => {
  return new Date(timestamp).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formats file size in bytes to a human-readable string.
 * @param bytes - Size in bytes
 * @returns Formatted size string (e.g., "2.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
};