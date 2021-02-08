// Library code
const OPT_DEFAULTS = {
  width: 600,
  height: 600,
  canvasId: 'canvas',
};

// KeyboardEvent#code -> input key
const KEY_MAP = {
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  KeyX: 'b1',
  KeyZ: 'b2',
};

// Globals (TODO: Remove)
let currentInput = {};
let currentInputP = {};

/**
 * Initialize the environment
 *
 *  - Set the canvas size
 *  - Store the canvas context
 *  - Register keyboard handlers
 *
 */
async function initEnv(opts) {
  let { width, height, canvasId } = opts;

  let canvasEl = document.getElementById(canvasId);
  canvasEl.width = width;
  canvasEl.height = height;

  initInput(currentInput, currentInputP);

  return {
    ctx: canvasEl.getContext('2d'),
    input: {},
    width,
    height,
    initialized: false,
  };
}

/**
 * Declares the game loop and starts it
 *
 */
function initGame(state, env) {
  let updatedState = state;
  let lastTime = 0;

  (function gameLoop(time) {
    env.delta = (time - lastTime) / 1000;
    readInput(env, currentInput, currentInputP);
    env.ctx.clearRect(0, 0, env.width, env.height);
    updatedState = env.draw(updatedState, env);
    clearInputPress(currentInputP);
    lastTime = time;
    window.requestAnimationFrame(gameLoop);
  })(0);
}

/**
 * Register input event handlers
 *
 */
function initInput(input, inputP) {
  document.addEventListener('keydown', e => {
    let key = KEY_MAP[e.code];
    let keyp = key + 'p';

    if (!key) return;

    input[key] = true;
    inputP[keyp] = true;
  });

  document.addEventListener('keyup', e => {
    let key = KEY_MAP[e.code];
    if (!key) return;
    input[key] = false;
  });
}

/**
 * Copy the transient input (as read from the DOM) into the env input.
 *
 */
function readInput(env, currentInput, currentInputP) {
  env.input = Object.assign({}, currentInput, currentInputP);
}

/**
 * Set all input keypresses to false, so that attribute can be used to detect the frame when the
 * key was initially pressed.
 *
 */
function clearInputPress(currentInputP) {
  Object.keys(currentInputP).forEach(k => {
    currentInputP[k] = false;
  });
}

/**
 * Create a new web socket connection to the server, passing the entry point of the game. When the
 * server detects a change and notifies through the websocket, re-import a new version of the module
 * and replace the draw / setup functions with the updated ones.
 *
 */
function startGameClient(moduleUrl, env) {
  let ws = new WebSocket(`ws://${location.host}?module=${moduleUrl}`);

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
      env.setup = module.setup;
      env.draw = module.draw;

      // After the first update, if the client was not initialized, we start the game
      if (!env.initialized) {
        let state = env.setup(env);

        env.initialized = true;
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
  window.addEventListener('load', async () => {
    let env = await initEnv(opts);
    startGameClient(opts.moduleUrl, env);
  });
}
