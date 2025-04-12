import axios from 'axios';
import { CrawlRequest, CrawlResponse, DisplayFile, FileEntry } from '@/types/api';

/**
 * API client for communicating with the backend
 */
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Sends a request to crawl a website
 * 
 * @param {CrawlRequest} crawlData - Website URL and requested file extensions
 * @returns {Promise<CrawlResponse>} - Files found during the crawl
 */
export async function crawlWebsite(crawlData: { 
  url: string;
  fileExtensions: string[];
  maxDepth?: number;
}): Promise<{ files: DisplayFile[], thumbnailConnections: any[] }> {
  try {
    // Transform from frontend format to backend format
    const backendRequest: CrawlRequest = {
      website: crawlData.url,
      extensions: crawlData.fileExtensions,
      crawlDepth: crawlData.maxDepth
    };
    
    const response = await api.post<CrawlResponse>('/crawl', backendRequest);
    
    // Transform backend response to match frontend expected types
    return {
      files: response.data.files.map((file: FileEntry): DisplayFile => ({
        url: file.url,
        filename: file.fileName,
        extension: file.fileType,
        foundOnPage: file.sourceUrl,
        thumbnailUrl: file.thumbnailUrl,
        size: file.size,
        formattedSize: file.formattedSize,
        isEmbedded: file.isEmbedded,
        relatedFiles: file.relatedFiles,
        selected: file.selected || false,
      })),
      thumbnailConnections: response.data.thumbnailConnections || []
    };
  } catch (error) {
    console.error('Crawl request failed:', error);
    throw error;
  }
}

/**
 * Get a proxied file URL to avoid CORS issues
 * 
 * @param {string} fileUrl - Original URL of the file
 * @returns {string} - Proxied URL to access the file
 */
export function getProxyUrl(fileUrl: string): string {
  const encodedUrl = encodeURIComponent(fileUrl);
  return `/api/proxy?url=${encodedUrl}`;
}

export default api;