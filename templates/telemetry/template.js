window.gamepad.templateClass = class TelemetryTemplate {
    /**
     * Instanciates a new telemetry template
     */
    constructor() {
        this.AXES = ['clutch', 'brake', 'throttle', 'steering'];
        this.gamepad = window.gamepad;

        this.loadSelectors();
        this.loadUrlParams();

        if (!this.brake.index || !this.throttle.index) {
            this.wizard();
            return;
        }

        this.setupTemplate();
        this.init();
    }

    /**
     * Destroys the template
     */
    destructor() {
        this.running = false;
    }

    /**
     * Converts a value to a percentage
     *
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    toPercentage(value, min, max) {
        return value !== undefined
            ? Math.max(0, Math.min(100, Math.round((value - min) * (100 / (max - min)))))
            : 0;
    }

    /**
     * Converts a value to degrees
     *
     * @param {number} value
     * @param {number} min
     * @param {number} max
     * @returns {number}
     */
    toDegrees(value, min, max) {
        const percentage = this.toPercentage(value, min, max);
        return (this.steeringAngle) * (percentage - 50) / 100;
    }

    /**
     * Set the value of an axis
     *
     * @param {object} gamepad
     * @param {string} axis
     * @returns {number}
     */
    toAxisValue(gamepad, axis) {
        const { type, index, min, max } = this[axis];
        if (!type || !index) return null;
        const value = type === 'button' ? gamepad.buttons[index].value : gamepad.axes[index];
        return axis === 'steering' ? this.toDegrees(value, min, max) : this.toPercentage(value, min, max);
    }

    /**
     * Loads the DOM selectors
     */
    loadSelectors() {
        this.$telemetry = document.querySelector('#telemetry');
        this.$clutch = this.$telemetry.querySelector('#clutch');
        this.$clutchBar = this.$clutch.querySelector('.bar');
        this.$clutchValue = this.$clutch.querySelector('.value');
        this.$brake = this.$telemetry.querySelector('#brake');
        this.$brakeBar = this.$brake.querySelector('.bar');
        this.$brakeValue = this.$brake.querySelector('.value');
        this.$throttle = this.$telemetry.querySelector('#throttle');
        this.$throttleBar = this.$throttle.querySelector('.bar');
        this.$throttleValue = this.$throttle.querySelector('.value');
        this.$steering = this.$telemetry.querySelector('#steering');
        this.$steeringIndicator = this.$steering.querySelector('.indicator');
        this.$wizard = document.querySelector('#wizard');
        this.$wizardInstructions = this.$wizard.querySelector('#wizard-instructions');
    }

    /**
     * Loads the params from the URL
     */
    loadUrlParams() {
        this.AXES.forEach((axis) => {
            this[axis] = {
                type: (gamepad.getUrlParam(`${axis}Type`) || 'axis').replace('axis', 'axe'),
                index: gamepad.getUrlParam(`${axis}Index`),
                min: gamepad.getUrlParam(`${axis}Min`) || -1,
                max: gamepad.getUrlParam(`${axis}Max`) || 1,
            }
        });
        this.steeringAngle = gamepad.getUrlParam('steeringAngle') || 360;
        this.frequency = gamepad.getUrlParam('fps') || 60;
        this.historyLength = gamepad.getUrlParam('history') || 5000;
    }

    setupTemplate() {
        if (!this.clutch.index) {
            this.$clutch.remove();
        } else {
            this.$telemetry.classList.add('with-clutch');
        }
        if (!this.brake.index) this.$brake.remove();
        if (!this.throttle.index) this.$throttle.remove();
        if (!this.steering.index) {
            this.$steering.remove();
        } else {
            this.$telemetry.classList.add('with-steering');
        }
    }

    /**
     * Initializes the live chart
     */
    init() {
        this.interval = 1000 / this.frequency;
        this.length = this.historyLength / this.interval;

        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.gstatic.com/charts/loader.js`;
        script.onload = () => {
            if (!google || !google.visualization) {
                this.loadGoogleCharts();
                return;
            }
            this.draw();
        };
        this.gamepad.$gamepad.appendChild(script);
    }

    /**
     * Loads the Google Charts library
     */
    loadGoogleCharts() {
        google.charts.load('current', { packages: ['corechart', 'line'], });
        google.charts.setOnLoadCallback(this.draw.bind(this));
    }

    /**
     * Draws the live chart with the initial data and starts the draw update loop
     */
    draw() {
        const now = Date.now();
        const initialData = [['time', 'clutch', 'brake', 'throttle']];
        for (let index = now - this.historyLength; index < now; index += this.interval) {
            initialData.push([index, 0, 0, 0]);
        }
        this.data = google.visualization.arrayToDataTable(initialData);
        this.options = {
            backgroundColor: 'transparent',
            chartArea: {
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'transparent',
            },
            hAxis: {
                textPosition: 'none',
                gridlines: {
                    color: 'transparent',
                },
                viewWindow: {
                    min: now - this.historyLength,
                    max: now
                }
            },
            vAxis: {
                textPosition: 'none',
                gridlines: {
                    color: 'transparent',
                },
                minValue: 0,
                maxValue: 100,
                viewWindow: {
                    min: 2,
                    max: 102,
                }
            },
            colors: ['#2D64B9', '#A52725', '#0CA818'],
            legend: 'none'
        };
        this.chart = new google.visualization.LineChart(document.querySelector('#chart'));
        this.chart.draw(this.data, this.options);

        this.running = true;
        this.update();
    }

    /**
     * Updates the live chart and the meters
     */
    update() {
        if (!this.running) return;

        const gamepad = this.gamepad.getActive();
        const [clutch, brake, throttle, steering] = this.AXES.map((axis) => this.toAxisValue(gamepad, axis));
        this.updateChart(clutch, brake, throttle);
        this.updateMeters(clutch, brake, throttle, steering);

        window.setTimeout(this.update.bind(this), this.interval);
    }

    /**
     * Updates the live chart with the latest data
     *
     * @param {number} clutch
     * @param {number} brake
     * @param {number} throttle
     */
    updateChart(clutch, brake, throttle) {
        const now = Date.now();
        this.data.removeRows(0, this.data.getFilteredRows([{ column: 0, maxValue: now - this.historyLength }]).length);
        this.data.addRow([now, clutch, brake, throttle]);
        this.options.hAxis.viewWindow = {
            min: now - this.historyLength,
            max: now
        };
        this.chart.draw(this.data, this.options);
    }

    /**
     * Updates the meters with the latest data
     *
     * @param {number} clutch
     * @param {number} brake
     * @param {number} throttle
     * @param {number} steering
     */
    updateMeters(clutch, brake, throttle, steering) {
        Object.entries({ clutch, brake, throttle, steering }).forEach(([axis, value]) => {
            if (value === null) return;
            if (axis === 'steering') {
                this.$steeringIndicator.style.transform = `rotate(${value}deg)`;
                return;
            }
            this[`$${axis}Value`].innerHTML = value;
            this[`$${axis}Value`].style.opacity = `${Math.round(33 + (value / 1.5))}%`;
            this[`$${axis}Bar`].style.height = `${value}%`;
        });
    }

    /**
     * Waits for all buttons of a gamepad to be released
     *
     * @returns {Promise}
     */
    async waitForAllButtonsRelease() {
        return new Promise((resolve) => {
            const interval = window.setInterval(() => {
                const gamepad = this.gamepad.getActive();
                const pressedButton = gamepad.buttons.some((button) => button.pressed);
                if (pressedButton) return;
                window.clearInterval(interval);
                resolve();
            }, 100);
        });
    }

    /**
     * Waits for a button to be pressed, then released
     *
     * @returns {Promise}
     */
    async waitForButtonPressAndRelease() {
        return new Promise((resolve) => {
            const pressInterval = window.setInterval(() => {
                const gamepad = this.gamepad.getActive();
                const index = gamepad.buttons.findIndex((button) => button.pressed);
                if (index === -1) return;
                window.clearInterval(pressInterval);
                const releaseInterval = window.setInterval(() => {
                    const gamepad = this.gamepad.getActive();
                    if (gamepad.buttons[index].pressed) return;
                    window.clearInterval(releaseInterval);
                    resolve(index);
                }, 100);
            }, 100);
        });
    }

    /**
     * Capitalizes a word
     *
     * @param {string} word
     * @returns {string}
     */
    capitalize(word) {
        return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    }

    /**
     * Asks the user for the telemetry options
     *
     * @returns {Promise}
     */
    async askForOptions() {
        this.$wizardInstructions.innerHTML = `
            <h4>Select the telemetry data you want to display</h4>
            <div class="wizard-options">
                <div>
                    <input id="clutch-option" name="clutch-option" type="checkbox" checked>
                    <label for="clutch-option">Clutch</label>
                </div>
                <div>
                    <input id="brake-option" name="brake-option" type="checkbox" readonly checked onclick="return false">
                    <label for="brake-option">Brake</label>
                </div>
                <div>
                    <input id="throttle-option" name="throttle-option" type="checkbox" checked onclick="return false">
                    <label for="throttle-option">Throttle</label>
                </div>
                <div>
                    <input id="steering-option" name="steering-option" type="checkbox" checked>
                    <label for="steering-option">Steering</label>
                </div>
            </div>
            <h4>Select the display options</h4>
            <div class="wizard-options">
                <div>
                    <label for="fps-option">FPS</label>
                    <select id="fps-option" name="fps-option">
                        <option value="30">30</option>
                        <option value="60" selected>60</option>
                    </select>
                </div>
                <div>
                    <label for="history-length-option">History length</label>
                    <input id="history-length-option" name="history-length-option" type="number" min="1" max="30" step="1" value="5">
                </div>
            </div>
            <p>Then, press any button to continue.</p>
        `;
        await this.waitForAllButtonsRelease();
        await this.waitForButtonPressAndRelease();

        return {
            ...this.AXES.reduce((options, axis) => {
                options[`with${this.capitalize(axis)}`] = document.querySelector(`[name=${axis}-option]`).checked;
                return options;
            }, {}),
            fps: parseInt(document.querySelector('[name=fps-option]').value),
            history: parseInt(document.querySelector('[name=history-length-option]').value) * 1000
        };
    }

    /**
     * Waits for an axis or button to be pressed
     *
     * @returns {Promise}
     */
    async detectAxisOrButton() {
        const before = this.gamepad.getActive();
        return new Promise((resolve) => {
            const interval = window.setInterval(async () => {
                const gamepad = this.gamepad.getActive();
                const pressedButtonIndex = gamepad.buttons.findIndex((button) => button.pressed);
                const pressedAxisIndex = gamepad.axes.findIndex((axis, index) => Math.abs(axis - before.axes[index]) > 0.5);
                if (pressedButtonIndex === -1 && pressedAxisIndex === -1) return;
                window.clearInterval(interval);
                await this.waitForAllButtonsRelease();
                resolve({
                    type: pressedButtonIndex === -1 ? 'axis' : 'button',
                    index: pressedButtonIndex === -1 ? pressedAxisIndex : pressedButtonIndex,
                });
            }, 100);
        });
    }

    /**
     * Calibrates a pedal
     *
     * @param {string} name
     * @returns {Promise}
     */
    async calibratePedal(name) {
        this.$wizardInstructions.innerHTML = `
            <p>Use the <strong>${name}</strong> axis or button.</p>
        `;
        const { type, index } = await this.detectAxisOrButton();
        if (type === 'button') {
            return { type, index, releasedValue: 0, pressedValue: 1 };
        }

        this.$wizardInstructions.innerHTML = `
            <p>Move and hold the <strong>${name}</strong> axis in its maximum position.</p>
            <p>Then, press any button to continue.</p>
        `;
        await this.waitForButtonPressAndRelease();
        const pressed = this.gamepad.getActive();
        const pressedValue = pressed.axes[index];

        this.$wizardInstructions.innerHTML = `
            <p>Release the <strong>${name}</strong> axis in its intial position.</p>
            <p>Then, press any button to continue.</p>
        `;
        await this.waitForButtonPressAndRelease();
        const released = this.gamepad.getActive();
        const releasedValue = released.axes[index];

        return { type, index, releasedValue, pressedValue };
    }

    /**
     * Calibrates the steering axis
     *
     * @returns {Promise}
     */
    async calibrateSteering() {
        this.$wizardInstructions.innerHTML = `
            <p>Set the <strong>steering</strong> axis on its <strong>center</strong> position.</p>
            <p>Then, press any button to continue.</p>
        `;
        await this.waitForButtonPressAndRelease();
        const gamepadBeforeLeft = this.gamepad.getActive();

        this.$wizardInstructions.innerHTML = `
            <p>Turn the <strong>steering</strong> axis all the way to the <strong>left</strong>.</p>
            <p>Then, press any button to continue.</p>
        `;
        await this.waitForButtonPressAndRelease();
        const gamepadAfterLeft = this.gamepad.getActive();
        const { index, leftValue } = gamepadBeforeLeft.axes.reduce((acc, beforeAxis, index) => {
            const afterAxis = gamepadAfterLeft.axes[index];
            const diff = Math.abs(beforeAxis - afterAxis);
            if (diff > acc.diff) {
                return { index, diff, leftValue: afterAxis };
            }
            return acc;
        }, { index: -1, diff: -1, value: 0 });

        this.$wizardInstructions.innerHTML = `
            <p>Turn the <strong>steering</strong> axis all the way to the <strong>right</strong>.</p>
            <p>Then, press any button to continue.</p>
        `;
        await this.waitForButtonPressAndRelease();
        const gamepadRight = this.gamepad.getActive();
        const rightValue = gamepadRight.axes[index];

        this.$wizardInstructions.innerHTML = `
            <p>Indicate the <strong>angle of rotation</strong> of your <strong>steering</strong> axis.</p>
            <p>
                <label for="steeringAngle">Angle</label>
                <input id="steeringAngle" name="steeringAngle" type="number" min="180" max="1080" step="10" value="360">°
            </p>
            <p>Then, press any button to continue.</p>
        `;
        await this.waitForButtonPressAndRelease();
        const angle = this.$wizardInstructions.querySelector('input[name="steeringAngle"]').value;

        return { index, leftValue, rightValue, angle };
    }

    /**
     * Generates the query string for a pedal
     *
     * @param {string} name
     * @param {Object} data
     * @returns string
     */
    toPedalParams(name, { type, index, releasedValue, pressedValue }) {
        return `${name}Type=${type}&${name}Index=${index}&${name}Min=${releasedValue}&${name}Max=${pressedValue}`;
    }

    /**
     * Generates the query string for the steering
     *
     * @param {Object} data
     * @returns string
     */
    toSteeringParams({ index, leftValue, rightValue, angle }) {
        return `steeringIndex=${index}&steeringMin=${leftValue}&steeringMax=${rightValue}&steeringAngle=${angle}`;
    }

    /**
     * Starts the wizard
     *
     * @returns {Promise}
     */
    async wizard() {
        this.$wizard.classList.add('active');

        const gamepad = this.gamepad.getActive();
        const { withClutch, withSteering, fps, history } = await this.askForOptions();
        const clutch = withClutch && await this.calibratePedal('clutch');
        const brake = await this.calibratePedal('brake');
        const throttle = await this.calibratePedal('throttle');
        const steering = withSteering && await this.calibrateSteering();

        window.location.href = [
            `?gamepad=${gamepad.id}&type=telemetry`,
            withClutch ? this.toPedalParams('clutch', clutch) : null,
            this.toPedalParams('brake', brake),
            this.toPedalParams('throttle', throttle),
            withSteering ? this.toSteeringParams(steering) : null,
            `fps=${fps}`,
            `history=${history}`
        ].filter(e => e !== null).join('&');
    }
};
