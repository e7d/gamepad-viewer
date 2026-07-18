const base = require("@playwright/test");

const makePad = (overrides = {}) => ({
    index: 0,
    id: "054c DualShock 4",
    mapping: "standard",
    timestamp: 1000,
    buttons: Array.from({ length: 18 }, () => ({
        pressed: false,
        touched: false,
        value: 0,
    })),
    axes: [0, 0, 0, 0],
    vibrationActuator: null,
    ...overrides,
});

async function installGamepad(page, overrides = {}) {
    await page.addInitScript((pad) => {
        window.__pad = pad;
        navigator.getGamepads = () => [window.__pad, null, null, null];
    }, makePad(overrides));
}

const test = base.test.extend({
    errors: async ({ page }, use) => {
        const errors = [];
        page.on("pageerror", (e) => errors.push(String(e)));
        page.on("console", (message) => {
            if (message.type() === "error") {
                errors.push(`console.error: ${message.text()}`);
            }
        });
        await use(errors);
    },
});

module.exports = { test, expect: base.expect, installGamepad };
