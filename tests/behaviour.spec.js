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

test("keeps the placeholder caption under the controller at any ratio", async ({
    page,
    errors,
}) => {
    await installGamepad(page);
    await page.goto("/", { waitUntil: "networkidle" });

    const viewports = [
        { width: 1600, height: 900 },
        { width: 900, height: 1600 },
        { width: 1280, height: 420 },
        { width: 800, height: 800 },
    ];
    for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.mouse.move(viewport.width / 2, viewport.height / 2);
        const placed = await page.evaluate((height) => {
            const rect = (selector) =>
                document.querySelector(selector).getBoundingClientRect();
            const svg = rect("#placeholder svg");
            const caption = rect("#placeholder-instructions");
            const bar = rect("#overlay");
            const captionCentre = (caption.top + caption.bottom) / 2;
            return {
                seat: (captionCentre - svg.top) / svg.height,
                ratio: svg.width / svg.height,
                offCentre: Math.abs((svg.top + svg.bottom) / 2 - height / 2),
                overflows: caption.bottom > height,
                hitsBar: caption.bottom > bar.top,
            };
        }, viewport.height);
        const where = `${viewport.width}x${viewport.height}`;

        expect(placed.seat, where).toBeGreaterThan(0.82);
        expect(placed.seat, where).toBeLessThan(0.95);
        expect(placed.overflows, where).toBe(false);
        expect(placed.hitsBar, where).toBe(false);
        expect(placed.ratio, where).toBeCloseTo(549.3125 / 367.98749, 2);
        expect(placed.offCentre, where).toBeLessThan(1);
    }
    expect(errors).toEqual([]);
});

test("keeps the placeholder caption on a single line, however cramped", async ({
    page,
    errors,
}) => {
    await installGamepad(page);
    await page.goto("/", { waitUntil: "networkidle" });

    const viewports = [
        { width: 1600, height: 900 },
        { width: 900, height: 1600 },
        { width: 1440, height: 305 },
        { width: 420, height: 900 },
    ];
    for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        const lines = await page.evaluate(() => {
            const range = document.createRange();
            range.selectNodeContents(
                document.querySelector("#placeholder-instructions"),
            );
            const tops = Array.from(range.getClientRects()).map((rect) =>
                Math.round(rect.top),
            );
            return new Set(tops).size;
        });
        expect(lines, `${viewport.width}x${viewport.height}`).toBe(1);
    }
    expect(errors).toEqual([]);
});

test("outlines the placeholder caption in the background colour", async ({
    page,
    errors,
}) => {
    await installGamepad(page);
    const halos = {
        lime: "lime",
        magenta: "magenta",
        black: "black",
        white: "white",
        transparent: "white",
    };
    for (const [background, halo] of Object.entries(halos)) {
        await page.goto(`/?background=${background}`, {
            waitUntil: "networkidle",
        });
        const painted = await page.evaluate(() => {
            const caption = document.querySelector("#placeholder-instructions");
            return {
                halo: getComputedStyle(document.body)
                    .getPropertyValue("--gv-halo")
                    .trim(),
                stroke: getComputedStyle(caption).webkitTextStrokeWidth,
            };
        });
        expect(painted.halo, background).toBe(halo);
        expect(painted.stroke, background).toBe("2px");
    }
    expect(errors).toEqual([]);
});

test("activates on a press, with no hold to discover", async ({
    page,
    errors,
}) => {
    await installGamepad(page);
    await page.goto("/", { waitUntil: "networkidle" });

    await page.evaluate(() => {
        window.__pad.buttons[0].pressed = true;
    });
    await page.waitForFunction(() => window.gamepad.index !== null, null, {
        timeout: 500,
    });
    expect(await page.evaluate(() => window.gamepad.index)).toBe(0);

    // releasing the button keeps the gamepad active
    await page.evaluate(() => {
        window.__pad.buttons[0].pressed = false;
    });
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => window.gamepad.index)).toBe(0);
    expect(errors).toEqual([]);
});

test("activates on a tap already released before the next scan", async ({
    page,
    errors,
}) => {
    await installGamepad(page);
    await page.goto("/", { waitUntil: "networkidle" });

    await page.evaluate(async () => {
        window.__pad.buttons[0].pressed = true;
        await new Promise((resolve) => setTimeout(resolve, 120));
        window.__pad.buttons[0].pressed = false;
    });

    await page.waitForFunction(() => window.gamepad.index !== null, null, {
        timeout: 500,
    });
    expect(errors).toEqual([]);
});

test("activates on a stick pushed past half its travel", async ({
    page,
    errors,
}) => {
    await installGamepad(page);
    await page.goto("/", { waitUntil: "networkidle" });

    await page.evaluate(() => {
        window.__pad.axes[1] = -0.8;
    });
    await page.waitForFunction(() => window.gamepad.index !== null, null, {
        timeout: 500,
    });
    expect(errors).toEqual([]);
});

test("ignores a drifting stick that never leaves its deadzone", async ({
    page,
    errors,
}) => {
    await installGamepad(page);
    await page.goto("/", { waitUntil: "networkidle" });

    await page.evaluate(async () => {
        for (let step = 0; step < 15; step++) {
            window.__pad.axes[0] = step % 2 ? 0.12 : -0.09;
            window.__pad.axes[3] = step % 2 ? -0.4 : 0.35;
            await new Promise((resolve) => setTimeout(resolve, 60));
        }
    });

    expect(await page.evaluate(() => window.gamepad.index)).toBeNull();
    expect(errors).toEqual([]);
});

test("ignores a button and an axis stuck on arrival, activating on the next press", async ({
    page,
    errors,
}) => {
    await installGamepad(page, {
        buttons: Array.from({ length: 18 }, (_, index) => ({
            pressed: index === 6,
            touched: false,
            value: index === 6 ? 1 : 0,
        })),
        axes: [0, 0, -1, 0],
    });
    await page.goto("/", { waitUntil: "networkidle" });

    await page.waitForTimeout(1200);
    expect(await page.evaluate(() => window.gamepad.index)).toBeNull();

    await page.evaluate(() => {
        window.__pad.buttons[6].pressed = false;
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
        window.__pad.buttons[6].pressed = true;
    });
    await page.waitForFunction(() => window.gamepad.index !== null, null, {
        timeout: 800,
    });
    expect(errors).toEqual([]);
});

test("confirms the activation with one short rumble", async ({
    page,
    errors,
}) => {
    await installGamepad(page);
    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate(() => {
        window.__rumbles = [];
        window.__pad.vibrationActuator = {
            type: "dual-rumble",
            playEffect: (type, effect) => {
                window.__rumbles.push({ type, effect });
                return Promise.resolve("complete");
            },
        };
    });

    await page.evaluate(() => {
        window.__pad.buttons[0].pressed = true;
    });
    await page.waitForFunction(() => window.gamepad.index !== null, null, {
        timeout: 800,
    });

    expect(await page.evaluate(() => window.__rumbles)).toEqual([
        {
            type: "dual-rumble",
            effect: {
                duration: 100,
                strongMagnitude: 0.2,
                weakMagnitude: 1,
                startDelay: 0,
            },
        },
    ]);
    expect(errors).toEqual([]);
});

test("activates the DualSense skin for a 0ce6 controller", async ({
    page,
    errors,
}) => {
    await installGamepad(page, {
        id: "DualSense Wireless Controller (Vendor: 054c Product: 0ce6)",
    });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate(() => {
        window.__pad.buttons[0].pressed = true;
    });
    await page.waitForFunction(
        () => window.gamepad?.type === "dualsense",
        null,
        { timeout: 3000 },
    );
    await page.waitForSelector("#gamepad .controller", { timeout: 3000 });
    expect(errors).toEqual([]);
});

test("lists connected gamepads and activates the one picked in the selector", async ({
    page,
    errors,
}) => {
    await installGamepad(page);
    await page.goto("/", { waitUntil: "networkidle" });

    await expect
        .poll(() =>
            page.evaluate(
                () =>
                    document.querySelectorAll("select[name=gamepad-id] option")
                        .length,
            ),
        )
        .toBe(2);

    await page.evaluate(() => window.gamepad.changeGamepad("054c DualShock 4"));
    await page.waitForFunction(() => window.gamepad.index === 0, null, {
        timeout: 3000,
    });
    expect(
        await page.evaluate(() =>
            new URLSearchParams(location.search).get("gamepad"),
        ),
    ).toBe("054c DualShock 4");
    expect(errors).toEqual([]);
});

test("closes the help modal on Escape without clearing the gamepad", async ({
    page,
    errors,
}) => {
    await installGamepad(page);
    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate(() => {
        window.__pad.buttons[0].pressed = true;
    });
    await page.waitForFunction(() => window.gamepad.index !== null, null, {
        timeout: 3000,
    });
    await page.evaluate(() => {
        window.__pad.buttons[0].pressed = false;
        window.gamepad.toggleHelp();
    });
    expect(
        await page.evaluate(() =>
            document.querySelector("#help-popout").classList.contains("active"),
        ),
    ).toBe(true);

    await page.keyboard.press("Escape");
    expect(
        await page.evaluate(() =>
            document.querySelector("#help-popout").classList.contains("active"),
        ),
    ).toBe(false);
    expect(await page.evaluate(() => window.gamepad.index)).toBe(0);
    expect(errors).toEqual([]);
});
