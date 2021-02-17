import { initInput, readInput, clearFrameInput } from './input.js';

const OPT_DEFAULTS = {
  width: 600,
  height: 600,
  canvasId: 'canvas',
};

/**
 * Initializes the game engine
 *  - Register keyboard handlers
 */
function initEngine() {
  return {
    initialized: false,
    input: initInput(),
  };
}

/**
 * Initialize the environment
 *
 *  - Set the canvas size
 *  - Store the canvas context
 *  - Initialize environment data
 *
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
  };
}

/**
 * Declares the game loop and starts it
 *
 */
function initGame(state, engine, env) {
  let updatedState = state;
  let lastTime = 0;

  (function gameLoop(time) {
    // Calculate how many milliseconds passed since last frame
    env.delta = (time - lastTime) / 1000;

    // Read this frame's input
    readInput(engine.input, env);

    // Run user's defined draw function
    updatedState = engine.draw(updatedState, env);

    // Clear transient input for this frame
    clearFrameInput(engine.input);
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
function startGameClient(moduleUrl, engine, env) {
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

      // Update the setup / draw functions with the new ones
      engine.setup = module.setup;
      engine.draw = module.draw;

      // After the first update, if the client was not initialized, we start the game
      if (!engine.initialized) {
        let state = engine.setup(env);

        engine.initialized = true;
        // game loop
        initGame(state, engine, env);
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
    let engine = initEngine();
    let env = initEnv(opts);
    startGameClient(opts.moduleUrl, engine, env);
  });
}
