var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {get: all[name], enumerable: true});
};

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
var COMMAND_BG = "#555555";
var COMMAND_FG = "#eeeeee";
function initHud(canvasBoundingBox, hudCommands) {
  let hudElement = buildHudElement(canvasBoundingBox, hudCommands);
  document.body.appendChild(hudElement);
  return {
    active: false,
    selectedCommand: 0,
    element: hudElement,
    commands: hudCommands
  };
}
function setHudBoundingBox(hudElement, boundingBox) {
  hudElement.style.top = boundingBox.top + "px";
  hudElement.style.left = boundingBox.left + "px";
  hudElement.style.width = boundingBox.width + "px";
  hudElement.style.height = boundingBox.height + "px";
}
function buildHudElement(boundingBox, hudCommands) {
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
  hudCommands.forEach((cmd) => {
    let commandItem = document.createElement("li");
    commandItem.innerHTML = cmd.label;
    commandItem.style.lineHeight = 1.6;
    commandItem.style.padding = "2px 10px";
    hudCommandList.appendChild(commandItem);
  });
  hudCommandList.children.item(0).style.backgroundColor = COMMAND_FG;
  hudCommandList.children.item(0).style.color = COMMAND_BG;
  hudElement.appendChild(hudCommandList);
  return hudElement;
}
function toggleHud(hud) {
  hud.active = !hud.active;
  hud.element.style.opacity = Number(hud.active);
}
function updateHudCommandSelection(hud, input) {
  let newCommandIndex = hud.selectedCommand;
  let commands = hud.commands;
  if (input.downp) {
    newCommandIndex = (hud.selectedCommand + 1) % commands.length;
  } else if (input.upp) {
    newCommandIndex = (hud.selectedCommand - 1 + commands.length) % commands.length;
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
function processHud(state, env) {
  let hud = env.engine.hud;
  let selectedCommand = updateHud(hud, env.engine.internalInput, env.input);
  if (selectedCommand !== void 0) {
    let callback = hud.commands[hud.selectedCommand].action;
    return callback(state, env);
  }
  return state;
}
function updateHud(hud, internalInput, input) {
  if (internalInput.enterp) {
    return hud.selectedCommand;
  }
  updateHudCommandSelection(hud, input);
}

// lib/assets.js
var assets_exports = {};
__export(assets_exports, {
  initAssets: () => initAssets,
  reloadAsset: () => reloadAsset
});
var ASSETS_URL = "/assets/";
function imageLoaded(image, asset) {
  return new Promise((resolve, reject) => {
    if (image.complete) {
      asset.loaded = true;
      resolve(asset);
    } else {
      const markImageLoaded = () => {
        asset.loaded = true;
        image.removeEventListener("load", markImageLoaded);
        resolve(asset);
      };
      const imageLoadError = (e) => {
        image.removeEventListener("error", imageLoadError);
        reject(e);
      };
      image.addEventListener("load", markImageLoaded);
      image.addEventListener("error", imageLoadError);
    }
  });
}
function getAssetUrl(assetPath) {
  return ASSETS_URL + assetPath;
}
function loadAssets(assets, assetsDescription) {
  let imageLoadedPromises = [];
  assets.loaded = false;
  Object.entries(assetsDescription).forEach(([k, v]) => {
    let image = new Image();
    assets[k] = {loaded: false, image};
    assets[k].path = v;
    assets[k].image.src = getAssetUrl(v);
    imageLoadedPromises.push(imageLoaded(image, assets[k]));
  });
  return Promise.all(imageLoadedPromises).then(() => {
    assets.loaded = true;
  }).catch((e) => {
    console.error(`Error loading assets`, e);
  });
}
function initAssets() {
  let assets = {
    load: (assetsDescription) => loadAssets(assets, assetsDescription)
  };
  return assets;
}
async function reloadAsset(assets, assetPath) {
  let allAssets = Object.values(assets);
  let changedAsset = allAssets.find((a) => a.path === assetPath);
  if (!changedAsset) {
    console.log(`Could not find the asset for ${assetPath}, no updates performed`);
    return;
  }
  let newImage = new Image();
  newImage.src = getAssetUrl(assetPath) + `?t=${new Date().getTime()}`;
  try {
    await imageLoaded(newImage, changedAsset);
    changedAsset.path = assetPath;
    changedAsset.image = newImage;
  } catch (e) {
    console.error(e);
  }
}

// lib/recorder.js
var MAX_RECORDER_SIZE = 60 * 60 * 5;
function initRecorder() {
  return {
    recording: false,
    playing: false,
    frameByFrame: false,
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
  recorder.stateSnapshot = JSON.parse(JSON.stringify(updatedState));
  recorder.inputHistory = [];
}
function playRecording(env) {
  let recorder = env.engine.recorder;
  stopRecording(env);
  recorder.playing = true;
  recorder.frameByFrame = false;
  recorder.currentInput = 0;
}
function playFrameByFrame(env) {
  let recorder = env.engine.recorder;
  stopRecording(env);
  recorder.playing = true;
  recorder.frameByFrame = true;
  recorder.currentInput = 0;
}
function stopRecording(env) {
  let recorder = env.engine.recorder;
  recorder.recording = false;
}
function stopPlaying(env) {
  env.engine.recorder.playing = false;
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
    state = JSON.parse(JSON.stringify(recorder.stateSnapshot));
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
  canvasId: "canvas",
  offscreen: false
};
var HUD_COMMANDS = [
  {label: "Start recording", action: hudStartRecording},
  {label: "Cancel recording", action: hudStopRecording},
  {label: "Play recording", action: hudPlayRecording},
  {label: "Stop playing", action: hudStopPlaying},
  {label: "Frame-by-frame", action: hudPlayFrameByFrame}
];
function hudStartRecording(state, env) {
  toggleHud(env.engine.hud);
  startRecording(env, state);
  return state;
}
function hudPlayRecording(state, env) {
  toggleHud(env.engine.hud);
  playRecording(env);
  return JSON.parse(JSON.stringify(env.engine.recorder.stateSnapshot));
}
function hudStopRecording(state, env) {
  toggleHud(env.engine.hud);
  stopRecording(env);
  return state;
}
function hudStopPlaying(state, env) {
  toggleHud(env.engine.hud);
  stopPlaying(env);
  return state;
}
function hudPlayFrameByFrame(state, env) {
  toggleHud(env.engine.hud);
  playFrameByFrame(env);
  return JSON.parse(JSON.stringify(env.engine.recorder.stateSnapshot));
}
function initEngine(canvasEl) {
  return {
    initialized: false,
    recorder: initRecorder(),
    input: initInput(),
    hud: initHud(canvasEl.getBoundingClientRect(), HUD_COMMANDS),
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
  let offscreenCtx;
  let offscreenCanvasEl;
  if (opts.offscreen) {
    offscreenCanvasEl = document.createElement("canvas");
    offscreenCtx = offscreenCanvasEl.getContext("2d");
    offscreenCanvasEl.width = width;
    offscreenCanvasEl.height = height;
  }
  return {
    ctx,
    offscreenCtx,
    offscreenCanvasEl,
    width,
    height,
    input: {},
    delta: 0,
    engine: initEngine(canvasEl),
    assets: initAssets()
  };
}
function initGame(state, env) {
  let updatedState = state;
  let lastTime = 0;
  let hud = env.engine.hud;
  let canvasEl = env.engine.canvasEl;
  let recorder = env.engine.recorder;
  let mainCtx;
  if (env.offscreenCtx) {
    mainCtx = env.ctx;
    env.ctx = env.offscreenCtx;
  }
  (function gameLoop(time) {
    env.delta = (time - lastTime) / 1e3;
    readInput(env);
    let playFrame = true;
    if (recorder.playing && !hud.active) {
      if (recorder.frameByFrame) {
        playFrame = env.input.rightp;
        if (playFrame) {
          let {state: state2, input} = playInputHistory(env.engine.recorder, updatedState);
          updatedState = state2;
          env.input = input;
        }
      } else {
        let {state: state2, input} = playInputHistory(env.engine.recorder, updatedState);
        updatedState = state2;
        env.input = input;
      }
    }
    if (recorder.recording && !hud.active) {
      recordInput(recorder, env.input);
    }
    if (env.engine.internalInput.hudp) {
      toggleHud(hud, canvasEl.getBoundingClientRect());
    }
    if (hud.active) {
      updatedState = processHud(updatedState, env);
      if (recorder.playing && recorder.frameByFrame) {
        updatedState = env.engine.draw(updatedState, env);
      }
    } else {
      if (playFrame) {
        updatedState = env.engine.draw(updatedState, env);
      }
    }
    clearFrameInput(env.engine.input);
    if (env.offscreenCtx) {
      mainCtx.drawImage(env.offscreenCanvasEl, 0, 0);
    }
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
        console.log(`Reloading game code...`);
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
    } else if (action === "asset") {
      console.log(`Reloading asset [${file}]...`);
      reloadAsset(env.assets, file);
    }
  });
}
function runGame(opts) {
  opts = Object.assign({}, OPT_DEFAULTS, opts);
  if (!opts.moduleUrl) {
    throw new Error(`Must provide a moduleUrl`);
  }
  window.addEventListener("load", () => {
    let env = initEnv(opts);
    startGameClient(opts.moduleUrl, env);
  });
}

// lib/animations.js
var animations_exports = {};
__export(animations_exports, {
  createAnimation: () => createAnimation,
  drawAnimation: () => drawAnimation,
  updateAnimation: () => updateAnimation
});
function updateAnimation(animation, delta) {
  animation.time += delta;
  let complete = false;
  if (animation.time > animation.timePerFrame) {
    animation.time = 0;
    if (animation.currentFrame < animation.frames.length - 1) {
      animation.currentFrame++;
    } else {
      complete = true;
      if (animation.loop) {
        animation.currentFrame = 0;
      }
    }
  }
  return complete;
}
function drawAnimation(animation, x, y, width, height, assets, ctx, flip = false, rotation = 0) {
  let asset = assets[animation.assetName];
  if (!asset || !asset.loaded) {
    throw new Error(`Asset ${animation.assetName} not loaded!!!`);
  }
  let columns = asset.image.width / animation.width;
  let frameIndex = animation.frames[animation.currentFrame];
  let sourceY = Math.trunc(frameIndex / columns) * animation.height;
  let sourceX = frameIndex % columns * animation.width;
  if (flip) {
    x += width;
  }
  ctx.save();
  ctx.translate(x, y);
  if (rotation) {
    ctx.rotate(rotation);
  }
  if (flip) {
    ctx.scale(-1, 1);
  }
  ctx.drawImage(asset.image, sourceX, sourceY, animation.width, animation.height, 0, 0, width, height);
  ctx.restore();
}
function createAnimation(assetName, {width, height, speed, loop, frames}) {
  return {
    currentFrame: 0,
    time: 0,
    assetName,
    loop,
    width,
    height,
    frames,
    timePerFrame: 1 / speed
  };
}
export {
  animations_exports as animations,
  assets_exports as assets,
  runGame
};
//# sourceMappingURL=game-sandbox.js.map
