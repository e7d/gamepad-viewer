var $timestamp = $('#info-timestamp value'),
    $index = $('#info-index value'),
    $mapping = $('#info-mapping value'),
    $axes = $('.axes ul'),
    $buttons = $('.buttons ul');

var gamepad = gamepads[activeGamepadIndex];
console.log(gamepad);

$timestamp.html(gamepad.timestamp);
$index.html(gamepad.index);
$mapping.html(gamepad.mapping);

for (var axisIndex = 0; axisIndex < gamepad.axes.length; axisIndex++) {
    $axes.append(
        '<li class="medium">' +
        '    <label>AXIS ' + axisIndex + '</label>' +
        '    <value data-axis="' + axisIndex + '">0</value>' +
        '</li>'
    );
}

for (var buttonIndex = 0; buttonIndex < gamepad.buttons.length; buttonIndex++) {
    $buttons.append(
        '<li>' +
        '    <label>B' + buttonIndex + '</label>' +
        '    <value data-button="' + buttonIndex + '">0</value>' +
        '</li>'
    );
}

function updateButton($button) {
    updateElem($button);
}

function updateAxis($axis) {
    updateElem($axis, 6);
}

function updateElem($elem, precision = 2) {
    updateTimestamp();

    value = parseFloat($elem.attr('data-value'), 10).toFixed(precision);
    $elem.html(value);
}

function updateTimestamp() {
    $timestamp.html(gamepad.timestamp);
}
