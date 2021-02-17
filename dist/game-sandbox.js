// lib/input.js
var KEY_MAP = {
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  KeyX: "b1",
  KeyZ: "b2",
  Backquote: "hud",
  Enter: "enter"
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
function readInput(env) {
  let internalInput = env.engine.input;
  env.input = Object.assign({}, internalInput.currentInput, internalInput.currentInputP);
}
function clearFrameInput(internalInput) {
  Object.keys(internalInput.currentInputP).forEach((k) => {
    internalInput.currentInputP[k] = false;
  });
}

// lib/hud.js
var HUD_COMMANDS = ["Toggle FPS", "Take state snapshot", "Load state snapshot"];
var COMMAND_BG = "#555555";
var COMMAND_FG = "#eeeeee";
function buildHudElement(boundingBox) {
  let hudElement = document.createElement("div");
  hudElement.style.position = "absolute";
  hudElement.style.top = boundingBox.top + "px";
  hudElement.style.left = boundingBox.left + "px";
  hudElement.style.width = boundingBox.width + "px";
  hudElement.style.height = boundingBox.height + "px";
  hudElement.style.backgroundColor = COMMAND_BG;
  hudElement.style.opacity = 0;
  hudElement.style.transition = "opacity 0.3s ease";
  let hudCommandList = document.createElement("ul");
  hudCommandList.style.color = COMMAND_FG;
  hudCommandList.style.listStyle = "none";
  hudCommandList.style.padding = "0 20px";
  hudCommandList.style.marginTop = "40px";
  hudCommandList.style.fontFamily = "monospace";
  HUD_COMMANDS.forEach((cmd) => {
    let commandItem = document.createElement("li");
    commandItem.innerHTML = cmd;
    commandItem.style.lineHeight = 1.6;
    hudCommandList.appendChild(commandItem);
  });
  hudCommandList.children.item(0).style.backgroundColor = COMMAND_FG;
  hudCommandList.children.item(0).style.color = COMMAND_BG;
  hudElement.appendChild(hudCommandList);
  return hudElement;
}
function initHud(boundingBox) {
  let hudElement = buildHudElement(boundingBox);
  document.body.appendChild(hudElement);
  return {
    active: false,
    selectedCommand: 0,
    element: hudElement
  };
}
function toggleHud(hud) {
  hud.active = !hud.active;
  hud.element.style.opacity = Number(hud.active);
}
function updateHudCommandSelection(hud, input) {
  let newCommandIndex = hud.selectedCommand;
  if (input.downp) {
    newCommandIndex = (hud.selectedCommand + 1) % HUD_COMMANDS.length;
  } else if (input.upp) {
    newCommandIndex = (hud.selectedCommand - 1 + HUD_COMMANDS.length) % HUD_COMMANDS.length;
  }
  if (newCommandIndex !== hud.selectedCommand) {
    let commandList = hud.element.firstChild;
    commandList.children.item(hud.selectedCommand).style.backgroundColor = null;
    commandList.children.item(hud.selectedCommand).style.color = COMMAND_FG;
    commandList.children.item(newCommandIndex).style.backgroundColor = COMMAND_FG;
    commandList.children.item(newCommandIndex).style.color = COMMAND_BG;
    hud.selectedCommand = newCommandIndex;
  }
}
function updateHud(hud, input) {
  if (input.enterp) {
    return hud.selectedCommand;
  }
  updateHudCommandSelection(hud, input);
}

// lib/engine.js
var OPT_DEFAULTS = {
  width: 600,
  height: 600,
  canvasId: "canvas"
};
function initEngine(canvasBoundingBox) {
  return {
    initialized: false,
    input: initInput(),
    hud: initHud(canvasBoundingBox)
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
    delta: 0,
    engine: initEngine(canvasEl.getBoundingClientRect())
  };
}
function initGame(state, env) {
  let updatedState = state;
  let lastTime = 0;
  (function gameLoop(time) {
    env.delta = (time - lastTime) / 1e3;
    readInput(env);
    if (env.input.hudp) {
      toggleHud(env.engine.hud);
    }
    if (env.engine.hud.active) {
      let selectedCommand = updateHud(env.engine.hud, env.input);
      if (selectedCommand !== void 0) {
        toggleHud(env.engine.hud);
        console.log("COMMMAND!", selectedCommand);
      }
    } else {
      updatedState = env.engine.draw(updatedState, env);
    }
    clearFrameInput(env.engine.input);
    lastTime = time;
    window.requestAnimationFrame(gameLoop);
  })(0);
}
function startGameClient(moduleUrl, env) {
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
      let engine = env.engine;
      engine.setup = module.setup;
      engine.draw = module.draw;
      if (!engine.initialized) {
        let state = engine.setup(env);
        engine.initialized = true;
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
  window.addEventListener("load", () => {
    let env = initEnv(opts);
    startGameClient(opts.moduleUrl, env);
  });
}
export {
  runGame
};
//# sourceMappingURL=game-sandbox.js.map
