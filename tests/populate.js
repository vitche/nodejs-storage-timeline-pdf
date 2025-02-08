import * as fs from "fs";
import StorageTimeline from "nodejs-storage-timeline";

// Open the storage
const storage = new StorageTimeline.Storage('./files');

// Create a schema
storage.create('crypto-news', function (error) {

    if (error) {
        console.error('Error creating schema:', error);
        return;
    }

    const schema = storage.get('crypto-news');

    // Create a time-line
    schema.create('fallout', function (error) {
        if (error) {
            console.error('Error creating time-line:', error);
            return;
        }

        const timeLine = schema.get('fallout');

        // Read events from the JSON file
        fs.readFile('tests/events.json', 'utf-8', (error, data) => {
            if (error) {
                return;
            }

            const events = JSON.parse(data);
            addEventsToTimeline(events, timeLine, 0);
        });

    });
});

function addEventsToTimeline(events, timeLine, index) {
    if (index >= events.length) {
        console.log("The `./files/crypto-news/fallout` time-line was populated.");
        return;
    }
    timeLine.add(events[index].time, events[index].value, function () {
        addEventsToTimeline(events, timeLine, index + 1);
    });
}
