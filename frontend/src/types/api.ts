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
  relatedFiles?: RelatedFile[];
  /** Whether the file is selected */
  selected?: boolean;
}

/**
 * Interface for related files
 */
export interface RelatedFile {
  /** Type of related file */
  type: string;
  /** URL of related file */
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
 * Interface for frontend display types with properly formatted names
 */
export interface DisplayFile {
  /** URL of the file */
  url: string;
  /** File name extracted from URL */
  filename: string;
  /** File extension */
  extension: string;
  /** Page URL where the file was found */
  foundOnPage: string;
  /** Thumbnail URL */
  thumbnailUrl: string | null;
  /** File size in bytes */
  size?: number;
  /** Formatted file size */
  formattedSize?: string;
  /** Whether the file is embedded */
  isEmbedded?: boolean;
  /** Related files */
  relatedFiles?: RelatedFile[];
  /** Whether the file is selected */
  selected?: boolean;
}