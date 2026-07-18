(() => {
    const STICK_TRAVEL_PX = 25;
    const STICK_TILT_DEG = 30;

    const gamepad = window.gamepad;

    gamepad.updateButton = ($button) => {
        if (!$button.matches(".trigger")) return;

        const value = parseFloat($button.getAttribute("data-value"));
        if (gamepad.triggersMeter) {
            $button.style.opacity = 1;
            $button.style.clipPath = `inset(${(1 - value) * 100}% 0px 0px 0px)`;
        } else {
            $button.style.opacity = `${value * 100}%`;
            $button.style.clipPath = "none";
        }
    };

    gamepad.updateAxis = ($axis) => {
        if (!$axis.matches(".stick")) return;

        const axisX = parseFloat($axis.getAttribute("data-value-x"));
        const axisY = parseFloat($axis.getAttribute("data-value-y"));
        $axis.style.marginTop = `${axisY * STICK_TRAVEL_PX}px`;
        $axis.style.marginLeft = `${axisX * STICK_TRAVEL_PX}px`;
        $axis.style.transform = `rotateX(${-axisY * STICK_TILT_DEG}deg) rotateY(${
            axisX * STICK_TILT_DEG
        }deg)`;
    };
})();
