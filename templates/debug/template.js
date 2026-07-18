(() => {
    $id = document.querySelector("#info-id .value");
    $timestamp = document.querySelector("#info-timestamp .value");
    $index = document.querySelector("#info-index .value");
    $mapping = document.querySelector("#info-mapping .value");
    $rumble = document.querySelector("#info-rumble .value");
    $axes = document.querySelector(".axes .container");
    $buttons = document.querySelector(".buttons .container");

    gamepad = window.gamepad;
    activeGamepad = gamepad.getActive();

    if (!activeGamepad) {
        return;
    }

    $id.textContent = activeGamepad.id;
    updateTimestamp();
    $index.textContent = activeGamepad.index;
    $mapping.textContent = activeGamepad.mapping;
    $rumble.textContent = activeGamepad.vibrationActuator
        ? activeGamepad.vibrationActuator.type
        : "N/A";

    for (
        let axisIndex = 0;
        axisIndex < activeGamepad.axes.length;
        axisIndex++
    ) {
        $axes.insertAdjacentHTML(
            "beforeend",
            `
            <div class="box medium">
               <div class="content">
                   <div class="label">Axis ${axisIndex}</div>
                   <div class="value" data-axis="${axisIndex}"></div>
               </div>
            </div>
        `
        );
    }

    for (
        let buttonIndex = 0;
        buttonIndex < activeGamepad.buttons.length;
        buttonIndex++
    ) {
        $buttons.insertAdjacentHTML(
            "beforeend",
            `
            <div class="box small">
               <div class="content">
                   <div class="label">B${buttonIndex}</div>
                   <div class="value" data-button="${buttonIndex}"></div>
               </div>
            </div>
        `
        );
    }

    gamepad.updateButton = function ($button) {
        updateElem($button);
    };

    gamepad.updateAxis = function ($axis) {
        updateElem($axis, 6);
    };

    gamepad.updateFrame = function () {
        updateTimestamp();
    };

    function updateElem($elem, precision = 2) {
        let value = parseFloat($elem.getAttribute("data-value"), 10).toFixed(
            precision
        );
        $elem.textContent = value;
        let color = Math.floor(255 * 0.3 + 255 * 0.7 * Math.abs(value));
        $elem.style.color = `rgb(${color}, ${color}, ${color})`;
    }

    function updateTimestamp() {
        activeGamepad = gamepad.getActive();
        if (!activeGamepad) {
            return;
        }
        $timestamp.textContent = parseFloat(activeGamepad.timestamp).toFixed(3);
    }
})();
