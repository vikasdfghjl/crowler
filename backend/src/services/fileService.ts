import axios from 'axios';
import { logDebug } from '../utils';

/**
 * Get file size from remote URL via HEAD request
 */
export async function getFileSize(fileUrl: string): Promise<number> {
  try {
    const response = await axios.head(fileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 5000
    });
    
    // Get content length from headers
    const contentLength = response.headers['content-length'];
    if (contentLength) {
      return parseInt(contentLength);
    }
    return 0;
  } catch (error) {
    logDebug(`Error getting file size for ${fileUrl}: ${(error as Error).message}`);
    return 0;
  }
}