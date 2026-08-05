/**
 * The main Gamepad class
 *
 * @class Gamepad
 */
class Gamepad {
    /**
     * Creates an instance of Gamepad.
     */
    constructor() {
        // cached DOM references
        this.$body = document.body;
        this.$instructions = document.querySelector("#instructions");
        this.$instructionsLink = this.$instructions.querySelector("button");
        this.$placeholder = document.querySelector("#placeholder");
        this.$gamepad = document.querySelector("#gamepad");
        this.$overlay = document.querySelector("#overlay");
        this.$gamepadSelect = document.querySelector("select[name=gamepad-id]");
        this.$skinSelect = document.querySelector("select[name=skin]");
        this.$backgroundSelect = document.querySelector(
            "select[name=background]",
        );
        this.$colorOverlay = this.$overlay.querySelector("#color");
        this.$colorSelect =
            this.$colorOverlay.querySelector("select[name=color]");
        this.$triggersOverlay = this.$overlay.querySelector("#triggers");
        this.$triggersSelect = this.$triggersOverlay.querySelector(
            "select[name=triggers]",
        );
        this.$helpPopout = document.querySelector("#help-popout");
        this.$gamepadList = document.querySelector("#gamepad-list");

        this.backgroundStyle = [
            "transparent",
            "checkered",
            "dimgrey",
            "black",
            "white",
            "lime",
            "magenta",
        ];
        this.textColors = [
            "black",
            "black",
            "black",
            "white",
            "black",
            "black",
            "black",
        ];
        this.haloColors = [
            "white",
            "white",
            "dimgrey",
            "black",
            "white",
            "lime",
            "magenta",
        ];

        // ensure the GamePad API is available on this browser
        this.assertGamepadAPI();

        this.initOverlaySelectors();

        // gamepad collection default values
        this.gamepads = {};
        this.identifiers = {
            // See: https://html5gamepad.com/codes
            debug: {
                id: /debug/,
                name: "Debug",
            },
            dualsense: {
                id: /0ce6/, // 0ce6 = DualSense controller product code
                name: "DualSense",
                colors: ["white", "black"],
                triggers: true,
            },
            ds4: {
                id: /054c|54c|09cc|046d|0810|2563/, // 054c = Sony vendor code, 046d,0810,2563 = PS-like controllers vendor codes
                name: "DualShock 4",
                colors: ["black", "white", "red", "blue"],
                triggers: true,
            },
            "xbox-one": {
                id: /045e|xinput|XInput/, // 045e = Microsoft vendor code, xinput = standard Windows controller
                name: "Xbox One",
                colors: ["black", "white"],
                triggers: true,
            },
        };

        // gamepad help default values
        this.instructionsTimeout = null;
        this.instructionsDelay = 5000;
        this.placeholderTimeout = null;
        this.placeholderDelay = 12000;
        this.overlayTimeout = null;
        this.overlayDelay = 5000;

        // active gamepad default values
        this.scanDelay = 50;
        this.isFirstscan = true;
        this.axisActivityThreshold = 0.5;
        this.activity = {};
        this.debug = false;
        this.index = null;
        this.disconnectedIndex = null;
        this.type = null;
        this.identifier = null;
        this.lastTimestamp = null;
        this.backgroundStyleIndex = 0;
        this.colorIndex = null;
        this.colorName = null;
        this.triggersMeter = false;
        this.zoomMode = "auto";
        this.zoomLevel = 1;
        this.updateButton = null;
        this.updateAxis = null;
        this.updateFrame = null;
        this.mapping = {
            buttons: [],
            axes: [],
        };

        // listen for gamepad related events
        this.haveEvents = "GamepadEvent" in window;
        if (this.haveEvents) {
            window.addEventListener(
                "gamepadconnected",
                this.onGamepadConnect.bind(this),
            );
            window.addEventListener(
                "gamepaddisconnected",
                this.onGamepadDisconnect.bind(this),
            );
        }

        // listen for mouse move events
        window.addEventListener("mousemove", this.onMouseMove.bind(this));
        // listen for keyboard events
        window.addEventListener("keydown", this.onKeyDown.bind(this));
        // listen for keyboard events
        window.addEventListener("resize", this.onResize.bind(this));

        this.$instructionsLink.addEventListener("click", () =>
            this.toggleHelp(),
        );

        // bind a gamepads scan
        window.setInterval(this.scan.bind(this), this.scanDelay);

        // change the type if specified
        const skin = this.getUrlParam("type");
        if (skin) {
            this.changeSkin(skin);
        }

        // change the background if specified
        const background = this.getUrlParam("background");
        if (background) {
            const backgroundStyleIndex =
                this.backgroundStyle.indexOf(background);
            if (backgroundStyleIndex !== -1) {
                this.changeBackgroundStyle(backgroundStyleIndex);
            }
        }

        // by default, enqueue a delayed display of the placeholder animation
        if (this.getUrlParam("placeholder") !== "no") {
            this.displayPlaceholder();
        }
    }

    /**
     * Ensures the availability of the Gamepad API in the current navigator
     */
    assertGamepadAPI() {
        const getGamepadsFn = navigator.getGamepads
            ? () => navigator.getGamepads()
            : navigator.webkitGetGamepads
              ? () => navigator.webkitGetGamepads()
              : null;
        if (!getGamepadsFn) {
            this.$body.classList.add("unsupported");
            throw new Error("Unsupported gamepad API");
        }
        this.getNavigatorGamepads = getGamepadsFn;
    }

    /**
     * Shows an element by removing its "hidden" state, cancelling any running fade
     *
     * @param {HTMLElement} $element
     */
    show($element) {
        this.stopFade($element);
        $element.style.opacity = "";
        $element.classList.remove("hidden");
    }

    /**
     * Hides an element right away, cancelling any running fade
     *
     * @param {HTMLElement} $element
     */
    hide($element) {
        this.stopFade($element);
        $element.style.opacity = "";
        $element.classList.add("hidden");
    }

    /**
     * Fades an element in
     *
     * @param {HTMLElement} $element
     */
    fadeIn($element) {
        this.stopFade($element);
        $element.classList.remove("hidden");
        $element._fade = $element.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 400,
        });
        $element._fade.onfinish = () => {
            $element.style.opacity = "";
            $element._fade = null;
        };
    }

    /**
     * Fades an element out, then hides it
     *
     * @param {HTMLElement} $element
     */
    fadeOut($element) {
        this.stopFade($element);
        $element._fade = $element.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 400,
        });
        $element._fade.onfinish = () => {
            $element.style.opacity = "";
            $element.classList.add("hidden");
            $element._fade = null;
        };
    }

    /**
     * Cancels a running fade animation on an element, if any
     *
     * @param {HTMLElement} $element
     */
    stopFade($element) {
        if ($element._fade) {
            $element._fade.cancel();
            $element._fade = null;
        }
    }

    /**
     * Initialises the overlay selectors
     */
    initOverlaySelectors() {
        this.$gamepadSelect.addEventListener("change", () =>
            this.changeGamepad(this.$gamepadSelect.value),
        );
        this.$skinSelect.addEventListener("change", () =>
            this.changeSkin(this.$skinSelect.value),
        );
        this.$backgroundSelect.addEventListener("change", () =>
            this.changeBackgroundStyle(this.$backgroundSelect.value),
        );
        this.$colorSelect.addEventListener("change", () =>
            this.changeGamepadColor(this.$colorSelect.value),
        );
        this.$triggersSelect.addEventListener("change", () =>
            this.toggleTriggersMeter(this.$triggersSelect.value === "meter"),
        );
    }

    /**
     * Displays the instructions
     */
    displayInstructions() {
        // do not display help if we have an active gamepad
        if (null !== this.index) return;

        // cancel the queued display of the instructions animation, if any
        window.clearTimeout(this.instructionsTimeout);
        // show the instructions
        this.show(this.$instructions);

        // enqueue a delayed display of the instructions animation
        this.hideInstructions();
    }

    /**
     * Hides the instructions animation
     *
     * @param {boolean} [hideNow=false]
     */
    hideInstructions(hideNow = false) {
        // cancel any previously queued fade-out
        window.clearTimeout(this.instructionsTimeout);

        // hide the message right away if needed
        if (hideNow) {
            this.hide(this.$instructions);
        }

        // hide instructions animation if no gamepad is active after X ms
        this.instructionsTimeout = window.setTimeout(() => {
            this.fadeOut(this.$instructions);
        }, this.instructionsDelay);
    }

    /**
     * Displays the placeholder animation on screen
     */
    displayPlaceholder() {
        // do not display help if we have an active gamepad
        if (null !== this.index) return;

        // cancel the queued display of the placeholder animation, if any
        window.clearTimeout(this.placeholderTimeout);
        // show the placeholder
        this.show(this.$placeholder);

        // enqueue a delayed display of the placeholder animation
        this.hidePlaceholder();
    }

    /**
     * Hides the placeholder animation
     *
     * @param {boolean} [hideNow=false]
     */
    hidePlaceholder(hideNow = false) {
        // cancel any previously queued fade-out
        window.clearTimeout(this.placeholderTimeout);

        // hide the animation right away if needed
        if (hideNow) {
            this.hide(this.$placeholder);
        }

        // hide placeholder animation if no gamepad is active after X ms
        this.placeholderTimeout = window.setTimeout(() => {
            this.fadeOut(this.$placeholder);
        }, this.placeholderDelay);
    }

    /**
     * Toggles the placeholder animation through the URL parameter and on screen
     */
    togglePlaceholder() {
        let placeholder = this.getUrlParam("placeholder");
        switch (placeholder) {
            case "yes":
                placeholder = "no";
                break;
            case "no":
                placeholder = undefined;
                break;
            default:
                placeholder = "yes";
                break;
        }
        this.updateUrlParams({ placeholder });
        if (placeholder === "no") {
            this.hidePlaceholder(true);
        } else {
            this.displayPlaceholder();
        }
    }

    /**
     * Displays the overlay animation on screen
     */
    displayOverlay() {
        // cancel the queued display of the overlay animation, if any
        window.clearTimeout(this.overlayTimeout);
        // show the overlay
        this.show(this.$overlay);

        // enqueue a delayed display of the overlay animation
        this.hideOverlay();
    }

    /**
     * Hides the overlay animation
     *
     * @param {boolean} [hideNow=false]
     */
    hideOverlay(hideNow = false) {
        // cancel any previously queued fade-out
        window.clearTimeout(this.overlayTimeout);

        // hide the message right away if needed
        if (hideNow) {
            this.hide(this.$overlay);
        }

        // hide overlay animation if no gamepad is active after X ms
        this.overlayTimeout = window.setTimeout(() => {
            this.fadeOut(this.$overlay);
        }, this.overlayDelay);
    }

    /**
     * Update colors following the active/inactive gamepad
     */
    updateColors() {
        if (!this.type) {
            this.hide(this.$colorOverlay);
            return;
        }

        const colors = this.identifiers[this.type].colors;
        if (!colors) {
            this.hide(this.$colorOverlay);
            return;
        }

        this.$colorSelect.innerHTML = colors
            .map((color) => `<option value="${color}">${color}</option>`)
            .join("");
        this.fadeIn(this.$colorOverlay);
    }

    /**
     * Update triggers following the active/inactive gamepad
     */
    updateTriggers() {
        if (!this.type) {
            this.hide(this.$triggersOverlay);
            return;
        }

        const triggers = this.identifiers[this.type].triggers;
        if (!triggers) {
            this.hide(this.$triggersOverlay);
            return;
        }

        this.fadeIn(this.$triggersOverlay);
    }

    /**
     * Handles the gamepad connection event
     */
    onGamepadConnect() {
        // refresh the gamepad information and selector
        this.pollGamepads();
        this.updateGamepadList();

        // refresh gamepad list on help, if displayed
        if (this.helpVisible) this.buildHelpGamepadList();
    }

    /**
     * Handles the gamepad disconnection event
     *
     * @param {GamepadEvent} e
     */
    onGamepadDisconnect(e) {
        // refresh the gamepad information and selector
        this.pollGamepads();
        this.updateGamepadList();

        if (e.gamepad.index === this.index) {
            // display a disconnection indicator
            this.$gamepad.classList.add("disconnected");
            this.disconnectedIndex = e.gamepad.index;
        }

        // refresh gamepad list on help, if displayed
        if (this.helpVisible) this.buildHelpGamepadList();
    }

    /**
     * Handles the mouse "mousemove" event
     *
     * @param {MouseEvent} e
     */
    onMouseMove() {
        this.displayInterface();
    }

    /**
     * Displays the whole interface and resets its fade-out delay
     */
    displayInterface() {
        this.displayInstructions();
        this.displayPlaceholder();
        this.displayOverlay();
    }

    /**
     * Handles the keyboard "keydown" event
     *
     * @param {KeyboardEvent} e
     */
    onKeyDown(e) {
        this.displayInterface();
        switch (e.code) {
            case "Delete":
                this.clear();
                this.displayPlaceholder();
                break;
            case "Escape":
                if (this.helpVisible) {
                    this.toggleHelp();
                    break;
                }
                this.clear();
                this.displayPlaceholder();
                break;
            case "KeyB":
                this.changeBackgroundStyle();
                break;
            case "KeyC":
                this.changeGamepadColor();
                break;
            case "KeyD":
                this.toggleDebug();
                break;
            case "KeyG":
                this.toggleGamepadType();
                break;
            case "KeyH":
                this.toggleHelp();
                break;
            case "KeyP":
                this.togglePlaceholder();
                break;
            case "KeyT":
                this.toggleTriggersMeter();
                break;
            case "NumpadAdd":
            case "Equal":
                this.changeZoom("+");
                break;
            case "NumpadSubtract":
            case "Minus":
                this.changeZoom("-");
                break;
            case "Numpad5":
            case "Digit5":
                this.changeZoom("auto");
                break;
            case "Numpad0":
            case "Digit0":
                this.changeZoom(0);
                break;
        }
    }

    /**
     * Handles the window "resize" event
     */
    onResize() {
        if (this.zoomMode === "auto") this.changeZoom("auto");
    }

    /**
     * Reloads gamepads data
     */
    pollGamepads() {
        // get fresh information from DOM about gamepads
        this.gamepads = this.getNavigatorGamepads();
    }

    /**
     * Builds the help gamepad list
     */
    buildHelpGamepadList() {
        // refresh gamepads information
        this.pollGamepads();

        const $rows = [];
        for (let key = 0; key < this.gamepads.length; key++) {
            const gamepad = this.gamepads[key];
            if (!gamepad) {
                continue;
            }

            const $row = document.createElement("tr");
            const $index = document.createElement("td");
            $index.textContent = gamepad.index;
            const $id = document.createElement("td");
            $id.textContent = gamepad.id;
            $row.append($index, $id);
            $rows.push($row);
        }

        this.$gamepadList.replaceChildren();
        if ($rows.length === 0) {
            const $row = document.createElement("tr");
            const $cell = document.createElement("td");
            $cell.colSpan = 2;
            $cell.textContent = "No gamepad detected.";
            $row.append($cell);
            $rows.push($row);
        }
        this.$gamepadList.append(...$rows);
    }

    /**
     * Extracts a human-readable name from a gamepad identifier
     *
     * @param {string} id
     * @returns {string}
     */
    toGamepadName(id) {
        const chrome =
            /^(?<name>.*) \((?:.*?Vendor: [0-9a-f]{4} Product: [0-9a-f]{4}|.*)\)$/i.exec(
                id,
            );
        if (chrome) return chrome.groups.name;

        const firefox = /^[0-9a-f]{4}-[0-9a-f]{4}-(?<name>.*)$/i.exec(id);
        if (firefox) return firefox.groups.name;

        return id;
    }

    /**
     * Updates the connected gamepads listed in the overlay selector
     */
    updateGamepadList() {
        // remove previously listed gamepads, keeping the "Auto" option
        for (const $entry of this.$gamepadSelect.querySelectorAll(".entry")) {
            $entry.remove();
        }

        for (let index = 0; index < this.gamepads.length; index++) {
            const gamepad = this.gamepads[index];
            if (!gamepad) continue;

            const $option = document.createElement("option");
            $option.className = "entry";
            $option.value = gamepad.id;
            $option.textContent = this.toGamepadName(gamepad.id);
            this.$gamepadSelect.append($option);
        }
    }

    /**
     * Activates a gamepad from its identifier, or clears the active one
     *
     * @param {string} id
     */
    changeGamepad(id) {
        this.pollGamepads();
        const index = this.gamepads.findIndex((g) => g && id === g.id);

        this.updateUrlParams({ gamepad: id !== "auto" ? id : undefined });
        if (index === -1) {
            this.clear();
        } else {
            this.map(index);
        }
    }

    /**
     * Return the connected gamepad
     */
    getActive() {
        return this.gamepads[this.index];
    }

    /**
     * Return the gamepad type for the connected gamepad
     *
     * @param {object} gamepad
     */
    getType(gamepad) {
        const type = this.getUrlParam("type");

        // if the debug option is active, use the associated template
        if (type === "debug") this.debug = true;
        if (this.debug) {
            return "debug";
        }

        // if the gamepad type is set through params, only apply it when known
        if (type) {
            return this.identifiers[type] ? type : null;
        }

        // else, determine the template to use from the gamepad identifier and update settings
        for (const gamepadType in this.identifiers) {
            if (this.identifiers[gamepadType].id.test(gamepad.id)) {
                return gamepadType;
            }
        }

        return "xbox-one";
    }

    /**
     * Scans gamepads for activity
     */
    scan() {
        // don't scan if we have an active gamepad
        if (null !== this.index && null === this.disconnectedIndex) return;

        // refresh gamepad information
        this.pollGamepads();

        // populate the gamepad selector on the first scan
        if (this.isFirstscan) {
            this.updateGamepadList();
            this.isFirstscan = false;
        }

        for (let index = 0; index < this.gamepads.length; index++) {
            if (
                null !== this.disconnectedIndex &&
                index !== this.disconnectedIndex
            )
                continue;

            const gamepad = this.gamepads[index];
            if (!gamepad) continue;

            // a gamepad selected through the URL activates right away
            if (this.getUrlParam("gamepad") === gamepad.id) {
                this.map(gamepad.index);
                return;
            }

            if (!this.hasNewActivity(gamepad)) continue;

            this.map(gamepad.index);

            // confirm mapping with a vibration when available
            if (gamepad.vibrationActuator) {
                gamepad.vibrationActuator.playEffect(
                    gamepad.vibrationActuator.type,
                    {
                        duration: 100,
                        strongMagnitude: 0.2,
                        weakMagnitude: 1,
                        startDelay: 0,
                    },
                );
            }

            return;
        }
    }

    /**
     * Tells whether a gamepad was just acted upon
     *
     * @param {object} gamepad
     * @returns {boolean}
     */
    hasNewActivity(gamepad) {
        const previous = this.activity[gamepad.index];
        const buttons = [];
        const axes = [];
        let isActive = false;

        for (let index = 0; index < gamepad.buttons.length; index++) {
            buttons[index] = gamepad.buttons[index].pressed;
            if (previous && buttons[index] && !previous.buttons[index]) {
                isActive = true;
            }
        }
        for (let index = 0; index < gamepad.axes.length; index++) {
            axes[index] =
                Math.abs(gamepad.axes[index]) > this.axisActivityThreshold;
            if (previous && axes[index] && !previous.axes[index]) {
                isActive = true;
            }
        }
        this.activity[gamepad.index] = { buttons, axes };

        return isActive;
    }

    /**
     * Sets a gamepad as active from its index
     *
     * @param {int} index
     */
    map(index) {
        // ensure a gamepad need to be mapped
        if ("undefined" === typeof index) return;

        // hide the help messages
        this.hideInstructions(true);
        this.$helpPopout.classList.remove("active");
        this.hidePlaceholder(true);

        // update local references
        this.index = index;
        this.disconnectedIndex = null;
        this.$gamepad.classList.remove("disconnected");
        const gamepad = this.getActive();

        // ensure that a gamepad was actually found for this index
        if (!gamepad) {
            // this mapping request was probably a mistake :
            // - remove the active gamepad index and reference
            this.index = null;
            // - enqueue a display of the placeholder animation right away
            this.displayPlaceholder(true);

            return;
        }

        // ensure a valid gamepad type is used
        this.type = this.getType(gamepad);
        if (!this.type) return;

        // initial setup of the gamepad
        this.identifier = this.identifiers[this.type];

        // reflect the active gamepad in the selector when pinned through the URL
        const gamepadId = this.getUrlParam("gamepad");
        if (gamepadId) {
            this.$gamepadSelect.value = gamepadId;
        }

        // update gamepad color and triggers selectors on overlay
        this.updateColors();
        this.updateTriggers();

        // load the HTML template file
        this.loadTemplate(gamepad);

        // hide the help before displaying the template
        this.hideInstructions();
        this.hidePlaceholder();
    }

    /**
     * Disconnect the active gamepad
     *
     * @param {int} index
     * @param {object} options
     */
    clear() {
        // ensure we have something to disconnect
        if (this.index === null) return;

        // clear associated data
        this.index = null;
        this.disconnectedIndex = null;
        this.debug = false;
        this.lastTimestamp = null;
        this.type = null;
        this.identifier = null;
        this.colorIndex = null;
        this.colorName = null;
        this.zoomLevel = 1;
        this.updateButton = null;
        this.updateAxis = null;
        this.updateFrame = null;
        this.$gamepad.replaceChildren();
        this.$gamepadSelect.value = "auto";
        this.updateColors();
        this.updateTriggers();
        this.clearUrlParams();
    }

    /**
     * Load the HTML template file for the active gamepad
     *
     * @param {*} gamepad
     */
    loadTemplate(gamepad) {
        // hide the gamepad while we prepare it
        this.hide(this.$gamepad);

        // reset any template-provided update hooks from a previous skin
        this.updateButton = null;
        this.updateAxis = null;
        this.updateFrame = null;

        fetch(`templates/${this.type}/template.html`)
            .then((response) => response.text())
            .then(async (template) => {
                // inject the template HTML, then run its scripts in order
                this.$gamepad.innerHTML = template;
                await this.runTemplateScripts(this.$gamepad);

                // read for parameters to apply:
                // - color
                this.changeGamepadColor(this.getUrlParam("color"));
                // - triggers mode
                this.toggleTriggersMeter(
                    this.getUrlParam("triggers") === "meter",
                );
                // - zoom
                window.setTimeout(() =>
                    this.changeZoom(
                        this.type === "debug"
                            ? "auto"
                            : this.getUrlParam("zoom") || "auto",
                    ),
                );

                // save the buttons mapping of this template
                this.mapping.buttons = [];
                for (let index = 0; index < gamepad.buttons.length; index++) {
                    this.mapping.buttons[index] =
                        this.$gamepad.querySelectorAll(
                            `[data-button="${index}"]`,
                        );
                }

                // save the axes mapping of this template
                this.mapping.axes = [];
                for (let index = 0; index < gamepad.axes.length; index++) {
                    this.mapping.axes[index] = this.$gamepad.querySelectorAll(
                        `[data-axis="${index}"], [data-axis-x="${index}"], [data-axis-y="${index}"], [data-axis-z="${index}"]`,
                    );
                }

                // enqueue the initial display refresh
                this.pollStatus(true);

                // once fully loaded, display the gamepad
                this.fadeIn(this.$gamepad);
            });
    }

    /**
     * Re-runs the <script> tags of a freshly injected template, in order.
     * innerHTML never executes injected scripts, and the mapping below relies
     * on the template script having built its DOM first, so we await each one.
     *
     * @param {HTMLElement} $container
     */
    runTemplateScripts($container) {
        const scripts = Array.from($container.querySelectorAll("script"));
        return scripts.reduce(
            (chain, $old) =>
                chain.then(
                    () =>
                        new Promise((resolve, reject) => {
                            const $script = document.createElement("script");
                            for (const { name, value } of $old.attributes) {
                                if (name === "async") continue;
                                $script.setAttribute(name, value);
                            }
                            $script.textContent = $old.textContent;
                            if ($old.src) {
                                $script.onload = resolve;
                                $script.onerror = reject;
                                $old.replaceWith($script);
                            } else {
                                $old.replaceWith($script);
                                resolve();
                            }
                        }),
                ),
            Promise.resolve(),
        );
    }

    /**
     * Updates the status of the active gamepad
     */
    pollStatus(force = false) {
        // ensure that a gamepad is currently active
        if (this.index === null) return;

        // suspend the render loop while disconnected; it resumes on reconnect
        if (this.disconnectedIndex !== null) return;

        // enqueue the next refresh
        window.requestAnimationFrame(() => this.pollStatus());

        // load latest gamepad data
        this.pollGamepads();
        const activeGamepad = this.getActive();
        if (!activeGamepad) return;

        // check for actual gamepad update
        if (!force && activeGamepad.timestamp === this.lastTimestamp) return;
        this.lastTimestamp = activeGamepad.timestamp;

        // actually update the active gamepad graphically
        this.updateButtons(activeGamepad);
        this.updateAxes(activeGamepad);

        // hook the template defined per-frame update method
        if ("function" === typeof this.updateFrame) {
            this.updateFrame(activeGamepad);
        }
    }

    /**
     * Writes an attribute only when its value actually changed
     *
     * @param {HTMLElement} $element
     * @param {string} name
     * @param {*} value
     */
    setValue($element, name, value) {
        const string = String(value);
        if ($element.getAttribute(name) !== string) {
            $element.setAttribute(name, string);
        }
    }

    /**
     * Updates the buttons status of the active gamepad
     *
     * @param {*} gamepad
     */
    updateButtons(gamepad) {
        // update the buttons
        for (let index = 0; index < gamepad.buttons.length; index++) {
            // find the DOM elements
            const $buttons = this.mapping.buttons[index];
            if (!$buttons?.length) {
                // nothing to do for this button if no DOM element exists
                continue;
            }

            // read the button data
            const button = gamepad.buttons[index];

            $buttons.forEach(($button) => {
                // update the display values
                this.setValue($button, "data-pressed", button.pressed);
                this.setValue($button, "data-value", button.value);

                // hook the template defined button update method
                if ("function" === typeof this.updateButton) {
                    this.updateButton($button);
                }
            });
        }
    }

    /**
     * Updates the axes status of the active gamepad
     *
     * @param {*} gamepad
     */
    updateAxes(gamepad) {
        // update the axes
        for (let index = 0; index < gamepad.axes.length; index++) {
            // find the DOM elements
            const $axes = this.mapping.axes[index];
            if (!$axes?.length) {
                // nothing to do for this axis if no DOM element exists
                continue;
            }

            // read the axis data
            const axis = gamepad.axes[index];

            $axes.forEach(($axis) => {
                // update the display values
                if ($axis.matches(`[data-axis="${index}"]`)) {
                    this.setValue($axis, "data-value", axis);
                }
                if ($axis.matches(`[data-axis-x="${index}"]`)) {
                    this.setValue($axis, "data-value-x", axis);
                }
                if ($axis.matches(`[data-axis-y="${index}"]`)) {
                    this.setValue($axis, "data-value-y", axis);
                }
                if ($axis.matches(`[data-axis-z="${index}"]`)) {
                    this.setValue($axis, "data-value-z", axis);
                }

                // hook the template defined axis update method
                if ("function" === typeof this.updateAxis) {
                    this.updateAxis($axis);
                }
            });
        }
    }

    /**
     * Changes the skin
     *
     * @param {any} skin
     */
    changeSkin(skin) {
        // update the visual skin selector
        this.$skinSelect.value = skin;

        // set the selected skin
        this.debug = skin === "debug";
        this.updateUrlParams({ type: skin !== "auto" ? skin : undefined });
        this.map(this.index);
    }

    /**
     * Changes the background style
     *
     * @param {any} style
     */
    changeBackgroundStyle(style) {
        if ("undefined" === typeof style) {
            this.backgroundStyleIndex =
                (this.backgroundStyleIndex + 1) % this.backgroundStyle.length;
        } else if ("string" === typeof style) {
            this.backgroundStyleIndex = this.backgroundStyle.indexOf(style);
        } else {
            this.backgroundStyleIndex = style;
        }
        this.backgroundStyleName =
            this.backgroundStyle[this.backgroundStyleIndex];

        this.$body.style.background =
            this.backgroundStyleName === "checkered"
                ? "url(css/transparent-bg.png)"
                : this.backgroundStyleName;
        this.$body.style.color = this.textColors[this.backgroundStyleIndex];
        this.$body.style.setProperty(
            "--gv-halo",
            this.haloColors[this.backgroundStyleIndex],
        );

        // update current settings
        this.updateUrlParams({ background: this.backgroundStyleName });
        this.$backgroundSelect.value = this.backgroundStyleName;
    }

    /**
     * Changes the active gamepad color
     *
     * @param {any} color
     */
    changeGamepadColor(color) {
        // ensure that a gamepad is currently active
        if (this.index === null) return;

        // ensure the active gamepad type actually has colors
        const colors = this.identifier.colors;
        if (!colors) return;

        if ("undefined" === typeof color) {
            // no color was specified, load the next one in list
            this.colorIndex = (this.colorIndex + 1) % colors.length;
        } else {
            // load the color by its name, defaulting to the first one
            const index = colors.indexOf(color);
            this.colorIndex = index === -1 ? 0 : index;
        }
        this.colorName = colors[this.colorIndex];

        // update the DOM with the color value
        this.$gamepad.setAttribute("data-color", this.colorName);

        // update current settings
        this.updateUrlParams({ color: this.colorName });
        this.$colorSelect.value = this.colorName;
    }

    /**
     * Changes the active gamepad zoom level
     *
     * @param {any} level
     */
    changeZoom(level) {
        // ensure that a gamepad is currently active
        if (this.index === null) return;

        // ensure we have some data to process
        if (typeof level === "undefined") return;

        this.zoomMode = level === "auto" ? "auto" : "manual";

        if (this.zoomMode === "auto") {
            // "auto" means a "contained in window" zoom, with a max zoom of 1
            this.zoomLevel = Math.min(
                window.innerWidth / this.$gamepad.offsetWidth,
                window.innerHeight / this.$gamepad.offsetHeight,
                1,
            );
        } else if (level === 0) {
            // 0 means a zoom reset
            this.zoomLevel = 1;
        } else if (level === "+" && this.zoomLevel < 2) {
            // "+" means a zoom in if we still can
            this.zoomLevel += 0.1;
        } else if (level === "-" && this.zoomLevel > 0.1) {
            // "-" means a zoom out if we still can
            this.zoomLevel -= 0.1;
        } else {
            const parsed = parseFloat(level);
            if (!Number.isNaN(parsed)) {
                // an integer value means a value-based zoom
                this.zoomLevel = parsed;
            }
        }

        // hack: fix js float issues
        this.zoomLevel = +this.zoomLevel.toFixed(2);

        // update the DOM with the zoom value
        this.$gamepad.style.transform = `translate(-50%, -50%) scale(${this.zoomLevel}, ${this.zoomLevel})`;

        // update current settings
        this.updateUrlParams({
            zoom: this.zoomMode === "auto" ? undefined : this.zoomLevel,
        });
    }

    /**
     * Toggles the debug template for the active gamepad, if any
     */
    toggleGamepadType() {
        // ensure that a gamepad is currently active
        if (this.index === null || this.type === null) return;

        // toggle debug off
        this.debug = false;

        // compute next type
        const types = Object.keys(this.identifiers).filter(
            (i) => i !== "debug",
        );
        let typeIndex = types.reduce((typeIndex, type, index) => {
            return type === this.type ? index : typeIndex;
        }, 0);
        this.type = types[++typeIndex >= types.length ? 0 : typeIndex];

        // update current settings
        this.updateUrlParams({ type: this.type });

        // remap current gamepad
        this.map(this.index);
    }

    /**
     * Toggles the debug template for the active gamepad, if any
     */
    toggleDebug(debug = null) {
        // ensure that a gamepad is currently active
        if (this.index === null) return;

        // update debug value
        this.debug = debug !== null ? debug : !this.debug;

        // update current settings
        this.changeSkin(this.debug ? "debug" : "auto");
    }

    /**
     * Toggles the on-screen help message
     */
    toggleHelp() {
        // refresh gamepad list with latest data
        this.buildHelpGamepadList();

        // display the help popout
        this.$helpPopout.classList.toggle("active");
        this.helpVisible = this.$helpPopout.classList.contains("active");
    }

    /**
     * Toggles the triggers meter display
     */
    toggleTriggersMeter(useMeter) {
        // ensure that a gamepad is currently active
        if (this.index === null) return;

        this.triggersMeter =
            useMeter !== undefined ? useMeter : !this.triggersMeter;
        this.$gamepad.classList.toggle("triggers-meter", this.triggersMeter);

        // update current settings
        const triggers = this.triggersMeter ? "meter" : "opacity";
        this.updateUrlParams({ triggers });
        this.$triggersSelect.value = triggers;
    }

    /**
     * Reads an URL search parameter
     *
     * @param {*} name
     */
    getUrlParam(name) {
        return new URLSearchParams(window.location.search).get(name);
    }

    /**
     * Update url settings with new params, then rewrite the query string
     *
     * @param {*} newParams
     */
    updateUrlParams(newParams) {
        const params = new URLSearchParams(window.location.search);
        for (const [key, value] of Object.entries(newParams)) {
            if (value === undefined || value === null) {
                params.delete(key);
            } else {
                params.set(key, value);
            }
        }
        const query = params.toString();
        window.history.replaceState(
            {},
            document.title,
            query
                ? `${window.location.pathname}?${query}`
                : window.location.pathname,
        );
    }

    /**
     * Clear all url settings
     */
    clearUrlParams() {
        this.updateUrlParams({
            type: undefined,
            color: undefined,
            debug: undefined,
            triggers: undefined,
            zoom: undefined,
        });
    }
}

window.gamepad = new Gamepad();
