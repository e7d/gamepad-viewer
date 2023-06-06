window.gamepad.templateClass = class DebugTemplate {
    /**
     * Instanciates a new debug template
     */
    constructor() {
        this.gamepad = window.gamepad;
        this.init();
        this.gamepad.updateButton = ($button, { value }) => this.updateElem($button, value);
        this.gamepad.updateAxis = ($axis, _, axis) => this.updateElem($axis, axis, 6);
    }

    /**
     * Destroys the template
     */
    destructor() {
        delete this.gamepad.updateButton;
        delete this.gamepad.updateAxis;
    }

    /**
     * Initializes the template
     */
    init() {
        this.$name = document.querySelector('#info-name .value');
        this.$vendor = document.querySelector('#info-vendor');
        this.$product = document.querySelector('#info-product');
        this.$id = document.querySelector('#info-id');
        this.$timestamp = document.querySelector('#info-timestamp .value');
        this.$index = document.querySelector('#info-index .value');
        this.$mapping = document.querySelector('#info-mapping .value');
        this.$rumble = document.querySelector('#info-rumble .value');
        this.$axes = document.querySelector('.axes .container');
        this.$buttons = document.querySelector('.buttons .container');
        const activeGamepad = this.gamepad.getActive();
        const { name, vendor, product, id } = this.gamepad.toGamepadInfo(activeGamepad.id);
        this.$name.innerHTML = name;
        this.$name.setAttribute('title', activeGamepad.id);
        if (vendor && product) {
            this.$vendor.querySelector('.value').innerHTML = vendor;
            this.$product.querySelector('.value').innerHTML = product;
            this.$vendor.style.setProperty('display', 'block');
            this.$product.style.setProperty('display', 'block');
        } else {
            this.$id.querySelector('.value').innerHTML = id;
            this.$id.style.setProperty('display', 'block');
        }
        this.updateTimestamp();
        this.$index.innerHTML = this.activeGamepad.index;
        this.$mapping.innerHTML = this.activeGamepad.mapping || 'N/A';
        this.$rumble.innerHTML = this.activeGamepad.vibrationActuator
            ? this.activeGamepad.vibrationActuator.type
            : 'N/A';
        this.initAxes();
        this.initButtons();
    }

    /**
     * Initializes the axes
     */
    initAxes() {
        for (
            let axisIndex = 0;
            axisIndex < this.activeGamepad.axes.length;
            axisIndex++
        ) {
            this.$axes.innerHTML += `
                <div class="box medium">
                    <div class="content">
                        <div class="label">Axis ${axisIndex}</div>
                        <div class="value" data-axis="${axisIndex}"></div>
                    </div>
                </div>
            `;
        }
    }

    /**
    * Initializes the buttons
    */
    initButtons() {
        for (
            let buttonIndex = 0;
            buttonIndex < this.activeGamepad.buttons.length;
            buttonIndex++
        ) {
            this.$buttons.innerHTML += `
                <div class="box small">
                    <div class="content">
                        <div class="label">B${buttonIndex}</div>
                        <div class="value" data-button="${buttonIndex}"></div>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Updates the value of an element
     *
     * @param {Element} $elem
     * @param {number} precision
     */
    updateElem($elem, value, precision = 2) {
        this.updateTimestamp();
        $elem.innerHTML = value.toFixed(precision);
        let color = Math.floor(255 * 0.3 + 255 * 0.7 * Math.abs(value));
        $elem.style.setProperty('color', `rgb(${color}, ${color}, ${color})`);
    }

    /**
     * Updates the timestamp
     */
    updateTimestamp() {
        this.activeGamepad = this.gamepad.getActive();
        if (!this.activeGamepad) {
            return;
        }
        this.$timestamp.innerHTML = parseFloat(this.activeGamepad.timestamp).toFixed(3);
    }
};
