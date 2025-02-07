import StorageTimeline from "nodejs-storage-timeline";

const storagePath = "./files";
const schemaName = "crypto-news";
const timeLineName = "fallout";

const storage = new StorageTimeline.Storage(storagePath);
const schema = storage.get(schemaName);
const timeLine = schema.get(timeLineName);

function processNextString() {
    timeLine.nextString((error, event) => {
        if (!error && event) {
            console.log(event.time, event.value);
            processNextString(); // Recursively call for the next event
        }
    });
}

processNextString();
