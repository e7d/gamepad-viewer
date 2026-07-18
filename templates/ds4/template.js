gamepad.updateButton = function ($button) {
    const value = parseFloat($button.getAttribute("data-value"), 10);

    if ($button.matches(".trigger")) {
        if (gamepad.triggersMeter) {
            $button.style.opacity = 1;
            $button.style.clipPath = `inset(${(1 - value) * 100}% 0px 0px 0pc)`;
        } else {
            $button.style.opacity = `${value * 100}%`;
            $button.style.clipPath = "none";
        }
    }
};

gamepad.updateAxis = function ($axis) {
    const axisX = $axis.getAttribute("data-value-x");
    const axisY = $axis.getAttribute("data-value-y");

    if ($axis.matches(".stick")) {
        $axis.style.marginTop = `${axisY * 25}px`;
        $axis.style.marginLeft = `${axisX * 25}px`;
        $axis.style.transform = `rotateX(${-parseFloat(
            axisY * 30,
            8
        )}deg) rotateY(${parseFloat(axisX * 30, 8)}deg)`;
    }
};
