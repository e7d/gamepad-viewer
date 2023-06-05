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
        this.$body = document.querySelector('body');
        this.$instructions = document.querySelector('#instructions');
        this.$placeholder = document.querySelector('#placeholder');
        this.$gamepad = document.querySelector('#gamepad');
        this.$overlay = document.querySelector('#overlay');
        this.$gamepadSelect = document.querySelector('select[name=gamepad-id]');
        this.$skinSelect = document.querySelector('select[name=skin]');
        this.$backgroundSelect = document.querySelector('select[name=background]');
        this.$colorOverlay = this.$overlay.querySelector('#color');
        this.$colorSelect = this.$colorOverlay.querySelector('select[name=color]');
        this.$triggersOverlay = this.$overlay.querySelector('#triggers');
        this.$triggersSelect = this.$triggersOverlay.querySelector('select[name=triggers]');
        this.$helpPopout = document.querySelector('#help.popout');
        this.$helpPopoutClose = this.$helpPopout.querySelector('.close');
        this.$gamepadList = document.querySelector('#gamepad-list');

        // ensure the GamePad API is available on this browser
        this.assertGamepadAPI();

        // overlay selectors
        this.backgroundStyle = [
            'transparent',
            'checkered',
            'dimgrey',
            'black',
            'white',
            'lime',
            'magenta',
        ];
        this.textColors = [
            'black',
            'black',
            'black',
            'white',
            'black',
            'black',
            'black',
        ];
        this.initOverlaySelectors();

        // gamepad collection default values
        this.gamepads = {};
        this.identifiers = {
            // See: https://html5gamepad.com/codes
            debug: {
                id: /debug/,
                name: 'Debug',
            },
            ds4: {
                id: /05c4|09cc|0104|046d|0810|2563/, // 05c4,09cc,0104 = DS4 controllers product codes, 046d,0810,2563 = PS-like controllers vendor codes
                name: 'DualShock 4',
                colors: ['black', 'white', 'red', 'blue'],
                triggers: true,
                zoom: true,
            },
            dualsense: {
                id: /0ce6/, // 0ce6 = DualSense controller product code
                name: 'DualSense',
                colors: ['white', 'black'],
                triggers: true,
                zoom: true,
            },
            // gamecube: {
            //     id: /0079/, // 0079 = Nintendo GameCube vendor code
            //     name: 'GameCube Controller',
            //     colors: ['black', 'purple'],
            // },
            // 'joy-con': {
            //     id: /200e/, // 200e = Joy-Con specific product code
            //     name: 'Joy-Con (L+R) Controllers',
            //     colors: ['blue-red', 'grey-grey'],
            // },
            // stadia: {
            //     id: /18d1/, // 18d1 = Google vendor code
            //     name: 'Stadia Controller',
            //     colors: ['black'],
            // },
            // 'switch-pro': {
            //     id: /057e|20d6|2009/, // 057e = Nintendo Switch vendor code, 20d6,2009 = Switch Pro-like vendor code
            //     name: 'Switch Pro Controller',
            //     colors: ['black'],
            // },
            telemetry: {
                id: /telemetry/,
                name: 'Telemetry',
                zoom: true
            },
            'xbox-one': {
                id: /045e|xinput|XInput/, // 045e = Microsoft vendor code, xinput = standard Windows controller
                name: 'Xbox One',
                colors: ['black', 'white'],
                triggers: true,
                zoom: true,
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
        this.isFirstscan = true;
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
        this.zoomMode = 'auto';
        this.zoomLevel = 1;
        this.mapping = {
            buttons: [],
            axes: [],
        };

        // listen for gamepad related events
        this.haveEvents = 'GamepadEvent' in window;
        if (this.haveEvents) {
            window.addEventListener(
                'gamepadconnected',
                this.onGamepadConnect.bind(this)
            );
            window.addEventListener(
                'gamepaddisconnected',
                this.onGamepadDisconnect.bind(this)
            );
        }

        // listen for mouse move events
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
        // listen for keyboard events
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        // listen for keyboard events
        window.addEventListener('resize', this.onResize.bind(this));

        // bind a gamepads scan
        window.setInterval(this.scan.bind(this), this.scanDelay);

        // change the type if specified
        const skin = this.getUrlParam('type');
        if (skin) {
            this.changeSkin(skin);
        }

        // change the background if specified
        const background = this.getUrlParam('background');
        if (background) {
            let backgroundStyleIndex;
            for (let i = 0; i < this.backgroundStyle.length; i++) {
                if (background === this.backgroundStyle[i]) {
                    backgroundStyleIndex = i;
                    break;
                }
            }
            if (backgroundStyleIndex) {
                this.changeBackgroundStyle(backgroundStyleIndex);
            }
        }

        // by default, enqueue a delayed display of the placeholder animation
        this.displayPlaceholder();

        // listen for keyboard events
        this.$helpPopoutClose.addEventListener('click', this.toggleHelp.bind(this));
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
            this.$body.classList.add('unsupported');
            throw new Error('Unsupported gamepad API');
        }
        this.getNavigatorGamepads = getGamepadsFn;
    }

    /**
     * Initialises the overlay selectors
     */
    initOverlaySelectors() {
        this.$gamepadSelect.addEventListener('change', () =>
            this.changeGamepad(this.$gamepadSelect.value)
        );
        this.$skinSelect.addEventListener('change', () =>
            this.changeSkin(this.$skinSelect.value)
        );
        this.$backgroundSelect.addEventListener('change', () =>
            this.changeBackgroundStyle(this.$backgroundSelect.value)
        );
        this.$colorSelect.addEventListener('change', () =>
            this.changeGamepadColor(this.$colorSelect.value)
        );
        this.$triggersSelect.addEventListener('change', () =>
            this.toggleTriggersMeter(this.$triggersSelect.value === 'meter')
        );
    }

    /**
     * Shows an HTML element
     *
     * @param {HTMLElement} $element
     */
    show($element) {
        $element.style.removeProperty('display');
        $element.classList.remove('fadeIn', 'fadeOut');
    }

    /**
     * Hides an HTML element
     *
     * @param {HTMLElement} $element
     */
    hide($element) {
        $element.style.setProperty('display', 'none');
        $element.classList.remove('fadeIn', 'fadeOut');
    }

    /**
     * Fades in an HTML element
     *
     * @param {HTMLElement} $element
     */
    fadeIn($element) {
        $element.style.removeProperty('display');
        $element.classList.remove('fadeOut');
        $element.classList.add('fadeIn');
    }

    /**
     * Fades out an HTML element
     *
     * @param {HTMLElement} $element
     */
    fadeOut($element) {
        $element.style.removeProperty('display');
        $element.classList.remove('fadeIn');
        $element.classList.add('fadeOut');
    }

    /**
     * Displays the instructions
     */
    displayInstructions() {
        // do not display help if we have an active gamepad
        if (null !== this.index) return;

        // show the instructions
        this.fadeIn(this.$instructions);

        // enqueue a delayed display of the instructions animation
        this.hideInstructions();
    }

    /**
     * Hides the instructions animation
     *
     * @param {boolean} [hideNow=false]
     */
    hideInstructions(hideNow = false) {
        // cancel the queued display of the instructions animation, if any
        window.clearTimeout(this.instructionsTimeout);

        // hide the message right away if needed
        if (hideNow) {
            this.hide(this.$instructions);
            return;
        }

        // hide instructions animation if no gamepad is active after X ms
        this.instructionsTimeout = window.setTimeout(
            () => this.fadeOut(this.$instructions),
            this.instructionsDelay
        );
    }

    /**
     * Displays the placeholder animation on screen
     */
    displayPlaceholder() {
        // do not display help if we have an active gamepad
        if (null !== this.index) return;

        // show the placeholder
        this.fadeIn(this.$placeholder);

        // enqueue a delayed display of the placeholder animation
        this.hidePlaceholder();
    }

    /**
     * Hides the placeholder animation
     *
     * @param {boolean} [hideNow=false]
     */
    hidePlaceholder(hideNow = false) {
        // cancel the queued display of the placeholder animation, if any
        window.clearTimeout(this.placeholderTimeout);

        // hide the animation right away if needed
        if (hideNow) {
            this.hide(this.$placeholder);
            return;
        }

        // hide placeholder animation if no gamepad is active after X ms
        this.placeholderTimeout = window.setTimeout(
            () => this.fadeOut(this.$placeholder),
            this.placeholderDelay
        );
    }

    /**
     * Displays the overlay animation on screen
     */
    displayOverlay() {
        // show the overlay
        this.fadeIn(this.$overlay);

        // enqueue a delayed display of the overlay animation
        this.hideOverlay();
    }

    /**
     * Hides the overlay animation
     *
     * @param {boolean} [hideNow=false]
     */
    hideOverlay(hideNow = false) {
        // cancel the queued display of the overlay animation, if any
        window.clearTimeout(this.overlayTimeout);

        // hide the message right away if needed
        if (hideNow) {
            this.hide(this.$overlay);
            return;
        }

        // hide overlay animation if no gamepad is active after X ms
        this.overlayTimeout = window.setTimeout(
            () => this.fadeOut(this.$overlay),
            this.overlayDelay
        );
    }

    /**
     * Extracts the name, vendor and product from a gamepad identifier
     *
     * @param {string} id
     * @returns {object}
     */
    toGamepadInfo(id) {
        return /(?<name>.*?) \((?:.*?Vendor: (?<vendor>[0-9a-f]{4}) Product: (?<product>[0-9a-f]{4})|(?<id>.*?))\)/.exec(id).groups;
    }

    /**
     * Updates the list of connected gamepads in the overlay
     */
    updateGamepadList() {
        this.$gamepadSelect.querySelectorAll('.entry').forEach($entry => $entry.remove());
        const $options = [];
        for (let key = 0; key < this.gamepads.length; key++) {
            const gamepad = this.gamepads[key];
            if (!gamepad) continue;
            const { name } = this.toGamepadInfo(gamepad.id);
            $options.push(
                `<option class='entry' value='${gamepad.id}'>${name}</option>`
            );
        }
        this.$gamepadSelect.innerHTML += $options.join('');
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

        const colorOptions = colors.map(
            (color) => `<option value='${color}'>${color.charAt(0).toUpperCase()}${color.slice(1)}</option>`
        );
        this.$colorSelect.innerHTML = colorOptions.join('');
        this.show(this.$colorOverlay);
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

        this.show(this.$triggersOverlay);
    }

    /**
     * Handles the gamepad connection event
     *
     * @param {GamepadEvent} e
     */
    onGamepadConnect(e) {
        // refresh gamepads information
        this.pollGamepads();

        // refresh gamepad list on overlay
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
        // refresh gamepads information
        this.pollGamepads();

        // refresh gamepad list on overlay
        this.updateGamepadList();

        if (e.gamepad.index === this.index) {
            // display a disconnection indicator
            this.$gamepad.classList.add('disconnected');
            this.disconnectedIndex = e.gamepad.index;

            // refresh gamepad list on help, if displayed
            if (this.helpVisible) this.buildHelpGamepadList();
        }
    }

    /**
     * Handles the mouse 'mousemove' event
     *
     * @param {MouseEvent} e
     */
    onMouseMove() {
        this.displayInstructions();
        this.displayPlaceholder();
        this.displayOverlay();
    }

    /**
     * Handles the keyboard 'keydown' event
     *
     * @param {KeyboardEvent} e
     */
    onKeyDown(e) {
        switch (e.code) {
            case 'Delete':
            case 'Escape':
                this.clear();
                this.displayPlaceholder();
                break;
            case 'KeyB':
                this.changeBackgroundStyle();
                break;
            case 'KeyC':
                this.changeGamepadColor();
                break;
            case 'KeyD':
                this.toggleDebug();
                break;
            case 'KeyG':
                this.toggleGamepadType();
                break;
            case 'KeyH':
                this.toggleHelp();
                break;
            case 'KeyT':
                this.toggleTriggersMeter();
                break;
            case 'NumpadAdd':
            case 'Equal':
                this.changeZoom('+');
                break;
            case 'NumpadSubtract':
            case 'Minus':
                this.changeZoom('-');
                break;
            case 'Numpad5':
            case 'Digit5':
                this.changeZoom('auto');
                break;
            case 'Numpad0':
            case 'Digit0':
                this.changeZoom(0);
                break;
        }
    }

    /**
     * Handles the keyboard 'keydown' event
     *
     * @param {WindowEvent} e
     */
    onResize(e) {
        if (this.zoomMode === 'auto') this.changeZoom('auto');
    }

    /**
     * Reloads gamepads data
     */
    pollGamepads() {
        // get fresh information from DOM about gamepads
        const gamepads = this.getNavigatorGamepads();
        if (gamepads !== this.gamepads) this.gamepads = gamepads;

        // when visible, refresh gamepad list with latest data
        if (this.helpVisible) this.buildHelpGamepadList();
    }

    /**
     * Builds the help gamepad list
     */
    buildHelpGamepadList() {
        const $tbody = [];
        for (let key = 0; key < this.gamepads.length; key++) {
            const gamepad = this.gamepads[key];
            if (!gamepad) continue;
            $tbody.push(`<tr><td>${gamepad.index}</td><td>${gamepad.id}</td></tr>`);
        }

        if ($tbody.length === 0) {
            this.$gamepadList.innerHTML = '<tr><td colspan="2">No gamepad detected.</td></tr>';
            return;
        }

        this.$gamepadList.innerHTML = $tbody.join('');
    }

    /**
     * Return the connected gamepad
     *
     * @returns {object}
     */
    getActive() {
        return this.gamepads[this.index];
    }

    /**
     * Return the gamepad type for the connected gamepad
     *
     * @param {object} gamepad
     * @returns {string}
     */
    getType(gamepad) {
        const type = this.getUrlParam('type');

        // if the debug option is active, use the associated template
        if (type === 'debug') this.debug = true;
        if (this.debug) {
            return 'debug';
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

        return 'debug';
    }

    /**
     * Scans gamepads for activity
     */
    scan() {
        // don't scan if we have an active gamepad
        if (null !== this.index && null === this.disconnectedIndex) return;

        // refresh gamepad information
        this.pollGamepads();

        if (this.isFirstscan) {
            // update the overlay list
            this.updateGamepadList();
            this.isFirstscan = false;
        }

        for (let index = 0; index < this.gamepads.length; index++) {
            if (
                null !== this.disconnectedIndex &&
                index !== this.disconnectedIndex
            ) continue;

            const gamepad = this.gamepads[index];
            if (!gamepad) continue;

            // check the parameters for a selected gamepad
            const gamepadId = this.getUrlParam('gamepad');
            if (gamepadId === gamepad.id) {
                this.map(gamepad.index);
                return;
            }

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
        if ('undefined' === typeof index) return;

        // hide the help messages
        this.hideInstructions(true);
        this.hidePlaceholder(true);

        // update local references
        this.index = index;
        this.disconnectedIndex = null;
        this.$gamepad.classList.remove('disconnected');
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

        // update the overlay selectors
        this.$gamepadSelect.value = gamepad.id;
        this.updateColors();
        this.updateTriggers();

        // load the HTML template file
        this.loadTemplate();
    }

    /**
     * Computes a SHA-1 for a given string
     *
     * @param {string} value
     * @returns {string}
     */
    async toHash(value) {
        return crypto.subtle
            .digest('SHA-1', new TextEncoder().encode(value))
            .then(ab => encodeURIComponent(String.fromCharCode.apply(null, new Uint8Array(ab))));
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

        // clear the current template
        this.clearTemplate();

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
        this.$gamepad.innerHTML = '';
        this.$gamepad.classList.remove('fadeIn');
        this.$gamepadSelect.value = 'auto';
        this.updateColors();
        this.updateTriggers();
        this.clearUrlParams();
    }

    /**
     * Loads the template script and stylesheet
     */
    loadTemplateAssets() {
        const script = document.createElement('script');
        script.async = true;
        script.src = `templates/${this.type}/template.js`;
        script.onload = () => {
            // initialize the template
            new this.template();

            // enqueue the initial display refresh
            this.startTemplate();
        }
        this.$gamepad.appendChild(script);

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `templates/${this.type}/template.css`;
        this.$gamepad.appendChild(link);
    }

    /**
     * Load the HTML template file for the active gamepad
     */
    loadTemplate() {
        // hide the gamepad while we prepare it
        this.$gamepad.style.setProperty('display', 'none');

        fetch(`templates/${this.type}/template.html`)
            .then((response) => response.text())
            .then((template) => {
                // inject the template HTML
                this.$gamepad.innerHTML = template;
                this.loadTemplateAssets();

                // read for parameters to apply:
                const identifier = this.identifiers[this.type];
                // - color
                if (identifier.colors) {
                    this.changeGamepadColor(this.getUrlParam('color'));
                } else {
                    this.updateUrlParams({ color: undefined });
                }
                // - triggers mode
                if (identifier.triggers) {
                    this.toggleTriggersMeter(this.getUrlParam('triggers') === 'meter');
                } else {
                    this.updateUrlParams({ triggers: undefined });
                }
                // - zoom
                if (identifier.zoom) {
                    window.setTimeout(() =>
                        this.changeZoom(
                            this.type === 'debug'
                                ? 'auto'
                                : this.getUrlParam('zoom') || 'auto'
                        )
                    );
                } else {
                    this.updateUrlParams({ zoom: undefined });
                }

                // once fully loaded, display the gamepad
                this.$gamepad.style.removeProperty('display');
                this.$gamepad.classList.remove('fadeOut');
                this.$gamepad.classList.add('fadeIn');
            });
    }

    /**
     * Starts the template
     */
    startTemplate() {
        // get the active gamepad
        const activeGamepad = this.getActive();

        // save the buttons mapping of this template
        this.mapping.buttons = activeGamepad.buttons.map((_, index) => {
            const $button = document.querySelector(`[data-button='${index}']`);
            return { $button, button: { pressed: null, value: null } };
        });

        // save the axes mapping of this template
        this.mapping.axes = activeGamepad.axes.map((_, index) => {
            const { $axis, attribute } = ['data-axis', 'data-axis-x', 'data-axis-y'].reduce((acc, attribute) => {
                if (acc.$axis) return acc;
                const $axis = document.querySelector(`[${attribute}='${index}']`);
                return $axis ? { $axis, attribute, axis: null } : acc;
            }, {});
            return { $axis, attribute };
        });

        // enqueue the initial display refresh
        this.pollStatus(true);
    }

    /**
     * Clears the template
     */
    clearTemplate() {
        // ensure that a tempalte is currently loaded
        if (!this.template) return;

        // destruct and clear the template
        if (this.template.destructor) this.template.destructor();
        delete this.template;
    }

    /**
     * Updates the status of the active gamepad
     */
    pollStatus(force = false) {
        // ensure that a gamepad is currently active
        if (this.index === null || this.index === this.disconnectedIndex) return;

        // enqueue the next refresh
        window.requestAnimationFrame(this.pollStatus.bind(this));

        // load latest gamepad data
        this.pollGamepads();
        const activeGamepad = this.getActive();

        // check for actual gamepad update
        if (
            !force &&
            (!activeGamepad || activeGamepad.timestamp === this.lastTimestamp)
        ) return;
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
        gamepad.buttons.forEach((updatedButton, index) => {
            // get the button information
            const { $button, button } = this.mapping.buttons[index];
            if (!$button) return;

            // update the display values
            if (updatedButton.pressed !== button.pressed || updatedButton.value !== button.value) {
                $button.setAttribute('data-pressed', updatedButton.pressed);
                $button.setAttribute('data-value', updatedButton.value);

                // ensure we have a button updater callback and hook the template defined button update method
                if ('function' === typeof this.updateButton) this.updateButton($button, updatedButton);
            }

            // save the updated button
            this.mapping.buttons[index].button = updatedButton;
        });
    }

    /**
     * Updates the axes status of the active gamepad
     *
     * @param {*} gamepad
     */
    updateAxes(gamepad) {
        // update the axes
        gamepad.axes.forEach((updatedAxis, index) => {
            // get the axis information
            const { $axis, attribute, axis } = this.mapping.axes[index];
            if (!$axis) return;

            // update the display value
            if (updatedAxis !== axis) {
                $axis.setAttribute(attribute.replace('-axis', '-value'), updatedAxis);

                // ensure we have an axis updater callback and hook the template defined axis update method
                if ('function' === typeof this.updateAxis) this.updateAxis($axis, attribute, updatedAxis);
            }

            // save the updated button
            this.mapping.axes[index].axis = updatedAxis;
        });
    }

    /**
     * Changes the active gamepad
     *
     * @param {string} gamepadId
     */
    changeGamepad(gamepadId) {
        // get the index corresponding to the identifier of the gamepad
        const index = this.gamepads.findIndex(g => g && gamepadId === g.id);

        // set the selected gamepad
        this.updateUrlParams({ gamepad: gamepadId !== 'auto' ? gamepadId : undefined });
        index === -1 ? this.clear() : this.map(index);
    }

    /**
     * Changes the skin
     *
     * @param {any} skin
     */
    changeSkin(skin) {
        // clear the current template
        this.clearTemplate();

        // update the visual skin selector
        this.$skinSelect.value = skin;

        // set the selected skin
        this.debug = skin === 'debug';
        this.updateUrlParams({ type: skin !== 'auto' ? skin : undefined });
        this.map(this.index);
    }

    /**
     * Changes the background style
     *
     * @param {any} style
     */
    changeBackgroundStyle(style) {
        if ('undefined' === typeof style) {
            this.backgroundStyleIndex++;
            if (this.backgroundStyleIndex > this.backgroundStyle.length - 1) {
                this.backgroundStyleIndex = 0;
            }
        } else if ('string' === typeof style) {
            this.backgroundStyleIndex = this.backgroundStyle.findIndex(
                (s) => s === style
            );
        } else {
            this.backgroundStyleIndex = style;
        }
        this.backgroundStyleName =
            this.backgroundStyle[this.backgroundStyleIndex];

        this.$body.style.setProperty(
            'background',
            this.backgroundStyleName === 'checkered'
                ? 'url(css/transparent-bg.png)'
                : this.backgroundStyleName
        );
        this.$body.style.setProperty('color', this.textColors[this.backgroundStyleIndex]);

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

        if ('undefined' === typeof color) {
            // no color was specified, load the next one in list
            this.colorIndex++;
            if (this.colorIndex > this.identifier.colors.length - 1) {
                this.colorIndex = 0;
            }
        } else if ('string' === typeof style) {
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
        this.$gamepad.setAttribute('data-color', this.colorName);

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
        if (typeof level === 'undefined') return;

        this.zoomMode = level === 'auto' ? 'auto' : 'manual';

        if (this.zoomMode === 'auto') {
            // 'auto' means a 'contained in window' zoom, with a max zoom of 1
            const { width, height } = this.$gamepad.getBoundingClientRect();
            this.zoomLevel = Math.min(
                window.innerWidth / width,
                window.innerHeight / height,
                1
            );
        } else if (level === 0) {
            // 0 means a zoom reset
            this.zoomLevel = 1;
        } else if (level === '+' && this.zoomLevel < 4) {
            // '+' means a zoom in if we still can
            this.zoomLevel += 0.1;
        } else if (level === '-' && this.zoomLevel > 0.1) {
            // '-' means a zoom out if we still can
            this.zoomLevel -= 0.1;
        } else if (!isNaN((level = parseFloat(level)))) {
            // an integer value means a value-based zoom
            this.zoomLevel = level;
        }

        // hack: fix js float issues
        this.zoomLevel = +this.zoomLevel.toFixed(2);

        // update the DOM with the zoom value
        this.$gamepad.style.setProperty(
            'transform',
            `translate(-50%, -50%) scale(${this.zoomLevel}, ${this.zoomLevel})`
        );

        // update current settings
        this.updateUrlParams({
            zoom: this.zoomMode === 'auto' ? undefined : this.zoomLevel,
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
            (i) => i !== 'debug'
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
        this.changeSkin(this.debug ? 'debug' : 'auto')
    }

    /**
     * Toggles the on-screen help message
     */
    toggleHelp() {
        // display the help popout
        this.$helpPopout.classList.toggle('active');
        this.helpVisible = this.$helpPopout.classList.contains('active');
    }

    /**
     * Toggles the triggers meter display
     */
    toggleTriggersMeter(useMeter) {
        // ensure that a gamepad is currently active
        if (this.index === null) return;

        this.triggersMeter =
            useMeter !== undefined ? useMeter : !this.triggersMeter;
        this.$gamepad.classList[this.triggersMeter ? 'add' : 'remove'](
            'triggers-meter'
        );

        // update current settings
        const triggers = this.triggersMeter ? 'meter' : 'opacity';
        this.updateUrlParams({ triggers });
        this.$triggersSelect.value = triggers;
    }

    /**
     * Reads an URL search parameter
     *
     * @param {string} name
     * @returns {string|boolean|null}
     */
    getUrlParam(name) {
        let matches = new RegExp('[?&]' + name + '(=([^&#]*))?').exec(
            window.location.search
        );
        return matches ? decodeURIComponent(matches[2] || true) || true : null;
    }

    /**
     * Read url settings to produce a key/value object
     *
     * @returns {object}
     */
    getUrlParams() {
        const settingsArr = window.location.search
            .replace('?', '')
            .split('&')
            .map((param) => param.split('='));
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
            gamepad: undefined,
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
     * @param {object} newParams
     */
    updateUrlParams(newParams) {
        const params = Object.assign(this.getUrlParams(), newParams);
        const query = Object.entries(params)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => `${key}=${value}`)
            .join('&');
        window.history.replaceState({}, document.title, `/?${query}`);
    }
}

window.gamepad = new Gamepad();
