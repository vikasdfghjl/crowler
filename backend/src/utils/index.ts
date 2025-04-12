import config from '../config';
import { URL } from 'url';
import * as cheerio from 'cheerio';

/**
 * Log debug messages when debug mode is enabled
 */
export function logDebug(...args: any[]): void {
  if (config.DEBUG) console.log(`[DEBUG ${new Date().toISOString()}]`, ...args);
}

/**
 * Normalize URLs to absolute paths
 */
export function normalizeUrl(baseUrl: string, href: string): string | null {
  try {
    return new URL(href, baseUrl).href;
  } catch (error) {
    logDebug(`URL normalization error: ${(error as Error).message}, baseUrl: ${baseUrl}, href: ${href}`);
    return null;
  }
}

/**
 * Check if an element might be a thumbnail
 */
export function isThumbnail($: cheerio.CheerioAPI, element: cheerio.Element): boolean {
  // Check if it's an image
  const isImg = $(element).is('img');
  
  // Check if it's inside an anchor tag (clickable)
  const isInAnchor = $(element).closest('a').length > 0;
  
  // Check if it has common thumbnail class/id indicators
  const className = $(element).attr('class') || '';
  const id = $(element).attr('id') || '';
  const alt = $(element).attr('alt') || '';
  const thumbnailKeywords = ['thumb', 'thumbnail', 'preview', 'small', 'mini'];
  
  const hasThumbKeyword = thumbnailKeywords.some(keyword => 
    className.toLowerCase().includes(keyword) || 
    id.toLowerCase().includes(keyword) || 
    alt.toLowerCase().includes(keyword)
  );
  
  // Check if it's small in size (typical for thumbnails)
  const width = parseInt($(element).attr('width') || '0');
  const height = parseInt($(element).attr('height') || '0');
  const isSmallSize = (width > 0 && width < 300) || (height > 0 && height < 300);
  
  return isImg && (isInAnchor || hasThumbKeyword || isSmallSize);
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return 'Unknown';
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}