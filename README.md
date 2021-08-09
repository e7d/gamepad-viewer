# gamepad-viewer
Displays live status about gamepads connected to your computer

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
- `T`: Toggle triggers meter mode  
- `Delete` or `Esc`: Clear active gamepad

## Supported Gamepads

- Sony DualShock 4*
- Microsoft Xbox One Controller*
- Microsoft Xbox 360 Controller
- Nintendo Switch Pro Controller*
- Xinput compatible gamepads

## How to use on OBS Studio
Please read below or use this video tutorial: https://youtu.be/vHzf_ESseTc
- Go to [gamepad.e7d.io](https://gamepad.e7d.io/)
- Activate the controller you want to use on OBS by long pressing one of its buttons
- Configure it as desired: adjust zoom, change color...
- Copy the resulting web page URL (i.e.: https://gamepad.e7d.io/?type=ds4&color=white)
- Go back to OBS Studio
- Add a Browser source: Right click in "Sources" > "Add" > "Browser"
    - Name it as you want (i.e.: "Gamepad")
    - Paste the previously copied URL on the URL field
    - Press OK
- Adjust position and size of the source as you will

*: These gamepads work both wired and wireless via Bluetooth
