// KeyboardEvent#code -> input key
const KEY_MAP = {
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  KeyX: 'b1',
  KeyZ: 'b2',
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

  document.addEventListener('keydown', e => {
    let key = KEY_MAP[e.code];
    let keyp = key + 'p';

    if (!key) return;

    currentInput[key] = true;
    currentInputP[keyp] = true;
  });

  document.addEventListener('keyup', e => {
    let key = KEY_MAP[e.code];
    if (!key) return;
    currentInput[key] = false;
  });

  return {
    currentInput,
    currentInputP,
  };
}

/**
 * Copy the transient input (as read from the DOM) into the env input.
 *
 */
export function readInput(env) {
  let internalInput = env.engine.input;
  env.input = Object.assign({}, internalInput.currentInput, internalInput.currentInputP);
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
}
