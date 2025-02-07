import StorageTimeline from "nodejs-storage-timeline";

const storagePath = "./files";
const schemaName = "crypto-news";
const timeLineName = "fallout";

const storage = new StorageTimeline.Storage(storagePath);
const schema = storage.get(schemaName);
const timeLine = schema.get(timeLineName);
timeLine.nextString((error, event) => {
    if (!error) {

        const time = event.time;
        const value = event.value;

        console.log(time, value);
    }
});
