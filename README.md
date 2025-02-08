# `Storage.Timeline` PDF rendering for Node.js projects

A utility library that integrates with [nodejs-storage-timeline](https://github.com/vitche/nodejs-storage-timeline) to collect timeline events and produce outputs in multiple formats—Markdown, HTML, and PDF—using [puppeteer](https://github.com/puppeteer/puppeteer).

This project provides:

• Methods to gather all events from a timeline.  
• Utility functions to convert these events into Markdown or HTML.  
• The capability to generate PDF files from HTML or Markdown content.  
• Chainable APIs for flexible formatting workflows.

--------------------------------------------------------------------------------

## Table of Contents

1. [Features](#features)
2. [Installation](#installation)
3. [Usage Overview](#usage-overview)
4. [API Reference](#api-reference)
5. [Examples](#examples)
6. [Project Structure](#project-structure)
7. [License](#license)

--------------------------------------------------------------------------------

## Features

• Gather events from a timeline (backed by the [nodejs-storage-timeline](https://github.com/vitche/nodejs-storage-timeline) library).  
• Transform timeline events into Markdown and/or HTML using default or custom formatters.  
• Convert HTML or Markdown content into PDF using [puppeteer](https://github.com/puppeteer/puppeteer).  
• Chainable API to easily define and execute a pipeline (e.g., `.toHTML().toPDF().toBuffer()`).  
• Builders for JSON-based event formatters (allows you to selectively extract fields from JSON values).

--------------------------------------------------------------------------------

## Installation

1. Clone or download this repo (or include it as a dependency in your existing project).  
2. Ensure you have Node.js >= 16 installed.  
3. Install dependencies:

   npm install

Since this project references the custom [nodejs-storage-timeline](https://github.com/vitche/nodejs-storage-timeline) repository, you must also have the correct Git credentials or SSH setup to pull from GitHub, if needed.

--------------------------------------------------------------------------------

## Usage Overview

Below is a brief outline of how to use the main features of this library:

1. Have an instance of your timeline from nodejs-storage-timeline:

    ```javascript
    import StorageTimeline from "nodejs-storage-timeline";
    const storage = new StorageTimeline.Storage("./path-to-timeline-files");
    const schema = storage.get("mySchema");
    const timeLine = schema.get("myTimeline");
    ```

2. Use the chainable API to collect and format events:

    ```javascript
    import { allEvents } from "./main.js";
    
    allEvents(timeLine, "myTimeline")
       .toMarkDown()        // or .toHTML(), optionally with a custom formatter
       .toBuffer()
       .then((buffer) => {
           // Do something with the resulting buffer (e.g., write to file)
           console.log(buffer.toString());
       })
       .catch(console.error);
    ```

3. Generate a PDF by chaining .toPDF():

    ```javascript
    allEvents(timeLine, "myTimeline")
       .toHTML()
       .toPDF()
       .toBuffer()
       .then((pdfBuffer) => {
           // This buffer is your PDF
           console.log("PDF size:", pdfBuffer.length);
       })
       .catch(console.error);
    ```

--------------------------------------------------------------------------------

## API Reference

### allEvents(timeLine, timeLineName)

Collects all events from a given timeline and returns a chainable object with several methods:

#### .toMarkDown([formatter])  
  – Transforms events into a Markdown string.  
  – Optionally pass a custom formatter of the form (events, timelineName) => string.  
#### .toHTML([formatter])  
  – Transforms events into HTML.  
  – Optionally pass a custom formatter.  
#### .toPDF()  
  – Converts the most recent output (either HTML or Markdown) into a PDF buffer. If called without prior .toMarkDown() or .toHTML(), it defaults to HTML.  
#### .toBuffer()  
  – Returns a Promise. The final data can be an Array of raw events, a Markdown string, HTML, or a PDF buffer, depending on previous transformations.

### buildJSONMarkdownFormatter(fields)

Returns a Markdown formatter function that will parse each event’s `.value` as JSON, extracting only the specified fields:

```javascript
const myFormatter = buildJSONMarkdownFormatter(["title", "description"]);
```

### buildJSONHTMLFormatter(fields)

Returns an HTML formatter function that will parse each event’s `.value` as JSON, extracting only the specified fields, presented as a bullet list:

```javascript
const myHTMLFormatter = buildJSONHTMLFormatter(["title", "description"]);
```

--------------------------------------------------------------------------------

## Examples

A few example scripts are included in the `tests/` directory:

### tests/populate.js  
  – Demonstrates how to populate a timeline with events from a JSON file.  
### tests/render-markdown.js  
  – Collects events and renders them as Markdown to the console.  
### tests/render-buffer.js  
  – Creates a PDF buffer in memory (logged by file size).  
### tests/render-file.js  
  – Saves a PDF to disk, using a custom HTML formatter for JSON-based events.

To run these examples:

1. Ensure you have the timeline and schema set up by running the populate script:
    ```shell
    node tests/populate.js
    ```

2. Preview the events in Markdown:
    ```shell
    node tests/render-markdown.js
    ```

3. Generate a PDF buffer in memory:
    ```shell
    node tests/render-buffer.js
    ```

4. Save a PDF to disk:
    ```shell
    node tests/render-file.js
    ```

--------------------------------------------------------------------------------

## Project Structure

### main.js  
  – Contains all the core functions for formatting timelines (Markdown, HTML, PDF) and the chainable pipeline via allEvents().  
### tests/  
  – Example scripts to populate and read from a timeline, generating different outputs.  
### package.json  
  – Project configuration, including scripts and dependencies.  
### commit.sh  
  – Simple Git configuration script (optional).  
### README.md  
  – This file.

--------------------------------------------------------------------------------

## License

Licensed under the [LGPL-3.0-or-later](https://www.gnu.org/licenses/lgpl-3.0.html).  
© Vitche Research Team Developer <developer@vitche.com>.

--------------------------------------------------------------------------------

For more information, please contact the Vitche Research Team Developer at <developer@vitche.com>. Contributions and pull requests are welcome!

