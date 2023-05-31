function DebugTemplate(gamepad) {
    return {
        $name: $('#info-name .value'),
        $vendor: $('#info-vendor'),
        $product: $('#info-product'),
        $id: $('#info-id'),
        $timestamp: $('#info-timestamp .value'),
        $index: $('#info-index .value'),
        $mapping: $('#info-mapping .value'),
        $rumble: $('#info-rumble .value'),
        $axes: $('.axes .container'),
        $buttons: $('.buttons .container'),
        activeGamepad: gamepad.getActive(),
        init: function () {
            if (!this.activeGamepad) {
                return;
            }
            const { name, vendor, product, id } = gamepad.toGamepadInfo(this.activeGamepad.id);
            this.$name.html(name).attr('title', name);
            if (vendor && product) {
                this.$vendor.css({display: 'block'}).find('.value').html(vendor);
                this.$product.css({display: 'block'}).find('.value').html(product);
            } else {
                this.$id.css({display: 'block'}).find('.value').html(id);
            }
            this.updateTimestamp();
            this.$index.html(this.activeGamepad.index);
            this.$mapping.html(this.activeGamepad.mapping || 'N/A');
            this.$rumble.html(
                this.activeGamepad.vibrationActuator
                    ? this.activeGamepad.vibrationActuator.type
                    : 'N/A'
            );
            this.initAxes();
            this.initButtons();
            gamepad.updateButton = ($button) => this.updateElem($button);
            gamepad.updateAxis = ($axis) => this.updateElem($axis, 6);
        },
        initAxes: function () {
            for (
                let axisIndex = 0;
                axisIndex < this.activeGamepad.axes.length;
                axisIndex++
            ) {
                this.$axes.append(`
                    <div class="box medium">
                    <div class="content">
                        <div class="label">Axis ${axisIndex}</div>
                        <div class="value" data-axis="${axisIndex}"></div>
                    </div>
                    </div>
                `);
            }
        },
        initButtons: function () {
            for (
                let buttonIndex = 0;
                buttonIndex < this.activeGamepad.buttons.length;
                buttonIndex++
            ) {
                this.$buttons.append(`
                    <div class="box small">
                    <div class="content">
                        <div class="label">B${buttonIndex}</div>
                        <div class="value" data-button="${buttonIndex}"></div>
                    </div>
                    </div>
                `);
            }
        },
        updateElem: function ($elem, precision = 2) {
            this.updateTimestamp();
            let value = parseFloat($elem.attr('data-value'), 10).toFixed(precision);
            $elem.html(value);
            let color = Math.floor(255 * 0.3 + 255 * 0.7 * Math.abs(value));
            $elem.css({ color: `rgb(${color}, ${color}, ${color})` });
        },
        updateTimestamp: function () {
            this.activeGamepad = gamepad.getActive();
            if (!this.activeGamepad) {
                return;
            }
            this.$timestamp.html(parseFloat(this.activeGamepad.timestamp).toFixed(3));
        },
    }.init();
};

new DebugTemplate(window.gamepad);
