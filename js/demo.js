/**
 * The Gamepad demo class
 *
 * @class Demo
 */
class Demo {
    /**
     * Creates an instance of Demo.
     *
     * @param Gamepad gamepad
     */
    constructor(gamepad) {
        this.gamepad = gamepad;
        this.demoGamepad = {
            'id': 'xinput',
            'timestamp': 0,
            'index': 'demo',
            'mapping': 'standard',
            'axes': [],
            'buttons': [],
        };

        for (let axisIndex = 0; axisIndex < 6; axisIndex++) {
            this.demoGamepad.axes[axisIndex] = 0;
        }
        for (let buttonIndex = 0; buttonIndex < 20; buttonIndex++) {
            this.demoGamepad.buttons[buttonIndex] = {
                pressed: false,
                value: 0
            };
        }
    }

    /**
     * Starts the demonstration mode
     *
     * @param {string} [mode='random']
     * @param {string} [id='xinput']
     */
    start(mode = 'random', id = 'xinput') {
        // add the demo gamepad to the gamepads list
        this.gamepad.gamepads['demo'] = this.demoGamepad;
        // map the demo gamepad as active gamepad
        this.gamepad.map('demo');

        // determine the callback to use following the demo mode
        let callback;
        switch (mode) {
            case 'random':
                callback = this.randomModeCallback;
                this.demoUpdateDelay = 100;
                break;
            case 'realist':
                callback = this.realistModeCallback;
                this.demoUpdateDelay = false;
                break;
            case 'sequential':
            default:
               callback = this.sequentialModeCallback;
                this.controlType = 'axis';
                this.controlIndex = 0;
                this.demoUpdateDelay = 1000;
                break;
        }

        // execute the callback once
        callback.bind(this)();
        if (this.demoUpdateDelay) {
            // setup an repeat callback if needed
            this.demoInterval = window.setInterval(
                () => {
                    callback.bind(this)();
                },
                this.demoUpdateDelay
            );
        }
    }

    /**
     * Stops the demonstration mode
     */
    stop() {
        // stop any running demo callback
        window.clearInterval(this.demoInterval);
    }

    /**
     * Executes the random mode callback
     */
    randomModeCallback() {
        // set a random value for each axis
        for (let axisIndex = 0; axisIndex < this.demoGamepad.axes.length; axisIndex++) {
            this.demoGamepad.axes[axisIndex] = (Math.random() * 2) - 1;
        }
        // set a random value for each button
        for (let buttonIndex = 0; buttonIndex < this.demoGamepad.buttons.length; buttonIndex++) {
            this.pressButton(buttonIndex, Math.random() > 0.5, Math.random());
        }
    }

    /**
     * Executes the realistic mode callback
     */
    realistModeCallback() {
        // TODO: capture a real usage, approx. 10s
    }

    /**
     * Executes the sequential mode callback
     */
    sequentialModeCallback() {
        // store the current index locally
        const index = this.controlIndex;

        // Axis
        if ('axis' === this.controlType) {
            // move axis from neutral to maximum, then minimum, then neutral again
            for (let i = 0; i <= 1; i = +(i + 0.01).toFixed(2)) {
                let value = 0;
                if (i > 0.75) {
                    value = (1 - i) * 4;
                } else if (i > 0.25) {
                    value = (i - 0.5) * 4;
                } else {
                    value = (-i) * 4;
                }

                window.setTimeout(
                    () => {
                        this.moveAxis(
                            index,
                            value
                        );
                    },
                    this.demoUpdateDelay * 0.7 * i
                )
            }

            // job is done for this axis, move to next axis
            this.controlIndex++;
            if (this.controlIndex >= this.demoGamepad.axes.length) {
                // if all axis where animated, change for buttons
                this.controlType = 'button';
                this.controlIndex = 0;
            }

            return;
        }

        if ('button' === this.controlType) {
            // update button pressure from null to maximum, then release again
            for (let i = 0; i <= 1; i = +(i + 0.01).toFixed(2)) {
                let value = 0;
                if (i > 0.5) {
                    value = (1 - i) * 2;
                } else {
                    value = i * 2;
                }

                window.setTimeout(
                    () => {
                        this.pressButton(
                            index,
                            value > 0,
                            value
                        );
                    },
                    this.demoUpdateDelay * 0.7 * i
                )
            }

            // job is done for this axis, move to next button
            this.controlIndex++;
            if (this.controlIndex >= this.demoGamepad.buttons.length) {
                // if all axis where animated, change for axes
                this.controlType = 'axis';
                this.controlIndex = 0;
            }

            return;
        }
    }

    /**
     * Simulates a button press
     *
     * @param {any} index
     * @param {boolean} [pressed=true]
     * @param {number} [value=1]
     */
    pressButton(index, pressed = true, value = 1) {
        // no pressure means a null value
        if (!pressed) {
            value = 0;
        }

        // update gamepad timestamp
        this.demoGamepad.timestamp++;
        // update button status
        this.demoGamepad.buttons[index] = {
            'pressed': pressed,
            'value': value
        };
    }

    /**
     * Simulates an axis movement
     *
     * @param {any} index
     * @param {number} [value=1]
     */
    moveAxis(index, value = 1) {
        // update gamepad timestamp
        this.demoGamepad.timestamp++;
        // update axis status
        this.demoGamepad.axes[index] = value;
    }
}
