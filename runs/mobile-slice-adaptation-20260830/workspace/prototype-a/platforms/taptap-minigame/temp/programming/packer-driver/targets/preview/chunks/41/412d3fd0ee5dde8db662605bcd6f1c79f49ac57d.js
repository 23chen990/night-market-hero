System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, _crd;

  function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

  function createGameState(seed) {
    if (seed === void 0) {
      seed = 928932;
    }

    return {
      seed,
      status: 'ready',
      failReason: null,
      motion: {
        vx: 150,
        vy: 0,
        angularVelocity: 0
      },
      cuts: 0,
      score: 0,
      cutTargets: [],
      lastFeedback: 'ready',
      settlement: {
        complete: false,
        score: 0
      }
    };
  }

  function tap(state) {
    if (state.status === 'failed' || state.status === 'won') return createGameState(state.seed);

    if (state.status === 'ready') {
      return _extends({}, state, {
        status: 'airborne',
        motion: {
          vx: 150,
          vy: -300,
          angularVelocity: 9.5
        },
        lastFeedback: 'launch'
      });
    }

    return _extends({}, state, {
      motion: {
        vx: Math.max(150, state.motion.vx),
        vy: Math.min(-300, state.motion.vy - 220),
        angularVelocity: -Math.sign(state.motion.angularVelocity || 1) * 10.5
      },
      lastFeedback: 'flip'
    });
  }

  function resolveContact(state, contact, targetId) {
    if (targetId === void 0) {
      targetId = contact;
    }

    if (state.status !== 'airborne') return state;

    if (contact === 'hazard' || contact === 'fall') {
      return _extends({}, state, {
        status: 'failed',
        failReason: contact,
        motion: {
          vx: 0,
          vy: 0,
          angularVelocity: 0
        },
        lastFeedback: contact
      });
    }

    if (contact === 'blunt') {
      return _extends({}, state, {
        motion: {
          vx: -Math.max(90, Math.abs(state.motion.vx) * 0.72),
          vy: -180,
          angularVelocity: -state.motion.angularVelocity
        },
        lastFeedback: 'reflect'
      });
    }

    if (state.cutTargets.includes(targetId)) return state;
    return _extends({}, state, {
      cuts: state.cuts + 1,
      score: state.score + 10,
      cutTargets: [...state.cutTargets, targetId],
      lastFeedback: 'cut'
    });
  }

  function resolveFinish(state) {
    if (state.status !== 'airborne') return state;
    return _extends({}, state, {
      status: 'won',
      motion: {
        vx: 0,
        vy: 0,
        angularVelocity: 0
      },
      lastFeedback: 'finish',
      settlement: {
        complete: true,
        score: state.score
      }
    });
  }

  _export({
    createGameState: createGameState,
    tap: tap,
    resolveContact: resolveContact,
    resolveFinish: resolveFinish
  });

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "92893IAAABAAIAAAAAAAAAC", "game-rules", undefined);

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=412d3fd0ee5dde8db662605bcd6f1c79f49ac57d.js.map