import markdownPdf from "markdown-pdf";

/**
 * Collects all events from a `nodejs-storage-timeline` timeline into an array.
 * Each event has a `time` and a `value`.
 *
 * @param {TimeLine} timeLine - An instance from nodejs-storage-timeline
 * @returns {Promise<Array<{ time: string, value: string }>>} - All events
 */
function gatherAllEvents(timeLine) {
    return new Promise((resolve, reject) => {
        const allEvents = [];

        function getNext() {
            timeLine.nextString((err, event) => {
                if (err) return reject(err);
                if (!event) {
                    // No more events
                    return resolve(allEvents);
                }
                allEvents.push(event);
                getNext();
            });
        }

        getNext();
    });
}

/**
 * Default formatter for an array of events. Converts each event into a small
 * Markdown section titled with the event's time.
 *
 * You can pass your own formatter to `toMarkDown(formatter)` if you want a
 * different structure. The formatter must accept an array of events and return
 * a single Markdown string.
 *
 * @param {Array<{ time: string, value: string }>} events - The array of events
 * @returns {string} - Combined Markdown content
 */
function eventsToMarkdown(events) {
    return events
        .map(({ time, value }) => `## Event at ${time}\n\n${value}\n`)
        .join("\n---\n\n");
}

/**
 * Converts a Markdown string into a PDF buffer entirely in memory (no disk I/O).
 * Uses the `markdown-pdf` package under the hood.
 *
 * @param {string} markdown - The Markdown to convert
 * @returns {Promise<Buffer>} - The PDF as a Buffer
 */
function markdownToPDF(markdown) {
    return new Promise((resolve, reject) => {
        markdownPdf()
            .from.string(markdown)
            .to.buffer((err, buffer) => {
            if (err) return reject(err);
            resolve(buffer);
        });
    });
}

/**
 * Defines the carrying pipeline for timeline events. It provides the following chainable steps:
 *   - `.toMarkDown([formatter])` transforms raw events into Markdown.
 *   - `.toPDF()` transforms Markdown into a PDF.
 *   - `.toBuffer()` returns a Promise that resolves to the final result as a buffer.
 *
 * Usage examples:
 *   - `allEvents(timeLine).toMarkDown().toBuffer()` returns a Buffer with default Markdown.
 *   - `allEvents(timeLine).toMarkDown(myFormatter).toBuffer()` returns a Buffer with custom Markdown.
 *   - `allEvents(timeLine).toMarkDown().toPDF().toBuffer()` returns a Buffer containing PDF.
 *
 * If `.toBuffer()` is called without transformations, the raw events are returned as an array.
 *
 * @param {TimeLine} timeLine - An instance from nodejs-storage-timeline
 * @returns {{toMarkDown: Function, toPDF: Function, toBuffer: Function}}
 *          A chainable pipeline object
 */
export function allEvents(timeLine) {
    let eventsPromise = null;    // -> Promise<Array<{ time: string, value: string }>>
    let markdownPromise = null;  // -> Promise<string>
    let pdfBufferPromise = null; // -> Promise<Buffer>

    // Immediately start gathering all events.
    eventsPromise = gatherAllEvents(timeLine);

    const pipeline = {
        /**
         * Transforms the collected events into a single Markdown string using the
         * given formatter. If no formatter is specified, uses the default `eventsToMarkdown`.
         */
        toMarkDown(formatter = eventsToMarkdown) {
            if (!markdownPromise) {
                markdownPromise = eventsPromise.then((events) => formatter(events));
            }
            return this;
        },

        /**
         * Transforms the Markdown into a PDF buffer.
         * If Markdown hasn't been created yet, it will use the default formatter.
         */
        toPDF() {
            if (!markdownPromise) {
                this.toMarkDown();
            }
            if (!pdfBufferPromise) {
                pdfBufferPromise = markdownPromise.then((markdown) => markdownToPDF(markdown));
            }
            return this;
        },

        /**
         * Returns a Promise resolving to the final data:
         *   - If `.toPDF()` was called, returns a PDF Buffer.
         *   - If `.toMarkDown()` was called (with or without a custom formatter),
         *     returns a Markdown Buffer.
         *   - If no transformations were requested, returns the raw events array.
         */
        async toBuffer() {
            if (pdfBufferPromise) {
                return pdfBufferPromise;
            }
            if (markdownPromise) {
                const markdown = await markdownPromise;
                return Buffer.from(markdown, "utf-8");
            }
            return eventsPromise;
        },
    };

    return pipeline;
}
