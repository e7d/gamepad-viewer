(() => {
    $id = $("#info-id .value");
    $timestamp = $("#info-timestamp .value");
    $index = $("#info-index .value");
    $mapping = $("#info-mapping .value");
    $rumble = $("#info-rumble .value");
    $axes = $(".axes .container");
    $buttons = $(".buttons .container");

    gamepad = window.gamepad;
    activeGamepad = gamepad.getActive();

    if (!activeGamepad) {
        return;
    }

    $id.html(activeGamepad.id);
    updateTimestamp();
    $index.html(activeGamepad.index);
    $mapping.html(activeGamepad.mapping);
    $rumble.html(
        activeGamepad.vibrationActuator
            ? activeGamepad.vibrationActuator.type
            : "N/A"
    );

    for (
        let axisIndex = 0;
        axisIndex < activeGamepad.axes.length;
        axisIndex++
    ) {
        $axes.append(`
            <div class="box medium">
               <div class="content">
                   <div class="label">Axis ${axisIndex}</div>
                   <div class="value" data-axis="${axisIndex}"></div>
               </div>
            </div>
        `);
    }

    for (
        let buttonIndex = 0;
        buttonIndex < activeGamepad.buttons.length;
        buttonIndex++
    ) {
        $buttons.append(`
            <div class="box small">
               <div class="content">
                   <div class="label">B${buttonIndex}</div>
                   <div class="value" data-button="${buttonIndex}"></div>
               </div>
            </div>
        `);
    }

    gamepad.updateButton = function ($button) {
        updateElem($button);
    };

    gamepad.updateAxis = function ($axis) {
        updateElem($axis, 6);
    };

    function updateElem($elem, precision = 2) {
        updateTimestamp();

        let value = parseFloat($elem.attr("data-value"), 10).toFixed(precision);
        $elem.html(value);
        let color = Math.floor(255 * 0.3 + 255 * 0.7 * Math.abs(value));
        $elem.css({ color: `rgb(${color}, ${color}, ${color})` });
    }

    function updateTimestamp() {
        activeGamepad = gamepad.getActive();
        if (!activeGamepad) {
            return;
        }
        $timestamp.html(parseFloat(activeGamepad.timestamp).toFixed(3));
    }
})();
