const { test, expect, installGamepad } = require("./fixtures");

const stickTransform = (page) =>
    page.evaluate(
        () => document.querySelector("#gamepad .stick.left").style.transform,
    );

test.describe("compositor-only stick rendering", () => {
    test.beforeEach(async ({ page }) => {
        await installGamepad(page);
        await page.goto("/", { waitUntil: "networkidle" });
        await page.evaluate(() => {
            window.__pad.buttons[0].pressed = true;
            window.__pad.timestamp = 2000;
        });
        await page.waitForFunction(() => window.gamepad?.type === "ds4", null, {
            timeout: 3000,
        });
        await page.waitForSelector("#gamepad .stick.left", { timeout: 3000 });
    });

    test("positions sticks with a quantized transform, not inline margins", async ({
        page,
    }) => {
        await page.evaluate(() => {
            window.__pad.axes[0] = 0.5;
            window.__pad.axes[1] = -0.5;
            window.__pad.timestamp = 3000;
        });
        await expect
            .poll(() => stickTransform(page))
            .toMatch(
                /^translate\(13px, -12px\) rotateX\(15deg\) rotateY\(15deg\)/,
            );

        const margins = await page.evaluate(() => {
            const el = document.querySelector("#gamepad .stick.left");
            return { top: el.style.marginTop, left: el.style.marginLeft };
        });
        expect(margins).toEqual({ top: "", left: "" });
    });

    test("zeroes sub-threshold noise to a byte-identical rest transform", async ({
        page,
    }) => {
        await page.evaluate(() => {
            window.__pad.axes[0] = 0.03;
            window.__pad.axes[1] = 0;
            window.__pad.timestamp = 4000;
        });
        await expect
            .poll(() => stickTransform(page))
            .toBe("translate(0px, 0px) rotateX(0deg) rotateY(0deg)");
    });

    test("still shows movement above the deadzone", async ({ page }) => {
        await page.evaluate(() => {
            window.__pad.axes[0] = 0.2;
            window.__pad.axes[1] = 0;
            window.__pad.timestamp = 5000;
        });
        await expect
            .poll(() => stickTransform(page))
            .toMatch(/^translate\(5px, 0px\)/);
    });
});

test("keeps the placeholder glow as a static drop-shadow", async ({
    page,
    errors,
}) => {
    await installGamepad(page);
    await page.goto("/", { waitUntil: "networkidle" });
    const filter = await page.evaluate(() => {
        const el = document.querySelector("#placeholder #a-button path");
        return el ? getComputedStyle(el).filter : null;
    });
    expect(filter).toContain("drop-shadow");
    expect(errors).toEqual([]);
});
