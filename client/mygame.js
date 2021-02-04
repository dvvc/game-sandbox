import { getColor } from './utils.js';

const TWOPI = 3.1416 * 2;

export function setup() {
  return {
    x: 100,
    y: 100,
    speed: 200,
    dx: 0,
    dy: 0,
  };
}

export function draw(state, env) {
  let ctx = env.ctx;
  let input = env.input;

  ctx.fillStyle = input.b1 ? 'red' : getColor();
  ctx.beginPath();
  ctx.arc(state.x, state.y, 10, 0, TWOPI);
  ctx.fill();

  let dx = input.right ? 1 : input.left ? -1 : 0;
  let dy = input.up ? -1 : input.down ? 1 : 0;

  state.x = state.x + state.speed * env.delta * dx;
  state.y = state.y + state.speed * env.delta * dy;
  return state;
}
