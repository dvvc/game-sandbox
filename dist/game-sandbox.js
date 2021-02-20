// lib/input.js
var KEY_MAP = {
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  KeyX: "b1",
  KeyZ: "b2"
};
var ENGINE_KEY_MAP = {
  Backquote: "hud",
  Enter: "enter"
};
function initInput() {
  let currentInput = {};
  let currentInputP = {};
  let engineCurrentInput = {};
  let engineCurrentInputP = {};
  document.addEventListener("keydown", (e) => {
    let key;
    if (key = KEY_MAP[e.code]) {
      let keyp = key + "p";
      currentInput[key] = true;
      currentInputP[keyp] = true;
    } else if (key = ENGINE_KEY_MAP[e.code]) {
      let keyp = key + "p";
      engineCurrentInput[key] = true;
      engineCurrentInputP[keyp] = true;
    }
  });
  document.addEventListener("keyup", (e) => {
    let key;
    if (key = KEY_MAP[e.code]) {
      currentInput[key] = false;
    } else if (key = ENGINE_KEY_MAP[e.code]) {
      engineCurrentInput[key] = false;
    }
  });
  return {
    currentInput,
    currentInputP,
    engineCurrentInput,
    engineCurrentInputP
  };
}
function readInput(env) {
  let input = env.engine.input;
  env.input = Object.assign({}, input.currentInput, input.currentInputP);
  env.engine.internalInput = Object.assign({}, input.engineCurrentInput, input.engineCurrentInputP);
}
function clearFrameInput(internalInput) {
  Object.keys(internalInput.currentInputP).forEach((k) => {
    internalInput.currentInputP[k] = false;
  });
  Object.keys(internalInput.engineCurrentInputP).forEach((k) => {
    internalInput.engineCurrentInputP[k] = false;
  });
}

// lib/hud.js
var HUD_COMMANDS = ["Start recording", "Play recording", "Stop recording"];
var COMMAND_BG = "#555555";
var COMMAND_FG = "#eeeeee";
function setHudBoundingBox(hudElement, boundingBox) {
  hudElement.style.top = boundingBox.top + "px";
  hudElement.style.left = boundingBox.left + "px";
  hudElement.style.width = boundingBox.width + "px";
  hudElement.style.height = boundingBox.height + "px";
}
function buildHudElement(boundingBox) {
  let hudElement = document.createElement("div");
  hudElement.style.position = "absolute";
  setHudBoundingBox(hudElement, boundingBox);
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
    commandItem.style.padding = "2px 10px";
    hudCommandList.appendChild(commandItem);
  });
  hudCommandList.children.item(0).style.backgroundColor = COMMAND_FG;
  hudCommandList.children.item(0).style.color = COMMAND_BG;
  hudElement.appendChild(hudCommandList);
  return hudElement;
}
function initHud(canvasBoundingBox) {
  let hudElement = buildHudElement(canvasBoundingBox);
  document.body.appendChild(hudElement);
  return {
    active: false,
    selectedCommand: 0,
    element: hudElement
  };
}
function toggleHud(hud, canvasBoundingBox) {
  hud.active = !hud.active;
  if (hud.active) {
    setHudBoundingBox(hud.element, canvasBoundingBox);
  }
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
function updateHud(hud, internalInput, input) {
  if (internalInput.enterp) {
    return hud.selectedCommand;
  }
  updateHudCommandSelection(hud, input);
}

// lib/recorder.js
var MAX_RECORDER_SIZE = 60 * 60 * 5;
function initRecorder() {
  return {
    recording: false,
    playing: false,
    currentInput: 0,
    stateSnapshot: void 0,
    inputHistory: []
  };
}
function startRecording(env, updatedState) {
  let recorder = env.engine.recorder;
  recorder.recording = true;
  recorder.stateSnapshot = updatedState;
  recorder.playing = false;
  recorder.currentInput = 0;
  recorder.stateSnapshot = {...updatedState};
  recorder.inputHistory = [];
}
function playRecording(env) {
  let recorder = env.engine.recorder;
  stopRecording(env);
  recorder.playing = true;
  recorder.currentInput = 0;
}
function stopRecording(env) {
  let recorder = env.engine.recorder;
  recorder.recording = false;
}
function playInputHistory(recorder, currentState) {
  if (!recorder.playing) {
    throw new Error(`Tried to play input history, but recorder is not playing`);
  }
  if (recorder.inputHistory.length === 0) {
    throw new Error(`Recorder input history is empty!!`);
  }
  let input = recorder.inputHistory[recorder.currentInput];
  let state = currentState;
  if (recorder.currentInput === 0) {
    state = {...recorder.stateSnapshot};
  }
  recorder.currentInput = (recorder.currentInput + 1) % recorder.inputHistory.length;
  return {state, input};
}
function recordInput(recorder, input) {
  if (!recorder.recording) {
    throw new Error(`Tried to record input, but recorder is not recording`);
  }
  recorder.inputHistory.push({...input});
  if (recorder.inputHistory.length > MAX_RECORDER_SIZE) {
    throw new Error(`Max record input exceeded!!`);
  }
}

// lib/engine.js
var OPT_DEFAULTS = {
  width: 600,
  height: 600,
  canvasId: "canvas"
};
function initEngine(canvasEl) {
  return {
    initialized: false,
    recorder: initRecorder(),
    input: initInput(),
    hud: initHud(canvasEl.getBoundingClientRect()),
    canvasEl
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
    engine: initEngine(canvasEl)
  };
}
function initGame(state, env) {
  let updatedState = state;
  let lastTime = 0;
  let hud = env.engine.hud;
  let canvasEl = env.engine.canvasEl;
  let recorder = env.engine.recorder;
  (function gameLoop(time) {
    env.delta = (time - lastTime) / 1e3;
    readInput(env);
    if (recorder.playing && !hud.active) {
      let {state: state2, input} = playInputHistory(env.engine.recorder, updatedState, env.input);
      updatedState = state2;
      env.input = input;
    }
    if (recorder.recording && !hud.active) {
      recordInput(recorder, env.input);
    }
    if (env.engine.internalInput.hudp) {
      toggleHud(hud, canvasEl.getBoundingClientRect());
    }
    if (hud.active) {
      let selectedCommand = updateHud(hud, env.engine.internalInput, env.input);
      if (selectedCommand !== void 0) {
        toggleHud(hud, canvasEl.getBoundingClientRect());
        if (selectedCommand === 0) {
          startRecording(env, updatedState);
        } else if (selectedCommand === 1) {
          playRecording(env);
          updatedState = {...recorder.stateSnapshot};
        } else if (selectedCommand === 2) {
          stopRecording(env);
        }
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
