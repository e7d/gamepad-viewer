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
        $button.style.setProperty('opacity', this.gamepad.triggersMeter ? 1 : `${button.value * 100}%`);
        $button.style.setProperty('clip-path', this.gamepad.triggersMeter ? `inset(${100 - button.value * 100}% 0px 0px 0pc)` : 'none');
    }

    updateAxis($axis, attribute, axis) {
        if (!$axis.matches('.stick')) return;
        if (attribute === 'data-axis-x') {
            $axis.style.setProperty('margin-left', `${axis * 25}px`);
            this.updateRotate($axis);
        }
        if (attribute === 'data-axis-y') {
            $axis.style.setProperty('margin-top', `${axis * 25}px`);
            this.updateRotate($axis);
        }
    }

    updateRotate($axis) {
        const rotateX = parseFloat($axis.getAttribute('data-value-y') * 30);
        const rotateY = -parseFloat($axis.getAttribute('data-value-x') * 30);
        $axis.style.setProperty('transform', `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
    }
};
