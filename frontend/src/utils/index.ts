/**
 * Formats a URL to ensure it has the proper HTTP/HTTPS prefix
 * @param url URL string to format
 * @returns Formatted URL with proper prefix
 */
export function formatUrl(url: string): string {
  if (!url) return '';
  return url.startsWith('http') ? url : `https://${url}`;
}

/**
 * Concatenates Tailwind CSS classes conditionally
 * @param classes Classes to concatenate
 * @returns Concatenated class string
 */
export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Extracts domain from a URL
 * @param url Full URL
 * @returns Domain name
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(formatUrl(url));
    return parsed.hostname;
  } catch (e) {
    return url;
  }
}

/**
 * Truncates a string to a specified length
 * @param str String to truncate
 * @param length Maximum length
 * @returns Truncated string
 */
export function truncate(str: string, length: number): string {
  if (!str) return '';
  return str.length > length ? `${str.substring(0, length)}...` : str;
}