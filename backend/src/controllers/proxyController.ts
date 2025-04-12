import { Request, Response } from 'express';
import axios from 'axios';
import { logDebug } from '../utils';

/**
 * Controller for proxying file requests to bypass CORS restrictions
 */
export const proxyFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const fileUrl = req.query.url as string;
    
    if (!fileUrl) {
      res.status(400).json({ error: 'URL parameter is required' });
      return;
    }
    
    logDebug(`Proxying request to: ${fileUrl}`);
    
    // Configure request headers to look like a browser
    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      // Set a reasonable timeout
      timeout: 30000,
      // Allow redirects
      maxRedirects: 5,
      validateStatus: (status) => status < 400
    });
    
    // Get content type from response or guess based on url
    const contentType = response.headers['content-type'] || 
                       guessContentType(fileUrl);
    
    // Forward the content type and other relevant headers
    res.setHeader('Content-Type', contentType);
    
    if (response.headers['content-disposition']) {
      res.setHeader('Content-Disposition', response.headers['content-disposition']);
    }
    
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }
    
    // Forward the file data
    res.send(response.data);
    
  } catch (error: any) {
    console.error('Proxy error:', error.message);
    
    // Try to provide a helpful error message
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      res.status(error.response.status).json({ 
        error: `Remote server error: ${error.response.status}`,
        message: error.message
      });
    } else if (error.request) {
      // The request was made but no response was received
      res.status(504).json({ 
        error: 'Gateway Timeout',
        message: 'No response received from remote server'
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: error.message
      });
    }
  }
};

/**
 * Helper function to guess content type from URL
 */
function guessContentType(url: string): string {
  const extension = url.split('.').pop()?.toLowerCase() || '';
  
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'pdf': 'application/pdf',
    'json': 'application/json',
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}