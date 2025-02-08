import puppeteer from 'puppeteer';

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
 * Default formatter for events to Markdown. Converts each event into a small
 * Markdown section titled with the event's time.
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
 * Default formatter for events to HTML. Converts each event into a styled
 * HTML section with the event's time as a header.
 *
 * @param {Array<{ time: string, value: string }>} events - The array of events
 * @returns {string} - Combined HTML content
 */
function eventsToHTML(events) {
    const eventsSections = events
        .map(({ time, value }) => `
            <section class="event">
                <h2>Event at ${time}</h2>
                <div class="event-content">
                    ${value}
                </div>
            </section>
        `)
        .join('\n<hr>\n');

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    margin: 2cm;
                    color: #333;
                }
                h2 {
                    color: #333;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 0.5em;
                    margin-top: 1.5em;
                }
                .event {
                    margin-bottom: 2em;
                }
                .event-content {
                    margin: 1em 0;
                }
                hr {
                    border: none;
                    border-top: 1px solid #eee;
                    margin: 2em 0;
                }
            </style>
        </head>
        <body>
            ${eventsSections}
        </body>
        </html>
    `;
}

/**
 * Converts HTML content into a PDF buffer using Puppeteer.
 *
 * @param {string} html - The HTML content to convert
 * @returns {Promise<Buffer>} - The PDF as a Buffer
 */
async function htmlToPDF(html) {
    const browser = await puppeteer.launch({ headless: 'new' });
    try {
        const page = await browser.newPage();
        await page.setContent(html);

        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: {
                top: '2cm',
                right: '2cm',
                bottom: '2cm',
                left: '2cm'
            },
            printBackground: true
        });

        return pdfBuffer;
    } finally {
        await browser.close();
    }
}

/**
 * Defines the carrying pipeline for timeline events. It provides the following chainable steps:
 *   - `.toMarkDown([formatter])` transforms raw events into Markdown
 *   - `.toHTML([formatter])` transforms raw events into HTML
 *   - `.toPDF()` transforms the current format (HTML or Markdown) into a PDF
 *   - `.toBuffer()` returns a Promise that resolves to the final result as a buffer
 *
 * Usage examples:
 *   - `allEvents(timeLine).toMarkDown().toBuffer()` returns a Buffer with default Markdown
 *   - `allEvents(timeLine).toHTML().toBuffer()` returns a Buffer with default HTML
 *   - `allEvents(timeLine).toMarkDown(myFormatter).toBuffer()` returns a Buffer with custom Markdown
 *   - `allEvents(timeLine).toHTML(myFormatter).toBuffer()` returns a Buffer with custom HTML
 *   - `allEvents(timeLine).toHTML().toPDF().toBuffer()` returns a Buffer containing PDF
 *
 * If `.toBuffer()` is called without transformations, the raw events are returned as an array.
 *
 * @param {TimeLine} timeLine - An instance from nodejs-storage-timeline
 * @returns {{toMarkDown: Function, toHTML: Function, toPDF: Function, toBuffer: Function}}
 *          A chainable pipeline object
 */
export function allEvents(timeLine) {
    let eventsPromise = null;    // -> Promise<Array<{ time: string, value: string }>>
    let markdownPromise = null;  // -> Promise<string>
    let htmlPromise = null;      // -> Promise<string>
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
         * Transforms the collected events into HTML using the given formatter.
         * If no formatter is specified, uses the default `eventsToHTML`.
         */
        toHTML(formatter = eventsToHTML) {
            if (!htmlPromise) {
                htmlPromise = eventsPromise.then((events) => formatter(events));
            }
            return this;
        },

        /**
         * Transforms the current format into a PDF buffer.
         * If neither Markdown nor HTML has been created yet, it will use the default HTML formatter.
         */
        toPDF() {
            if (!htmlPromise && !markdownPromise) {
                this.toHTML();
            }

            if (!pdfBufferPromise) {
                if (htmlPromise) {
                    pdfBufferPromise = htmlPromise.then((html) => htmlToPDF(html));
                } else if (markdownPromise) {
                    // Convert Markdown to HTML first
                    pdfBufferPromise = markdownPromise
                        .then((markdown) => {
                            const html = eventsToHTML([{
                                time: 'Markdown Content',
                                value: markdown.replace(/\n/g, '<br>')
                            }]);
                            return htmlToPDF(html);
                        });
                }
            }
            return this;
        },

        /**
         * Returns a Promise resolving to the final data:
         *   - If `.toPDF()` was called, returns a PDF Buffer
         *   - If `.toHTML()` was called, returns an HTML Buffer
         *   - If `.toMarkDown()` was called, returns a Markdown Buffer
         *   - If no transformations were requested, returns the raw events array
         */
        async toBuffer() {
            if (pdfBufferPromise) {
                return pdfBufferPromise;
            }
            if (htmlPromise) {
                const html = await htmlPromise;
                return Buffer.from(html, "utf-8");
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