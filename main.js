const { app, BrowserWindow, Tray, Menu } = require('electron');
const { writeFileSync, readFileSync, existsSync } = require('fs');

/**
 * The main Gamepad class
 *
 * @class Gamepad
 */
class GamepadApp {
    mainFile = `${__dirname}/web/index.html`;
    paramsFile = `${__dirname}/params.json`;
    logoFile = `${__dirname}/web/android-chrome-512x512.png`;

    constructor() {
        this.loadParams();
        app.whenReady().then(() => {
            this.createTray();
            this.createWindow();
            this.navigate(this.params.gamepad);
            app.on('activate', () => {
                if (BrowserWindow.getAllWindows().length > 0) return;
                this.createWindow();
            })
        });

        app.on('window-all-closed', () => app.quit());
    }

    writeParams() {
        writeFileSync(this.paramsFile, JSON.stringify(this.params));
    }

    loadParams() {
        if (existsSync(this.paramsFile)) {
            this.params = JSON.parse(readFileSync(this.paramsFile, 'utf8'));
            return;
        }
        this.params = { app: { alwaysOnTop: true } };
        this.writeParams();
    }

    updateParams(key, values, merge = false) {
        this.params = merge
            ? {
                ...this.params,
                [key]: {
                    ...this.params[key],
                    ...values
                }
            }
            : {
                ...this.params,
                [key]: values
            };
        this.writeParams();
        this.updateContextMenu();
        if (key === 'gamepad') {
            this.resizeWindow();
        }
    }

    navigate(query) {
        this.mainWindow.loadURL(`file://${__dirname}/web/index.html?${new URLSearchParams(query).toString()}`);
    }

    updateContextMenu() {
        const traySkinEntries = [
            {
                key: 'auto',
                label: 'Auto',
                type: 'radio',
                checked: !this.params.gamepad?.type,
                click: () => this.navigate({ type: 'auto' })
            },
            {
                key: 'ds4',
                label: 'Dualshock 4',
                type: 'radio',
                checked: this.params.gamepad?.type === 'ds4',
                click: () => this.navigate({ type: 'ds4' })
            },
            {
                key: 'dualsense',
                label: 'DualSense',
                type: 'radio',
                checked: this.params.gamepad?.type === 'dualsense',
                click: () => this.navigate({ type: 'dualsense' })
            },
            {
                key: 'xbox-one',
                label: 'Xbox One',
                type: 'radio',
                checked: this.params.gamepad?.type === 'xbox-one',
                click: () => this.navigate({ type: 'xbox-one' })
            },
            {
                key: 'telemetry',
                label: 'Telemetry',
                type: 'radio',
                checked: this.params.gamepad?.type === 'telemetry',
                click: () => this.navigate({ type: 'telemetry' })
            },
            {
                key: 'debug',
                label: 'Debug',
                type: 'radio',
                checked: this.params.gamepad?.type === 'debug',
                click: () => this.navigate({ type: 'debug' })
            }
        ];
        const alwaysOnTopEntry = {
            label: 'Always on top',
            type: 'checkbox',
            checked: this.params.app?.alwaysOnTop,
            click: () => {
                const isAlwaysOnTop = !this.mainWindow.isAlwaysOnTop();
                this.mainWindow.setAlwaysOnTop(isAlwaysOnTop, 'pop-up-menu');
                this.updateParams('app', { alwaysOnTop: isAlwaysOnTop }, true)
            }
        };
        this.contextMenu = Menu.buildFromTemplate([
            {
                label: 'Skin',
                submenu: traySkinEntries
            },
            alwaysOnTopEntry,
            { type: 'separator' },
            {
                label: 'Quit',
                role: 'quit'
            },
        ]);
        this.tray.setContextMenu(this.contextMenu);
    }

    createTray() {
        this.tray = new Tray(this.logoFile);
        this.tray.setToolTip('Gamepad Viewer');
        this.updateContextMenu();
    };

    async getBaseSize() {
        const result = await this.mainWindow.webContents.executeJavaScript(`
            element = document.querySelector('#gamepad #wizard .content, #gamepad .controller, #placeholder');
            style = window.getComputedStyle(element);
            JSON.stringify({ width: parseInt(style.width, 10), height: parseInt(style.height, 10) });
        `);
        return JSON.parse(result);
    }

    async resizeWindow() {
        const { width, height } = await this.getBaseSize();
        if (!width || !height) return;
        this.mainWindow.setContentSize(width, height);
        this.updateParams('app', { size: this.mainWindow.getSize() }, true);
    }

    createWindow() {
        // https://github.com/electron/electron/blob/main/docs/api/browser-window.md
        this.mainWindow = new BrowserWindow({
            show: false,
            transparent: true,
            frame: false,
            webPreferences: {
                nodeIntegration: true
            }
        });
        if (this.params.app?.position) this.mainWindow.setPosition(...this.params.app?.position);
        if (this.params.app?.alwaysOnTop) this.mainWindow.setAlwaysOnTop(true, 'pop-up-menu');
        this.mainWindow.setAlwaysOnTop(true, 'pop-up-menu');
        this.mainWindow.moveTop();
        this.mainWindow.setMenuBarVisibility(false);
        this.mainWindow.webContents.on('did-start-navigation', ({ url }) => {
            if (url !== this.lastUrl) {
                console.log('url changed');
                this.updateParams('gamepad', Object.fromEntries(new URL(url).searchParams.entries()));
            }
            this.lastUrl = url;
        });

        this.mainWindow.on('will-resize', async (event, { width, height }, { edge }) => {
            event.preventDefault();
            const [oldX, oldY] = this.params.app?.position;
            const { width: baseWidth, height: baseHeight } = await this.getBaseSize();
            const ratio = baseWidth / baseHeight;
            const [oldWidth, oldHeight] = this.params.app?.size || {};

            let newX = oldX;
            let newY = oldY;
            let newWidth = width;
            let newHeight = Math.round(width / ratio);
            if (edge === 'top' || edge === 'bottom') {
                newWidth = Math.round(height * ratio);
                newHeight = height;
            }
            if (edge === 'left' || edge === 'top-left' || edge === 'bottom-left') {
                newX = oldX - (newWidth - oldWidth);
            }
            if (edge === 'top' || edge === 'top-left' || edge === 'top-right') {
                newY = oldY - (newHeight - oldHeight);
            }
            if (oldX !== newX || oldY !== newY) {
                this.mainWindow.setPosition(newX, newY);
            }

            if (newWidth !== oldWidth || newHeight !== oldHeight) {
                this.mainWindow.setContentSize(newWidth, newHeight);
            }
        });

        this.mainWindow.on('resized', async () => {
            this.updateParams('app', { size: this.mainWindow.getSize() }, true);
            this.updateParams('app', { position: this.mainWindow.getPosition() }, true)
        });
        this.mainWindow.on('moved', () => this.updateParams('app', { position: this.mainWindow.getPosition() }, true));

        this.mainWindow.once('ready-to-show', () => this.mainWindow.show());
    };
}

new GamepadApp();
