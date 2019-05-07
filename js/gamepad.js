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
        this.gamepadDemo = new GamepadDemo(this);

        // cached DOM references
        this.$gamepad = $('.gamepad');
        this.$nogamepad = $('.no-gamepad');
        this.$debug = $('.debug');
        this.$help = $('.help');

        // gamepad collection default values
        this.gamepads = {};
        this.gamepadIdentifiers = {
            'debug': {
                'id': /debug/,
                'name': 'Debug',
                'colors': []
            },
            'ds4': {
                'id': /054c.*?05c4/,
                'name': 'DualShock 4',
                'colors': ['black', 'white', 'red', 'blue']
            },
            'xbox-one': {
                'id': /xinput|XInput/,
                'name': 'Xbox One',
                'colors': ['black', 'white']
            }
        };

        // gamepad help default values
        this.gamepadHelpTimeout = null;
        this.gamepadHelpDelay = 5000;

        // active gamepad default values
        this.scanGamepadsDelay = 500;
        this.debug = false;
        this.activeGamepadIndex = null;
        this.activeGamepadType = null;
        this.activeGamepadIdentifier = null;
        this.activeGamepadColorIndex = null;
        this.activeGamepadColorName = null;
        this.activeGamepadZoomLevel = 1;
        this.mapping = {
            buttons: [],
            axes: []
        };

        // listen for gamepad related events
        this.haveEvents = 'GamepadEvent' in window;
        if (this.haveEvents) {
            window.addEventListener("gamepadconnected", this.onGamepadConnect.bind(this));
            window.addEventListener("gamepaddisconnected", this.onGamepadDisconnect.bind(this));
        }

        // listen for keyboard events
        window.addEventListener("keydown", this.onKeyDown.bind(this));

        // bind a gamepads scan
        window.setInterval(this.scanGamepads.bind(this), this.scanGamepadsDelay);

        // read URI for display parameters to initalize
        this.params = {
            demoMode: $.urlParam('demo') || null,
            gamepadColor: $.urlParam('color') || $.urlParam('c') || null,
            gamepadIndex: $.urlParam('index') || $.urlParam('i') || null,
            gamepadType: $.urlParam('type') || $.urlParam('t') || null,
            zoom: $.urlParam('zoom') || $.urlParam('z') || null
        };

        // if a gamepad index is specified, try to map the corresponding gamepad
        if (this.params.gamepadIndex) {
            this.refreshGamepads();
            this.mapGamepad(+this.params.gamepadIndex);

            return;
        }

        if (this.params.demoMode) {
            this.gamepadDemo.start(this.params.demoMode);

            return;
        }

        // by default, enqueue a delayed display of the help modal
        this.displayGamepadHelp();
    }

    /**
     * Displays the help modal on screen
     *
     * @param {boolean} [displayNow=false]
     */
    displayGamepadHelp(displayNow = false) {
        // display help modal if no gamepad is active after X ms
        this.gamepadHelpTimeout = window.setTimeout(
            () => {
                this.$nogamepad.fadeIn();
            },
            displayNow ? 0 : this.gamepadHelpDelay
        );
    }

    /**
     * Hides the help modal
     */
    hideGamepadHelp() {
        // cancel the queued display of the help modal, if any
        window.clearTimeout(this.gamepadHelpTimeout);
        // hide the help modal
        this.$nogamepad.hide();
    }

    /**
     * Handles the gamepad connection event
     *
     * @param {GamepadEvent} e
     */
    onGamepadConnect(e) {
        // on gamepad connection, add it to the list
        this.addGamepad(e.gamepad);
    }

    /**
     * Handles the gamepad disconnection event
     *
     * @param {GamepadEvent} e
     */
    onGamepadDisconnect(e) {
        // on gamepad disconnection, remove it from the list
        this.removeGamepad(e.gamepad.index);
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
                this.removeGamepad(true);
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
            case "NumpadAdd":
            case "Equal":
                this.changeZoom("+");
                break;
            case "NumpadSubtract":
            case "Minus":
                this.changeZoom("-");
                break;
            case "Numpad0":
            case "Digit0":
                this.changeZoom("0");
                break;
        }
    }

    /**
     * Reloads gamepads data
     */
    refreshGamepads() {
        // get fresh information from DOM about gamepads
        const navigatorGamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
        for (let key in navigatorGamepads) {
            this.gamepads[key] = navigatorGamepads[key];
        }
    }

    /**
     * Return the connected gamepad
     */
    getActiveGamepad() {
        return this.gamepads[this.activeGamepadIndex];
    }

    /**
     * Adds a gamepad to the gamepads collection
     *
     * @param {object} gamepad
     */
    addGamepad(gamepad) {
        this.gamepads[gamepad.index] = gamepad;
    }

    /**
     * Removes a gamepad to the gamepads collection
     *
     * @param {object} gamepad
     */
    removeGamepad(gamepadIndex) {
        // ensure we have an index to remove
        if ('undefined' === typeof gamepadIndex) {
            return;
        }

        // ensure to kill demo mode
        if ('demo' === this.activeGamepadIndex) {
            this.gamepadDemo.stop();
        }

        // if this is the active gamepad
        if (true === gamepadIndex ||
            this.activeGamepadIndex === gamepadIndex) {
            // clear associated date
            this.activeGamepadIndex = null;
            this.$gamepad.empty();
        }
        delete this.gamepads[gamepadIndex];

        // enqueue a display of the help modal
        this.displayGamepadHelp();
        this.debug = false;
    }

    /**
     * Scans gamepads for activity
     */
    scanGamepads() {
        // don't scan if we have an active gamepad
        if (null !== this.activeGamepadIndex) {
            return;
        }

        // refresh gamepad information
        this.refreshGamepads();

        // read information for each gamepad
        for (let gamepadIndex = 0; gamepadIndex < this.gamepads.length; gamepadIndex++) {
            const gamepad = this.gamepads[gamepadIndex];
            if (gamepad) {
                // store the current gamepad give its index
                if (gamepad.index in this.gamepads) {
                    this.gamepads[gamepad.index] = gamepad;
                }

                // read the gamepad buttons
                let button;
                for (let buttonIndex = 0; buttonIndex < gamepad.buttons.length; buttonIndex++) {
                    button = gamepad.buttons[buttonIndex];

                    // if one of its button is pressed, activate this gamepad
                    if (button.pressed) {
                        this.mapGamepad(gamepad.index);
                    }
                }
            }
        }
    }

    /**
     * Sets a gamepad as active from its index
     *
     * @param {int} gamepadIndex
     */
    mapGamepad(gamepadIndex) {
        // ensure a gamepad need to be mapped
        if ('undefined' === typeof gamepadIndex) {
            return;
        }

        // update local references
        this.activeGamepadIndex = gamepadIndex;
        const activeGamepad = this.getActiveGamepad();

        // ensure that a gamepad was actually found for this index
        if (!activeGamepad) {
            // this mapping request was probably a mistake :
            // - remove the active gamepad index and reference
            this.activeGamepadIndex = null;
            // - enqueue a display of the help modal right away
            this.displayGamepadHelp(true);

            return;
        }

        // determine gamepad type
        this.activeGamepadType = null;
        if (this.debug) {
            // if the debug option is active, use the associated template
            this.activeGamepadType = 'debug';
        } else if (this.params.gamepadType) {
            // if the gamepad type is set through params, apply it
            this.activeGamepadType = this.params.gamepadType;
        } else {
            // else, determine the template to use from the gamepad identifier
            for (let gamepadType in this.gamepadIdentifiers) {
                if (this.gamepadIdentifiers[gamepadType].id.test(activeGamepad.id)) {
                    this.activeGamepadType = gamepadType;
                }
            }
        }
        this.activeGamepadIdentifier = this.gamepadIdentifiers[this.activeGamepadType];
        this.activeGamepadColorIndex = 0;

        // ensure a valid gamepad type was discovered
        if (!this.activeGamepadType) {
            return;
        }

        // hoist some template related variables
        let button;
        let axis;

        // hide the help before displaying the template
        this.hideGamepadHelp();

        // load the template HTML file
        $.ajax(
            'templates/' + this.activeGamepadType + '/template.html'
        ).done((template) => {
            // inject the template HTML
            this.$gamepad.html(template);

            // read for parameters to apply:
            // - color
            if (this.params.gamepadColor) {
                this.changeGamepadColor(this.params.gamepadColor);
            }
            // - zoom
            if (this.params.zoom) {
                this.changeZoom(this.params.zoom);
            }

            // save the buttons mapping of this template
            this.mapping.buttons = [];
            for (let buttonIndex = 0; buttonIndex < activeGamepad.buttons.length; buttonIndex++) {
                button = activeGamepad.buttons[buttonIndex];
                this.mapping.buttons[buttonIndex] = $('[data-button=' + buttonIndex + ']');
            }

            // save the axes mapping of this template
            this.mapping.axes = [];
            for (let axisIndex = 0; axisIndex < activeGamepad.axes.length; axisIndex++) {
                axis = activeGamepad.axes[axisIndex];
                this.mapping.axes[axisIndex] = $('[data-axis=' + axisIndex + '], [data-axis-x=' + axisIndex + '], [data-axis-y=' + axisIndex + '], [data-axis-z=' + axisIndex + ']');
            }

            // enqueue the initial display refresh
            this.updateStatus();
        });
    }

    /**
     * Updates the status of the active gamepad
     */
    updateStatus() {
        // ensure that a gamepad is currently active
        if (!this.activeGamepadIndex) {
            return;
        }

        // enqueue the next refresh right away
        window.requestAnimationFrame(this.updateStatus.bind(this));

        // load latest gamepad data
        this.refreshGamepads();
        const activeGamepad = this.getActiveGamepad();

        // hoist some variables
        let button;
        let $button;
        let axis;
        let $axis;

        // update the buttons
        for (let buttonIndex = 0; buttonIndex < activeGamepad.buttons.length; buttonIndex++) {
            // find the DOM element
            $button = this.mapping.buttons[buttonIndex];
            if (!$button) {
                // nothing to do for this button if no DOM element exists
                break;
            }

            // read the button data
            button = activeGamepad.buttons[buttonIndex];

            // update the display values
            $button.attr('data-pressed', button.pressed);
            $button.attr('data-value', button.value);

            // hook the template defined button update method
            if ("function" === typeof this.updateButton) {
                this.updateButton($button);
            }
        }

        // update the axes
        for (let axisIndex = 0; axisIndex < activeGamepad.axes.length; axisIndex++) {
            // find the DOM element
            $axis = this.mapping.axes[axisIndex];
            if (!$axis) {
                // nothing to do for this button if no DOM element exists
                break;
            }

            // read the axis data
            axis = activeGamepad.axes[axisIndex];

            // update the display values
            if ($axis.is('[data-axis=' + axisIndex + ']')) {
                $axis.attr('data-value', axis);
            }
            if ($axis.is('[data-axis-x=' + axisIndex + ']')) {
                $axis.attr('data-value-x', axis);
            }
            if ($axis.is('[data-axis-y=' + axisIndex + ']')) {
                $axis.attr('data-value-y', axis);
            }
            if ($axis.is('[data-axis-z=' + axisIndex + ']')) {
                $axis.attr('data-value-z', axis);
            }

            // hook the template defined axis update method
            if ("function" === typeof this.updateAxis) {
                this.updateAxis($axis);
            }
        }
    }

    /**
     * Changes the active gamepad color
     *
     * @param {any} gamepadColor
     */
    changeGamepadColor(gamepadColor) {
        // ensure that a gamepad is currently active
        if (!this.activeGamepadIndex) {
            return;
        }

        const activeGamepad = this.getActiveGamepad();
        if ('undefined' === typeof gamepadColor) {
            // no color was specified, load the next one in list
            this.activeGamepadColorIndex++;
            if (this.activeGamepadColorIndex > this.activeGamepadIdentifier.colors.length - 1) {
                this.activeGamepadColorIndex = 0;
            }

            this.activeGamepadColorName = this.activeGamepadIdentifier.colors[this.activeGamepadColorIndex];
        } else {
            if (!isNaN(parseInt(gamepadColor))) {
                // the color is a number, load it by its index
                this.activeGamepadColorIndex = gamepadColor;
                this.activeGamepadColorName = this.activeGamepadIdentifier.colors[this.activeGamepadColorIndex];
            } else {
                // the color is a string, load it by its name
                this.activeGamepadColorName = gamepadColor;
                this.activeGamepadColorIndex = 0;
                for (let gamepadColorIndex in this.activeGamepadIdentifier.colors) {
                    if (this.activeGamepadColorName === this.activeGamepadIdentifier.colors[gamepadColorIndex]) {
                        break;
                    }
                    this.activeGamepadColorIndex++;
                }
            }
        }

        // update the DOM with the color value
        this.$gamepad.attr('data-color', this.activeGamepadColorName);
    }

    /**
     * Changes the active gamepad zoom level
     *
     * @param {any} zoomLevel
     */
    changeZoom(zoomLevel) {
        // ensure that a gamepad is currently active
        if (!this.activeGamepadIndex) {
            return;
        }

        // ensure we have some data to process
        if ('undefined' === typeof zoomLevel) {
            return;
        }

        if ('0' === zoomLevel) {
            // "0" means a zoom reset
            this.activeGamepadZoomLevel = 1;
        } else if ('+' === zoomLevel && this.activeGamepadZoomLevel < 2) {
            // "+" means a zoom in if we still can
            this.activeGamepadZoomLevel += 0.1;
        } else if ('-' === zoomLevel && this.activeGamepadZoomLevel > 0.2) {
            // "-" means a zoom out if we still can
            this.activeGamepadZoomLevel -= 0.1;
        } else if (!isNaN(zoomLevel = parseFloat(zoomLevel))) {
            // an integer value means a value-based zoom
            this.activeGamepadZoomLevel = zoomLevel;
        }

        // hack: fix js float issues
        this.activeGamepadZoomLevel = +this.activeGamepadZoomLevel.toFixed(1);

        // update the DOM with the zoom value
        this.$gamepad.css(
            'transform',
            'translate(-50%, -50%) scale(' + this.activeGamepadZoomLevel + ', ' + this.activeGamepadZoomLevel + ')'
        );
    }

    /**
     * Toggles the on-screen help message
     */
    toggleHelp() {
        this.$help.toggleClass('active');
    }

    /**
     * Toggles the debug template for the active gamepad, if any
     */
    toggleDebug() {
        // ensure that a gamepad is currently active
        if (!this.activeGamepadIndex) {
            return;
        }

        // update debug value
        this.debug = !this.debug;

        // remap current gamepad
        this.mapGamepad(this.activeGamepadIndex);
    }
}
