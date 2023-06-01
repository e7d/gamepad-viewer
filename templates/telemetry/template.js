window.gamepad.template = class TelemetryTemplate {
    /**
     * Instanciates a new telemetry template
     */
    constructor() {
        this.gamepad = window.gamepad;
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
     * @param {Number} value
     * @param {Number} min
     * @param {Number} max
     * @returns {Number}
     */
    toPercentage(value, min, max) {
        return value !== undefined
            ? Math.round((value - min) * (100 / (max - min)))
            : 0;
    }

    /**
     * Converts a value to degrees
     *
     * @param {Number} value
     * @param {Number} min
     * @param {Number} max
     * @returns {Number}
     */
    toDegrees(value, min, max) {
        const percentage = this.toPercentage(value, min, max);
        return (this.directionDegrees) * (percentage - 50) / 100;
    }

    /**
     * Set the value of an axis
     *
     * @param {object} gamepad
     * @param {string} axis
     * @returns {Number}
     */
    toAxisValue(gamepad, axis) {
        const { [`${axis}Type`]: type, [`${axis}Index`]: index, [`${axis}Min`]: min, [`${axis}Max`]: max } = this[axis];
        const value = type === 'button' ? gamepad.buttons[index].value : gamepad.axes[index];
        return axis === 'direction' ? this.toDegrees(value, min, max) : this.toPercentage(value, min, max);
    }

    /**
     * Loads the axes
     */
    loadAxes() {
        this.AXES.forEach((axis) => {
            this[axis] = {
                [`${axis}Type`]: (gamepad.getUrlParam(`${axis}Type`) || 'axis').replace('axis', 'axe'),
                [`${axis}Index`]: gamepad.getUrlParam(`${axis}Index`),
                [`${axis}Min`]: gamepad.getUrlParam(`${axis}Min`) || -1,
                [`${axis}Max`]: gamepad.getUrlParam(`${axis}Max`) || 1,
            }
        });
        this.directionDegrees = gamepad.getUrlParam('directionDegrees') || 360;
    }

    /**
     * Initializes the template
     */
    init() {
        this.$fps = document.querySelector('#fps');
        this.$clutchBar = document.querySelector('#clutch .bar');
        this.$clutchValue = document.querySelector('#clutch .value');
        this.$brakeBar = document.querySelector('#brake .bar');
        this.$brakeValue = document.querySelector('#brake .value');
        this.$throttleBar = document.querySelector('#throttle .bar');
        this.$throttleValue = document.querySelector('#throttle .value');
        this.$directionIndicator = document.querySelector('#direction .indicator');
        this.AXES = ['clutch', 'brake', 'throttle', 'direction'];
        this.frequency = gamepad.getUrlParam('fps') || 60;
        this.historyLength = gamepad.getUrlParam('history') || 5000;
        this.index = 0;
        this.interval = 1000 / this.frequency;
        this.length = this.historyLength / this.interval;
        this.loadAxes();
        this.initChart();
    }

    /**
     * Initializes the live chart
     */
    initChart() {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.gstatic.com/charts/loader.js`;
        script.onload = () => {
            if (!google || !google.visualization) {
                this.loadGoogleCharts();
                return;
            }
            this.drawChart();
        };
        this.gamepad.$gamepad.appendChild(script);
    }

    /**
     * Loads the Google Charts library
     */
    loadGoogleCharts() {
        google.charts.load('current', { packages: ['corechart', 'line'], });
        google.charts.setOnLoadCallback(this.drawChart.bind(this));
    }

    /**
     * Draws the live chart with the initial data
     */
    drawChart() {
        this.initialData = [['time', 'clutch', 'brake', 'throttle']];
        for (this.index = 0; this.index < this.length; this.index++) {
            this.initialData.push([this.index, 0, 0, 0]);
        }
        this.data = google.visualization.arrayToDataTable(this.initialData);
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

        const activeGamepad = this.gamepad.getActive();
        if (!activeGamepad) return;
        const [clutch, brake, throttle, direction] = this.AXES.map((axis) => this.toAxisValue(activeGamepad, axis));
        this.updateChart(clutch, brake, throttle);
        this.updateMeters(clutch, brake, throttle, direction);

        window.setTimeout(this.update.bind(this), this.interval);
    }

    /**
     * Updates the live chart with the latest data
     *
     * @param {Number} clutch
     * @param {Number} brake
     * @param {Number} throttle
     */
    updateChart(clutch, brake, throttle) {
        this.data.removeRows(0, 1);
        this.data.addRow([this.index, clutch, brake, throttle]);
        this.chart.draw(this.data, this.options);
        this.index++;
    }

    /**
     * Updates the meters with the latest data
     *
     * @param {Number} clutch
     * @param {Number} brake
     * @param {Number} throttle
     * @param {Number} direction
     */
    updateMeters(clutch, brake, throttle, direction) {
        Object.entries({ clutch, brake, throttle, direction }).forEach(([axis, value]) => {
            if (axis === 'direction') {
                this.$directionIndicator.style.transform = `rotate(${value}deg)`;
                return;
            }
            this[`$${axis}Value`].innerHTML = value;
            this[`$${axis}Value`].style.opacity = `${Math.round(33 + (value / 1.5))}%`;
            this[`$${axis}Bar`].style.height = `${value}%`;
        });
    }
};
