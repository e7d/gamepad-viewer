(() => {
    const STICK_TRAVEL_PX = 25;
    const STICK_TILT_DEG = 30;
    const STICK_DEADZONE = 0.05;

    const gamepad = window.gamepad;

    const deadzone = (value) => (Math.abs(value) < STICK_DEADZONE ? 0 : value);

    // write a style property only when the computed value actually changed,
    // so a resting (or noisy) controller produces zero style mutations
    const write = ($element, property, value) => {
        const key = `_${property}`;
        if ($element[key] === value) return;
        $element[key] = value;
        $element.style[property] = value;
    };

    gamepad.updateButton = ($button) => {
        if (!$button.matches(".trigger")) return;

        const value = parseFloat($button.getAttribute("data-value"));
        if (gamepad.triggersMeter) {
            write($button, "opacity", "1");
            write(
                $button,
                "clipPath",
                `inset(${(1 - value) * 100}% 0px 0px 0px)`,
            );
        } else {
            write($button, "opacity", `${value * 100}%`);
            write($button, "clipPath", "none");
        }
    };

    gamepad.updateAxis = ($axis) => {
        if (!$axis.matches(".stick")) return;

        const axisX = deadzone(parseFloat($axis.getAttribute("data-value-x")));
        const axisY = deadzone(parseFloat($axis.getAttribute("data-value-y")));
        const x = Math.round(axisX * STICK_TRAVEL_PX);
        const y = Math.round(axisY * STICK_TRAVEL_PX);
        write(
            $axis,
            "transform",
            `translate(${x}px, ${y}px) rotateX(${-axisY * STICK_TILT_DEG}deg) rotateY(${axisX * STICK_TILT_DEG}deg)`,
        );
    };
})();
