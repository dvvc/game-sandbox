const ASSET_WIDTH = 98;
const ASSET_HEIGHT = 128;

const ASSETS = {
  alice: 'alice.png',
  bob: 'bob.png',
  carla: 'carla.png',
  daniel: 'daniel.png',
  robot: 'robot.png',
  zombie: 'zombie.png',
};

const ASSET_LIST = Object.keys(ASSETS);

export function setup({ width, height, assets }) {
  assets.load(ASSETS);

  return {
    asset: 0,
    x: width / 2 - ASSET_WIDTH / 2,
    y: height / 2 - ASSET_HEIGHT / 2,
  };
}

export function draw(state, { input, width, height, assets, ctx }) {
  if (!assets.loaded) return state;

  ctx.fillStyle = 'lightgray';
  ctx.fillRect(0, 0, width, height);

  if (input.rightp) {
    state.asset = (state.asset + 1) % ASSET_LIST.length;
  }

  if (input.leftp) {
    state.asset = (state.asset - 1 + ASSET_LIST.length) % ASSET_LIST.length;
  }

  ctx.drawImage(assets[ASSET_LIST[state.asset]].image, state.x, state.y, ASSET_WIDTH, ASSET_HEIGHT);

  return state;
}
