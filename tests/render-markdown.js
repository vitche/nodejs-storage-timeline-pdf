import {allEvents} from "../main.js";
import StorageTimeline from "nodejs-storage-timeline";

// Paths and names to match your setup
const storagePath = "../files";       // Where your timeline data is stored
const schemaName = "crypto-news";     // Schema name
const timeLineName = "fallout";       // Timeline name

// Initialize storage and timeline
const storage = new StorageTimeline.Storage(storagePath);
const schema = storage.get(schemaName);
const timeLine = schema.get(timeLineName);

// Render timeline to Markdown and output to console
allEvents(timeLine, timeLineName)
    .toMarkDown()    // Convert events to Markdown
    .toBuffer()      // Get the result as a Buffer
    .then((markdownBuffer) => {
        // Convert the Buffer to a string and log it
        const markdownString = markdownBuffer.toString("utf-8");
        console.log(markdownString);
    })
    .catch(console.error);
