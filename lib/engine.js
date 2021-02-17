import { initInput, readInput, clearFrameInput } from './input.js';
import { initHud, toggleHud, updateHud } from './hud.js';

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

  (function gameLoop(time) {
    // Calculate how many milliseconds passed since last frame
    env.delta = (time - lastTime) / 1000;

    // Read this frame's input
    readInput(env);

    if (env.input.hudp) {
      toggleHud(hud, canvasEl.getBoundingClientRect());
    }

    if (hud.active) {
      // If hud is open, do not draw the game, instead process hud events
      let selectedCommand = updateHud(hud, env.input);
      if (selectedCommand !== undefined) {
        // A command was executed
        // Deactivate hud
        toggleHud(hud, canvasEl.getBoundingClientRect());
        // Apply command
        // FIXME: This requires knowledge of HUD Commands. Instead, register functions or something
        // like that?
        console.log('COMMMAND!', selectedCommand);
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
export async function runGame(opts) {
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
