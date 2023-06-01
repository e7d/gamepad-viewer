window.gamepad.template = class XboxOneTemplate {
    /**
     * Instanciates a new Xbox One controller template
     */
    constructor() {
        this.gamepad = window.gamepad;
        this.gamepad.updateButton = ($button) => this.updateButton($button);
        this.gamepad.updateAxis = ($axis) => this.updateAxis($axis);
    }

    /**
     * Destroys the template
     */
    destructor() {
        delete this.gamepad.updateButton;
        delete this.gamepad.updateAxis;
    }

    updateButton($button) {
        if (!$button.matches('.trigger')) return;
        const value = parseFloat($button.getAttribute('data-value'), 10);
        $button.style.setProperty('opacity', this.gamepad.triggersMeter ? 1 : `${value * 100}%`);
        $button.style.setProperty('clip-path', this.gamepad.triggersMeter ? `inset(${100 - value * 100}% 0px 0px 0pc)` : 'none');
    }

    updateAxis($axis) {
        if (!$axis.matches('.stick')) return;
        const axisX = $axis.getAttribute('data-value-x');
        const axisY = $axis.getAttribute('data-value-y');
        $axis.style.setProperty('margin-top', `${axisY * 25}px`);
        $axis.style.setProperty('margin-left', `${axisX * 25}px`);
        $axis.style.setProperty('transform', `rotateX(${-parseFloat(axisY * 30, 8)}deg) rotateY(${parseFloat(axisX * 30, 8)}deg)`);
    }
};
