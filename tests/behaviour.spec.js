const { test, expect, installGamepad } = require("./fixtures");

test("auto-detects ds4, applies the template, reflects button and axis state", async ({
    page,
    errors,
}) => {
    await installGamepad(page);
    await page.goto("/", { waitUntil: "networkidle" });

    await page.evaluate(() => {
        window.__pad.buttons[0].pressed = true;
        window.__pad.buttons[0].value = 1;
        window.__pad.timestamp = 2000;
    });
    await page.waitForFunction(() => window.gamepad?.type === "ds4", null, {
        timeout: 3000,
    });
    expect(await page.evaluate(() => window.gamepad.type)).toBe("ds4");

    await page.waitForSelector('#gamepad [data-button="0"]', { timeout: 3000 });
    await expect
        .poll(() =>
            page.evaluate(() =>
                document
                    .querySelector('#gamepad [data-button="0"]')
                    .getAttribute("data-pressed"),
            ),
        )
        .toBe("true");

    await page.evaluate(() => {
        window.__pad.axes[0] = 0.5;
        window.__pad.timestamp = 3000;
    });
    await expect
        .poll(() =>
            page.evaluate(() =>
                document
                    .querySelector('[data-axis-x="0"]')
                    .getAttribute("data-value-x"),
            ),
        )
        .toBe("0.5");

    expect(errors).toEqual([]);
});

test("rejects an unknown ?type= without crashing or injecting a template", async ({
    page,
    errors,
}) => {
    await installGamepad(page);
    await page.goto("/?type=../../secret", { waitUntil: "networkidle" });
    await page.evaluate(() => {
        window.__pad.buttons[0].pressed = true;
        window.__pad.timestamp = 2000;
    });
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.gamepad.type)).toBeNull();
    expect(
        await page.evaluate(
            () => document.querySelector("#gamepad").innerHTML.length,
        ),
    ).toBe(0);
    expect(errors).toEqual([]);
});

test("applies ?background=transparent", async ({ page, errors }) => {
    await installGamepad(page);
    await page.goto("/?background=transparent", { waitUntil: "networkidle" });
    expect(await page.evaluate(() => window.gamepad.backgroundStyleName)).toBe(
        "transparent",
    );
    expect(errors).toEqual([]);
});

test("renders the device id as text, blocking HTML/script injection", async ({
    page,
    errors,
}) => {
    await installGamepad(page);
    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate(() => {
        window.__xss = false;
        window.__pad.id = '<img src=x onerror="window.__xss=true">';
        window.gamepad.toggleHelp();
    });
    await page.waitForSelector("#gamepad-list tr", { timeout: 3000 });

    const cellText = await page.evaluate(
        () =>
            document.querySelector("#gamepad-list tr").lastElementChild
                .textContent,
    );
    expect(cellText).toContain("<img");
    expect(
        await page.evaluate(
            () => !!document.querySelector("#gamepad-list img"),
        ),
    ).toBe(false);
    expect(await page.evaluate(() => window.__xss)).toBe(false);
    expect(
        await page.evaluate(() =>
            document
                .querySelector("#gamepad-list")
                .innerHTML.includes('</tr>"'),
        ),
    ).toBe(false);
    expect(errors).toEqual([]);
});

test("debug skin builds boxes and shows id/values as text", async ({
    page,
    errors,
}) => {
    await installGamepad(page);
    await page.goto("/?type=debug", { waitUntil: "networkidle" });
    await page.evaluate(() => {
        window.__pad.buttons[0].pressed = true;
        window.__pad.buttons[0].value = 1;
        window.__pad.timestamp = 2000;
    });
    await page.waitForFunction(
        () =>
            document.querySelector("#info-id .value") &&
            document.querySelector('.buttons [data-button="0"]'),
        null,
        { timeout: 3000 },
    );
    await expect
        .poll(() =>
            page.evaluate(
                () =>
                    document.querySelector('.buttons [data-button="0"]')
                        ?.textContent,
            ),
        )
        .toBe("1.00");

    const info = await page.evaluate(() => ({
        id: document.querySelector("#info-id .value")?.textContent,
        boxes: document.querySelectorAll(".buttons .box").length,
        axes: document.querySelectorAll(".axes .box").length,
    }));
    expect(info.id).toBe("054c DualShock 4");
    expect(info.boxes).toBe(18);
    expect(info.axes).toBe(4);
    expect(errors).toEqual([]);
});

test("persists color changes to the URL via URLSearchParams", async ({
    page,
}) => {
    await installGamepad(page);
    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate(() => {
        window.__pad.buttons[0].pressed = true;
        window.__pad.timestamp = 2000;
    });
    await page.waitForFunction(() => window.gamepad.type === "ds4", null, {
        timeout: 3000,
    });
    await page.evaluate(() => window.gamepad.changeGamepadColor("white"));
    expect(await page.evaluate(() => window.location.search)).toMatch(
        /color=white/,
    );
});
