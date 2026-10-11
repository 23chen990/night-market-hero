System.register("chunks:///_virtual/game-rules.ts", ["./rollupPluginModLoBabelHelpers.js", "cc"], function (t) {
  var e, a;
  return {
    setters: [function (t) {
      e = t["extends"];
    }, function (t) {
      a = t.cclegacy;
    }],
    execute: function execute() {
      function n(t) {
        return void 0 === t && (t = 928932), {
          seed: t,
          status: "ready",
          failReason: null,
          motion: {
            vx: 150,
            vy: 0,
            angularVelocity: 0
          },
          cuts: 0,
          score: 0,
          cutTargets: [],
          lastFeedback: "ready",
          settlement: {
            complete: !1,
            score: 0
          }
        };
      }
      t({
        createGameState: n,
        resolveContact: function resolveContact(t, a, n) {
          void 0 === n && (n = a);
          if ("airborne" !== t.status) return t;
          if ("hazard" === a || "fall" === a) return e({}, t, {
            status: "failed",
            failReason: a,
            motion: {
              vx: 0,
              vy: 0,
              angularVelocity: 0
            },
            lastFeedback: a
          });
          if ("blunt" === a) return e({}, t, {
            motion: {
              vx: -Math.max(90, .72 * Math.abs(t.motion.vx)),
              vy: -180,
              angularVelocity: -t.motion.angularVelocity
            },
            lastFeedback: "reflect"
          });
          return t.cutTargets.includes(n) ? t : e({}, t, {
            cuts: t.cuts + 1,
            score: t.score + 10,
            cutTargets: [].concat(t.cutTargets, [n]),
            lastFeedback: "cut"
          });
        },
        resolveFinish: function resolveFinish(t) {
          return "airborne" !== t.status ? t : e({}, t, {
            status: "won",
            motion: {
              vx: 0,
              vy: 0,
              angularVelocity: 0
            },
            lastFeedback: "finish",
            settlement: {
              complete: !0,
              score: t.score
            }
          });
        },
        tap: function tap(t) {
          if ("failed" === t.status || "won" === t.status) return n(t.seed);
          if ("ready" === t.status) return e({}, t, {
            status: "airborne",
            motion: {
              vx: 150,
              vy: -300,
              angularVelocity: 9.5
            },
            lastFeedback: "launch"
          });
          return e({}, t, {
            motion: {
              vx: Math.max(150, t.motion.vx),
              vy: Math.min(-300, t.motion.vy - 220),
              angularVelocity: 10.5 * -Math.sign(t.motion.angularVelocity || 1)
            },
            lastFeedback: "flip"
          });
        }
      }), a._RF.push({}, "92893IAAABAAIAAAAAAAAAC", "game-rules", void 0), a._RF.pop();
    }
  };
});
System.register("chunks:///_virtual/GameBootstrap.ts", ["./rollupPluginModLoBabelHelpers.js", "cc", "./game-rules.ts", "./tap-config.ts"], function (t) {
  var e, i, a, s, n, o, r, l, h, c, d, f, u, p, m, g, y, T, C, v, w, b;
  return {
    setters: [function (t) {
      e = t.inheritsLoose;
    }, function (t) {
      i = t.cclegacy, a = t._decorator, s = t.Color, n = t.view, o = t.ResolutionPolicy, r = t.screen, l = t.input, h = t.Input, c = t.Layers, d = t.UITransform, f = t.Node, u = t.Camera, p = t.Canvas, m = t.Graphics, g = t.KeyCode, y = t.Component;
    }, function (t) {
      T = t.resolveContact, C = t.resolveFinish, v = t.tap, w = t.createGameState;
    }, function (t) {
      b = t.TAP_GAME;
    }],
    execute: function execute() {
      var E;
      i._RF.push({}, "7e55cESrsFKH4tTDHbbtj9j", "GameBootstrap", void 0);
      var D = a.ccclass,
        G = 390,
        R = 844,
        _ = {
          background: new s(7, 17, 38, 255),
          lane: new s(31, 56, 86, 255),
          mint: new s(99, 242, 213, 255),
          coral: new s(244, 91, 118, 255),
          gold: new s(247, 185, 76, 255),
          blade: new s(229, 244, 251, 255)
        };
      t("GameBootstrap", D("GameBootstrap")(E = function (t) {
        function i() {
          for (var e, i = arguments.length, a = new Array(i), s = 0; s < i; s++) a[s] = arguments[s];
          return (e = t.call.apply(t, [this].concat(a)) || this).state = w(), e.staticGraphics = void 0, e.dynamicGraphics = void 0, e.distance = 0, e.bladeY = -250, e.bladeVy = 0, e.bladeAngle = 0, e.cutTriggered = !1, e.reflectTriggered = !1, e.hazardTriggered = !1, e.safeOffsetY = 0, e.idlePhase = 0, e;
        }
        e(i, t);
        var a = i.prototype;
        return a.start = function () {
          n.setDesignResolutionSize(G, R, o.FIXED_WIDTH);
          var t = r.safeArea;
          this.safeOffsetY = Math.max(0, (r.windowSize.height - t.height) / 2), this.buildPlatformSafeCanvas(), this.redrawStaticCourse(), this.redrawDynamicCourse(), l.on(h.EventType.TOUCH_END, this.onTap, this), l.on(h.EventType.MOUSE_UP, this.onTap, this), l.on(h.EventType.KEY_DOWN, this.onKeyDown, this), console.log("[" + b.name + "] TapTap " + b.appId + " portrait Graphics runtime ready");
        }, a.update = function (t) {
          var e = Math.min(.05, Math.max(0, t));
          if ("airborne" !== this.state.status) {
            this.idlePhase += 2.2 * e, this.bladeY = -250 + 14 * Math.sin(this.idlePhase), this.bladeAngle = .22 * Math.sin(.8 * this.idlePhase), this.redrawDynamicCourse();
            return;
          }
          this.distance += Math.max(80, Math.abs(this.state.motion.vx)) * e, this.bladeVy += 164 * e, this.bladeY -= this.bladeVy * e, this.bladeAngle += this.state.motion.angularVelocity * e, !this.cutTriggered && this.distance >= 85 && (this.cutTriggered = !0, this.state = T(this.state, "sharp", "moon-fruit-1")), !this.reflectTriggered && this.distance >= 180 && this.bladeY < -170 && (this.reflectTriggered = !0, this.state = T(this.state, "blunt", "stone-1"), this.bladeVy = -92), !this.hazardTriggered && this.distance >= 300 && this.bladeY < -320 ? (this.hazardTriggered = !0, this.state = T(this.state, "hazard", "spikes")) : this.bladeY < -390 ? this.state = T(this.state, "fall") : this.distance >= 520 && (this.state = C(this.state)), this.redrawDynamicCourse();
        }, a.onDestroy = function () {
          l.off(h.EventType.TOUCH_END, this.onTap, this), l.off(h.EventType.MOUSE_UP, this.onTap, this), l.off(h.EventType.KEY_DOWN, this.onKeyDown, this);
        }, a.buildPlatformSafeCanvas = function () {
          var t, e, i;
          this.node.layer = c.Enum.UI_2D, (null != (t = this.node.getComponent(d)) ? t : this.node.addComponent(d)).setContentSize(G, R);
          var a = new f("Portrait UI Camera");
          a.layer = c.Enum.UI_2D, a.setPosition(0, 0, 1e3);
          var s = a.addComponent(u);
          s.projection = u.ProjectionType.ORTHO, s.orthoHeight = 422, s.visibility = c.Enum.UI_2D, s.clearColor = _.background, null == (e = this.node.scene) || e.addChild(a), (null != (i = this.node.getComponent(p)) ? i : this.node.addComponent(p)).cameraComponent = s, this.staticGraphics = this.createGraphicsLayer("Static Course"), this.dynamicGraphics = this.createGraphicsLayer("Dynamic Blade And Feedback");
        }, a.createGraphicsLayer = function (t) {
          var e = new f(t);
          return e.layer = c.Enum.UI_2D, e.addComponent(d).setContentSize(G, R), this.node.addChild(e), e.addComponent(m);
        }, a.drawFirstFrameBackground = function (t) {
          t.fillColor = _.background, t.rect(-195, -422, G, R), t.fill(), t.fillColor = _.lane, t.roundRect(-168, -355, 336, 650, 26), t.fill(), t.strokeColor = new s(52, 88, 126, 255), t.lineWidth = 4, t.moveTo(0, -335), t.lineTo(0, 272), t.stroke();
        }, a.redrawStaticCourse = function () {
          var t = this.staticGraphics;
          if (t) {
            t.clear(), this.drawFirstFrameBackground(t), this.fillRect(t, -170, -365, 340, 28, new s(127, 202, 104, 255)), this.fillRect(t, 94, -185, 45, 142, new s(82, 109, 128, 255)), t.fillColor = new s(232, 162, 72, 255), t.circle(-45, 28, 30), t.fill();
            for (var e = -150; e <= 150; e += 38) t.fillColor = _.coral, t.moveTo(e - 17, -335), t.lineTo(e, -297), t.lineTo(e + 17, -335), t.close(), t.fill();
            this.fillRect(t, -126, 250, 30, 116, _.mint), this.fillRect(t, 96, 250, 30, 116, _.gold), this.fillRect(t, -126, 340, 252, 24, new s(79, 141, 232, 255));
          }
        }, a.redrawDynamicCourse = function () {
          var t = this.dynamicGraphics;
          if (t) {
            t.clear();
            var e = "failed" === this.state.status ? _.coral : "won" === this.state.status ? _.mint : "cut" === this.state.lastFeedback ? new s(150, 255, 233, 255) : new s(255, 226, 146, 255);
            this.fillRect(t, -145, 300 - this.safeOffsetY, 290, 12, e), this.drawBlade(t);
          }
        }, a.drawBlade = function (t) {
          var e = this.bladeY,
            i = Math.cos(this.bladeAngle),
            a = Math.sin(this.bladeAngle),
            n = function n(t, s) {
              return [t * i - 45 - s * a, e + t * a + s * i];
            },
            o = [n(-62, -8), n(68, -8), n(82, 0), n(68, 8), n(-62, 8)];
          t.fillColor = _.blade, t.moveTo(o[0][0], o[0][1]);
          for (var r = 1; r < o.length; r += 1) t.lineTo(o[r][0], o[r][1]);
          t.close(), t.fill(), this.fillRect(t, -137, e - 16, 34, 32, new s(229, 95, 56, 255));
        }, a.fillRect = function (t, e, i, a, s, n) {
          t.fillColor = n, t.roundRect(e, i, a, s, Math.min(10, a / 4, s / 4)), t.fill();
        }, a.applyTap = function () {
          var t = "failed" === this.state.status || "won" === this.state.status;
          this.state = v(this.state), t ? (this.distance = 0, this.bladeY = -250, this.bladeAngle = 0, this.cutTriggered = !1, this.reflectTriggered = !1, this.hazardTriggered = !1) : this.bladeVy = -102, this.redrawDynamicCourse();
        }, a.onTap = function () {
          this.applyTap();
        }, a.onKeyDown = function (t) {
          t.keyCode !== g.SPACE && t.keyCode !== g.ENTER || this.applyTap();
        }, i;
      }(y)) || E);
      i._RF.pop();
    }
  };
});
System.register("chunks:///_virtual/main", ["./GameBootstrap.ts", "./game-rules.ts", "./tap-config.ts"], function () {
  return {
    setters: [null, null, null],
    execute: function execute() {}
  };
});
System.register("chunks:///_virtual/tap-config.ts", ["cc"], function (e) {
  var t;
  return {
    setters: [function (e) {
      t = e.cclegacy;
    }],
    execute: function execute() {
      e("validateTapAppId", n), t._RF.push({}, "92893IAAABAAIAAAAAAAAAD", "tap-config", void 0);
      var r = new Set(["000000", "your-app-id", "test", "demo"]);
      function n(e) {
        var t = e.trim();
        if (!/^\d{5,}$/.test(t) || r.has(t)) throw new Error("TapTap AppID must be a reviewed numeric AppID");
        return t;
      }
      e("TAP_GAME", Object.freeze({
        name: "疯狂切割",
        appId: n("928932"),
        version: "1.0.0",
        orientation: "portrait"
      }));
      t._RF.pop();
    }
  };
});
(function (r) {
  r('virtual:///prerequisite-imports/main', 'chunks:///_virtual/main');
})(function (mid, cid) {
  System.register(mid, [cid], function (_export, _context) {
    return {
      setters: [function (_m) {
        var _exportObj = {};
        for (var _key in _m) {
          if (_key !== "default" && _key !== "__esModule") _exportObj[_key] = _m[_key];
        }
        _export(_exportObj);
      }],
      execute: function execute() {}
    };
  });
});