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
        this.$body = $("body");
        this.$instructions = $("#instructions");
        this.$placeholder = $("#placeholder");
        this.$gamepad = $("#gamepad");
        this.$overlay = $("#overlay");
        this.$skinSelect = $("select[name=skin]");
        this.$backgroundSelect = $("select[name=background]");
        this.$colorOverlay = this.$overlay.find("#color");
        this.$colorSelect = this.$colorOverlay.find("select[name=color]");
        this.$triggersOverlay = this.$overlay.find("#triggers");
        this.$triggersSelect = this.$triggersOverlay.find(
            "select[name=triggers]"
        );
        this.$helpPopout = $("#help-popout");
        this.$gamepadList = $("#gamepad-list");

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
            ds4: {
                id: /054c|54c|09cc|046d|0810|2563/, // 054c = Sony vendor code, 046d,0810,2563 = PS-like controllers vendor codes
                name: "DualShock 4",
                colors: ["black", "white", "red", "blue"],
                triggers: true,
            },
            // gamecube: {
            //     id: /0079/, // 0079 = Nintendo GameCube vendor code
            //     name: "GameCube Controller",
            //     colors: ["black", "purple"],
            // },
            // "joy-con": {
            //     id: /200e/, // 0079 = Joy-Con specific product code
            //     name: "Joy-Con (L+R) Controllers",
            //     colors: ["blue-red", "grey-grey"],
            // },
            // stadia: {
            //     id: /18d1/, // 18d1 = Google vendor code
            //     name: "Stadia Controller",
            //     colors: ["black"],
            // },
            // "switch-pro": {
            //     id: /057e|20d6/, // 057e = Nintendo Switch vendor code, 20d6 = Switch Pro-like vendor code
            //     name: "Switch Pro Controller",
            //     colors: ["black"],
            // },
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
        this.scanDelay = 200;
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
        this.mapping = {
            buttons: [],
            axes: [],
        };

        // // read hash
        // this.hash = this.readHash();

        // listen for gamepad related events
        this.haveEvents = "GamepadEvent" in window;
        if (this.haveEvents) {
            window.addEventListener(
                "gamepadconnected",
                this.onGamepadConnect.bind(this)
            );
            window.addEventListener(
                "gamepaddisconnected",
                this.onGamepadDisconnect.bind(this)
            );
        }

        // listen for mouse move events
        window.addEventListener("mousemove", this.onMouseMove.bind(this));
        // listen for keyboard events
        window.addEventListener("keydown", this.onKeyDown.bind(this));
        // listen for keyboard events
        window.addEventListener("resize", this.onResize.bind(this));

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
            let backgroundStyleIndex;
            for (let i = 0; i < this.backgroundStyle.length; i++) {
                if (background === this.backgroundStyle[i]) {
                    backgroundStyleIndex = i;
                    break;
                }
            }

            if (backgroundStyleIndex)
                this.changeBackgroundStyle(backgroundStyleIndex);
        }

        // by default, enqueue a delayed display of the placeholder animation
        this.displayPlaceholder();
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
            this.$body.addClass("unsupported");
            throw new Error("Unsupported gamepad API");
        }
        this.getNavigatorGamepads = getGamepadsFn;
    }

    /**
     * Initialises the overlay selectors
     */
    initOverlaySelectors() {
        this.$skinSelect.on("change", () =>
            this.changeSkin(this.$skinSelect.val())
        );
        this.$backgroundSelect.on("change", () =>
            this.changeBackgroundStyle(this.$backgroundSelect.val())
        );
        this.$colorSelect.on("change", () =>
            this.changeGamepadColor(this.$colorSelect.val())
        );
        this.$triggersSelect.on("change", () =>
            this.toggleTriggersMeter(this.$triggersSelect.val() === "meter")
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
        this.$instructions.show();

        // enqueue a delayed display of the instructions animation
        this.hideInstructions();
    }

    /**
     * Hides the instructions animation
     *
     * @param {boolean} [hideNow=false]
     */
    hideInstructions(hideNow = false) {
        // hide the message right away if needed
        if (hideNow) {
            this.$instructions.hide();
        }

        // hide instructions animation if no gamepad is active after X ms
        this.instructionsTimeout = window.setTimeout(() => {
            this.$instructions.fadeOut();
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
        this.$placeholder.show();

        // enqueue a delayed display of the placeholder animation
        this.hidePlaceholder();
    }

    /**
     * Hides the placeholder animation
     *
     * @param {boolean} [hideNow=false]
     */
    hidePlaceholder(hideNow = false) {
        // hide the animation right away if needed
        if (hideNow) {
            this.$placeholder.hide();
        }

        // hide placeholder animation if no gamepad is active after X ms
        this.placeholderTimeout = window.setTimeout(() => {
            this.$placeholder.fadeOut();
        }, this.placeholderDelay);
    }

    /**
     * Displays the overlay animation on screen
     */
    displayOverlay() {
        // cancel the queued display of the overlay animation, if any
        window.clearTimeout(this.overlayTimeout);
        // show the overlay
        this.$overlay.show();

        // enqueue a delayed display of the overlay animation
        this.hideOverlay();
    }

    /**
     * Hides the overlay animation
     *
     * @param {boolean} [hideNow=false]
     */
    hideOverlay(hideNow = false) {
        // hide the message right away if needed
        if (hideNow) {
            this.$overlay.hide();
        }

        // hide overlay animation if no gamepad is active after X ms
        this.overlayTimeout = window.setTimeout(() => {
            this.$overlay.fadeOut();
        }, this.overlayDelay);
    }

    /**
     * Update colors following the active/inactive gamepad
     */
    updateColors() {
        if (!this.type) {
            this.$colorOverlay.hide();
            return;
        }

        const colors = this.identifiers[this.type].colors;
        if (!colors) {
            this.$colorOverlay.hide();
            return;
        }

        const colorOptions = colors.map(
            (color) => `<option value="${color}">${color}</option>`
        );
        this.$colorSelect.html(colorOptions);
        this.$colorOverlay.fadeIn();
    }

    /**
     * Update triggers following the active/inactive gamepad
     */
    updateTriggers() {
        if (!this.type) {
            this.$triggersOverlay.hide();
            return;
        }

        const triggers = this.identifiers[this.type].triggers;
        if (!triggers) {
            this.$triggersOverlay.hide();
            return;
        }

        this.$triggersOverlay.fadeIn();
    }

    /**
     * Handles the gamepad connection event
     *
     * @param {GamepadEvent} e
     */
    onGamepadConnect(e) {
        // refresh gamepad list on help, if displayed
        if (this.helpVisible) this.buildHelpGamepadList();
    }

    /**
     * Handles the gamepad disconnection event
     *
     * @param {GamepadEvent} e
     */
    onGamepadDisconnect(e) {
        if (e.gamepad.index === this.index) {
            // display a disconnection indicator
            this.$gamepad.addClass("disconnected");
            this.disconnectedIndex = e.gamepad.index;

            // refresh gamepad list on help, if displayed
            if (this.helpVisible) this.buildHelpGamepadList();
        }
    }

    /**
     * Handles the mouse "mousemove" event
     *
     * @param {MouseEvent} e
     */
    onMouseMove() {
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
        switch (e.code) {
            case "Delete":
            case "Escape":
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
     * Handles the keyboard "keydown" event
     *
     * @param {WindowEvent} e
     */
    onResize(e) {
        if (this.zoomMode === "auto") this.changeZoom("auto");
    }

    /**
     * Reloads gamepads data
     */
    pollGamepads() {
        // get fresh information from DOM about gamepads
        const gamepads = this.getNavigatorGamepads();
        if (gamepads !== this.gamepads) this.gamepads = gamepads;
    }

    /**
     * Builds the help gamepad list
     */
    buildHelpGamepadList() {
        // refresh gamepads information
        this.pollGamepads();

        const $tbody = [];
        for (let key = 0; key < this.gamepads.length; key++) {
            const gamepad = this.gamepads[key];
            if (!gamepad) {
                continue;
            }

            $tbody.push(
                `<tr><td>${gamepad.index}</td><td>${gamepad.id}</td></tr>"`
            );
        }
        if ($tbody.length === 0) {
            $tbody.push('<tr><td colspan="2">No gamepad detected.</td></tr>');
        }

        this.$gamepadList.html($tbody.join(""));
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

        // if the gamepad type is set through params, apply it
        if (type) {
            return type;
        }

        // else, determine the template to use from the gamepad identifier and update settings
        for (let gamepadType in this.identifiers) {
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

        for (let index = 0; index < this.gamepads.length; index++) {
            if (
                null !== this.disconnectedIndex &&
                index !== this.disconnectedIndex
            )
                continue;

            const gamepad = this.gamepads[index];
            if (!gamepad) continue;

            // read the gamepad buttons
            let button;
            for (
                let buttonIndex = 0;
                buttonIndex < gamepad.buttons.length;
                buttonIndex++
            ) {
                button = gamepad.buttons[buttonIndex];

                // if one of its button is pressed, activate this gamepad
                if (button.pressed) {
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
                            }
                        );
                    }

                    return;
                }
            }
        }
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
        this.$helpPopout.removeClass("active");
        this.hidePlaceholder(true);

        // update local references
        this.index = index;
        this.disconnectedIndex = null;
        this.$gamepad.removeClass("disconnected");
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

        // update gamepad color and triggers selectors on overlay
        this.updateColors();
        this.updateTriggers();

        // load the HTML template file
        this.loadTemplate(gamepad);

        // hide the help before displaying the template
        this.hideInstructions();
        this.hidePlaceholder();

        // save statistics
        if (!!window.ga) {
            ga("send", "event", {
                eventCategory: "Gamepad",
                eventAction: "map",
                eventLabel: "Map",
                eventValue: this.identifier,
            });
        }
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
        this.$gamepad.empty();
        this.updateColors();
        this.updateTriggers();
        this.clearUrlParams();

        // save statistics
        if (!!window.ga) {
            ga("send", "event", {
                eventCategory: "Gamepad",
                eventAction: "disconnect",
                eventLabel: "Disconnect",
                eventValue: this.identifier,
            });
        }
    }

    /**
     * Load the HTML template file for the active gamepad
     *
     * @param {*} gamepad
     */
    loadTemplate(gamepad) {
        // hide the gamepad while we prepare it
        this.$gamepad.hide();

        $.ajax(`templates/${this.type}/template.html`).done((template) => {
            // inject the template HTML
            this.$gamepad.html(template);

            // read for parameters to apply:
            // - color
            this.changeGamepadColor(this.getUrlParam("color"));
            // - triggers mode
            this.toggleTriggersMeter(this.getUrlParam("triggers") === "meter");
            // - zoom$
            window.setTimeout(() =>
                this.changeZoom(
                    this.type === "debug"
                        ? "auto"
                        : this.getUrlParam("zoom") || "auto"
                )
            );

            // save the buttons mapping of this template
            this.mapping.buttons = [];
            for (let index = 0; index < gamepad.buttons.length; index++) {
                this.mapping.buttons[index] = $(`[data-button="${index}"]`);
            }

            // save the axes mapping of this template
            this.mapping.axes = [];
            for (let index = 0; index < gamepad.axes.length; index++) {
                this.mapping.axes[index] = $(
                    `[data-axis=${index}], [data-axis-x=${index}], [data-axis-y=${index}], [data-axis-z=${index}]`
                );
            }

            // enqueue the initial display refresh
            this.pollStatus(true);

            // once fully loaded, display the gamepad
            this.$gamepad.fadeIn();
        });
    }

    /**
     * Updates the status of the active gamepad
     */
    pollStatus(force = false) {
        // ensure that a gamepad is currently active
        if (this.index === null) return;

        // enqueue the next refresh
        window.requestAnimationFrame(this.pollStatus.bind(this));

        // load latest gamepad data
        this.pollGamepads();
        const activeGamepad = this.getActive();

        // check for actual gamepad update
        if (
            !force &&
            (!activeGamepad || activeGamepad.timestamp === this.lastTimestamp)
        )
            return;
        this.lastTimestamp = activeGamepad.timestamp;

        // actually update the active gamepad graphically
        this.updateButtons(activeGamepad);
        this.updateAxes(activeGamepad);
    }

    /**
     * Updates the buttons status of the active gamepad
     *
     * @param {*} gamepad
     */
    updateButtons(gamepad) {
        // update the buttons
        for (let index = 0; index < gamepad.buttons.length; index++) {
            // find the DOM element
            const $button = this.mapping.buttons[index];
            if (!$button) {
                // nothing to do for this button if no DOM element exists
                break;
            }

            // read the button data
            const button = gamepad.buttons[index];

            // update the display values
            $button.attr("data-pressed", button.pressed);
            $button.attr("data-value", button.value);

            // hook the template defined button update method
            if ("function" === typeof this.updateButton) {
                this.updateButton($button);
            }
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
            // find the DOM element
            const $axis = this.mapping.axes[index];
            if (!$axis) {
                // nothing to do for this button if no DOM element exists
                break;
            }

            // read the axis data
            const axis = gamepad.axes[index];

            // update the display values
            if ($axis.is("[data-axis=" + index + "]")) {
                $axis.attr("data-value", axis);
            }
            if ($axis.is("[data-axis-x=" + index + "]")) {
                $axis.attr("data-value-x", axis);
            }
            if ($axis.is("[data-axis-y=" + index + "]")) {
                $axis.attr("data-value-y", axis);
            }
            if ($axis.is("[data-axis-z=" + index + "]")) {
                $axis.attr("data-value-z", axis);
            }

            // hook the template defined axis update method
            if ("function" === typeof this.updateAxis) {
                this.updateAxis($axis);
            }
        }
    }

    /**
     * Changes the skin
     *
     * @param {any} skin
     */
    changeSkin(skin) {
        // update the visual skin selector
        this.$skinSelect.val(skin);

        // set the selected skin
        this.debug = skin === 'debug';
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
            this.backgroundStyleIndex++;
            if (this.backgroundStyleIndex > this.backgroundStyle.length - 1) {
                this.backgroundStyleIndex = 0;
            }
        } else if ("string" === typeof style) {
            this.backgroundStyleIndex = this.backgroundStyle.findIndex(
                (s) => s === style
            );
        } else {
            this.backgroundStyleIndex = style;
        }
        this.backgroundStyleName =
            this.backgroundStyle[this.backgroundStyleIndex];

        this.$body.css({
            background:
                this.backgroundStyleName === "checkered"
                    ? "url(css/transparent-bg.png)"
                    : this.backgroundStyleName,
            color: this.textColors[this.backgroundStyleIndex],
        });

        // update current settings
        this.updateUrlParams({ background: this.backgroundStyleName });
        this.$backgroundSelect.val(this.backgroundStyleName);

        // save statistics
        if (!!window.ga) {
            ga("send", "event", {
                eventCategory: "Gamepad",
                eventAction: "change-background-color",
                eventLabel: "Change Background Color",
                eventValue: this.backgroundStyleName,
            });
        }
    }

    /**
     * Changes the active gamepad color
     *
     * @param {any} color
     */
    changeGamepadColor(color) {
        // ensure that a gamepad is currently active
        if (this.index === null) return;

        if ("undefined" === typeof color) {
            // no color was specified, load the next one in list
            this.colorIndex++;
            if (this.colorIndex > this.identifier.colors.length - 1) {
                this.colorIndex = 0;
            }
        } else if ("string" === typeof style) {
            this.colorIndex = this.identifier.colors.findIndex(
                (c) => c === color
            );
        } else {
            if (!isNaN(parseInt(color))) {
                // the color is a number, load it by its index
                this.colorIndex = color;
            } else {
                // the color is a string, load it by its name
                this.colorIndex = 0;
                for (let gamepadColorIndex in this.identifier.colors) {
                    if (color === this.identifier.colors[gamepadColorIndex]) {
                        this.colorIndex = gamepadColorIndex;
                        break;
                    }
                }
            }
        }
        this.colorName = this.identifier.colors
            ? this.identifier.colors[this.colorIndex]
            : null;

        // update the DOM with the color value
        this.$gamepad.attr("data-color", this.colorName);

        // update current settings
        this.updateUrlParams({ color: this.colorName });
        this.$colorSelect.val(this.colorName);

        // save statistics
        if (!!window.ga) {
            ga("send", "event", {
                eventCategory: "Gamepad",
                eventAction: "change-gamepad-color",
                eventLabel: "Change Gamepad Color",
                eventValue: this.colorName,
            });
        }
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
                window.innerWidth / this.$gamepad.width(),
                window.innerHeight / this.$gamepad.height(),
                1
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
        } else if (!isNaN((level = parseFloat(level)))) {
            // an integer value means a value-based zoom
            this.zoomLevel = level;
        }

        // hack: fix js float issues
        this.zoomLevel = +this.zoomLevel.toFixed(2);

        // update the DOM with the zoom value
        this.$gamepad.css(
            "transform",
            `translate(-50%, -50%) scale(${this.zoomLevel}, ${this.zoomLevel})`
        );

        // update current settings
        this.updateUrlParams({
            zoom: this.zoomMode === "auto" ? undefined : this.zoomLevel,
        });

        // save statistics
        if (!!window.ga) {
            ga("send", "event", {
                eventCategory: "Gamepad",
                eventAction: "change-zoom",
                eventLabel: "Change Zoom",
                eventValue: this.zoomLevel,
            });
        }
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
            (i) => i !== "debug"
        );
        let typeIndex = types.reduce((typeIndex, type, index) => {
            return type === this.type ? index : typeIndex;
        }, 0);
        this.type = types[++typeIndex >= types.length ? 0 : typeIndex];

        // save statistics
        if (!!window.ga) {
            ga("send", "event", {
                eventCategory: "Gamepad",
                eventAction: "toggle-type",
                eventLabel: "Toggle Type",
                eventValue: this.type,
            });
        }

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

        // save statistics
        if (!!window.ga) {
            ga("send", "event", {
                eventCategory: "Gamepad",
                eventAction: "toggle-debug",
                eventLabel: "Toggle Debug",
                eventValue: this.debug,
            });
        }

        // update current settings
        this.changeSkin(this.debug ? 'debug' : 'auto')
    }

    /**
     * Toggles the on-screen help message
     */
    toggleHelp() {
        // refresh gamepad lsit with latest data
        this.buildHelpGamepadList();

        // display the help popout
        this.$helpPopout.toggleClass("active");
        this.helpVisible = this.$helpPopout.is(".active");

        // save statistics
        if (!!window.ga) {
            ga("send", "event", {
                eventCategory: "Gamepad",
                eventAction: "toggle-help",
                eventLabel: "Toggle Help",
                eventValue: this.$helpPopout.is("active"),
            });
        }
    }

    /**
     * Toggles the triggers meter display
     */
    toggleTriggersMeter(useMeter) {
        // ensure that a gamepad is currently active
        if (this.index === null) return;

        this.triggersMeter =
            useMeter !== undefined ? useMeter : !this.triggersMeter;
        this.$gamepad[this.triggersMeter ? "addClass" : "removeClass"](
            "triggers-meter"
        );

        // update current settings
        const triggers = this.triggersMeter ? "meter" : "opacity";
        this.updateUrlParams({ triggers });
        this.$triggersSelect.val(triggers);
    }

    /**
     * Reads an URL search parameter
     *
     * @param {*} name
     */
    getUrlParam(name) {
        let matches = new RegExp("[?&]" + name + "(=([^&#]*))?").exec(
            window.location.search
        );
        return matches ? decodeURIComponent(matches[2] || true) || true : null;
    }

    /**
     * Read url settings to produce a key/value object
     */
    getUrlParams() {
        const settingsArr = window.location.search
            .replace("?", "")
            .split("&")
            .map((param) => param.split("="));
        const settings = {};
        Object.keys(settingsArr).forEach((key) => {
            const [k, v] = settingsArr[key];
            settings[k] = v;
        });
        return settings;
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

    /**
     * Update url hash with new settings
     *
     * @param {*} newParams
     */
    updateUrlParams(newParams) {
        const params = Object.assign(this.getUrlParams(), newParams);
        const query = Object.entries(params)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => `${key}=${value}`)
            .join("&");
        window.history.replaceState({}, document.title, `/?${query}`);
    }
}

window.gamepad = new Gamepad();
