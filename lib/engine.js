import { initInput, readInput, clearFrameInput } from './input.js';
import { initHud, toggleHud, updateHud } from './hud.js';
import { initAssets } from './assets.js';
import {
  initRecorder,
  startRecording,
  playRecording,
  stopRecording,
  playInputHistory,
  recordInput,
} from './recorder.js';

const OPT_DEFAULTS = {
  width: 600,
  height: 600,
  canvasId: 'canvas',
};

/**
 * Initializes the internal data in the environment
 *
 */
function initEngine(canvasEl) {
  return {
    initialized: false,
    recorder: initRecorder(),
    input: initInput(),
    hud: initHud(canvasEl.getBoundingClientRect()),
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

    // if we are playing a recording, overwrite the parts of the input that affect the game
    if (recorder.playing && !hud.active) {
      // playInputHistory may force an state update when it has reached the end of the record and
      // needs to loop to the beginning
      let { state, input } = playInputHistory(env.engine.recorder, updatedState, env.input);

      // Update the input and state based on the recording
      updatedState = state;
      env.input = input;
    }

    if (recorder.recording && !hud.active) {
      recordInput(recorder, env.input);
    }

    if (env.engine.internalInput.hudp) {
      toggleHud(hud, canvasEl.getBoundingClientRect());
    }

    if (hud.active) {
      // If hud is open, do not draw the game, instead process hud events
      let selectedCommand = updateHud(hud, env.engine.internalInput, env.input);
      if (selectedCommand !== undefined) {
        // A command was executed
        // Deactivate hud
        toggleHud(hud, canvasEl.getBoundingClientRect());
        // Apply command
        // FIXME: This requires knowledge of HUD Commands. Instead, register functions or something
        // like that?
        if (selectedCommand === 0) {
          // start recording
          startRecording(env, updatedState);
        } else if (selectedCommand === 1) {
          // stop recording and play
          playRecording(env);
          updatedState = JSON.parse(JSON.stringify(recorder.stateSnapshot));
        } else if (selectedCommand === 2) {
          stopRecording(env);
        }
      }
    } else {
      // Run user's defined draw function
      updatedState = env.engine.draw(updatedState, env);
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
