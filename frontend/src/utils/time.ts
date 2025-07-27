/**
 * Time utility functions for the application
 */

/**
 * Format time ago string (e.g., "2 minutes ago")
 */
export const formatTimeAgo = (timestamp: string | Date): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 60) {
    return 'vor wenigen Sekunden';
  } else if (diffInMinutes < 60) {
    return `vor ${diffInMinutes} Minute${diffInMinutes === 1 ? '' : 'n'}`;
  } else if (diffInHours < 24) {
    return `vor ${diffInHours} Stunde${diffInHours === 1 ? '' : 'n'}`;
  } else if (diffInDays < 7) {
    return `vor ${diffInDays} Tag${diffInDays === 1 ? '' : 'en'}`;
  } else {
    return date.toLocaleDateString('de-DE');
  }
};

/**
 * Format duration in seconds to human readable string
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
};

/**
 * Check if a timestamp is from today
 */
export const isToday = (timestamp: string | Date): boolean => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

/**
 * Format timestamp to German locale string
 */
export const formatTimestamp = (timestamp: string | Date): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleString('de-DE');
};

/**
 * Format file size in bytes to human readable string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  return `${size.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
};