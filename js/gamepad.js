class Gamepad {
    constructor() {
        this.haveEvents = 'GamepadEvent' in window;
        
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
                'colors': []
            },
            'ds4': {
                'id': /054c.*?05c4/,
                'colors': ['black', 'white', 'red', 'blue']
            },
            'xbox-one': {
                'id': /xinput|XInput/,
                'colors': ['black', 'white']
            }
        };

        // gamepad help default values
        this.gamepadHelpTimeout = null;
        this.gamepadHelpDelay = 5000;
        
        // active gamepad default values
        this.scanGamepadsDelay = 500;
        this.debug = false;
        this.activeGamepad = null;
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
        window.addEventListener("gamepadconnected", this.onGamepadConnect.bind(this));
        window.addEventListener("gamepaddisconnected", this.onGamepadDisconnect.bind(this));
        
        // listen for keyboard events
        window.addEventListener("keydown", this.onKeyDown.bind(this));

        // bind a gamepads scan
        window.setInterval(this.scanGamepads.bind(this), this.scanGamepadsDelay);

        // read URI for display parameters to initalize
        this.params = {
            gamepadIndex: $.urlParam('index') || $.urlParam('i') || null,
            gamepadColor: $.urlParam('color') || $.urlParam('c') || null,
            zoom: $.urlParam('zoom') || $.urlParam('z') || null
        };

        // if a gamepad index is specified, try to map the corresponding gamepad
        if (this.params.gamepadIndex) {
            this.refreshGamepads();
            this.mapGamepad(+this.params.gamepadIndex);

            return;
        }

        // by default, enqueue a delayed display of the help tooltip
        this.displayGamepadHelp();
    }
    
    displayGamepadHelp(displayNow = false) {
        // display help tooltip if no gamepad is active after X ms
        this.gamepadHelpTimeout = window.setTimeout(
            () => {
                this.$nogamepad.fadeIn();
            },
            displayNow ? 0 : this.gamepadHelpDelay
        );
    }

    hideGamepadHelp() {
        // cancel the queued display of the help tooltip, if any
        window.clearTimeout(this.gamepadHelpTimeout);
        // hide the help tooltip
        this.$nogamepad.hide();
    }

    onGamepadConnect(e) {
        // on gamepad connection, add it to the list
        this.addGamepad(e.gamepad);
    }

    onGamepadDisconnect(e) {
        // on gamepad disconnection, remove it from the list
        this.removeGamepad(e.gamepad.index);
    }

    onKeyDown(e) {
        switch (e.code) {
            case "Delete":
            case "Escape":
                this.removeGamepad(this.activeGamepadIndex);
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

    refreshGamepads() {
        // get fresh information from DOM about gamepads
        this.gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
    }

    getActiveGamepad() {
        return this.activeGamepad;
    }

    addGamepad(gamepad) {
        this.gamepads[gamepad.index] = gamepad;
    }

    removeGamepad(gamepadIndex) {
        // ensure we have an index to remove
        if ('undefined' === typeof gamepadIndex) {
            return;
        }

        // if this is the active gamepad
        if (gamepadIndex === this.activeGamepadIndex) {
            // clear associated date
            this.activeGamepadIndex = null;
            this.$gamepad.empty();
        }
        delete this.gamepads[gamepadIndex];

        // enqueue a display of the help tooltip
        this.displayGamepadHelp();
        this.debug = false;
    }

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

    mapGamepad(gamepadIndex) {
        // ensure a gamepad need to be mapped
        if ('undefined' === typeof gamepadIndex) {
            return;
        }

        // update local references
        this.activeGamepadIndex = gamepadIndex;
        this.activeGamepad = this.gamepads[this.activeGamepadIndex];

        // ensure that a gamepad was actually found for this index
        if (!this.activeGamepad) {
            // this mapping request was probably a mistake :
            // - remove the active gamepad index and reference
            this.activeGamepadIndex = null;
            this.activeGamepad = null;
            // - enqueue a display of the help tooltip right away
            this.displayGamepadHelp(true);

            return;
        }

        this.activeGamepadType = null;
        if (this.debug) {
            // if the debug option is active, use the associated template
            this.activeGamepadType = 'debug';
            this.activeGamepadIdentifier = this.gamepadIdentifiers[this.activeGamepadType];
            this.activeGamepadColorIndex = 0;
        } else {
            // else, determine the template to use from the gamepad identifier
            for (let gamepadType in this.gamepadIdentifiers) {
                if (this.gamepadIdentifiers[gamepadType].id.test(this.activeGamepad.id)) {
                    this.activeGamepadType = gamepadType;
                    this.activeGamepadIdentifier = this.gamepadIdentifiers[gamepadType];
                    this.activeGamepadColorIndex = 0;
                }
            }
        }

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
            for (let buttonIndex = 0; buttonIndex < this.activeGamepad.buttons.length; buttonIndex++) {
                button = this.activeGamepad.buttons[buttonIndex];
                this.mapping.buttons[buttonIndex] = $('[data-button=' + buttonIndex + ']');
            }

            // save the axes mapping of this template
            this.mapping.axes = [];
            for (let axisIndex = 0; axisIndex < this.activeGamepad.axes.length; axisIndex++) {
                axis = this.activeGamepad.axes[axisIndex];
                this.mapping.axes[axisIndex] = $('[data-axis=' + axisIndex + '], [data-axis-x=' + axisIndex + '], [data-axis-y=' + axisIndex + '], [data-axis-z=' + axisIndex + ']');
            }

            // enqueue the initial display refresh
            this.updateStatus();
        });
    }

    updateStatus() {
        // ensure that a gamepad is currently active
        if (!this.activeGamepad) {
            return;
        }

        // enqueue the next refresh right away
        window.requestAnimationFrame(this.updateStatus.bind(this));

        // load latest gamepad data
        this.refreshGamepads();

        // hoist some variables
        let button;
        let $button;
        let axis;
        let $axis;

        // update the buttons
        for (let buttonIndex = 0; buttonIndex < this.activeGamepad.buttons.length; buttonIndex++) {
            // find the DOM element
            $button = this.mapping.buttons[buttonIndex];
            if (!$button) {
                // nothing to do for this button if no DOM element exists
                break;
            }

            // read the button data
            button = this.activeGamepad.buttons[buttonIndex];

            // update the display values
            $button.attr('data-pressed', button.pressed);
            $button.attr('data-value', button.value);

            // hook the template defined button update method
            if ("function" === typeof this.updateButton) {
                this.updateButton($button);
            }
        }

        // update the axes
        for (let axisIndex = 0; axisIndex < this.activeGamepad.axes.length; axisIndex++) {
            // find the DOM element
            $axis = this.mapping.axes[axisIndex];
            if (!$axis) {
                // nothing to do for this button if no DOM element exists
                break;
            }

            // read the axis data
            axis = this.activeGamepad.axes[axisIndex];

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

    changeGamepadColor(gamepadColor) {
        // ensure that a gamepad is currently active
        if (!this.activeGamepad) {
            return;
        }

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
                for (let gamepadColorName in this.activeGamepadIdentifier.colors) {
                    if (this.activeGamepadColorName === gamepadColorName) {
                        break;
                    }
                    this.activeGamepadColorIndex++;
                }
            }
        }

        // update the DOM with the color value
        this.$gamepad.attr('data-color', this.activeGamepadColorName);
    }

    changeZoom(zoomLevel) {
        // ensure that a gamepad is currently active
        if (!this.activeGamepad) {
            return;
        }

        // ensure we have some data to process
        if ('undefined' === typeof zoomLevel) {
            return;
        }

        if ('0' === zoomLevel) {
            // "0" means a zoom reset
            this.activeGamepadZoomLevel = 1;
        }
        else if ('+' === zoomLevel && this.activeGamepadZoomLevel < 2) {
            // "+" means a zoom in if we still can
            this.activeGamepadZoomLevel += 0.1;
        }
        else if ('-' === zoomLevel && this.activeGamepadZoomLevel > 0.2) {
            // "-" means a zoom out if we still can
            this.activeGamepadZoomLevel -= 0.1;
        }
        else if (!isNaN(zoomLevel = parseFloat(zoomLevel))) {
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

    toggleHelp(zoomLevel) {
        this.$help.toggleClass('active');
    }

    toggleDebug() {
        // ensure that a gamepad is currently active
        if (!this.activeGamepad) {
            return;
        }

        // update debug value
        this.debug = !this.debug;

        // remap current gamepad
        this.mapGamepad(this.activeGamepadIndex);
    }
}
