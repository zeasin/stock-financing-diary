const { app, BrowserWindow,Menu } = require('electron')
const path = require('path')
const url = require('url')
const ipc = require('electron').ipcMain
// 加载模块
const nedb = require('nedb');

// const ipc = ipcMain
let newwin;
let win;
function createWindow () {   
  // 创建浏览器窗口
   win = new BrowserWindow({
    // width: 800,
    // height: 600,
    webPreferences: {
      nodeIntegration: true//在页面上集成 Nodejs
    }
  })
  win.maximize()

  // 并且为你的应用加载index.html
  win.loadFile('index.html')

  // 打开开发者工具
  win.webContents.openDevTools()

}
ipc.on('createWindow',()=> {
    console.log('请求打开新窗口')
    newwin = new BrowserWindow({
        modal: true,
        parent: win, //win是主窗口
        webPreferences: {
          nodeIntegration: true//在页面上集成 Nodejs
        }
    })
    newwin.maximize()
    newwin.webContents.openDevTools()
    newwin.loadURL(path.join('file:',__dirname,'new.html')); //new.html是新开窗口的渲染进程
    newwin.on('closed',()=>{newwin = null})
    
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// 部分 API 在 ready 事件触发后才能使用。
app.whenReady().then(createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
  // 否则绝大部分应用及其菜单栏会保持激活。
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // 在macOS上，当单击dock图标并且没有其他窗口打开时，
  // 通常在应用程序中重新创建一个窗口。
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

//创建应用菜单
app.on('ready', () => {
  // const appMenu = Menu.buildFromTemplate(menuTemplate);
  // Menu.setApplicationMenu(appMenu);

  // const exePath = path.dirname(app.getPath('exe'));

  // console.log('获取当前运行目录')
  // console.log(exePath);
});

//监听添加zixuangu
ipc.on('addStock',(event, arg) => {
  
  // console.log(JSON.stringify(arg))
  // console.log(arg.code)
  // console.log(arg['code'])
  // var stockJson = JSON.parse(arg)//eval('('+arg+')')
  // console.log(stockJson)
  // var stockJson = eval(arg)
  // console.log('板块：'+arg.plate)
  // console.log()
  //http://img1.money.126.net/data/hs/time/today/1399001.json

  //加载plate数据
  const Datastore = require('nedb')



  if(arg.plate != ''){
    const plateDb = new Datastore({
      filename: './data/plate.db',
      autoload: true
    });
    // console.log('板块：')
    //查询板块是否存在，不存在添加
    plateDb.findOne({
      name: arg.plate
      }, (err, ret) => {
        if(ret == null){
          //空数据，插入数据
          let plate = {
            name: arg.plate,
            time: new Date()
          }

          plateDb.insert(plate, function (err, newDoc) {   // Callback is optional
            // newDoc is the newly inserted document, including its _id
            // newDoc has no key called notToBeSaved since its value was undefined
          });
        }
          // console.log(err);
          // console.log(ret);
      });
  }
  
  if(arg.code != ''){
    const stockDb = new Datastore({
      filename: './data/stock.db',
      autoload: true
    });

    stockDb.findOne({
      symbol: arg.code
      }, (err, ret) => {
        if(ret == null){
          //空数据，插入数据
          var stock = {
            symbol:arg.code,
            name:arg.name,
            plate:arg.plate,
            yestclose:arg.price,
            date:arg.date,
            lastVolume:arg.lastVolume,
            comment:arg.comment,
            time:new Date()
          }

          stockDb.insert(stock, function (err, newDoc) {   // Callback is optional
            // newDoc is the newly inserted document, including its _id
            // newDoc has no key called notToBeSaved since its value was undefined
          });

        }else{
          console.log('已经存在'+JSON.stringify(ret));
        }
      }
    )
  }


  // const request = net.request({
  //   method: 'GET',
  //   protocol: 'http:',
  //   hostname: 'img1.money.126.net',
  //   port: 443,
  //   path: '/data/hs/time/today/1399001.json'
  // })

})