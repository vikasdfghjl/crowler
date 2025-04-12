# Website File Crawler & Downloader

A simple web application that allows you to crawl websites, search for files with specific extensions (like mp4, jpeg, etc.), and provide options to download them.

## Features

- Search for files with specific extensions on any website
- Support for common file extensions (mp4, jpeg, jpg, png, pdf)
- Option to add custom file extensions
- Filter results by file type
- Download individual files or all files at once
- Simple and intuitive user interface

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js with Express
- **Libraries**:
  - Axios (for HTTP requests)
  - Cheerio (for HTML parsing)
  - File-saver (for handling downloads)

## Getting Started

1. Make sure you have [Node.js](https://nodejs.org/) installed.
2. Clone or download this repository.
3. Install the dependencies:
   ```
   npm install
   ```
4. Start the server:
   ```
   npm start
   ```
5. Open your browser and visit `http://localhost:3000`

## Usage

1. Enter a website URL (must start with http:// or https://)
2. Select the file extensions you want to search for
3. Click "Start Crawling"
4. Wait for the results to appear
5. Filter results by file type if needed
6. Download individual files or all files at once

## Development

To run the application in development mode with auto-restart:

```
npm install -g nodemon
npm run dev
```

## Limitations

- The crawler is limited to 50 pages per website to avoid excessive crawling
- Some websites may block automated crawling attempts
- Downloads are handled by the browser's download mechanism
- The application respects the same-origin policy of websites

## License

ISC