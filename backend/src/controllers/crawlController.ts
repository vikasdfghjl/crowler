import { Request, Response } from 'express';
import { crawlWebsite as crawlWebsiteService } from '../services/crawlerService';
import { CrawlRequest, FileEntry, ThumbnailConnection, FileSizeFilter } from '../types';

// Simple debug function to avoid import errors
function logDebug(...args: any[]): void {
  if (process.env.DEBUG === 'true') console.log(`[DEBUG ${new Date().toISOString()}]`, ...args);
}

/**
 * Controller for handling website crawling requests
 */
export const crawlWebsite = async (req: Request, res: Response): Promise<void> => {
  try {
    const { website, extensions, crawlDepth = 0, sizeFilters } = req.body as CrawlRequest;
    
    if (!website) {
      res.status(400).json({ error: 'Website URL is required' });
      return;
    }
    
    if (!extensions || !extensions.length) {
      res.status(400).json({ error: 'At least one file extension is required' });
      return;
    }
    
    const maxDepth = parseInt(String(crawlDepth));
    logDebug(`Starting crawl of ${website} with max depth: ${maxDepth}`);
    
    // Extract size filters if provided
    const minSizeFilter = sizeFilters?.minSize || null;
    const maxSizeFilter = sizeFilters?.maxSize || null;
    
    if (minSizeFilter || maxSizeFilter) {
      logDebug(`Size filters applied - Min: ${JSON.stringify(minSizeFilter)}, Max: ${JSON.stringify(maxSizeFilter)}`);
    }
    
    // Use the statically imported service function
    try {
      const result = await crawlWebsiteService(website, extensions, maxDepth, minSizeFilter, maxSizeFilter);
      res.json(result);
    } catch (serviceError) {
      console.error('Error in crawler service:', serviceError);
      res.status(500).json({ error: 'An error occurred during crawling' });
    }
  } catch (error) {
    console.error('Crawl error:', error);
    res.status(500).json({ error: 'An error occurred during crawling' });
  }
};