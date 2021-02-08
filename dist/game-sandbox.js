// lib/index.js
var OPT_DEFAULTS = {
  width: 600,
  height: 600,
  canvasId: "canvas"
};
var KEY_MAP = {
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  KeyX: "b1",
  KeyZ: "b2"
};
var currentInput = {};
var currentInputP = {};
async function initEnv(opts) {
  let {width, height, canvasId} = opts;
  let canvasEl = document.getElementById(canvasId);
  canvasEl.width = width;
  canvasEl.height = height;
  initInput(currentInput, currentInputP);
  return {
    ctx: canvasEl.getContext("2d"),
    input: {},
    width,
    height,
    initialized: false
  };
}
function initGame(state, env) {
  let updatedState = state;
  let lastTime = 0;
  (function gameLoop(time) {
    env.delta = (time - lastTime) / 1e3;
    readInput(env, currentInput, currentInputP);
    env.ctx.clearRect(0, 0, env.width, env.height);
    updatedState = env.draw(updatedState, env);
    clearInputPress(currentInputP);
    lastTime = time;
    window.requestAnimationFrame(gameLoop);
  })(0);
}
function initInput(input, inputP) {
  document.addEventListener("keydown", (e) => {
    let key = KEY_MAP[e.code];
    let keyp = key + "p";
    if (!key)
      return;
    input[key] = true;
    inputP[keyp] = true;
  });
  document.addEventListener("keyup", (e) => {
    let key = KEY_MAP[e.code];
    if (!key)
      return;
    input[key] = false;
  });
}
function readInput(env, currentInput2, currentInputP2) {
  env.input = Object.assign({}, currentInput2, currentInputP2);
}
function clearInputPress(currentInputP2) {
  Object.keys(currentInputP2).forEach((k) => {
    currentInputP2[k] = false;
  });
}
function setupFileClient(moduleUrl, env) {
  let ws = new WebSocket(`ws://${location.host}?module=${moduleUrl}`);
  ws.addEventListener("message", async (event) => {
    console.log("Message from server ", event.data);
    let [action, file] = event.data.split(":");
    if (action === "change" || action === "rebuild") {
      console.log("Updating module");
      let module;
      try {
        module = await import(file + "?t=" + new Date().getTime());
      } catch (e) {
        throw e;
      }
      if (!module.setup || !module.draw) {
        throw new Error(`Invalid module at ${file}`);
      }
      env.setup = module.setup;
      env.draw = module.draw;
      if (!env.initialized) {
        let state = env.setup(env);
        env.initialized = true;
        initGame(state, env);
      }
    }
  });
}
async function runGame(opts) {
  opts = Object.assign({}, OPT_DEFAULTS, opts);
  if (!opts.moduleUrl) {
    throw new Error(`Must provide a moduleUrl`);
  }
  let env = await initEnv(opts);
  setupFileClient(opts.moduleUrl, env);
}
export {
  runGame
};
//# sourceMappingURL=game-sandbox.js.map
