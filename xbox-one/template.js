function updateButton($button)
{
    value = $button.attr('data-value');

    if ($button.is('.trigger')) {
        $button.css({
            '-webkit-clip-path': 'inset(' + (1 - value) * 100 + '% 0px 0px 0pc)'
        });
    }
}

var axisX, axisY, axisZ;
function updateAxis($axis)
{
    axisX = $axis.attr('data-value-x');
    axisY = $axis.attr('data-value-y');
    axisZ = $axis.attr('data-value-z');

    if ($axis.is('.stick')) {
        $axis.css({
            'margin-top': axisY * 25,
            'margin-left': axisX * 25,
            'transform': 'rotateX(' + -parseFloat(axisY * 30, 8) + 'deg) rotateY(' + parseFloat(axisX * 30, 8) + 'deg)'
        });
    }
}
