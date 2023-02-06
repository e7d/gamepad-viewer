function TelemetryTemplate(gamepad) {
    return {
        $clutchBar: document.querySelector('#clutch .bar'),
        $clutchValue: document.querySelector('#clutch .value'),
        $brakeBar: document.querySelector('#brake .bar'),
        $brakeValue: document.querySelector('#brake .value'),
        $throttleBar: document.querySelector('#throttle .bar'),
        $throttleValue: document.querySelector('#throttle .value'),
        $directionIndicator: document.querySelector('#direction .indicator'),
        AXES: ['clutch', 'brake', 'throttle', 'direction'],
        frequency: gamepad.getUrlParam('fps') || 60,
        historyLength: gamepad.getUrlParam('history') || 5000,
        index: 0,
        init: function () {
            this.interval = 1000 / this.frequency;
            this.length = this.historyLength / this.interval;
            this.loadAxes();
            this.initChart();
        },
        toPercentage: function (value, min, max) {
            return value !== undefined
                ? Math.round((value - min) * (100 / (max - min)))
                : 0;
        },
        toDegrees: function (value, min, max) {
            const percentage = this.toPercentage(value, min, max);
            return (this.directionDegrees) * (percentage - 50) / 100;
        },
        toAxisValue: function (gamepad, axis) {
            const { [`${axis}Type`]: type, [`${axis}Index`]: index, [`${axis}Min`]: min, [`${axis}Max`]: max } = this[axis];
            const value = type === 'button' ? gamepad.buttons[index].value : gamepad.axes[index];
            return axis === 'direction' ? this.toDegrees(value, min, max) : this.toPercentage(value, min, max);
        },
        loadAxes: function () {
            this.AXES.forEach((axis) => {
                this[axis] = {
                    [`${axis}Type`]: (gamepad.getUrlParam(`${axis}Type`) || 'axis').replace('axis', 'axe'),
                    [`${axis}Index`]: gamepad.getUrlParam(`${axis}Index`),
                    [`${axis}Min`]: gamepad.getUrlParam(`${axis}Min`) || -1,
                    [`${axis}Max`]: gamepad.getUrlParam(`${axis}Max`) || 1,
                }
            });
            this.directionDegrees = gamepad.getUrlParam('directionDegrees') || 360;
        },
        initChart: function () {
            if (!window.google) {
                window.setTimeout(this.loadGoogleCharts.bind(this), 100);
                return;
            }
            this.drawChart();
        },
        loadGoogleCharts: function () {
            google.charts.load('current', { packages: ['corechart', 'line'], });
            google.charts.setOnLoadCallback(this.drawChart.bind(this));
        },
        drawChart: function () {
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
            this.update();
        },
        update: function () {
            const activeGamepad = gamepad.getActive();
            if (!activeGamepad) return;
            const [clutch, brake, throttle, direction] = this.AXES.map((axis) => this.toAxisValue(activeGamepad, axis));
            this.updateChart(clutch, brake, throttle);
            this.updateMeters(clutch, brake, throttle, direction);
            window.setTimeout(this.update.bind(this), this.interval);
        },
        updateChart: function (clutch, brake, throttle) {
            this.data.removeRows(0, 1);
            this.data.addRow([this.index, clutch, brake, throttle]);
            this.chart.draw(this.data, this.options);
            this.index++;
        },
        updateMeters: function (clutch, brake, throttle, direction) {
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
    }.init();
};

new TelemetryTemplate(window.gamepad);
