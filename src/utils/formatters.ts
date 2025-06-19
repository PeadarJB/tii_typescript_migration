/**
 * Formatting utilities for consistent data display
 */

/**
 * Format a number as a percentage
 * @param value - The decimal value (0-1 or 0-100)
 * @param decimals - Number of decimal places
 * @param isAlreadyPercentage - Whether the value is already a percentage (0-100)
 * @returns Formatted percentage string
 */
export function formatPercentage(
  value: number,
  decimals: number = 1,
  isAlreadyPercentage: boolean = false
): string {
  const percentage = isAlreadyPercentage ? value : value * 100;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format a number with thousand separators
 * @param value - The number to format
 * @param decimals - Number of decimal places
 * @returns Formatted number string
 */
export function formatNumber(value: number, decimals: number = 0): string {
  return value.toLocaleString('en-IE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Format length in kilometers
 * @param lengthKm - Length in kilometers
 * @param decimals - Number of decimal places
 * @returns Formatted length string
 */
export function formatLength(lengthKm: number, decimals: number = 1): string {
  if (lengthKm < 1) {
    return `${(lengthKm * 1000).toFixed(0)} m`;
  }
  return `${lengthKm.toFixed(decimals)} km`;
}

/**
 * Format date to Irish locale
 * @param date - Date to format
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options
  };
  
  return dateObj.toLocaleDateString('en-IE', defaultOptions);
}

/**
 * Format date and time to Irish locale
 * @param date - Date to format
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date and time string
 */
export function formatDateTime(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  
  return dateObj.toLocaleString('en-IE', defaultOptions);
}

/**
 * Format file size in bytes to human readable
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format duration in milliseconds to human readable
 * @param ms - Duration in milliseconds
 * @returns Formatted duration string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  
  return `${seconds}s`;
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add (default: '...')
 * @returns Truncated text
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix: string = '...'
): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Convert string to title case
 * @param str - String to convert
 * @returns Title cased string
 */
export function toTitleCase(str: string): string {
  return str.replace(
    /\w\S*/g,
    txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Convert camelCase or snake_case to human readable
 * @param str - String to convert
 * @returns Human readable string
 */
export function humanize(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\s/, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Format coordinate to decimal degrees
 * @param coordinate - Coordinate value
 * @param type - 'lat' or 'lon'
 * @param decimals - Number of decimal places
 * @returns Formatted coordinate string
 */
export function formatCoordinate(
  coordinate: number,
  type: 'lat' | 'lon',
  decimals: number = 6
): string {
  const absolute = Math.abs(coordinate);
  const direction = type === 'lat'
    ? coordinate >= 0 ? 'N' : 'S'
    : coordinate >= 0 ? 'E' : 'W';
    
  return `${absolute.toFixed(decimals)}° ${direction}`;
}

/**
 * Format risk level for display
 * @param level - Risk level
 * @returns Formatted risk level with emoji
 */
export function formatRiskLevel(level: string): string {
  const riskEmojis: Record<string, string> = {
    none: '✅',
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    extreme: '🔴'
  };
  
  const emoji = riskEmojis[level.toLowerCase()] || '❓';
  return `${emoji} ${toTitleCase(level)}`;
}