/* Unity Converter Injection */
Error.stackTraceLimit = Infinity;

GameGlobal.oldFetch = GameGlobal.fetch;
if (!GameGlobal.oldFetch) {
    throw new Error('fetch is not defined');
}
GameGlobal.fetch = undefined; // remove fetch to follow wx

function __initApp() {
  // init app
  globalThis.__wxRequire = require; // FIX: require cannot work in separate engine 
  require('./web-adapter');
  var firstScreen = require('./first-screen');

  // Polyfills bundle.
  require("src/polyfills.bundle.js");

  // SystemJS support.
  require("src/system.bundle.js");

  // Adapt for IOS, swap if opposite
  var info = wx.getSystemInfoSync();
  if (canvas) {
    var _w = canvas.width;
    var _h = canvas.height;
    if (info.screenWidth < info.screenHeight) {
      if (canvas.width > canvas.height) {
        _w = canvas.height;
        _h = canvas.width;
      }
    } else {
      if (canvas.width < canvas.height) {
        _w = canvas.height;
        _h = canvas.width;
      }
    }
    canvas.width = _w;
    canvas.height = _h;
  }
  // Adjust initial canvas size
  if (canvas && window.devicePixelRatio >= 2) {
    canvas.width *= info.devicePixelRatio;
    canvas.height *= info.devicePixelRatio;
  }
  var importMap = require("src/import-map.js")["default"];
  System.warmup({
    importMap: importMap,
    importMapUrl: 'src/import-map.js',
    defaultHandler: function defaultHandler(urlNoSchema) {
      require('.' + urlNoSchema);
    },
    handlers: {
      'plugin:': function plugin(urlNoSchema) {
        requirePlugin(urlNoSchema);
      },
      'project:': function project(urlNoSchema) {
        require(urlNoSchema);
      }
    }
  });
  firstScreen.start('default', 'default', 'false').then(function () {
    return System["import"]('./application.js');
  }).then(function (module) {
    return firstScreen.setProgress(0.2).then(function () {
      return Promise.resolve(module);
    });
  }).then(function (_ref) {
    var Application = _ref.Application;
    return new Application();
  }).then(function (application) {
    return firstScreen.setProgress(0.4).then(function () {
      return Promise.resolve(application);
    });
  }).then(function (application) {
    return onApplicationCreated(application);
  })["catch"](function (err) {
    console.error(err);
  });
  function onApplicationCreated(application) {
    return System["import"]('cc').then(function (module) {
      return firstScreen.setProgress(0.6).then(function () {
        return Promise.resolve(module);
      });
    }).then(function (cc) {
      require('./engine-adapter');
      return application.init(cc);
    }).then(function () {
      return firstScreen.end().then(function () {
        return application.start();
      });
    });
  }
} // init app

// NOTE: on WeChat Android end, we can only get the correct screen size at the second tick of game.
var sysInfo = wx.getSystemInfoSync();
if (sysInfo.platform.toLocaleLowerCase() === 'android') {
  GameGlobal.requestAnimationFrame(__initApp);
} else {
  __initApp();
}