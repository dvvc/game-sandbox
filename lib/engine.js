import { initInput, readInput, clearFrameInput } from './input.js';
import { initHud, toggleHud, processHud } from './hud.js';
import { initAssets, reloadAsset } from './assets.js';
import {
  initRecorder,
  startRecording,
  playRecording,
  playFrameByFrame,
  stopRecording,
  stopPlaying,
  playInputHistory,
  recordInput,
} from './recorder.js';

const OPT_DEFAULTS = {
  width: 600,
  height: 600,
  canvasId: 'canvas',
};

const HUD_COMMANDS = [
  { label: 'Start recording', action: hudStartRecording },
  { label: 'Cancel recording', action: hudStopRecording },
  { label: 'Play recording', action: hudPlayRecording },
  { label: 'Stop playing', action: hudStopPlaying },
  { label: 'Frame-by-frame', action: hudPlayFrameByFrame },
];

// HUD actions
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

// ---

/**
 * Initializes the internal data in the environment
 *
 */
function initEngine(canvasEl) {
  return {
    initialized: false,
    recorder: initRecorder(),
    input: initInput(),
    hud: initHud(canvasEl.getBoundingClientRect(), HUD_COMMANDS),
    canvasEl,
  };
}

/**
 * Initialize the environment
 *
 *  - Set the canvas size
 *  - Store the canvas context
 *  - Initialize environment data
 *  - Register keyboard handlers
 */
function initEnv(opts) {
  let { width, height, canvasId } = opts;

  let canvasEl = document.getElementById(canvasId);
  let ctx = canvasEl.getContext('2d');

  // Scale the ctx to respect the pixel ratio
  let dpr = window.devicePixelRatio || 1;

  canvasEl.width = width * dpr;
  canvasEl.height = height * dpr;

  canvasEl.style.width = width + 'px';
  canvasEl.style.height = height + 'px';

  ctx.scale(dpr, dpr);

  return {
    ctx,
    width,
    height,
    input: {},
    delta: 0,
    engine: initEngine(canvasEl),
    assets: initAssets(),
  };
}

/**
 * Declares the game loop and starts it
 *
 */
function initGame(state, env) {
  let updatedState = state;
  let lastTime = 0;

  let hud = env.engine.hud;
  let canvasEl = env.engine.canvasEl;
  let recorder = env.engine.recorder;

  (function gameLoop(time) {
    // Calculate how many milliseconds passed since last frame
    env.delta = (time - lastTime) / 1000;

    // Read this frame's input
    readInput(env);

    let playFrame = true;

    // if we are playing a recording, overwrite the parts of the input that affect the game
    if (recorder.playing && !hud.active) {
      // If `frameByFrame` mode is activated, only play the next frame if `right` was pressed
      if (recorder.frameByFrame) {
        playFrame = env.input.rightp;

        if (playFrame) {
          // playInputHistory may force a state update when it has reached the end of the record and
          // needs to loop to the beginning
          let { state, input } = playInputHistory(env.engine.recorder, updatedState);

          // Update the input and state based on the recording
          updatedState = state;
          env.input = input;
        }
      } else {
        // playInputHistory may force a state update when it has reached the end of the record and
        // needs to loop to the beginning
        let { state, input } = playInputHistory(env.engine.recorder, updatedState);

        // Update the input and state based on the recording
        updatedState = state;
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
      // Process the hud input and commands instead of drawing the game
      updatedState = processHud(updatedState, env);

      // This is a special case in which we've just selected play frame-by-frame. If that's the
      // case, we want to draw the first frame so that when the game freezes for frame-by-frame, it
      // freezes on the initial state (Otherwise, it would freeze in the last updatedState)
      if (recorder.playing && recorder.frameByFrame) {
        updatedState = env.engine.draw(updatedState, env);
      }
    } else {
      // Run user's defined draw function
      if (playFrame) {
        updatedState = env.engine.draw(updatedState, env);
      }
    }

    // Clear transient input for this frame
    clearFrameInput(env.engine.input);
    lastTime = time;
    window.requestAnimationFrame(gameLoop);
  })(0);
}

/**
 * Create a new web socket connection to the server, passing the entry point of the game. When the
 * server detects a change and notifies through the websocket, re-import a new version of the module
 * and replace the draw / setup functions with the updated ones.
 *
 */
function startGameClient(moduleUrl, env) {
  let protocol = location.protocol === 'https' ? 'wss' : 'ws';
  let ws = new WebSocket(`${protocol}://${location.host}?module=${moduleUrl}`);

  ws.addEventListener('message', async event => {
    let [action, file] = event.data.split(':');

    if (action === 'change' || action === 'rebuild') {
      // When a chage is detected, re-import the game bundle

      // The try block is just to silence esbuild when bundling the distributable
      let module;

      // eslint-disable-next-line no-useless-catch
      try {
        console.log(`Reloading game code...`);
        module = await import(file + '?t=' + new Date().getTime());
      } catch (e) {
        throw e;
      }

      if (!module.setup || !module.draw) {
        throw new Error(`Invalid module at ${file}`);
      }

      let engine = env.engine;

      // Update the setup / draw functions with the new ones
      engine.setup = module.setup;
      engine.draw = module.draw;

      // After the first update, if the client was not initialized, we start the game
      if (!engine.initialized) {
        let state = engine.setup(env);

        engine.initialized = true;
        // game loop
        initGame(state, env);
      }
    } else if (action === 'asset') {
      console.log(`Reloading asset [${file}]...`);
      reloadAsset(env.assets, file);
    }
  });
}

/**
 * Starts the game. Options
 *
 *   witdth:    The game width
 *   height:    The game height
 *   canvasId:  The id of the HTML canvas element
 *   moduleUrl: The path to the game module entry point (relative to the watch-dir parameter)
 *
 */
export function runGame(opts) {
  opts = Object.assign({}, OPT_DEFAULTS, opts);

  if (!opts.moduleUrl) {
    throw new Error(`Must provide a moduleUrl`);
  }

  // wait until the DOM is loaded, then start
  window.addEventListener('load', () => {
    let env = initEnv(opts);
    startGameClient(opts.moduleUrl, env);
  });
}
