"use client";

import { useState } from "react";
import { crawlWebsite, getProxyUrl } from "@/lib/api";
import { DisplayFile } from "@/types/api";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/Card";
import { Button } from "@/components/Button";

export default function Home() {
  const [url, setUrl] = useState("");
  const [fileExtensions, setFileExtensions] = useState<string[]>(["pdf", "doc", "docx", "xls", "xlsx"]);
  const [customExtension, setCustomExtension] = useState("");
  const [maxDepth, setMaxDepth] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{
    files: DisplayFile[];
    thumbnailConnections: any[];
    crawlInfo?: {
      pagesVisited: number;
      duration: number;
      baseUrl: string;
    };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExtensionDropdownOpen, setIsExtensionDropdownOpen] = useState(false);
  // New state for image preview
  const [previewImage, setPreviewImage] = useState<{url: string, filename: string} | null>(null);
  
  // File size filter states
  const [minSizeEnabled, setMinSizeEnabled] = useState(false);
  const [maxSizeEnabled, setMaxSizeEnabled] = useState(false);
  const [minSize, setMinSize] = useState(100);
  const [maxSize, setMaxSize] = useState(1000);
  const [minSizeUnit, setMinSizeUnit] = useState<'KB' | 'MB'>('KB');
  const [maxSizeUnit, setMaxSizeUnit] = useState<'KB' | 'MB'>('KB');

  const extensionCategories = [
    { 
      label: "Documents", 
      options: [
        { label: "PDF (*.pdf)", value: "pdf" },
        { label: "Word (*.doc, *.docx)", value: "doc,docx" },
        { label: "Excel (*.xls, *.xlsx)", value: "xls,xlsx" },
        { label: "PowerPoint (*.ppt, *.pptx)", value: "ppt,pptx" },
        { label: "Text (*.txt)", value: "txt" },
      ]
    },
    {
      label: "Images",
      options: [
        { label: "JPEG (*.jpg, *.jpeg)", value: "jpg,jpeg" },
        { label: "PNG (*.png)", value: "png" },
        { label: "GIF (*.gif)", value: "gif" },
        { label: "WebP (*.webp)", value: "webp" },
        { label: "SVG (*.svg)", value: "svg" },
      ]
    },
    {
      label: "Videos",
      options: [
        { label: "MP4 (*.mp4)", value: "mp4" },
        { label: "WebM (*.webm)", value: "webm" },
        { label: "MKV (*.mkv)", value: "mkv" },
        { label: "AVI (*.avi)", value: "avi" },
        { label: "MOV (*.mov)", value: "mov" },
        { label: "TS (*.ts)", value: "ts" },
      ]
    },
    {
      label: "Audio",
      options: [
        { label: "MP3 (*.mp3)", value: "mp3" },
        { label: "WAV (*.wav)", value: "wav" },
        { label: "AAC (*.aac)", value: "aac" },
        { label: "FLAC (*.flac)", value: "flac" },
      ]
    },
    {
      label: "Archives",
      options: [
        { label: "ZIP (*.zip)", value: "zip" },
        { label: "RAR (*.rar)", value: "rar" },
        { label: "7Z (*.7z)", value: "7z" },
        { label: "TAR (*.tar)", value: "tar" },
        { label: "GZ (*.gz)", value: "gz" },
      ]
    },
  ];

  const handleExtensionChange = (extensionValue: string, checked: boolean) => {
    const values = extensionValue.split(",");
    if (checked) {
      setFileExtensions(prev => [...prev, ...values.filter(v => !prev.includes(v))]);
    } else {
      setFileExtensions(prev => prev.filter(ext => !values.includes(ext)));
    }
  };

  const handleAddCustomExtension = () => {
    if (customExtension && customExtension.trim() !== "") {
      // Clean the input - remove dots and spaces
      const cleanExtension = customExtension.trim().replace(/^\.+/, "");
      
      if (cleanExtension && !fileExtensions.includes(cleanExtension)) {
        setFileExtensions(prev => [...prev, cleanExtension]);
      }
      setCustomExtension("");
    }
  };

  const handleRemoveExtension = (extension: string) => {
    setFileExtensions(prev => prev.filter(ext => ext !== extension));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      if (!url) {
        throw new Error("Please enter a URL");
      }

      const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
      
      const crawlData = {
        url: formattedUrl,
        fileExtensions,
        maxDepth,
        sizeFilters: {
          minSize: minSizeEnabled ? {
            size: minSize,
            unit: minSizeUnit
          } : null,
          maxSize: maxSizeEnabled ? {
            size: maxSize,
            unit: maxSizeUnit
          } : null
        }
      };

      const response = await crawlWebsite(crawlData);
      
      // Apply file size filters on the client side as well
      const filteredFiles = filterFilesBySize(response.files);
      
      setResults({
        files: filteredFiles,
        thumbnailConnections: response.thumbnailConnections,
        crawlInfo: {
          pagesVisited: response.files.length, // This is just a placeholder since we don't have actual crawlInfo
          duration: 0, // Placeholder
          baseUrl: formattedUrl
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to check if a file is previewable (image)
  const isPreviewable = (extension: string): boolean => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    return imageExtensions.includes(extension.toLowerCase());
  };

  // Function to filter files by size
  const filterFilesBySize = (files: DisplayFile[]): DisplayFile[] => {
    if (!minSizeEnabled && !maxSizeEnabled) return files;
    
    return files.filter(file => {
      // If file has no size property, we can't filter it
      if (file.size === undefined) return true;
      
      // Convert filter sizes to bytes for comparison
      const minSizeBytes = minSizeEnabled
        ? minSizeUnit === 'KB' 
          ? minSize * 1024
          : minSize * 1024 * 1024
        : 0;
      
      const maxSizeBytes = maxSizeEnabled
        ? maxSizeUnit === 'KB'
          ? maxSize * 1024
          : maxSize * 1024 * 1024
        : Infinity;
      
      // Check if file size is within the specified range
      const fileSize = file.size;
      return fileSize >= minSizeBytes && fileSize <= maxSizeBytes;
    });
  };

  // Function to open the preview modal
  const openPreview = (file: DisplayFile) => {
    setPreviewImage({
      url: getProxyUrl(file.url),
      filename: file.filename
    });
  };

  // Function to close the preview modal
  const closePreview = () => {
    setPreviewImage(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Header />
      
      <main className="py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-2">Web File Crawler</h1>
            <p className="text-lg text-muted-foreground">Discover and download files from any website</p>
          </div>
          
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Crawl Website</CardTitle>
              <CardDescription>Enter a URL and select file types to discover</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-foreground mb-2">
                    Website URL
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <input
                      id="url"
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Enter website URL (e.g., example.com)"
                      className="block w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-card text-foreground transition-colors"
                    />
                  </div>
                </div>
                
                <div>
                  <fieldset>
                    <legend className="block text-sm font-medium text-foreground mb-3">
                      File Extensions to Crawl
                    </legend>
                    
                    {extensionCategories.map((category) => (
                      <div key={category.label} className="mb-4">
                        <h3 className="text-sm font-medium text-foreground mb-2">{category.label}</h3>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                          {category.options.map((option) => (
                            <div 
                              key={option.value} 
                              className={`flex items-center p-2 rounded-lg border ${
                                option.value.split(',').some(v => fileExtensions.includes(v)) 
                                  ? 'bg-accent/10 border-accent/30' 
                                  : 'bg-card border-border hover:bg-muted'
                              } cursor-pointer transition-colors`}
                              onClick={() => handleExtensionChange(
                                option.value, 
                                !option.value.split(',').some(v => fileExtensions.includes(v))
                              )}
                            >
                              <input
                                id={`ext-${option.value}`}
                                type="checkbox"
                                className="h-4 w-4 text-accent border-border rounded focus:ring-accent"
                                checked={option.value.split(',').some(v => fileExtensions.includes(v))}
                                onChange={(e) => handleExtensionChange(option.value, e.target.checked)}
                              />
                              <label htmlFor={`ext-${option.value}`} className="ml-2 text-sm text-foreground cursor-pointer truncate">
                                {option.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    <div className="mt-4">
                      <label htmlFor="customExtension" className="block text-sm font-medium text-foreground mb-2">
                        Add Custom Extension
                      </label>
                      <div className="flex">
                        <input
                          id="customExtension"
                          type="text"
                          value={customExtension}
                          onChange={(e) => setCustomExtension(e.target.value)}
                          placeholder="e.g., csv"
                          className="block w-full px-4 py-3 border border-border rounded-l-lg focus:ring-2 focus:ring-accent focus:border-accent bg-card text-foreground transition-colors"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomExtension}
                          className="px-4 py-3 border border-border border-l-0 rounded-r-lg bg-accent text-white"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-2">
                        {fileExtensions.map((ext) => (
                          <div key={ext} className="flex items-center px-3 py-1 bg-accent/10 text-accent rounded-full">
                            <span className="text-sm">{ext}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveExtension(ext)}
                              className="ml-2 text-accent hover:text-accent-dark"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </fieldset>
                </div>
                
                <div>
                  <label htmlFor="maxDepth" className="block text-sm font-medium text-foreground mb-2">
                    Maximum Crawl Depth
                  </label>
                  <select
                    id="maxDepth"
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(Number(e.target.value))}
                    className="block w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent bg-card text-foreground transition-colors"
                  >
                    <option value={1}>1 - Homepage only</option>
                    <option value={2}>2 - Homepage + linked pages (recommended)</option>
                    <option value={3}>3 - Deep crawl (may take longer)</option>
                  </select>
                </div>
                
                <div>
                  <fieldset>
                    <legend className="block text-sm font-medium text-foreground mb-3">
                      File Size Filters
                    </legend>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Min file size filter */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label htmlFor="minSize" className="flex items-center text-sm text-foreground">
                            <span>Larger than</span>
                          </label>
                          <div className="flex items-center">
                            <label className="inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={minSizeEnabled}
                                onChange={(e) => setMinSizeEnabled(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="relative w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-accent peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                              <span className="ml-1 text-sm font-medium text-foreground">{minSizeEnabled ? "On" : "Off"}</span>
                            </label>
                          </div>
                        </div>
                        <div className="flex">
                          <input
                            id="minSize"
                            type="number"
                            min={0}
                            value={minSize}
                            onChange={(e) => setMinSize(parseInt(e.target.value) || 0)}
                            disabled={!minSizeEnabled}
                            className="block w-full px-4 py-3 border border-border rounded-l-lg focus:ring-2 focus:ring-accent focus:border-accent bg-card text-foreground transition-colors disabled:opacity-50"
                          />
                          <select
                            value={minSizeUnit}
                            onChange={(e) => setMinSizeUnit(e.target.value as 'KB' | 'MB')}
                            disabled={!minSizeEnabled}
                            className="px-4 py-3 border border-border border-l-0 rounded-r-lg bg-card text-foreground transition-colors focus:ring-2 focus:ring-accent focus:border-accent disabled:opacity-50"
                          >
                            <option value="KB">KB</option>
                            <option value="MB">MB</option>
                          </select>
                        </div>
                      </div>
                      
                      {/* Max file size filter */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label htmlFor="maxSize" className="flex items-center text-sm text-foreground">
                            <span>Smaller than</span>
                          </label>
                          <div className="flex items-center">
                            <label className="inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={maxSizeEnabled}
                                onChange={(e) => setMaxSizeEnabled(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="relative w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-accent peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                              <span className="ml-1 text-sm font-medium text-foreground">{maxSizeEnabled ? "On" : "Off"}</span>
                            </label>
                          </div>
                        </div>
                        <div className="flex">
                          <input
                            id="maxSize"
                            type="number"
                            min={0}
                            value={maxSize}
                            onChange={(e) => setMaxSize(parseInt(e.target.value) || 0)}
                            disabled={!maxSizeEnabled}
                            className="block w-full px-4 py-3 border border-border rounded-l-lg focus:ring-2 focus:ring-accent focus:border-accent bg-card text-foreground transition-colors disabled:opacity-50"
                          />
                          <select
                            value={maxSizeUnit}
                            onChange={(e) => setMaxSizeUnit(e.target.value as 'KB' | 'MB')}
                            disabled={!maxSizeEnabled}
                            className="px-4 py-3 border border-border border-l-0 rounded-r-lg bg-card text-foreground transition-colors focus:ring-2 focus:ring-accent focus:border-accent disabled:opacity-50"
                          >
                            <option value="KB">KB</option>
                            <option value="MB">MB</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </fieldset>
                </div>
                
                <Button
                  type="submit"
                  isLoading={isLoading}
                  disabled={isLoading}
                  size="lg"
                  className="w-full"
                >
                  {isLoading ? 'Crawling...' : 'Start Crawling'}
                </Button>
              </form>
            </CardContent>
          </Card>
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 mb-8 rounded-lg shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {results && results.files.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between">
                  <CardTitle>Found {results.files.length} Files</CardTitle>
                  {results.crawlInfo && (
                    <div className="mt-2 md:mt-0 text-sm text-muted-foreground">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-accent/10 text-accent mr-2">
                        {results.crawlInfo.pagesVisited} pages visited
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-accent/10 text-accent">
                        {(results.crawlInfo.duration/1000).toFixed(2)}s
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto rounded-lg">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          File
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Type
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Size
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Found On
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {results.files.map((file, index) => (
                        <tr key={index} className="hover:bg-muted/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-foreground truncate max-w-[150px] sm:max-w-xs">{file.filename}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
                              {file.extension}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-muted-foreground">{file.formattedSize || 'Unknown'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-xs">
                              {file.foundOnPage}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center space-x-2">
                              {isPreviewable(file.extension) && (
                                <Button variant="outline" size="sm" onClick={() => openPreview(file)} className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  Preview
                                </Button>
                              )}
                              <a 
                                href={getProxyUrl(file.url)} 
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                              >
                                <Button variant="outline" size="sm">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  Download
                                </Button>
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {previewImage && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4"
              onClick={closePreview}
            >
              <div 
                className="bg-card dark:bg-gray-800 rounded-lg overflow-hidden shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center p-4 border-b border-border">
                  <h3 className="text-lg font-medium text-foreground">{previewImage.filename}</h3>
                  <div className="flex items-center space-x-2">
                    <a 
                      href={previewImage.url} 
                      download={previewImage.filename}
                      className="text-accent hover:text-accent-dark p-2 rounded-full hover:bg-accent/10"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                    <button 
                      onClick={closePreview} 
                      className="text-muted-foreground hover:text-foreground p-2 rounded-full hover:bg-muted"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gradient-to-r from-gray-50/30 to-gray-100/30 dark:from-gray-800/30 dark:to-gray-900/30">
                  <img 
                    src={previewImage.url} 
                    alt={previewImage.filename} 
                    className="max-w-full max-h-[calc(90vh-8rem)] object-contain" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).onerror = null;
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIj48L2NpcmNsZT48bGluZSB4MT0iNC45MyIgeTE9IjQuOTMiIHgyPSIxOS4wNyIgeTI9IjE5LjA3Ij48L2xpbmU+PC9zdmc+';
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {!results && (
            <Card className="mb-8">
              <CardContent className="text-center">
                <svg className="mx-auto h-12 w-12 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-foreground">No files found</h3>
                <p className="mt-1 text-muted-foreground">No files were found matching the selected criteria.</p>
              </CardContent>
            </Card>
          )}
          
          <footer className="mt-12 text-center text-sm text-muted-foreground">
            <p>Web File Crawler &copy; {new Date().getFullYear()}</p>
          </footer>
        </div>
      </main>
    </div>
  );
}