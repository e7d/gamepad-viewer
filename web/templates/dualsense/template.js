window.gamepad.TemplateClass = class DualSenseTemplate {
    /**
     * Instanciates a new DualSense controller template
     */
    constructor() {
        this.gamepad = window.gamepad;
        this.gamepad.updateButton = this.updateButton.bind(this);
        this.gamepad.updateAxis = this.updateAxis.bind(this);
        this.rotateX = 0;
        this.rotateY = 0;
    }

    /**
     * Destroys the template
     */
    destructor() {
        delete this.gamepad.updateButton;
        delete this.gamepad.updateAxis;
    }

    updateButton($button, button) {
        if (!$button.matches('.trigger') || !button) return;
        $button.style.setProperty('opacity', this.gamepad.useMeterTriggers ? 1 : `${button.value * 100}%`);
        $button.style.setProperty('clip-path', this.gamepad.useMeterTriggers ? `inset(${100 - button.value * 100}% 0px 0px 0pc)` : 'none');
    }

    updateAxis($axis, attribute, axis) {
        if (!$axis.matches('.stick')) return;
        if (attribute === 'data-axis-x') {
            $axis.style.setProperty('margin-left', `${axis * 25}px`);
            $axis.rotateY = parseFloat(axis * 30, 8);
            this.updateRotate($axis);
        }
        if (attribute === 'data-axis-y') {
            $axis.style.setProperty('margin-top', `${axis * 25}px`);
            $axis.rotateX = -parseFloat(axis * 30, 8);
            this.updateRotate($axis);
        }
    }

    updateRotate($axis) {
        $axis.style.setProperty('transform', `rotateX(${$axis.rotateX}deg) rotateY(${$axis.rotateY}deg)`);
    }
};