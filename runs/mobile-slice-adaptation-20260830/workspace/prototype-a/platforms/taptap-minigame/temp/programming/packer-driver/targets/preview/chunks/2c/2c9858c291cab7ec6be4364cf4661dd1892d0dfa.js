System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Camera, Canvas, Color, Component, Graphics, input, Input, KeyCode, Layers, Node, ResolutionPolicy, screen, UITransform, view, createGameState, resolveContact, resolveFinish, tap, TAP_GAME, _dec, _class, _crd, ccclass, DESIGN_WIDTH, DESIGN_HEIGHT, exactFitScreen, FIRST_FRAME_PALETTE, GameBootstrap;

  function _reportPossibleCrUseOfcreateGameState(extras) {
    _reporterNs.report("createGameState", "./core/game-rules", _context.meta, extras);
  }

  function _reportPossibleCrUseOfresolveContact(extras) {
    _reporterNs.report("resolveContact", "./core/game-rules", _context.meta, extras);
  }

  function _reportPossibleCrUseOfresolveFinish(extras) {
    _reporterNs.report("resolveFinish", "./core/game-rules", _context.meta, extras);
  }

  function _reportPossibleCrUseOftap(extras) {
    _reporterNs.report("tap", "./core/game-rules", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTAP_GAME(extras) {
    _reporterNs.report("TAP_GAME", "./core/tap-config", _context.meta, extras);
  }

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      _decorator = _cc._decorator;
      Camera = _cc.Camera;
      Canvas = _cc.Canvas;
      Color = _cc.Color;
      Component = _cc.Component;
      Graphics = _cc.Graphics;
      input = _cc.input;
      Input = _cc.Input;
      KeyCode = _cc.KeyCode;
      Layers = _cc.Layers;
      Node = _cc.Node;
      ResolutionPolicy = _cc.ResolutionPolicy;
      screen = _cc.screen;
      UITransform = _cc.UITransform;
      view = _cc.view;
    }, function (_unresolved_2) {
      createGameState = _unresolved_2.createGameState;
      resolveContact = _unresolved_2.resolveContact;
      resolveFinish = _unresolved_2.resolveFinish;
      tap = _unresolved_2.tap;
    }, function (_unresolved_3) {
      TAP_GAME = _unresolved_3.TAP_GAME;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "7e55cESrsFKH4tTDHbbtj9j", "GameBootstrap", undefined);

      __checkObsolete__(['_decorator', 'Camera', 'Canvas', 'Color', 'Component', 'Graphics', 'input', 'Input', 'KeyCode', 'Layers', 'Node', 'ResolutionPolicy', 'screen', 'UITransform', 'view', 'EventKeyboard']);

      ({
        ccclass
      } = _decorator);
      DESIGN_WIDTH = 390;
      DESIGN_HEIGHT = 844;
      exactFitScreen = false;
      FIRST_FRAME_PALETTE = {
        background: new Color(7, 17, 38, 255),
        lane: new Color(31, 56, 86, 255),
        mint: new Color(99, 242, 213, 255),
        coral: new Color(244, 91, 118, 255),
        gold: new Color(247, 185, 76, 255),
        blade: new Color(229, 244, 251, 255)
      };

      _export("GameBootstrap", GameBootstrap = (_dec = ccclass('GameBootstrap'), _dec(_class = class GameBootstrap extends Component {
        constructor() {
          super(...arguments);
          this.state = (_crd && createGameState === void 0 ? (_reportPossibleCrUseOfcreateGameState({
            error: Error()
          }), createGameState) : createGameState)();
          this.staticGraphics = void 0;
          this.dynamicGraphics = void 0;
          this.distance = 0;
          this.bladeY = -250;
          this.bladeVy = 0;
          this.bladeAngle = 0;
          this.cutTriggered = false;
          this.reflectTriggered = false;
          this.hazardTriggered = false;
          this.safeOffsetY = 0;
        }

        start() {
          void exactFitScreen;
          view.setDesignResolutionSize(DESIGN_WIDTH, DESIGN_HEIGHT, ResolutionPolicy.FIXED_WIDTH);
          var safeArea = screen.safeArea;
          this.safeOffsetY = Math.max(0, (screen.windowSize.height - safeArea.height) / 2);
          this.buildPlatformSafeCanvas();
          this.redrawStaticCourse();
          this.redrawDynamicCourse();
          input.on(Input.EventType.TOUCH_END, this.onTap, this);
          input.on(Input.EventType.MOUSE_UP, this.onTap, this);
          input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
          console.log("[" + (_crd && TAP_GAME === void 0 ? (_reportPossibleCrUseOfTAP_GAME({
            error: Error()
          }), TAP_GAME) : TAP_GAME).name + "] TapTap " + (_crd && TAP_GAME === void 0 ? (_reportPossibleCrUseOfTAP_GAME({
            error: Error()
          }), TAP_GAME) : TAP_GAME).appId + " portrait Graphics runtime ready");
        }

        update(deltaTime) {
          if (this.state.status !== 'airborne') return;
          var dt = Math.min(0.05, Math.max(0, deltaTime));
          this.distance += Math.max(80, Math.abs(this.state.motion.vx)) * dt;
          this.bladeVy += 164 * dt;
          this.bladeY -= this.bladeVy * dt;
          this.bladeAngle += this.state.motion.angularVelocity * dt;

          if (!this.cutTriggered && this.distance >= 85) {
            this.cutTriggered = true;
            this.state = (_crd && resolveContact === void 0 ? (_reportPossibleCrUseOfresolveContact({
              error: Error()
            }), resolveContact) : resolveContact)(this.state, 'sharp', 'moon-fruit-1');
          }

          if (!this.reflectTriggered && this.distance >= 180 && this.bladeY < -170) {
            this.reflectTriggered = true;
            this.state = (_crd && resolveContact === void 0 ? (_reportPossibleCrUseOfresolveContact({
              error: Error()
            }), resolveContact) : resolveContact)(this.state, 'blunt', 'stone-1');
            this.bladeVy = -92;
          }

          if (!this.hazardTriggered && this.distance >= 300 && this.bladeY < -320) {
            this.hazardTriggered = true;
            this.state = (_crd && resolveContact === void 0 ? (_reportPossibleCrUseOfresolveContact({
              error: Error()
            }), resolveContact) : resolveContact)(this.state, 'hazard', 'spikes');
          } else if (this.bladeY < -390) {
            this.state = (_crd && resolveContact === void 0 ? (_reportPossibleCrUseOfresolveContact({
              error: Error()
            }), resolveContact) : resolveContact)(this.state, 'fall');
          } else if (this.distance >= 520) {
            this.state = (_crd && resolveFinish === void 0 ? (_reportPossibleCrUseOfresolveFinish({
              error: Error()
            }), resolveFinish) : resolveFinish)(this.state);
          }

          this.redrawDynamicCourse();
        }

        onDestroy() {
          input.off(Input.EventType.TOUCH_END, this.onTap, this);
          input.off(Input.EventType.MOUSE_UP, this.onTap, this);
          input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        }

        buildPlatformSafeCanvas() {
          var _this$node$getCompone, _this$node$scene, _this$node$getCompone2;

          this.node.layer = Layers.Enum.UI_2D;
          var transform = (_this$node$getCompone = this.node.getComponent(UITransform)) != null ? _this$node$getCompone : this.node.addComponent(UITransform);
          transform.setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
          var cameraNode = new Node('Portrait UI Camera');
          cameraNode.layer = Layers.Enum.UI_2D;
          cameraNode.setPosition(0, 0, 1000);
          var camera = cameraNode.addComponent(Camera);
          camera.projection = Camera.ProjectionType.ORTHO;
          camera.orthoHeight = DESIGN_HEIGHT / 2;
          camera.visibility = Layers.Enum.UI_2D;
          camera.clearColor = FIRST_FRAME_PALETTE.background;
          (_this$node$scene = this.node.scene) == null || _this$node$scene.addChild(cameraNode);
          var canvas = (_this$node$getCompone2 = this.node.getComponent(Canvas)) != null ? _this$node$getCompone2 : this.node.addComponent(Canvas);
          canvas.cameraComponent = camera;
          this.staticGraphics = this.createGraphicsLayer('Static Course');
          this.dynamicGraphics = this.createGraphicsLayer('Dynamic Blade And Feedback');
        }

        createGraphicsLayer(name) {
          var layer = new Node(name);
          layer.layer = Layers.Enum.UI_2D;
          layer.addComponent(UITransform).setContentSize(DESIGN_WIDTH, DESIGN_HEIGHT);
          this.node.addChild(layer);
          return layer.addComponent(Graphics);
        }

        drawFirstFrameBackground(graphics) {
          graphics.fillColor = FIRST_FRAME_PALETTE.background;
          graphics.rect(-DESIGN_WIDTH / 2, -DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT);
          graphics.fill();
          graphics.fillColor = FIRST_FRAME_PALETTE.lane;
          graphics.roundRect(-168, -355, 336, 650, 26);
          graphics.fill();
          graphics.strokeColor = new Color(52, 88, 126, 255);
          graphics.lineWidth = 4;
          graphics.moveTo(0, -335);
          graphics.lineTo(0, 272);
          graphics.stroke();
        }

        redrawStaticCourse() {
          var graphics = this.staticGraphics;
          if (!graphics) return;
          graphics.clear();
          this.drawFirstFrameBackground(graphics);
          this.fillRect(graphics, -170, -365, 340, 28, new Color(127, 202, 104, 255));
          this.fillRect(graphics, 94, -185, 45, 142, new Color(82, 109, 128, 255));
          graphics.fillColor = new Color(232, 162, 72, 255);
          graphics.circle(-45, 28, 30);
          graphics.fill();

          for (var x = -150; x <= 150; x += 38) {
            graphics.fillColor = FIRST_FRAME_PALETTE.coral;
            graphics.moveTo(x - 17, -335);
            graphics.lineTo(x, -297);
            graphics.lineTo(x + 17, -335);
            graphics.close();
            graphics.fill();
          }

          this.fillRect(graphics, -126, 250, 30, 116, FIRST_FRAME_PALETTE.mint);
          this.fillRect(graphics, 96, 250, 30, 116, FIRST_FRAME_PALETTE.gold);
          this.fillRect(graphics, -126, 340, 252, 24, new Color(79, 141, 232, 255));
        }

        redrawDynamicCourse() {
          var graphics = this.dynamicGraphics;
          if (!graphics) return;
          graphics.clear();
          var feedback = this.state.status === 'failed' ? FIRST_FRAME_PALETTE.coral : this.state.status === 'won' ? FIRST_FRAME_PALETTE.mint : this.state.lastFeedback === 'cut' ? new Color(150, 255, 233, 255) : new Color(255, 226, 146, 255);
          this.fillRect(graphics, -145, 300 - this.safeOffsetY, 290, 12, feedback);
          this.drawBlade(graphics);
        }

        drawBlade(graphics) {
          var cx = -45;
          var cy = this.bladeY;
          var cos = Math.cos(this.bladeAngle);
          var sin = Math.sin(this.bladeAngle);

          var point = (x, y) => [cx + x * cos - y * sin, cy + x * sin + y * cos];

          var points = [point(-62, -8), point(68, -8), point(82, 0), point(68, 8), point(-62, 8)];
          graphics.fillColor = FIRST_FRAME_PALETTE.blade;
          graphics.moveTo(points[0][0], points[0][1]);

          for (var i = 1; i < points.length; i += 1) graphics.lineTo(points[i][0], points[i][1]);

          graphics.close();
          graphics.fill();
          this.fillRect(graphics, cx - 92, cy - 16, 34, 32, new Color(229, 95, 56, 255));
        }

        fillRect(graphics, x, y, width, height, color) {
          graphics.fillColor = color;
          graphics.roundRect(x, y, width, height, Math.min(10, width / 4, height / 4));
          graphics.fill();
        }

        applyTap() {
          var terminal = this.state.status === 'failed' || this.state.status === 'won';
          this.state = (_crd && tap === void 0 ? (_reportPossibleCrUseOftap({
            error: Error()
          }), tap) : tap)(this.state);

          if (terminal) {
            this.distance = 0;
            this.bladeY = -250;
            this.bladeAngle = 0;
            this.cutTriggered = false;
            this.reflectTriggered = false;
            this.hazardTriggered = false;
          } else {
            this.bladeVy = -102;
          }

          this.redrawDynamicCourse();
        }

        onTap() {
          this.applyTap();
        }

        onKeyDown(event) {
          if (event.keyCode === KeyCode.SPACE || event.keyCode === KeyCode.ENTER) this.applyTap();
        }

      }) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=2c9858c291cab7ec6be4364cf4661dd1892d0dfa.js.map