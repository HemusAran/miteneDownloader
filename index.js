const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { download } = require('electron-dl');
const ini = require('ini');

let mainWindow;
let subWindow;

let package;
let config;

app.whenReady().then(() => {
	createWindow();

	app.on('activate', function () {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
	if (process.platform !== 'darwin') app.quit();
})

// メイン画面の表示
function createWindow () {
	mainWindow = new BrowserWindow({
		width: 800,
		height: 800,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js') 
		},
		show: false 
	});

	readPackageFile();
	readConfigUrl();
	
	mainWindow.setTitle(package.name + " " + package.version);

	mainWindow.setMenuBarVisibility(false);

	mainWindow.loadFile('index.html');

	mainWindow.webContents.on('did-finish-load', ()=>{
		if (subWindow) {
			// サブ画面を開いている場合は閉じる
			subWindow.close();
			subWindow = null;
		}
		
		mainWindow.show();
	});

	// develop
	//mainWindow.webContents.openDevTools();
}

// package.jsonの読み込み
function readPackageFile() {
	const filePath = path.join(__dirname, 'package.json');

	try {
		const fileData = fs.readFileSync(filePath, 'utf-8');
		const data = JSON.parse(fileData);
		package = data;
	} catch (err) {
		console.error('Error reading file:', err);
	}
}

// config.iniの読み込み、URLを返す
function readConfigUrl() {
	const filePath = path.join(path.resolve(), 'config.ini');

	try {
		const fileData = fs.readFileSync(filePath, 'utf-8');
		const data = ini.parse(fileData);
		config = data;
	} catch (err) {
		console.error('Error reading file:', err);
	}
}

// サブ画面の表示
function createSubWindow(url) {
	if (subWindow) {
		// サブ画面を開いている場合は閉じる
		subWindow.close();
		subWindow = null;
	}

	subWindow = new BrowserWindow({
		width: 800,
		height: 600,
		x: mainWindow.getBounds().x + 600,
		y: mainWindow.getBounds().y + 100,
		parent: mainWindow,
		show: false 
	});
	
	subWindow.setMenuBarVisibility(false);
	
	subWindow.loadURL(url);
	
	subWindow.once('ready-to-show', () => {
		subWindow.show();
	});
}

// サブ画面にurlを渡して表示
ipcMain.on('show-subwindow', async (event, url) => {
	await createSubWindow(url);
});

// サブ画面にurlを渡して表示
ipcMain.on('get-subwindow-html', (event, url) => {
	subWindow.webContents.executeJavaScript(`
		document.documentElement.outerHTML;
	`).then((html) => {
		let subWindowSrc = html;
		event.reply('subwindow-html', subWindowSrc);
	}).catch((error) => {
		console.error('HTMLの取得中にエラーが発生しました:', error);
	});
});

// メイン画面にurlを渡す
ipcMain.on('get-config-url', (event) => {
	if (config) {
		if (config.general.url) {
			event.reply('setConfigUrl', config.general.url);
		}
	}
});

// ダウンロード処理
ipcMain.on('downloadAll', async (event, data) => {

	// ダウンロード先のフォルダを選択するダイアログを表示
	const dirpath = dialog.showOpenDialogSync(null, {
		properties: ['openDirectory'],
		title: 'download to',
		defaultPath: '.'
	});

	if (dirpath === undefined) {
		// キャンセルされた
		return;
	}

	event.reply('startDownloading', "ダウンロード開始");

	// ファイル数分ダウンロード
	for (let no=0; no<data.length; no++) {
		const url = data[no]["url"];
		const filename = data[no]["filename"];

		if (fs.existsSync(dirpath + "/" + filename)) {
			//ファイルが存在する場合はスキップ
		} else {
			await download(mainWindow, url, {
				directory: dirpath + "/",
				filename: filename,
			});
		}
		
		event.reply('downloadProgress', "ダウンロード中 " + no.toString() + "/" + data.length.toString());
	}

	event.reply('finishDownloading', "ダウンロード終了");
});
