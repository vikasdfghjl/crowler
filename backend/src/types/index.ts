/**
 * Interface for a file entry found during crawling
 */
export interface FileEntry {
  /** URL of the file */
  url: string;
  /** File name extracted from URL */
  fileName: string;
  /** File extension */
  fileType: string;
  /** Page URL where the file was found */
  sourceUrl: string;
  /** Thumbnail URL */
  thumbnailUrl: string | null;
  /** File size in bytes */
  size?: number;
  /** Formatted file size */
  formattedSize?: string;
  /** Whether the file is embedded */
  isEmbedded?: boolean;
  /** Related files */
  relatedFiles?: any[];
  /** Whether the file is selected */
  selected?: boolean;
}

/**
 * Interface for related files
 */
export interface RelatedFile {
  type: string;
  url: string;
}

/**
 * Interface for thumbnail to content connection
 */
export interface ThumbnailConnection {
  /** URL of the thumbnail */
  thumbnail: string;
  /** URL of the content */
  content: string;
}

/**
 * Interface for a file size filter
 */
export interface FileSizeFilter {
  /** Size value */
  size: number;
  /** Size unit (KB or MB) */
  unit: 'KB' | 'MB';
}

/**
 * Interface for a crawl request
 */
export interface CrawlRequest {
  /** URL of the website to crawl */
  website: string;
  /** Array of file extensions to look for during crawl (e.g., ['pdf', 'doc']) */
  extensions: string[];
  /** Optional maximum depth for the crawler to traverse (default: 2) */
  crawlDepth?: number;
  /** Optional file size filters */
  sizeFilters?: {
    /** Minimum file size filter */
    minSize?: FileSizeFilter | null;
    /** Maximum file size filter */
    maxSize?: FileSizeFilter | null;
  };
}

/**
 * Interface for a crawl response
 */
export interface CrawlResponse {
  /** Array of files found during the crawl */
  files: FileEntry[];
  /** Information about the crawl process (optional) */
  crawlInfo?: {
    /** Total number of pages visited */
    pagesVisited: number;
    /** Duration of the crawl in milliseconds */
    duration: number;
    /** URL that was crawled */
    baseUrl: string;
  };
  /** Thumbnail connections (returned by backend) */
  thumbnailConnections: ThumbnailConnection[];
}