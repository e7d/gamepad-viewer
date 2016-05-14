var haveEvents = 'ongamepadconnected' in window;
var gamepads = {};
var $gamepad = $('.gamepad');
var gamepadIdentifiers = {
    'ds4': /Vendor: 054c Product: 05c4/,
    'xbox-one': /XInput/
};
var activeGamepad = null;
var activeGamepadType = null;
var mapping = {
    buttons: [],
    axes: []
};

window.addEventListener("gamepadconnected", onGamepadConenct);
window.addEventListener("gamepaddisconnected", onGamepadDisconnect);

function onGamepadConenct(e) {
    addGamepad(e.gamepad);
}

function onGamepadDisconnect(e) {
    removeGamepad(e.gamepad.index);
}

function addGamepad(gamepad) {
    gamepads[gamepad.index] = gamepad;
    requestAnimationFrame(updateStatus);
}

function removeGamepad(gamepadIndex) {
    var gamepad = gamepads[gamepadIndex];
    if (gamepad && activeGamepad && gamepad.index === activeGamepad.index) {
        activeGamepad = null;
        $gamepad.empty();
    }
    delete gamepads[gamepadIndex];
}

function scanGamepads() {
    var navigatorGamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
    for (var gamepadIndex = 0; gamepadIndex < navigatorGamepads.length; gamepadIndex++) {
        var gamepad = navigatorGamepads[gamepadIndex];
        if (gamepad) {
            if (gamepad.index in gamepads) {
                gamepads[gamepad.index] = gamepad;
            } else {
                addGamepad(gamepad);
            }

            for (var buttonIndex = 0; buttonIndex < gamepad.buttons.length; buttonIndex++) {
                button = gamepad.buttons[buttonIndex];
                if (!activeGamepad && button.pressed) {
                    mapGamepad(gamepad);
                }
            }
        } else {
            if (gamepadIndex in gamepads) {
                removeGamepad(gamepadIndex);
            }
        }
    }
}

function updateStatus() {
    if (!haveEvents) {
        scanGamepads();
    }

    requestAnimationFrame(updateStatus);
}

function mapGamepad(gamepad) {
    var button;
    var axis;

    activeGamepad = gamepad;

    for (var gamepadType in gamepadIdentifiers) {
        if (gamepadIdentifiers[gamepadType].test(activeGamepad.id)) {
            activeGamepadType = gamepadType;
        }
    }

    $.ajax(
        'templates/' + activeGamepadType + '/template.html', {
            async: true
        }
    ).done(function(template) {
        $gamepad.html(template);

        mapping.buttons = [];
        for (var buttonIndex = 0; buttonIndex < activeGamepad.buttons.length; buttonIndex++) {
            button = activeGamepad.buttons[buttonIndex];
            mapping.buttons[buttonIndex] = $('[data-button=' + buttonIndex + ']');
        }

        mapping.axes = [];
        for (var axisIndex = 0; axisIndex < activeGamepad.axes.length; axisIndex++) {
            axis = activeGamepad.axes[axisIndex];
            mapping.axes[axisIndex] = $('[data-axis-x=' + axisIndex + '], [data-axis-y=' + axisIndex + '], [data-axis-z=' + axisIndex + ']');
        }

        updateVisualStatus();
    });
}

function updateVisualStatus() {
    requestAnimationFrame(updateVisualStatus);

    if (!activeGamepad) {
        return;
    }

    var button;
    var $button;
    for (var buttonIndex = 0; buttonIndex < activeGamepad.buttons.length; buttonIndex++) {
        $button = mapping.buttons[buttonIndex];
        if (!$button) {
            break;
        }

        button = activeGamepad.buttons[buttonIndex];

        $button.attr('data-pressed', button.pressed);
        $button.attr('data-value', button.value);

        if ("function" === typeof updateButton) {
            updateButton($button);
        }
    }

    var axis;
    var $axis;
    for (var axisIndex = 0; axisIndex < activeGamepad.axes.length; axisIndex++) {
        $axis = mapping.axes[axisIndex];
        if (!$axis) {
            break;
        }

        axis = activeGamepad.axes[axisIndex];

        if ($axis.is('[data-axis-x=' + axisIndex + ']')) {
            $axis.attr('data-value-x', axis);
        }
        if ($axis.is('[data-axis-y=' + axisIndex + ']')) {
            $axis.attr('data-value-y', axis);
        }
        if ($axis.is('[data-axis-z=' + axisIndex + ']')) {
            $axis.attr('data-value-z', axis);
        }

        if ("function" === typeof updateAxis) {
            updateAxis($axis);
        }
    }
}

if (!haveEvents) {
    setInterval(scanGamepads, 500);
}
