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

async function runGame(opts) {
  opts = Object.assign({}, OPT_DEFAULTS, opts);

  if (!opts.moduleUrl) {
    throw new Error(`Must provide a moduleUrl`);
  }

  let env = await initEnv(opts);

  setupFileClient(opts.moduleUrl, env);
}

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
 * Copy the transient input (as read from the DOM) into the env input
 *
 */
function readInput(env, currentInput, currentInputP) {
  env.input = Object.assign({}, currentInput, currentInputP);
}

function clearInputPress(currentInputP) {
  Object.keys(currentInputP).forEach(k => {
    currentInputP[k] = false;
  });
}

function setupFileClient(moduleUrl, env) {
  let ws = new WebSocket(`ws://${location.host}?module=${moduleUrl}`);

  ws.addEventListener('message', async event => {
    console.log('Message from server ', event.data);
    let [action, file] = event.data.split(':');

    // We *always* update the gameModule, even if the change is in a submodule
    if (action === 'change' || action === 'rebuild') {
      console.log('Updating module');

      let module = await import(file + '?t=' + new Date().getTime());

      if (!module.setup || !module.draw) {
        throw new Error(`Invalid module at ${file}`);
      }

      env.setup = module.setup;
      env.draw = module.draw;

      // If the client was not initialized, we start the game, otherwise, just reload
      if (!env.initialized) {
        let state = env.setup(env);

        env.initialized = true;
        // game loop
        initGame(state, env);
      }
    }
  });
}

// Game static code
window.addEventListener('load', () => {
  runGame({
    width: 400,
    height: 400,
    canvasId: 'canvas',
    moduleUrl: './mygame.js',
  });
});
