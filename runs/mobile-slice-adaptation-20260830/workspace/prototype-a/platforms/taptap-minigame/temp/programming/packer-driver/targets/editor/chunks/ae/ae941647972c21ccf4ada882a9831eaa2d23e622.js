System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, _crd, PLACEHOLDER_IDS, TAP_GAME;

  function validateTapAppId(value) {
    const normalized = value.trim();

    if (!/^\d{5,}$/.test(normalized) || PLACEHOLDER_IDS.has(normalized)) {
      throw new Error('TapTap AppID must be a reviewed numeric AppID');
    }

    return normalized;
  }

  _export("validateTapAppId", validateTapAppId);

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "92893IAAABAAIAAAAAAAAAD", "tap-config", undefined);

      PLACEHOLDER_IDS = new Set(['000000', 'your-app-id', 'test', 'demo']);

      _export("TAP_GAME", TAP_GAME = Object.freeze({
        name: '疯狂切割',
        appId: validateTapAppId('928932'),
        version: '1.0.0',
        orientation: 'portrait'
      }));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=ae941647972c21ccf4ada882a9831eaa2d23e622.js.map