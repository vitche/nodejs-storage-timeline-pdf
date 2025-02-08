import fs from "fs";
import path from "path";
import {fileURLToPath} from "url";
import {allEvents, buildJSONHTMLFormatter} from "../main.js";
import StorageTimeline from "nodejs-storage-timeline";

// Resolve __dirname in ECMAScript modules.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust these to match your folder/file structure.
const storagePath = "../files";
const schemaName = "crypto-news";
const timeLineName = "fallout";

// Instantiate the storage and timeline.
const storage = new StorageTimeline.Storage(storagePath);
const schema = storage.get(schemaName);
const timeLine = schema.get(timeLineName);

// Create the path to store the resulting PDF file.
// This will place "timeline.pdf" alongside your timeline data.
const pdfFilePath = path.join(
    __dirname,
    "..",                // Go up from ./tests/
    "files",
    schemaName,
    timeLineName + ".pdf"
);

allEvents(timeLine, timeLineName)
    .toHTML(buildJSONHTMLFormatter(['uri', 'text']))   // Convert to Markdown first.
    .toPDF()        // Then produce a PDF from that Markdown.
    .toBuffer()     // Get the conversion result as a Buffer.
    .then((pdfBuffer) => {
        fs.writeFileSync(pdfFilePath, pdfBuffer);
        console.log(`PDF saved to: ${pdfFilePath}`);
    })
    .catch(console.error);
