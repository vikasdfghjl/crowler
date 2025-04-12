import axios from 'axios';
import * as cheerio from 'cheerio';
import * as url from 'url';
import * as path from 'path';
import { FileEntry, ThumbnailConnection } from '../types';
import { normalizeUrl, isThumbnail, logDebug, formatFileSize } from '../utils';
import { getFileSize } from './fileService';

/**
 * Function to check and extract CDN URLs, particularly for Bunkr
 */
export function extractBunkrCdnUrls(html: string, baseUrl: string, extensionList: string[]): string[] {
  const cdnUrls: string[] = [];
  
  try {
    // Common CDN patterns for Bunkr
    const cdnPatterns = [
      // Match standard CDN URLs
      /https?:\/\/cdn[0-9]*\.bunkr\.(?:ru|cr|is|sk|to)\/[a-zA-Z0-9\/_\-.]+\.(mp4|jpg|jpeg|png|gif|webm|mp3)/gi,
      // Match URLs in JavaScript variables or JSON
      /"(?:url|src|file)"\s*:\s*"(https?:\/\/[^"]*?\.(mp4|jpg|jpeg|png|gif|webm|mp3))"/gi,
      // Match URLs in JavaScript string assignments
      /['"]?(https?:\/\/[^'"]*?\.(mp4|jpg|jpeg|png|gif|webm|mp3))['"]?/gi
    ];
    
    cdnPatterns.forEach(pattern => {
      const matches = html.match(pattern);
      if (matches) {
        matches.forEach(match => {
          // Clean up the URL by removing quotes and whitespace
          let cdnUrl = match.replace(/['"]/g, '').trim();
          
          // If it's a key-value pair from JSON, extract just the URL
          if (cdnUrl.includes('":"')) {
            cdnUrl = cdnUrl.split('":"')[1];
          }
          
          // Check if the extracted URL matches one of our desired extensions
          const urlExt = cdnUrl.split('.').pop()?.toLowerCase();
          if (urlExt && extensionList.includes(urlExt)) {
            cdnUrls.push(cdnUrl);
          }
        });
      }
    });
    
    // Look for indirect references to mp4 files (common in Bunkr)
    const streamRefPattern = /(stream-[a-zA-Z0-9]+)/gi;
    const streamMatches = html.match(streamRefPattern);
    
    if (streamMatches) {
      streamMatches.forEach(streamId => {
        // For each stream reference, construct a possible CDN URL
        extensionList.forEach(ext => {
          // Common CDN URL pattern for Bunkr
          const possibleCdnUrl = `https://cdn.bunkr.cr/stream/${streamId}.${ext}`;
          cdnUrls.push(possibleCdnUrl);
        });
      });
    }
  } catch (error) {
    console.error("Error extracting CDN URLs:", error);
  }
  
  return cdnUrls;
}

/**
 * Main crawling function that crawls a website for files with specific extensions
 */
export async function crawlWebsite(
  website: string, 
  extensions: string[], 
  crawlDepth: number = 0
): Promise<{files: FileEntry[], thumbnailConnections: ThumbnailConnection[]}> {
  const extensionList = extensions.map(ext => ext.toLowerCase());
  const foundFiles: FileEntry[] = [];
  const visitedUrls = new Set<string>();
  const thumbnailConnections = new Map<string, string>(); // To track thumbnail -> content relationships
  
  // Function to crawl the website
  async function crawlPage(pageUrl: string, depth = 0, referrerThumbnailUrl: string | null = null) {
    if (visitedUrls.has(pageUrl) || depth > crawlDepth) {
      return;
    }
    
    visitedUrls.add(pageUrl);
    
    try {
      console.log(`Crawling: ${pageUrl} (depth: ${depth})`);
      
      // Special handling for bunkr.cr domain
      const isBunkrSite = pageUrl.includes('bunkr.cr');
      let response;
      
      if (isBunkrSite) {
        console.log('Detected Bunkr site, using specialized headers');
        response = await axios.get(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://bunkr.cr/',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          timeout: 15000 // Longer timeout for this site
        });
      } else {
        response = await axios.get(pageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 8000 // Increased timeout for potentially slower media pages
        });
      }
      
      const baseUrl = pageUrl;
      const $ = cheerio.load(response.data as string);
      
      // Special handling for Bunkr site content extraction
      if (isBunkrSite) {
        console.log('Applying Bunkr-specific content extraction');
        
        // Extract CDN URLs from the HTML content first
        const cdnUrls = extractBunkrCdnUrls(response.data as string, baseUrl, extensionList);
        console.log(`Found ${cdnUrls.length} potential CDN URLs in page source`);
        
        cdnUrls.forEach(cdnUrl => {
          const parsedUrl = url.parse(cdnUrl);
          const pathName = parsedUrl.pathname || '';
          
          const fileName = path.basename(pathName);
          const fileType = path.extname(pathName).substring(1).toLowerCase();
          
          if (extensionList.includes(fileType)) {
            const fileEntry: FileEntry = {
              url: cdnUrl,
              fileName,
              fileType,
              sourceUrl: pageUrl,
              thumbnailUrl: null,
              selected: false
            };
            
            if (!foundFiles.some(file => file.url === cdnUrl)) {
              foundFiles.push(fileEntry);
              console.log(`Added CDN file: ${fileName} (${fileType})`);
            }
          }
        });
        
        // Find media elements specific to bunkr.cr structure
        $('.media-container, .stream-content, .album-media, .media-wrapper, .media-viewer').each((_, container) => {
          // Look for direct media elements
          $(container).find('video source, video, img, a.download-link, a.media-link').each((_, element) => {
            let mediaUrl: string | undefined = undefined;
            
            // Extract URL based on element type
            if ($(element).is('source')) {
              mediaUrl = $(element).attr('src');
            } else if ($(element).is('video')) {
              mediaUrl = $(element).attr('src');
            } else if ($(element).is('img')) {
              mediaUrl = $(element).attr('src');
            } else if ($(element).is('a')) {
              mediaUrl = $(element).attr('href');
            }
            
            if (!mediaUrl) return;
            
            const normalizedUrl = normalizeUrl(baseUrl, mediaUrl);
            if (!normalizedUrl) return;
            
            const parsedUrl = url.parse(normalizedUrl);
            const pathName = parsedUrl.pathname || '';
            
            if (extensionList.some(ext => pathName.toLowerCase().endsWith(`.${ext}`))) {
              const fileName = path.basename(pathName);
              const fileType = path.extname(pathName).substring(1);
              
              const fileEntry: FileEntry = {
                url: normalizedUrl,
                fileName,
                fileType,
                sourceUrl: pageUrl,
                thumbnailUrl: null,
                selected: false
              };
              
              if (!foundFiles.some(file => file.url === normalizedUrl)) {
                foundFiles.push(fileEntry);
              }
            }
          });
          
          // Look for JSON data in scripts that might contain media URLs
          $('script').each((_, scriptElem) => {
            const scriptContent = $(scriptElem).html() || '';
            
            // Look for common patterns in script content that might contain media URLs
            const mediaMatches = scriptContent.match(/["'](https?:\/\/[^"']*\.(mp4|jpg|jpeg|png|gif|webm|mp3))['"]/gi);
            if (mediaMatches) {
              mediaMatches.forEach(match => {
                // Clean up the URL
                const mediaUrl = match.replace(/['"\s]/g, '');
                
                const parsedUrl = url.parse(mediaUrl);
                const pathName = parsedUrl.pathname || '';
                
                if (extensionList.some(ext => pathName.toLowerCase().endsWith(`.${ext}`))) {
                  const fileName = path.basename(pathName);
                  const fileType = path.extname(pathName).substring(1);
                  
                  const fileEntry: FileEntry = {
                    url: mediaUrl,
                    fileName,
                    fileType,
                    sourceUrl: pageUrl,
                    thumbnailUrl: null,
                    selected: false
                  };
                  
                  if (!foundFiles.some(file => file.url === mediaUrl)) {
                    foundFiles.push(fileEntry);
                  }
                }
              });
            }
          });
        });
        
        // Look for download links and buttons specific to Bunkr
        $('a.download-btn, a.dl-button, a[download], a[href*="download"], button.download-btn').each((_, element) => {
          const href = $(element).attr('href') || $(element).data('url') || $(element).data('href');
          if (!href) return;
          
          const normalizedUrl = normalizeUrl(baseUrl, href.toString());
          if (!normalizedUrl) return;
          
          const parsedUrl = url.parse(normalizedUrl);
          const pathName = parsedUrl.pathname || '';
          
          if (extensionList.some(ext => pathName.toLowerCase().endsWith(`.${ext}`))) {
            const fileName = path.basename(pathName);
            const fileType = path.extname(pathName).substring(1);
            
            const fileEntry: FileEntry = {
              url: normalizedUrl,
              fileName,
              fileType,
              sourceUrl: pageUrl,
              thumbnailUrl: null,
              selected: false
            };
            
            if (!foundFiles.some(file => file.url === normalizedUrl)) {
              foundFiles.push(fileEntry);
            }
          }
        });
      }
      
      // Find direct file links that match extensions
      $('a').each((_, element) => {
        const href = $(element).attr('href');
        if (!href) return;
        
        const normalizedUrl = normalizeUrl(baseUrl, href);
        if (!normalizedUrl) return;
        
        const parsedUrl = url.parse(normalizedUrl);
        const pathName = parsedUrl.pathname || '';
        
        // Check if file extension matches
        if (extensionList.some(ext => pathName.toLowerCase().endsWith(`.${ext}`))) {
          const fileName = path.basename(pathName);
          const fileType = path.extname(pathName).substring(1);
          
          const fileEntry: FileEntry = {
            url: normalizedUrl,
            fileName,
            fileType,
            sourceUrl: pageUrl,
            thumbnailUrl: referrerThumbnailUrl,
            selected: false
          };
          
          // Avoid duplicates
          if (!foundFiles.some(file => file.url === normalizedUrl)) {
            foundFiles.push(fileEntry);
          }
          
          // Add connection if this file was found through a thumbnail
          if (referrerThumbnailUrl) {
            thumbnailConnections.set(referrerThumbnailUrl, normalizedUrl);
          }
        }
        
        // If at max depth, don't crawl further links
        if (depth >= crawlDepth) return;
        
        // Only process embedded content and further crawling if depth > 0
        if (depth <= crawlDepth) {
          // Find embedded videos or iframes that might contain videos
          $('video, iframe').each((_, mediaElement) => {
            const src = $(mediaElement).attr('src');
            if (!src) return;
            
            const normalizedSrc = normalizeUrl(baseUrl, src);
            if (!normalizedSrc) return;
            
            const parsedSrc = url.parse(normalizedSrc);
            const pathName = parsedSrc.pathname || '';
            
            // Check if source matches extensions
            if (extensionList.some(ext => pathName.toLowerCase().endsWith(`.${ext}`) || 
                normalizedSrc.includes(`/embed/`) || // Common in video platforms
                normalizedSrc.includes(`/player/`))) {
              
              const fileName = path.basename(pathName) || `embedded_${new Date().getTime()}`;
              const fileType = path.extname(pathName).substring(1) || 'embedded';
              
              const fileEntry: FileEntry = {
                url: normalizedSrc,
                fileName,
                fileType,
                sourceUrl: pageUrl,
                thumbnailUrl: referrerThumbnailUrl,
                isEmbedded: true,
                selected: false
              };
              
              // Avoid duplicates
              if (!foundFiles.some(file => file.url === normalizedSrc)) {
                foundFiles.push(fileEntry);
              }
              
              if (referrerThumbnailUrl) {
                thumbnailConnections.set(referrerThumbnailUrl, normalizedSrc);
              }
            }
          });
          
          // Avoid external links and non-http(s) protocols for further crawling
          const parsedUrl = url.parse(normalizedUrl);
          const isSameHost = parsedUrl.hostname === url.parse(baseUrl).hostname;
          const isValidProtocol = normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://');
          
          if (isSameHost && isValidProtocol && visitedUrls.size < 100) {
            // Only follow links deeper if we haven't reached max depth yet
            if (depth < crawlDepth) {
              // Look for thumbnails that might lead to media pages (only if depth >= 2)
              if (crawlDepth >= 2) {
                const thumbImg = $(element).find('img').first();
                // Cast $ to any to avoid TypeScript errors with cheerio types
                const isThumb = thumbImg.length && isThumbnail($ as any, thumbImg.get(0));
                const thumbnailUrl = isThumb ? normalizedUrl : null;
                
                // If it's a thumbnail, follow it with priority and track source
                if (isThumb) {
                  crawlPage(normalizedUrl, depth + 1, normalizedUrl);
                } 
                // For non-thumbnails, check if it might still lead to a media page (only if depth >= 1)
                else if (crawlDepth >= 1 && (href.toLowerCase().includes('video') || 
                        href.toLowerCase().includes('media') ||
                        href.toLowerCase().includes('watch') ||
                        href.toLowerCase().includes('stream') ||
                        href.toLowerCase().includes('player') ||
                        href.toLowerCase().includes('gallery'))) {
                  // Crawl with lower priority
                  setTimeout(() => {
                    crawlPage(normalizedUrl, depth + 1, referrerThumbnailUrl);
                  }, 500); // Stagger these requests
                }
                // For simple direct links with depth 1
                else if (crawlDepth >= 1) {
                  // Less priority for regular links
                  setTimeout(() => {
                    crawlPage(normalizedUrl, depth + 1);
                  }, 1000);
                }
              } else if (crawlDepth == 1) {
                // Depth 1: Just follow direct links without complex analysis
                setTimeout(() => {
                  crawlPage(normalizedUrl, depth + 1);
                }, 1000);
              }
            }
          }
        }
      });
      
      // Only process thumbnails if we're going deep enough (depth >= 2)
      if (crawlDepth >= 2 && depth < crawlDepth) {
        // Find all images that might be thumbnails and follow their links
        $('img').each((_, element) => {
          // Cast $ to any to avoid TypeScript errors with cheerio types
          if (isThumbnail($ as any, element)) {
            const parentAnchor = $(element).closest('a');
            if (parentAnchor.length) {
              const href = $(parentAnchor).attr('href');
              if (!href) return;
              
              const normalizedUrl = normalizeUrl(baseUrl, href);
              if (!normalizedUrl) return;
              
              // Check if it's a same-domain link
              const parsedUrl = url.parse(normalizedUrl);
              const isSameHost = parsedUrl.hostname === url.parse(baseUrl).hostname;
              const isValidProtocol = normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://');
              
              if (isSameHost && isValidProtocol && !visitedUrls.has(normalizedUrl) && visitedUrls.size < 100) {
                const thumbnailUrl = normalizedUrl;
                const imgSrc = $(element).attr('src');
                const normalizedImgSrc = imgSrc ? normalizeUrl(baseUrl, imgSrc) : null;
                
                crawlPage(normalizedUrl, depth + 1, normalizedImgSrc || normalizedUrl);
              }
            }
          }
        });
      }
    } catch (error) {
      console.error(`Error crawling ${pageUrl}: ${(error as Error).message}`);
    }
  }
  
  // Start crawling from the provided website URL
  await crawlPage(website);
  
  // For Bunkr sites, try to check additional CDN domains
  if (website.includes('bunkr.cr')) {
    console.log('Checking additional Bunkr CDN URLs');
    
    // Common CDN domains for Bunkr
    const cdnDomains = [
      'cdn.bunkr.cr',
      'cdn1.bunkr.cr',
      'cdn2.bunkr.cr',
      'media.bunkr.cr',
      'stream.bunkr.cr'
    ];
    
    // Extract album or content ID from URL
    const albumMatch = website.match(/\/a\/([a-zA-Z0-9]+)/);
    if (albumMatch && albumMatch[1]) {
      const albumId = albumMatch[1];
      
      // Try constructing direct CDN URLs for common patterns
      for (const cdnDomain of cdnDomains) {
        for (const ext of extensionList) {
          // Check if we've hit the file limit
          if (foundFiles.length >= 100) break;
          
          // Different patterns Bunkr might use
          const possibleUrls = [
            `https://${cdnDomain}/a/${albumId}/content.${ext}`,
            `https://${cdnDomain}/albums/${albumId}/media.${ext}`,
            `https://${cdnDomain}/stream/${albumId}.${ext}`,
            `https://${cdnDomain}/${albumId}.${ext}`
          ];
          
          for (const possibleUrl of possibleUrls) {
            try {
              const response = await axios.head(possibleUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  'Referer': website
                },
                timeout: 3000,
                validateStatus: status => status < 400 // Accept any non-error status code
              });
              
              if (response.status < 400) {
                console.log(`Found valid file at: ${possibleUrl}`);
                
                const fileName = `bunkr_${albumId}.${ext}`;
                const fileEntry: FileEntry = {
                  url: possibleUrl,
                  fileName,
                  fileType: ext,
                  sourceUrl: website,
                  thumbnailUrl: null,
                  selected: false
                };
                
                if (!foundFiles.some(file => file.url === possibleUrl)) {
                  foundFiles.push(fileEntry);
                }
              }
            } catch (error) {
              // Just continue to next URL, no need to log each 404
            }
          }
        }
      }
    }
  }
  
  // Process the found files to include thumbnail relationships and file sizes
  const processedFiles: FileEntry[] = [];
  
  // Get file sizes in parallel to improve performance
  const sizePromises = foundFiles.map(file => getFileSize(file.url));
  const fileSizes = await Promise.all(sizePromises);
  
  // Add size information to files
  foundFiles.forEach((file, index) => {
    const size = fileSizes[index] || 0;
    
    // Check if this file has a related thumbnail
    let relatedFiles = [];
    if (file.thumbnailUrl) {
      relatedFiles.push({
        type: 'thumbnail',
        url: file.thumbnailUrl
      });
    }
    
    processedFiles.push({
      ...file,
      size: size,
      formattedSize: size ? formatFileSize(size) : 'Unknown',
      relatedFiles
    });
  });
  
  return { 
    files: processedFiles,
    thumbnailConnections: Array.from(thumbnailConnections).map(([thumb, content]) => ({
      thumbnail: thumb,
      content
    }))
  };
}