gamepad.templateClass = class TelemetryTemplate {
    /**
     * Instanciates a new telemetry template
     */
    constructor() {
        this.AXES = ['clutch', 'brake', 'throttle', 'steering'];
        this.gamepad = window.gamepad;

        this.loadSelectors();
        this.loadUrlParams();

        if (!this.AXES.some((axis) => this[axis].index)) {
            this.wizard();
            return;
        }

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
        return (this.angle) * (percentage - 50) / 100;
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
        this.$chart = this.$telemetry.querySelector('#chart');
        this.$meters = this.$telemetry.querySelector('#meters');
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
        this.withChart = gamepad.getUrlParam('chart') !== 'false';
        this.historyLength = gamepad.getUrlParam('history') || 5000;

        this.withMeters = gamepad.getUrlParam('meters') !== 'false';

        this.withSteering = gamepad.getUrlParam('steeringIndex') !== null;
        this.angle = gamepad.getUrlParam('angle') || 360;

        this.frequency = gamepad.getUrlParam('fps') || 60;

        this.AXES.forEach((axis) => {
            this[axis] = {
                type: (gamepad.getUrlParam(`${axis}Type`) || 'axis').replace('axis', 'axe'),
                index: gamepad.getUrlParam(`${axis}Index`),
                min: gamepad.getUrlParam(`${axis}Min`) || -1,
                max: gamepad.getUrlParam(`${axis}Max`) || 1,
            }
        });
    }

    /**
     * Sets up the template
     */
    setupTemplate() {
        if (!this.withChart) this.$chart.remove();

        if (!this.clutch.index) this.$clutch.remove();
        if (!this.brake.index) this.$brake.remove();
        if (!this.throttle.index) this.$throttle.remove();
        if (!this.withMeters) this.$meters.remove();

        if (!this.steering.index) {
            this.$steering.remove();
        } else {
            this.$telemetry.classList.add('with-steering');
        }
    }

    async setupChart() {
        if (!this.withChart) return;
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://www.gstatic.com/charts/loader.js`;
            script.onload = () => {
                if (!google || !google.visualization) {
                    this.loadGoogleCharts(resolve);
                    return;
                }
                this.drawChart(resolve);
            };
            this.gamepad.$gamepad.appendChild(script);
        });
    }

    /**
     * Initializes the live chart
     */
    async init() {
        this.interval = 1000 / this.frequency;
        this.length = this.historyLength / this.interval;

        this.setupTemplate();
        await this.setupChart();

        this.running = true;
        this.update();
    }

    /**
     * Loads the Google Charts library
     */
    loadGoogleCharts(resolve) {
        google.charts.load('current', { packages: ['corechart', 'line'], });
        google.charts.setOnLoadCallback(this.drawChart.bind(this, resolve));
    }

    /**
     * Draws the live chart with the initial data and starts the draw update loop
     */
    drawChart(resolve) {
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
            legend: 'none',
            tooltip: {
                trigger: 'none'
            }
        };
        this.chart = new google.visualization.LineChart(document.querySelector('#chart'));
        this.chart.draw(this.data, this.options);
        resolve();
    }

    /**
     * Updates the live chart and the meters
     */
    update() {
        if (!this.running) return;

        const gamepad = this.gamepad.getActive();
        const [clutch, brake, throttle, steering] = this.AXES.map((axis) => this.toAxisValue(gamepad, axis));
        if (this.withChart) this.updateChart(clutch, brake, throttle);
        if (this.withMeters) this.updateMeters(clutch, brake, throttle);
        if (this.withSteering) this.updateSteering(steering);

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
    updateMeters(clutch, brake, throttle) {
        Object.entries({ clutch, brake, throttle }).forEach(([axis, value]) => {
            if (value === null) return;
            this[`$${axis}Value`].innerHTML = value;
            this[`$${axis}Value`].style.opacity = `${Math.round(33 + (value / 1.5))}%`;
            this[`$${axis}Bar`].style.height = `${value}%`;
        });
    }

    /**
     * Updates the steering indicator with the latest data
     *
     * @param {number} steering
     */
    updateSteering(steering) {
        this.$steeringIndicator.style.transform = `rotate(${steering}deg)`;
    }

    /**
     * Waits for one or all buttons of a gamepad to be released
     *
     * @param {number} [index]
     * @returns {Promise}
     */
    async waitButtonRelease(index = undefined) {
        return new Promise((resolve) => {
            const interval = window.setInterval(() => {
                const gamepad = this.gamepad.getActive();
                const pressedButton = index !== undefined
                    ? gamepad.buttons[index].pressed
                    : gamepad.buttons.some((button) => button.pressed);
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
    async waitButtonClick() {
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
     * Waits for an axis to be pushed out, and of the reference value, if any
     *
     * @param {number} index
     * @param {number} [referenceValue]
     * @param {number} [duration]
     * @returns {Promise}
     */
    async getAxisPush(index, referenceValue = undefined, duration = 1000) {
        let start;
        let value;
        return new Promise((resolve) => {
            const interval = window.setInterval(() => {
                const gamepad = this.gamepad.getActive();
                if (start === undefined) {
                    start = Date.now();
                    value = gamepad.axes[index];
                    return;
                }
                if (referenceValue !== undefined && Math.abs(gamepad.axes[index] - referenceValue) < 0.5) {
                }
                if (Math.abs(gamepad.axes[index] - value) > 0.05) {
                    start = undefined;
                    value = undefined;
                    return;
                }
                if (Date.now() - start < duration) {
                    value = gamepad.axes[index];
                    return;
                }
                window.clearInterval(interval);
                resolve(value);
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
            <h4>Inputs</h4>
            <div class="wizard-options">
                <div>
                    <input id="clutch-option" name="clutch-option" type="checkbox" checked>
                    <label for="clutch-option">Clutch</label>
                </div>
                <div>
                    <input id="brake-option" name="brake-option" type="checkbox" readonly checked>
                    <label for="brake-option">Brake</label>
                </div>
                <div>
                    <input id="throttle-option" name="throttle-option" type="checkbox" checked>
                    <label for="throttle-option">Throttle</label>
                </div>
                <div>
                    <input id="steering-option" name="steering-option" type="checkbox" checked>
                    <label for="steering-option">Steering</label>
                </div>
            </div>
            <h4>Chart widget</h4>
            <div class="wizard-options">
                <div>
                    <input id="chart-option" name="chart-option" type="checkbox" checked>
                    <label for="chart-option">Enable</label>
                </div>
                <div>
                    <label for="history-option">History</label>
                    <input id="history-option" name="history-option" type="number" min="1" max="30" step="1" value="5">s
                </div>
            </div>
            <h4>Meters widget</h4>
            <div class="wizard-options">
                <div>
                    <input id="meters-option" name="meters-option" type="checkbox" checked>
                    <label for="meters-option">Enable</label>
                </div>
            </div>
            <h4>Steering widget</h4>
            <div class="wizard-options">
                <div>
                    <label for="steering-angle-option">Angle</label>
                    <input id="steering-angle-option" name="steering-angle-option" type="number" min="180" max="1080" step="10" value="360">°
                </div>
            </div>
            <h4>Display mode</h4><div class="wizard-options">
                <div>
                    <label for="fps-option">Mode</label>
                    <select id="fps-option" name="fps-option">
                        <option value="30">30 FPS (performance)</option>
                        <option value="60" selected>60 FPS (quality)</option>
                    </select>
                </div>
            </div>
            <p>Then, press any button to continue.</p>
        `;

        await this.waitButtonRelease();
        await this.waitButtonClick();

        return {
            ...this.AXES.reduce((options, axis) => {
                options[`with${this.capitalize(axis)}`] = document.querySelector(`[name=${axis}-option]`).checked;
                return options;
            }, {}),
            chart: document.querySelector('[name=chart-option]').checked,
            history: parseInt(document.querySelector('[name=history-option]').value) * 1000,
            meters: document.querySelector('[name=meters-option]').checked,
            angle: this.$wizardInstructions.querySelector('input[name="steering-angle-option"]').value,
            fps: parseInt(document.querySelector('[name=fps-option]').value)
        };
    }

    /**
     * Detects activity on any button or axis of the gamepad
     *
     * @param {string} [type='button'|'axis'|undefined]
     * @param {number} [distance=0.5]
     * @returns {Promise}
     */
    async detectActivity(type = undefined, distance = 0.5) {
        const before = this.gamepad.getActive();
        return new Promise((resolve) => {
            const interval = window.setInterval(async () => {
                const gamepad = this.gamepad.getActive();
                const buttonIndex = ['button', undefined].includes(type)
                    ? gamepad.buttons.findIndex((button, index) => button.pressed && Math.abs(button.value - before.buttons[index].value) > distance)
                    : -1;
                const axisIndex = ['axis', undefined].includes(type)
                    ? gamepad.axes.findIndex((axis, index) => Math.abs(axis - before.axes[index]) > distance)
                    : -1;
                if (buttonIndex === -1 && axisIndex === -1) return;
                window.clearInterval(interval);
                resolve({
                    type: buttonIndex === -1 ? 'axis' : 'button',
                    index: buttonIndex === -1 ? axisIndex : buttonIndex,
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
            <p>Waiting for <strong>${name}</strong> activity.</p>
        `;
        const { type, index } = await this.detectActivity();
        if (type === 'button') {
            this.$wizardInstructions.innerHTML = `
                <p>Release the <strong>${name}</strong> button.</p>
            `;
            await this.waitButtonRelease(index);
            return { type, index, releasedValue: 0, pressedValue: 1 };
        }

        this.$wizardInstructions.innerHTML = `
            <p>Press and hold the <strong>${name}</strong> axis.</p>
        `;
        const pressedValue = await this.getAxisPush(index);

        this.$wizardInstructions.innerHTML = `
            <p>Release the <strong>${name}</strong> axis.</p>
        `;
        const releasedValue = await this.getAxisPush(index, pressedValue);

        return { type, index, releasedValue, pressedValue };
    }

    /**
     * Calibrates the steering axis
     *
     * @returns {Promise}
     */
    async calibrateSteering() {
        this.$wizardInstructions.innerHTML = `
            <p>Turn the <strong>steering</strong> axis all the way to the <strong>left</strong>.</p>
        `;
        const { index } = await this.detectActivity('axis', 0.2);
        const leftValue = await this.getAxisPush(index, 0);

        this.$wizardInstructions.innerHTML = `
            <p>Turn the <strong>steering</strong> axis all the way to the <strong>right</strong>.</p>
        `;
        const rightValue = await this.getAxisPush(index, leftValue);

        return { index, leftValue, rightValue };
    }

    /**
     * Converts an object to a query string, ignoring empty values
     *
     * @param {Object} options
     * @returns {string}
     */
    toOptionsParams(options) {
        return Object.entries(options)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => `${key}=${value}`)
            .join('&');
    }

    /**
     * Generates the query string for a pedal
     *
     * @param {string} name
     * @param {Object} data
     * @returns {string}
     */
    toPedalParams(name, { type, index, releasedValue, pressedValue }) {
        return `${name}Type=${type}&${name}Index=${index}&${name}Min=${releasedValue}&${name}Max=${pressedValue}`;
    }

    /**
     * Generates the query string for the steering
     *
     * @param {Object} data
     * @returns {string}
     */
    toSteeringParams({ index, leftValue, rightValue }) {
        return `steeringIndex=${index}&steeringMin=${leftValue}&steeringMax=${rightValue}`;
    }

    /**
     * Starts the wizard
     *
     * @returns {Promise}
     */
    async wizard() {
        this.$wizard.classList.add('active');

        const gamepad = this.gamepad.getActive();
        const { withClutch, withBrake, withThrottle, withSteering, chart, history, meters, angle, fps } = await this.askForOptions();
        const clutch = withClutch && await this.calibratePedal('clutch');
        const brake = withBrake && await this.calibratePedal('brake');
        const throttle = withThrottle && await this.calibratePedal('throttle');
        const steering = withSteering && await this.calibrateSteering();

        window.location.href = [
            `?gamepad=${gamepad.id}&type=telemetry`,
            this.toOptionsParams({ chart, history, meters, angle, fps }),
            withClutch ? this.toPedalParams('clutch', clutch) : null,
            withBrake ? this.toPedalParams('brake', brake) : null,
            withThrottle ? this.toPedalParams('throttle', throttle) : null,
            withSteering ? this.toSteeringParams(steering) : null
        ].filter(e => e !== null).join('&');
    }
};
