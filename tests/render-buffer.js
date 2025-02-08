import { allEvents } from "../main.js";

import StorageTimeline from "nodejs-storage-timeline";

const storagePath = "../files";
const schemaName = "crypto-news";
const timeLineName = "fallout";

const storage = new StorageTimeline.Storage(storagePath);
const schema = storage.get(schemaName);
const timeLine = schema.get(timeLineName);

// Default or custom formatter can be used before .toPDF()
allEvents(timeLine)
    .toMarkDown()
    .toPDF()
    .toBuffer()
    .then((pdfBuffer) => {
        console.log("PDF buffer size:", pdfBuffer.length);
        // Do something with the PDF, e.g., save to disk, send via Express, etc.
    })
    .catch(console.error);
