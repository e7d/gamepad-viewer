gamepad.updateButton = function ($button) {
    const value = parseFloat($button.attr("data-value"), 10);

    if ($button.is(".trigger")) {
        $button.css(
            gamepad.triggersMeter
                ? {
                      opacity: 1,
                      "clip-path": `inset(${(1 - value) * 100}% 0px 0px 0pc)`,
                  }
                : {
                      opacity: `${value * 100}%`,
                      "clip-path": "none",
                  }
        );
    }
};

gamepad.updateAxis = function ($axis) {
    const axisX = $axis.attr("data-value-x");
    const axisY = $axis.attr("data-value-y");

    if ($axis.is(".stick")) {
        $axis.css({
            "margin-top": axisY * 25,
            "margin-left": axisX * 25,
            transform: `rotateX(${-parseFloat(
                axisY * 30,
                8
            )}deg) rotateY(${parseFloat(axisX * 30, 8)}deg)`,
        });
    }
};
