(() => {
    const gamepad = window.gamepad;
    let activeGamepad = gamepad.getActive();
    if (!activeGamepad) {
        return;
    }

    const $id = document.querySelector("#info-id .value");
    const $timestamp = document.querySelector("#info-timestamp .value");
    const $index = document.querySelector("#info-index .value");
    const $mapping = document.querySelector("#info-mapping .value");
    const $rumble = document.querySelector("#info-rumble .value");
    const $axes = document.querySelector(".axes .container");
    const $buttons = document.querySelector(".buttons .container");

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
        `,
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
        `,
        );
    }

    gamepad.updateButton = ($button) => {
        updateElem($button);
    };

    gamepad.updateAxis = ($axis) => {
        updateElem($axis, 6);
    };

    gamepad.updateFrame = () => {
        updateTimestamp();
    };

    function updateElem($elem, precision = 2) {
        const value = parseFloat($elem.getAttribute("data-value")).toFixed(
            precision,
        );
        $elem.textContent = value;
        const color = Math.floor(255 * 0.3 + 255 * 0.7 * Math.abs(value));
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
