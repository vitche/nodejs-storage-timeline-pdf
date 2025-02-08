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
 * Safely converts a timestamp (in ms) to a human-readable date/time string.
 * If the provided time isn't a numeric timestamp, just return it as-is.
 *
 * @param {string} time - The original time (often in milliseconds)
 * @returns {string} - The time as a human-readable date/time if numeric; otherwise unchanged
 */
function formatTime(time) {
    const parsed = Number(time);
    if (!isNaN(parsed)) {
        return new Date(parsed).toLocaleString();
    }
    return time;
}

/**
 * Default formatter for events to Markdown. Converts each event into a small
 * Markdown section titled with the event's parsed date (or original string).
 *
 * @param {Array<{ time: string, value: string }>} events - The array of events
 * @param {string} timelineName - The name of the timeline
 * @returns {string} - Combined Markdown content
 */
function defaultMarkdownFormatter(events, timelineName) {
    return `# ${timelineName}\n\n` +
        events
            .map(({ time, value }) => {
                const displayTime = formatTime(time);
                return `## ${displayTime}\n\n${value}\n`;
            })
            .join("\n---\n\n");
}

/**
 * Default formatter for events to HTML. Converts each event into a styled
 * HTML section with the event's parsed date (or original string) as a header.
 *
 * @param {Array<{ time: string, value: string }>} events - The array of events
 * @param {string} timelineName - The name of the timeline
 * @returns {string} - Combined HTML content
 */
function defaultHTMLFormatter(events, timelineName) {
    const eventsSections = events
        .map(({ time, value }) => {
            const displayTime = formatTime(time);
            return `
                <section class="event">
                    <h2>${displayTime}</h2>
                    <div class="event-content">
                        ${value}
                    </div>
                </section>
            `;
        })
        .join('\n<hr>\n');

    return `
        <!DOCTYPE html>
        <html lang="utf-8">
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    margin: 2cm;
                    color: #333;
                }
                h1 {
                    color: #222;
                    text-align: center;
                    margin-bottom: 1.5em;
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
            <title>${timelineName}</title>
        </head>
        <body>
            <h1>${timelineName}</h1>
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

        return await page.pdf({
            format: 'A4',
            margin: {
                top: '2cm',
                right: '2cm',
                bottom: '2cm',
                left: '2cm'
            },
            printBackground: true
        });
    } finally {
        await browser.close();
    }
}

/**
 * A builder that returns a Markdown formatter for events whose .value is a JSON object.
 * The builder accepts an array of fields to include from the JSON object. Each event
 * will be rendered by listing only those JSON fields.
 *
 * Usage:
 *   const customFormatter = buildJSONMarkdownFormatter(["title", "description"]);
 *   allEvents(timeLine, "aTimeline").toMarkDown(customFormatter).toBuffer()...
 *
 * @param {Array<string>} fields - The list of keys to extract from the JSON object
 * @returns {(events: Array<{ time: string, value: string }>, timelineName: string) => string}
 */
export function buildJSONMarkdownFormatter(fields) {
    return (events, timelineName) => {
        let output = `# ${timelineName}\n\n`;

        output += events
            .map(({ time, value }) => {
                const displayTime = formatTime(time);
                let jsonData;
                try {
                    jsonData = JSON.parse(value);
                } catch (e) {
                    // If value isn't valid JSON, treat it as plain text
                    jsonData = { raw: value };
                }

                // Build bullet points for each requested field
                const contentLines = fields.map((field) => {
                    const fieldVal = jsonData[field] !== undefined
                        ? jsonData[field]
                        : "";
                    return `- ${field}: ${fieldVal}`;
                }).join("\n");

                return `## ${displayTime}\n\n${contentLines}\n`;
            })
            .join("\n---\n\n");

        return output;
    };
}

/**
 * A builder that returns an HTML formatter for events whose .value is a JSON object.
 * The builder accepts an array of fields to include from the JSON object. Each event
 * will be rendered by listing only those JSON fields in a bullet list.
 *
 * Usage:
 *   const customHTMLFormatter = buildJSONHTMLFormatter(["title", "description"]);
 *   allEvents(timeLine, "aTimeline").toHTML(customHTMLFormatter).toBuffer()...
 *
 * @param {Array<string>} fields - The list of keys to extract from the JSON object
 * @returns {(events: Array<{ time: string, value: string }>, timelineName: string) => string}
 */
export function buildJSONHTMLFormatter(fields) {
    return (events, timelineName) => {
        const eventSections = events
            .map(({ time, value }) => {
                const displayTime = formatTime(time);
                let jsonData;
                try {
                    jsonData = JSON.parse(value);
                } catch (e) {
                    // If value isn't valid JSON, treat it as plain text
                    jsonData = { raw: value };
                }

                // Build bullet list for each requested field
                const items = fields.map((field) => {
                    const fieldVal = jsonData[field] !== undefined
                        ? jsonData[field]
                        : "";
                    return `<li><strong>${field.toUpperCase()}:</strong> ${fieldVal}</li>`;
                }).join("");

                return `
                    <section class="event">
                        <h2>${displayTime}</h2>
                        <ul class="event-fields">
                            ${items}
                        </ul>
                    </section>
                `;
            })
            .join('\n<hr>\n');

        return `
            <!DOCTYPE html>
            <html lang="utf-8">
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        margin: 2cm;
                        color: #333;
                    }
                    h1 {
                        color: #222;
                        text-align: center;
                        margin-bottom: 1.5em;
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
                    .event-fields {
                        margin: 1em 0;
                        list-style: disc;
                        padding-left: 2em;
                    }
                    hr {
                        border: none;
                        border-top: 1px solid #eee;
                        margin: 2em 0;
                    }
                </style>
                <title>${timelineName}</title>
            </head>
            <body>
                <h1>${timelineName}</h1>
                ${eventSections}
            </body>
            </html>
        `;
    };
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
 * @param {string} timeLineName
 * @returns {{toMarkDown: Function, toHTML: Function, toPDF: Function, toBuffer: Function}}
 *          A chainable pipeline object
 */
export function allEvents(timeLine, timeLineName) {
    let eventsPromise = null;    // -> Promise<Array<{ time: string, value: string }>>
    let markdownPromise = null;  // -> Promise<string>
    let htmlPromise = null;      // -> Promise<string>
    let pdfBufferPromise = null; // -> Promise<Buffer>

    // Immediately start gathering all events.
    eventsPromise = gatherAllEvents(timeLine);

    return {
        /**
         * Transforms the collected events into a single Markdown string using the
         * given formatter. If no formatter is specified, uses the default `defaultMarkdownFormatter`.
         */
        toMarkDown(formatter = defaultMarkdownFormatter) {
            if (!markdownPromise) {
                markdownPromise = eventsPromise.then((events) => formatter(events, timeLineName));
            }
            return this;
        },

        /**
         * Transforms the collected events into HTML using the given formatter.
         * If no formatter is specified, uses the default `defaultHTMLFormatter`.
         */
        toHTML(formatter = defaultHTMLFormatter) {
            if (!htmlPromise) {
                htmlPromise = eventsPromise.then((events) => formatter(events, timeLineName));
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
                            const html = defaultHTMLFormatter([{
                                time: 'Markdown Content',
                                value: markdown.replace(/\n/g, '<br>')
                            }], timeLineName);
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
}