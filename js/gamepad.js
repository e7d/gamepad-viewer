(function(window, document, undefined) {
    $.urlParam = function(name) {
        var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        if (results === null) {
           return null;
        } else {
           return decodeURIComponent(results[1]) || 0;
        }
    };

    var haveEvents = 'ongamepadconnected' in window;
    var scanGamepadsDelay = 1000;
    var gamepads = {};
    var $gamepad = $('.gamepad');
    var $nogamepad = $('.no-gamepad');
    var $help = $('.help');
    var gamepadIdentifiers = {
        'ds4': {
            'id': /054c.*?05c4/,
            'colors': ['black', 'white', 'red', 'blue']
        },
        'xbox-one': {
            'id': /xinput|XInput/,
            'colors': ['black', 'white']
        }
    };
    var gamepadHelpTimeout = null;
    var gamepadHelpDelay = 5000;
    var activeGamepadIndex = null;
    var activeGamepadType = null;
    var activeGamepadIdentifier = null;
    var activeGamepadColorIndex = null;
    var activeGamepadColorName = null;
    var activeGamepadZoomLevel = 1;
    var mapping = {
        buttons: [],
        axes: []
    };

    window.addEventListener("gamepadconnected", onGamepadConnect);
    window.addEventListener("gamepaddisconnected", onGamepadDisconnect);
    window.addEventListener("keydown", onKeyDown);

    displayGamepadHelp();
    function displayGamepadHelp() {
        gamepadHelpTimeout = window.setTimeout(function() {
            $nogamepad.fadeIn();
        }, gamepadHelpDelay);
    }
    function hideGamepadHelp() {
        window.clearTimeout(gamepadHelpTimeout);
        $nogamepad.hide();
    }

    function onGamepadConnect(e) {
        addGamepad(e.gamepad);
    }

    function onGamepadDisconnect(e) {
        removeGamepad(e.gamepad.index);
    }

    function onKeyDown(e) {
        switch (e.code) {
            case "Delete":
            case "Escape":
                removeGamepad(activeGamepadIndex);
                break;
            case "KeyC":
                changeGamepadColor();
                break;
            case "KeyH":
                toggleHelp();
                break;
            case "NumpadAdd":
            case "Equal":
                changeZoom("+");
                break;
            case "NumpadSubtract":
            case "Minus":
                changeZoom("-");
                break;
            case "Numpad0":
            case "Digit0":
                changeZoom("0");
                break;
        }
    }

    function getGamepads() {
        return navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
    }

    function addGamepad(gamepad) {
        gamepads[gamepad.index] = gamepad;
    }

    function removeGamepad(gamepadIndex) {
        if (gamepadIndex === activeGamepadIndex) {
            activeGamepadIndex = null;
            $gamepad.empty();
        }
        delete gamepads[gamepadIndex];

        displayGamepadHelp();
    }

    setInterval(scanGamepads, scanGamepadsDelay);
    function scanGamepads() {
        if (null !== activeGamepadIndex) {
            return;
        }

        gamepads = getGamepads();
        for (var gamepadIndex = 0; gamepadIndex < gamepads.length; gamepadIndex++) {
            var gamepad = gamepads[gamepadIndex];
            if (gamepad) {
                if (gamepad.index in gamepads) {
                    gamepads[gamepad.index] = gamepad;
                }

                for (var buttonIndex = 0; buttonIndex < gamepad.buttons.length; buttonIndex++) {
                    button = gamepad.buttons[buttonIndex];
                    if (null === activeGamepadIndex && button.pressed) {
                        mapGamepad(gamepad);
                    }
                }
            }
        }
    }

    function mapGamepad(gamepad) {
        var button;
        var axis;

        activeGamepadIndex = gamepad.index;

        hideGamepadHelp();

        for (var gamepadType in gamepadIdentifiers) {
            if (gamepadIdentifiers[gamepadType].id.test(gamepad.id)) {
                activeGamepadType = gamepadType;
                activeGamepadIdentifier = gamepadIdentifiers[gamepadType];
                activeGamepadColorIndex = 0;
            }
        }

        $.ajax(
            'templates/' + activeGamepadType + '/template.html', {
                async: true
            }
        ).done(function(template) {
            $gamepad.html(template);

            if ($.urlParam('color')) {
                changeGamepadColor($.urlParam('color'));
            }
            if ($.urlParam('c')) {
                changeGamepadColor($.urlParam('c'));
            }

            if ($.urlParam('zoom')) {
                changeZoom($.urlParam('zoom'));
            }
            if ($.urlParam('z')) {
                changeZoom($.urlParam('z'));
            }

            mapping.buttons = [];
            for (var buttonIndex = 0; buttonIndex < gamepad.buttons.length; buttonIndex++) {
                button = gamepad.buttons[buttonIndex];
                mapping.buttons[buttonIndex] = $('[data-button=' + buttonIndex + ']');
            }

            mapping.axes = [];
            for (var axisIndex = 0; axisIndex < gamepad.axes.length; axisIndex++) {
                axis = gamepad.axes[axisIndex];
                mapping.axes[axisIndex] = $('[data-axis-x=' + axisIndex + '], [data-axis-y=' + axisIndex + '], [data-axis-z=' + axisIndex + ']');
            }

            updateVisualStatus();
        });
    }

    function updateVisualStatus() {
        if (null === activeGamepadIndex) {
            return;
        }

        gamepads = getGamepads();
        var activeGamepad = gamepads[activeGamepadIndex];

        if (!activeGamepad) {
            return;
        }

        requestAnimationFrame(updateVisualStatus);

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

    function changeGamepadColor(gamepadColor) {
        if (! activeGamepadIdentifier) {
            return;
        }

        if (!! gamepadColor) {
            if (! isNaN(parseInt(gamepadColor))) {
                activeGamepadColorIndex = gamepadColor;
                activeGamepadColorName = activeGamepadIdentifier.colors[activeGamepadColorIndex];
            } else {
                activeGamepadColorName = gamepadColor;
                activeGamepadColorIndex = 0;
                for (var gamepadColorName in activeGamepadIdentifier.colors) {
                    if (activeGamepadColorName === gamepadColorName) {
                        break;
                    }
                    activeGamepadColorIndex++;
                }
            }
        } else {
            activeGamepadColorIndex++;
            if (activeGamepadColorIndex > activeGamepadIdentifier.colors.length - 1) {
                activeGamepadColorIndex = 0;
            }

            activeGamepadColorName = activeGamepadIdentifier.colors[activeGamepadColorIndex];
        }

        $gamepad.attr('data-color', activeGamepadColorName);
    }

    function changeZoom(zoomLevel) {
        if (! activeGamepadIdentifier) {
            return;
        }

        if (! zoomLevel) {
            return;
        }

        if ('0' === zoomLevel) {
            activeGamepadZoomLevel = 1;
        }
        else if ('+' === zoomLevel && activeGamepadZoomLevel < 2) {
            activeGamepadZoomLevel += 0.1;
        }
        else if ('-' === zoomLevel && activeGamepadZoomLevel > 0.2) {
            activeGamepadZoomLevel -= 0.1;
        }
        else if (! isNaN(zoomLevel = parseFloat(zoomLevel))) {
            activeGamepadZoomLevel = zoomLevel;
        }

        // hack: fix js float issues
        activeGamepadZoomLevel = +activeGamepadZoomLevel.toFixed(1);

        $gamepad.css('transform', 'translate(-50%, -50%) scale(' + activeGamepadZoomLevel + ', ' + activeGamepadZoomLevel + ')');
    }

    function toggleHelp(zoomLevel) {
        $help.toggleClass('active');
    }
})(window, document);
