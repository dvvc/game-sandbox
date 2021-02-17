// lib/input.js
var KEY_MAP = {
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  KeyX: "b1",
  KeyZ: "b2",
  Backquote: "hud"
};
function initInput() {
  let currentInput = {};
  let currentInputP = {};
  document.addEventListener("keydown", (e) => {
    let key = KEY_MAP[e.code];
    let keyp = key + "p";
    if (!key)
      return;
    currentInput[key] = true;
    currentInputP[keyp] = true;
  });
  document.addEventListener("keyup", (e) => {
    let key = KEY_MAP[e.code];
    if (!key)
      return;
    currentInput[key] = false;
  });
  return {
    currentInput,
    currentInputP
  };
}
function readInput(internalInput, env) {
  env.input = Object.assign({}, internalInput.currentInput, internalInput.currentInputP);
}
function clearFrameInput(internalInput) {
  Object.keys(internalInput.currentInputP).forEach((k) => {
    internalInput.currentInputP[k] = false;
  });
}

// lib/engine.js
var OPT_DEFAULTS = {
  width: 600,
  height: 600,
  canvasId: "canvas"
};
function initEngine() {
  return {
    initialized: false,
    input: initInput()
  };
}
function initEnv(opts) {
  let {width, height, canvasId} = opts;
  let canvasEl = document.getElementById(canvasId);
  let ctx = canvasEl.getContext("2d");
  let dpr = window.devicePixelRatio || 1;
  canvasEl.width = width * dpr;
  canvasEl.height = height * dpr;
  canvasEl.style.width = width + "px";
  canvasEl.style.height = height + "px";
  ctx.scale(dpr, dpr);
  return {
    ctx,
    width,
    height,
    input: {},
    delta: 0
  };
}
function initGame(state, engine, env) {
  let updatedState = state;
  let lastTime = 0;
  (function gameLoop(time) {
    env.delta = (time - lastTime) / 1e3;
    readInput(engine.input, env);
    updatedState = engine.draw(updatedState, env);
    clearFrameInput(engine.input);
    lastTime = time;
    window.requestAnimationFrame(gameLoop);
  })(0);
}
function startGameClient(moduleUrl, engine, env) {
  let protocol = location.protocol === "https" ? "wss" : "ws";
  let ws = new WebSocket(`${protocol}://${location.host}?module=${moduleUrl}`);
  ws.addEventListener("message", async (event) => {
    let [action, file] = event.data.split(":");
    if (action === "change" || action === "rebuild") {
      let module;
      try {
        module = await import(file + "?t=" + new Date().getTime());
      } catch (e) {
        throw e;
      }
      if (!module.setup || !module.draw) {
        throw new Error(`Invalid module at ${file}`);
      }
      engine.setup = module.setup;
      engine.draw = module.draw;
      if (!engine.initialized) {
        let state = engine.setup(env);
        engine.initialized = true;
        initGame(state, engine, env);
      }
    }
  });
}
async function runGame(opts) {
  opts = Object.assign({}, OPT_DEFAULTS, opts);
  if (!opts.moduleUrl) {
    throw new Error(`Must provide a moduleUrl`);
  }
  window.addEventListener("load", () => {
    let engine = initEngine();
    let env = initEnv(opts);
    startGameClient(opts.moduleUrl, engine, env);
  });
}
export {
  runGame
};
//# sourceMappingURL=game-sandbox.js.map
