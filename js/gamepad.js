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
        this.demo = new Demo(this);

        // cached DOM references
        this.$body = $("body");
        this.$gamepad = $("#gamepad");
        this.$nogamepad = $("#no-gamepad");
        this.$nogamepadLink = $("#no-gamepad a");
        this.$help = $("#help");
        this.$gamepadList = $("#gamepad-list");

        this.backgroundColors = [
            "transparent",
            "dimgrey",
            "black",
            "lime",
            "magenta",
        ];

        // gamepad collection default values
        this.gamepads = {};
        this.identifiers = {
            // See: https://html5gamepad.com/codes
            debug: {
                id: /debug/,
                name: "Debug",
                colors: [],
            },
            ds4: {
                id: /054c/,
                name: "DualShock 4",
                colors: ["black", "white", "red", "blue"],
            },
            // "switch-pro": {
            //     id: /057e/,
            //     name: "Switch Pro Controller",
            //     colors: ["black"],
            // },
            "xbox-one": {
                id: /045e|xinput|XInput/,
                name: "Xbox One",
                colors: ["black", "white"],
            },
        };

        // gamepad help default values
        this.helpTimeout = null;
        this.helpDelay = 5000;

        // active gamepad default values
        this.scanDelay = 500;
        this.debug = false;
        this.index = null;
        this.type = null;
        this.identifier = null;
        this.timestamp = null;
        this.backgroundColorIndex = 0;
        this.colorIndex = null;
        this.colorName = null;
        this.zoomMode = "manual";
        this.zoomLevel = 1;
        this.mapping = {
            buttons: [],
            axes: [],
        };

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

        // read URI for display parameters to initalize
        this.params = {
            background: this.getUrlParam("background") || null,
            color: this.getUrlParam("color") || null,
            type: this.getUrlParam("type") || null,
            demo: this.getUrlParam("demo") || null,
            zoom: this.getUrlParam("zoom") || null,
        };

        // change the background is specified
        if (this.params.background) {
            for (let i = 0; i < this.backgroundColors.length; i++) {
                if (this.params.background === this.backgroundColors[i]) {
                    this.index = i;
                    break;
                }
            }

            if (!this.index) {
                return;
            }

            this.$body.css("background", this.backgroundColors[this.index]);
        }

        // start the demo if requested by params
        if (this.params.demo) {
            this.demo.start(this.params.demo);
            return;
        }

        // by default, enqueue a delayed display of the help modal
        this.displayHelp();
    }

    /**
     * Reads an URL search parameter
     *
     * @param {*} name
     */
    getUrlParam(name) {
        let results = new RegExp("[?&]" + name + "(=([^&#]*))?").exec(
            window.location.search
        );
        if (results === null) {
            return null;
        }

        return decodeURIComponent(results[2] || true) || true;
    }

    /**
     * Displays the help modal on screen
     */
    displayHelp() {
        // do not display help if we have an active gamepad
        if (null !== this.index) return;

        // cancel the queued display of the help modal, if any
        window.clearTimeout(this.helpTimeout);
        // hide the help modal
        this.$nogamepad.show();

        // enqueue a delayed display of the help modal
        this.hideHelp();
    }

    /**
     * Hides the help modal
     *
     * @param {boolean} [hideNow=false]
     */
    hideHelp(hideNow = false) {
        // hide the message right away if needed
        if (hideNow) {
            this.$nogamepad.hide();
        }

        // hide help modal if no gamepad is active after X ms
        this.helpTimeout = window.setTimeout(() => {
            this.$nogamepad.fadeOut();
        }, this.helpDelay);
    }

    /**
     * Handles the gamepad connection event
     *
     * @param {GamepadEvent} e
     */
    onGamepadConnect(e) {
        // on gamepad connection, refresh available gamepads list
        this.scan();
    }

    /**
     * Handles the gamepad disconnection event
     *
     * @param {GamepadEvent} e
     */
    onGamepadDisconnect(e) {
        // on gamepad disconnection, remove it from the list
        this.disconnect(e.gamepad.index);
        this.scan();
    }

    /**
     * Handles the mouse "mouslmove" event
     *
     * @param {MouseEvent} e
     */
    onMouseMove() {
        this.displayHelp();
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
                this.disconnect(true);
                break;
            case "KeyB":
                this.changeBackgroundColor();
                break;
            case "KeyC":
                this.changeGamepadColor();
                break;
            case "KeyD":
                this.toggleDebug();
                break;
            case "KeyH":
                this.toggleHelp();
                break;
            case "KeyO":
                this.demo.start();
                break;
            case "NumpadAdd":
            case "Equal":
                this.changeZoom("+");
                break;
            case "NumpadSubtract":
            case "Minus":
                this.changeZoom("-");
                break;
            case "NumpadDecimal":
                this.adjustZoom(1);
                break;
            case "Numpad0":
            case "Digit0":
                this.changeZoom("0");
                break;
        }
    }

    /**
     * Handles the keyboard "keydown" event
     *
     * @param {WindowEvent} e
     */
    onResize(e) {
        if (this.zoomMode === "auto") this.adjustZoom(1);
    }

    /**
     * Get navigator gamepads collection
     */
    getNavigatorGamepads() {
        return navigator.getGamepads
            ? navigator.getGamepads()
            : navigator.webkitGetGamepads
            ? navigator.webkitGetGamepads()
            : [];
    }

    /**
     * Reloads gamepads data
     */
    refresh() {
        // get fresh information from DOM about gamepads
        this.gamepads = this.getNavigatorGamepads();

        this.buildHelpGamepadList();
    }

    /**
     * Builds the help gamepad list
     */
    buildHelpGamepadList() {
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
        if (this.debug) {
            // if the debug option is active, use the associated template
            return "debug";
        }

        if (this.params.type) {
            // if the gamepad type is set through params, apply it
            return this.params.type;
        }

        // else, determine the template to use from the gamepad identifier
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
        if (null !== this.index) return;

        // refresh gamepad information
        this.refresh();

        for (let index = 0; index < this.gamepads.length; index++) {
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
        this.hideHelp(true);
        this.$help.removeClass("active");

        // update local references
        this.index = index;
        const gamepad = this.getActive();

        // ensure that a gamepad was actually found for this index
        if (!gamepad) {
            // this mapping request was probably a mistake :
            // - remove the active gamepad index and reference
            this.index = null;
            // - enqueue a display of the help modal right away
            this.displayHelp(true);

            return;
        }

        // determine gamepad type
        this.type = this.getType(gamepad);
        this.identifier = this.identifiers[this.type];
        this.colorIndex = 0;
        // ensure a valid gamepad type was discovered
        if (!this.type) return;

        // load the HTML template file
        this.loadTemplate(gamepad);

        // hide the help before displaying the template
        this.hideHelp();
    }

    /**
     * Disconnect the active gamepad
     *
     * @param {object} gamepad
     */
    disconnect(index) {
        // ensure we have an index to remove
        if ("undefined" === typeof index) return;

        // ensure to kill demo mode
        if ("demo" === this.index) {
            this.demo.stop();
        }

        // if this is the active gamepad
        if (true === index || this.index === index) {
            // clear associated date
            this.index = null;
            this.type = null;
            this.identifier = null;
            this.colorIndex = null;
            this.colorName = null;
            this.zoomLevel = 1;
            this.$gamepad.empty();
        }

        // enqueue a display of the help modal
        this.displayHelp();
        this.debug = false;
    }

    /**
     * Load the HTML template file for the active gamepad
     *
     * @param {*} gamepad
     */
    loadTemplate(gamepad) {
        $.ajax(`templates/${this.type}/template.html`).done((template) => {
            // inject the template HTML
            this.$gamepad.html(template);
            window.setTimeout(() => {
                this.adjustZoom(1);
            });

            // read for parameters to apply:
            // - color
            if (this.params.color) {
                this.changeGamepadColor(this.params.color);
            }
            // - zoom
            if (this.params.zoom) {
                this.changeZoom(this.params.zoom);
            }

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
            this.timestamp = null;
            this.updateStatus();
        });
    }

    /**
     * Updates the status of the active gamepad
     */
    updateStatus() {
        // ensure that a gamepad is currently active
        if (null === this.index) return;

        // enqueue the next refresh right away
        window.requestAnimationFrame(this.updateStatus.bind(this));
        // window.setTimeout(this.updateStatus.bind(this), 1000 / 60);

        // load latest gamepad data
        this.refresh();
        const activeGamepad = this.getActive();

        if (activeGamepad.timestamp === this.timestamp) return;
        this.timestamp = activeGamepad.timestamp;

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
     * Changes the background color
     *
     * @param {any} color
     */
    changeBackgroundColor(color) {
        if ("undefined" === typeof color) {
            this.backgroundColorIndex++;
            if (this.backgroundColorIndex > this.backgroundColors.length - 1) {
                this.backgroundColorIndex = 0;
            }
        } else {
            this.backgroundColorIndex = color;
        }

        this.$body.css(
            "background",
            this.backgroundColors[this.backgroundColorIndex]
        );
    }

    /**
     * Changes the active gamepad color
     *
     * @param {any} color
     */
    changeGamepadColor(color) {
        // ensure that a gamepad is currently active
        if (null === this.index) return;

        if ("undefined" === typeof color) {
            // no color was specified, load the next one in list
            this.colorIndex++;
            if (this.colorIndex > this.identifier.colors.length - 1) {
                this.colorIndex = 0;
            }

            this.colorName = this.identifier.colors[this.colorIndex];
        } else {
            if (!isNaN(parseInt(color))) {
                // the color is a number, load it by its index
                this.colorIndex = color;
                this.colorName = this.identifier.colors[this.colorIndex];
            } else {
                // the color is a string, load it by its name
                this.colorName = color;
                this.colorIndex = 0;
                for (let gamepadColorIndex in this.identifier.colors) {
                    if (
                        this.colorName ===
                        this.identifier.colors[gamepadColorIndex]
                    ) {
                        break;
                    }
                    this.colorIndex++;
                }
            }
        }

        // update the DOM with the color value
        this.$gamepad.attr("data-color", this.colorName);
    }

    /**
     * Adjusts the zoom level to the available space
     */
    adjustZoom(maxZoom = null) {
        // let the browser the time to paint
        const smallerRatio = Math.min(
            window.innerWidth / (this.$gamepad.width() / this.zoomLevel),
            window.innerHeight / (this.$gamepad.height() / this.zoomLevel)
        );
        this.changeZoom(
            maxZoom !== null && smallerRatio >= maxZoom
                ? maxZoom
                : Math.floor(smallerRatio * 100) / 100,
            "auto"
        );
    }

    /**
     * Changes the active gamepad zoom level
     *
     * @param {any} level
     */
    changeZoom(level, mode = "manual") {
        // ensure that a gamepad is currently active
        if (null === this.index) return;

        // ensure we have some data to process
        if ("undefined" === typeof level) return;

        this.zoomMode = mode;

        if ("0" === level) {
            // "0" means a zoom reset
            this.zoomLevel = 1;
        } else if ("+" === level && this.zoomLevel < 2) {
            // "+" means a zoom in if we still can
            this.zoomLevel += 0.1;
        } else if ("-" === level && this.zoomLevel > 0.2) {
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
    }

    /**
     * Toggles the on-screen help message
     */
    toggleHelp() {
        this.$help.toggleClass("active");
    }

    /**
     * Toggles the debug template for the active gamepad, if any
     */
    toggleDebug() {
        // ensure that a gamepad is currently active
        if (null === this.index) return;

        // update debug value
        this.debug = !this.debug;

        // remap current gamepad
        this.map(this.index);
    }
}

window.gamepad = new Gamepad();
