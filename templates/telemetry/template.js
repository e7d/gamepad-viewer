/**
 * The Telemetry template class
 *
 * @class TelemetryTemplate
 */
class TelemetryTemplate {
    /**
     * Creates an instance of TelemetryTemplate.
     */
    constructor() {
        this.AXES = ['clutch', 'brake', 'throttle', 'direction'];

        this.frequency = 1000 / 60;
        this.historyLength = 5000;
        this.length = this.historyLength / this.frequency;
        this.index = 0;

        this.$clutchValue = document.querySelector('#clutch .value');
        this.$clutchBar = document.querySelector('#clutch .bar .filler');
        this.$brakeValue = document.querySelector('#brake .value');
        this.$brakeBar = document.querySelector('#brake .bar .filler');
        this.$throttleValue = document.querySelector('#throttle .value');
        this.$throttleBar = document.querySelector('#throttle .bar .filler');
        this.$directionIndicator = document.querySelector('#direction #wheel--indicator');

        this.init();
    }

    toPercentage(value, min, max) {
        // debugger;
        return value !== undefined
            ? Math.round((value - min) * (100 / (max - min)))
            : 0;
    }

    toDegrees(value, min, max) {
        const percentage = this.toPercentage(value, min, max);
        return (this.directionDegrees) * (percentage - 50) / 100;
    }

    toAxisValue(gamepad, axis) {
        const { [`${axis}Type`]: type, [`${axis}Index`]: index, [`${axis}Min`]: min, [`${axis}Max`]: max } = this[axis];
        const value = type === 'button' ? gamepad.buttons[index].value : gamepad.axes[index];
        return axis === 'direction' ? this.toDegrees(value, min, max) : this.toPercentage(value, min, max);
    }

    loadAxes() {
        this.AXES.forEach((axis) => {
            this[axis] = {
                [`${axis}Type`]: (window.gamepad.getUrlParam(`${axis}Type`) || 'axis').replace('axis', 'axe'),
                [`${axis}Index`]: window.gamepad.getUrlParam(`${axis}Index`),
                [`${axis}Min`]: window.gamepad.getUrlParam(`${axis}Min`) || -1,
                [`${axis}Max`]: window.gamepad.getUrlParam(`${axis}Max`) || 1,
            }
        });
        this.directionDegrees = window.gamepad.getUrlParam('directionDegrees') || 360;
    }

    init() {
        this.loadAxes();

        if (!window.google) {
            window.setTimeout(this.init.bind(this), 100);
            return;
        }

        google.charts.load('current', {
            packages: ['corechart', 'line'],
        });
        google.charts.setOnLoadCallback(this.drawChart.bind(this));
    }

    drawChart() {
        this.initialData = [['Time', 'Clutch', 'Brake', 'Throttle']];
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
            },
            colors: ['blue', 'red', 'lime'],
            legend: 'none'
        };
        this.chart = new google.visualization.LineChart(document.querySelector('#chart'));
        this.chart.draw(this.data, this.options);

        this.update();
    }

    update() {
        const gamepad = window.gamepad.getActive();
        if (!gamepad) return;

        const [clutch, brake, throttle, direction] = this.AXES.map((axis) => this.toAxisValue(gamepad, axis));

        this.updateChart(clutch, brake, throttle);
        this.updateMeters(clutch, brake, throttle, direction);
        window.setTimeout(this.update.bind(this), this.frequency);
    }

    updateChart(clutch, brake, throttle) {
        if (this.data.getNumberOfRows() > this.length) {
            this.data.removeRows(0, this.data.getNumberOfRows() - this.length);
        }
        this.data.addRow([this.index, clutch, brake, throttle]);
        this.chart.draw(this.data, this.options);
        this.index++;
    }

    updateMeters(clutch, brake, throttle, direction) {
        Object.entries({ clutch, brake, throttle, direction }).forEach(([axis, value]) => {
            if (axis === 'direction') {
                this.$directionIndicator.style.transform = `rotate(${value}deg)`;
                return;
            }
            this[`$${axis}Value`].innerHTML = value;
            this[`$${axis}Bar`].style.height = `${value}%`;
        });
    };
}

window.telemetryTemplate = new TelemetryTemplate();
