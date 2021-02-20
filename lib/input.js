// KeyboardEvent#code -> input key
const KEY_MAP = {
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  KeyX: 'b1',
  KeyZ: 'b2',
};

const ENGINE_KEY_MAP = {
  Backquote: 'hud',
  Enter: 'enter',
};

/**
 * Register input event handlers
 *
 */
export function initInput() {
  let currentInput = {};
  let currentInputP = {};
  let engineCurrentInput = {};
  let engineCurrentInputP = {};

  document.addEventListener('keydown', e => {
    let key;

    if ((key = KEY_MAP[e.code])) {
      let keyp = key + 'p';

      currentInput[key] = true;
      currentInputP[keyp] = true;
    } else if ((key = ENGINE_KEY_MAP[e.code])) {
      let keyp = key + 'p';
      engineCurrentInput[key] = true;
      engineCurrentInputP[keyp] = true;
    }
  });

  document.addEventListener('keyup', e => {
    let key;

    if ((key = KEY_MAP[e.code])) {
      currentInput[key] = false;
    } else if ((key = ENGINE_KEY_MAP[e.code])) {
      engineCurrentInput[key] = false;
    }
  });

  return {
    currentInput,
    currentInputP,
    engineCurrentInput,
    engineCurrentInputP,
  };
}

/**
 * Copy the transient input (as read from the DOM) into the env input.
 *
 */
export function readInput(env) {
  let input = env.engine.input;
  env.input = Object.assign({}, input.currentInput, input.currentInputP);
  env.engine.internalInput = Object.assign({}, input.engineCurrentInput, input.engineCurrentInputP);
}

/**
 * Same as read input, but only for internal input
 * This is necessary when we want to keep reading the system's input while playing a recording,
 * since we don't read user input then
 *
 * TODO: DELETE ME!!!
 */
export function readInternalInput(env) {
  let input = env.engine.input;
  env.engine.internalInput = Object.assign({}, input.engineCurrentInput, input.engineCurrentInputP);
}

/**
 * Set all input keypresses to false, so that attribute can be used to detect the frame when the
 * key was initially pressed.
 *
 */
export function clearFrameInput(internalInput) {
  Object.keys(internalInput.currentInputP).forEach(k => {
    internalInput.currentInputP[k] = false;
  });
  Object.keys(internalInput.engineCurrentInputP).forEach(k => {
    internalInput.engineCurrentInputP[k] = false;
  });
}
