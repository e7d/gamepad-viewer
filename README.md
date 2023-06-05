# gamepad-viewer
Displays live status about gaming devices connected to your computer.

## Demo
[gamepad.e7d.io](https://gamepad.e7d.io/)

## Shortcuts
- `+`: Zoom in  
- `-`: Zoom out  
- `0`: Reset zoom to 100%  
- `5`: Adjust zoom automatically to window  
- `B`: Change background style  
- `C`: Change active gamepad color  
- `D`: Toggle debug mode for active gamepad  
- `H`: Toggle help menu  
- `T`: Toggle triggers mode (opacity / meter)  
- `Delete` or `Esc`: Clear active gamepad

## Supported gamepads

- Sony DualSense*
- Sony DualShock 4*
- Microsoft Xbox Series Controller*
- Microsoft Xbox One Controller*
- Microsoft Xbox 360 Controller
- Nintendo Switch Pro Controller*
- Xinput compatible gamepads

## Parameters

All the parameters are set in the URL.
| **Parameter** | **Description**                                                                                                                                            | **Value**                                                                                                                                                      | **Default**   |
|---------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------|
| gamepad       | The controller ID of a specific gamepad to use. Please find the controller ID by using the help displayed using the `h` keyboard button.                   | i.e.: `Microsoft Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b00)`                                                                                     |               |
| type          | The type of controller (the "skin") to display to the screen.<br>When possible, the type of controller is auto detected to display the corresponding skin. | - `debug`<br>- `dualsense`<br>- `ds4`<br>- `xbox-one`<br>- `telemetry` (beta mode for wheels that requires specific configuration)                             |               |
| background    | The background color.                                                                                                                                      | - `transparent`<br>- `checkered`<br>- `grey`<br>- `black`<br>- `white`<br>- `lime`<br>- `magenta`                                                              | `transparent` |
| color         | The displayed gamepad color.                                                                                                                               | Depending of the selected display `type`.                                                                                                                      |               |
| triggers      | The triggers display mode, when applicable.                                                                                                                | - `opacity`<br>- `meter`                                                                                                                                       | `opacity`     |
| zoom          | The zoom level of the display controller.                                                                                                                  | Any integer value from `0.1` to `4`, corresponding to a zoom value for 10% to 400%.<br>When no value is set, the zoom is auto adjusted to fit the window size. |               |

## Telemetry configuration

The `telemetry` display mode is a beta mode, designed for wheels, that requires specific configuration.

### Axes and buttons mapping

The `telemetry` mode requires for you to determine which axes or buttons will be used used for each telemetry data: clutch, brake, throttle and direction.

To help you do so, you need to access the Gamepad Viewer with the `debug` skin. To do so, you can go to https://gamepad.e7d.io/?type=debug, and press any button for detection.

For each of the axes or buttons you want to use, activate them one by one, and proceed as following:
- observe the changing value in the `Axes` and `Buttons` sections to determine the correct entry
- note down its type (axis or button) and its index.
- for the clutch, brake and throttle, note down the minimum (when released) and maximum (when pressed) values
- for the direction, note down the minimum (left) and maximum (right) values

For example with a **Thrustmaster T818**, you should get the following values:
- clutch: axis 6, min 1, max -1
- brake: axis 1, min 1, max -1
- throttle: axis 5, min 1, max -1
- direction: axis 0, min -1, max 1

Another example with a **Xbox one controller** with the A button used as clutch, the triggers as brake and throttle, and the left stick as direction. You should get the following values:
- clutch: button 0, min 0, max 1
- brake: button 6, min 0, max 1
- throttle: button 7, min 0, max 1
- direction: axis 0, min -1, max 1

### Telemetry parameters

All the parameters are set in the URL.
| **Parameter** | **Description** | **Value** | **Default** |
|---|---|---|---|
| clutchType | The clutch type, either an axis or a button. | `axis` or `button` | `axis` |
| clutchIndex | The index of the clutch axis or button. | A positive integer. |  |
| clutchMin | The minimum value when the clutch is fully released. | `-1`, `0` or `1` | `-1` |
| clutchMax | The maximum value when the clutch is fully pressed. | `-1`, `0` or `1` | `1` |
| brakeType | The brake type, either an axis or a button. | `axis` or `button` | `axis` |
| brakeIndex | The index of the brake axis or button. | A positive integer. |  |
| brakeMin | The minimum value when the brake is fully released. | `-1`, `0` or `1` | `-1` |
| brakeMax | The maximum value when the brake is fully pressed. | `-1`, `0` or `1` | `1` |
| throttleType | The throttle type, either an axis or a button. | `axis` or `button` | `axis` |
| throttleIndex | The index of the throttle axis or button. | A positive integer. |  |
| throttleMin | The minimum value when the throttle is fully released. | `-1`, `0` or `1` | `-1` |
| throttleMax | The maximum value when the throttle is fully pressed. | `-1`, `0` or `1` | `1` |
| directionType | The direction type, either an axis or a button. | `axis` or `button` | `axis` |
| directionIndex | The index of the direction axis or button. | A positive integer. |  |
| directionMin | The value when the direction is fully on the left. | `-1`, `0` or `1` | `-1` |
| directionMax | The value when the direction is fully on the right. | `-1`, `0` or `1` | `1` |
| directionDegrees | The angle in degrees to represent the direction changes.<br>Common wheel values are `360`, `900` and `1080`. | A positive integer. | `360` |
| fps | The number of render calculations per second.<br>The default `60` is smoother but can be challenging for the CPU.<br>Can be reduced to `30` for performance. | A positive integer. | `60` |
| history | The duration in milliseconds of data to display in the history graph. | A positive integer. | `5000` |

### Examples

Some working examples:
- Thrustmaster T818, with 900 degrees direction: http://gamepad.e7d.io/?gamepad=044f-b696&type=telemetry&clutchIndex=6&clutchMin=1&clutchMax=-1&brakeIndex=1&brakeMin=1&brakeMax=-1&throttleIndex=5&throttleMin=1&throttleMax=-1&directionIndex=0&directionDegrees=900
- DualShock 4 or Xbox Controller, with 180 degrees direction representation: http://gamepad.e7d.io/?gamepad=045e-0b00&type=telemetry&brakeType=button&brakeIndex=6&brakeMin=0&brakeMax=1&throttleType=button&throttleIndex=7&throttleMin=0&throttleMax=1&directionIndex=0&directionDegrees=180
- DualShock 4 or Xbox Controller, with clutch as A or Cross button, and 180 degrees direction representation: http://gamepad.e7d.io/?gamepad=045e-0b00&type=telemetry&clutchType=button&clutchIndex=0&clutchMin=0&clutchMax=1&brakeType=button&brakeIndex=6&brakeMin=0&brakeMax=1&throttleType=button&throttleIndex=7&throttleMin=0&throttleMax=1&directionIndex=0&directionDegrees=180

## How to use with OBS Studio
Please read below:
- Open [gamepad.e7d.io](https://gamepad.e7d.io/) in your browser
- Activate the controller you want to display in OBS by long pressing one of its buttons
- Configure it as desired: change skin, controller color, gamepad color, zoom...
- Copy the resulting web page URL (i.e.: https://gamepad.e7d.io/?type=ds4&color=white&triggers=meter)
- Go back to OBS Studio
- Add a Browser source: Right click in "Sources" > "Add" > "Browser"
    - Name it as you want (i.e.: "Gamepad")
    - Paste the previously copied URL on the URL field
    - Press OK
- Adjust position and size of the source as you will

*: These gamepads work both wired and wireless via Bluetooth

## Credits
DualShock 4 and Xbox One skins from [gamepadviewer.com](https://gamepadviewer.com/)
DualSense skin from [justEhCupcake](https://github.com/justEhCupcake/justEhCupcake.github.io/tree/main/PS5_Display_Pics)
