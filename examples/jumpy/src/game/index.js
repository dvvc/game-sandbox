const GRAVITY = 6000; // In pixels per second
const FLOOR = 40;
const SPEED = 400;
const JUMP_SPEED = 1300;
const ATTACK_SPEED = 1700;

const LEDGE_CHEAT = 15; // In pixels
const LEDGE_CHEAT_SPEED = 200; // In pixels per second

const CAMERA_SMOOTHING = 0.08;

const MAX_HEIGHT = 4000;
const MIN_HEIGHT = 100;
const MAX_SEPARATION = 115;
const MIN_SEPARATION = 20;

const PLAYER_SPRITE_WIDTH = 30;
const PLAYER_SPRITE_HEIGHT = 26;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 26;
const HIT_ROTATION_SPEED = -3.14 * 180; // In radians per second

const PLATFORM_WIDTH = 60;
const PLATFORM_HEIGHT = 15;
const PLATFORM_SEPARATION = 100;

const BIRD_PROBABILITY = 0.3;
const BIRD_WIDTH = 30;
const BIRD_HEIGHT = 30;
const BIRD_SPRITE_WIDTH = 85;
const BIRD_SPRITE_HEIGHT = 50;
const BIRD_SPEED = 40;

import { assets, animations } from '/game-sandbox.js';

import { initFont, drawText, measureText } from './fonts.js';
import { createTimer, updateTimer } from './timers.js';

function isValidPlatformX(x, prevX) {
  let dist = x >= prevX ? x - (prevX + PLATFORM_WIDTH) : prevX - (x + PLATFORM_WIDTH);
  return dist >= MIN_SEPARATION && dist <= MAX_SEPARATION;
}

function randInt(n) {
  return Math.trunc(Math.random() * n);
}

function roll(p) {
  return Math.random() < p;
}

function generatePlatforms(width) {
  let y = MIN_HEIGHT;
  let platforms = [];
  let x = randInt(width - PLATFORM_WIDTH);

  platforms.push({ x, y, w: PLATFORM_WIDTH });
  y += PLATFORM_SEPARATION;
  let prevX = x;

  while (y < MAX_HEIGHT) {
    do {
      x = randInt(width - PLATFORM_WIDTH);
    } while (!isValidPlatformX(x, prevX));
    platforms.push({ x, y, w: PLATFORM_WIDTH });
    y += PLATFORM_SEPARATION;
    prevX = x;
  }

  return platforms;
}

function generateBirds(width, animationDef) {
  let y = MIN_HEIGHT + PLATFORM_SEPARATION / 2;
  let birds = [];

  while (y < MAX_HEIGHT) {
    if (roll(BIRD_PROBABILITY)) {
      let animation = animations.createAnimation('bird', animationDef);
      let x = Math.random() * (width - BIRD_SPRITE_WIDTH);
      let d = randInt(2) ? 1 : -1;
      birds.push({ x, y, d, s: BIRD_SPEED + randInt(40), a: animation, alive: true });
    }
    y += PLATFORM_SEPARATION;
  }

  return birds;
}

const CLOUD_WIDTH = 100;
const CLOUD_HEIGHT = 60;
const CLOUD_SPEED = 50;

function generateClouds(width) {
  let y = FLOOR;
  let clouds = [];
  while (y < MAX_HEIGHT + 100) {
    y += 150 + randInt(200);
    let x = randInt(width - CLOUD_WIDTH);
    let d = randInt(2) ? 1 : -1;
    let s = 20 + randInt(30);
    clouds.push({ x, y, d, s });
  }
  return clouds;
}

function updateClouds(clouds, width, delta) {
  clouds.forEach(c => {
    c.x += c.d * c.s * delta;
    if (c.x < 0) {
      c.d = 1;
    } else if (c.x > width - CLOUD_WIDTH) {
      c.d = -1;
    }
  });
}

function updateBirds(birds, width, delta) {
  birds.forEach(b => {
    b.x += b.d * b.s * delta;
    if (b.x < 0) {
      b.d = 1;
    } else if (b.x > width - CLOUD_WIDTH) {
      b.d = -1;
    }
  });
}

const ASSETS = {
  cloud: 'cloud.png',
  idle: 'idle.png',
  walk: 'walk.png',
  jump: 'jump.png',
  platform: 'platform.png',
  bird: 'bird.png',
  font: 'font.png',
};

function initState(width) {
  let idleAnimation = animations.createAnimation('idle', {
    width: 78,
    height: 68,
    speed: 1,
    frames: [0],
    loop: true,
  });

  let jumpAnimation = animations.createAnimation('jump', {
    width: 85,
    height: 76,
    speed: 1,
    frames: [0],
    loop: true,
  });

  let birdAnimationDef = {
    width: 216,
    height: 126,
    speed: 28,
    frames: [0, 1, 2, 3, 4, 3, 2, 1],
    loop: true,
  };

  let font = initFont('font', 84);
  let [scoreWidth] = measureText('00000', 15, font);
  return {
    x: width / 2,
    y: FLOOR - PLAYER_HEIGHT / 2,
    score: 0,
    r: 0,
    hit: false,
    scoreWidth,
    radius: PLAYER_WIDTH / 2,
    dy: 0,
    jumping: false,
    camera: 0,
    platforms: generatePlatforms(width),
    clouds: generateClouds(width),
    birds: generateBirds(width, birdAnimationDef),
    facingDir: 1,
    font,
    idleAnimation,
    jumpAnimation,
    currentAnimation: idleAnimation,
    walkAnimation: animations.createAnimation('walk', {
      width: 78,
      height: 68,
      speed: 20,
      frames: [0, 1],
      loop: true,
    }),
  };
}

export function setup({ width, assets, ctx }) {
  assets.load(ASSETS);

  ctx.imageSmoothingEnabled = false;

  return initState(width);
}

function toCameraY(y, camera, height) {
  return height - (y - camera);
}

function inCamera(cameraY, screenHeight, height) {
  return cameraY + height > 0 && cameraY < screenHeight;
}

export function draw(state, { input, ctx, width, height, delta, assets }) {
  if (!assets.loaded) {
    console.log('LOADING');
    return state;
  }

  ctx.fillStyle = 'lightblue';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'maroon';

  let prevY = state.y;
  let prevX = state.x;

  // keyboard
  if (input.right) {
    state.x += delta * SPEED;
  }

  if (input.left) {
    state.x -= delta * SPEED;
  }

  if (input.b2p) {
    state.jumping = true;
    state.dy = JUMP_SPEED;
  }

  // gravity
  state.dy -= delta * GRAVITY;
  state.y += delta * state.dy;

  // if we are moving at certain (horizontal) speed, turn on ledge cheating (add an extra ledge so that
  let dx = (state.x - prevX) / delta;
  let ledgeCheat = Math.abs(dx) > LEDGE_CHEAT_SPEED ? LEDGE_CHEAT : 0;

  ctx.strokeStyle = 'black';
  // detect collision with a platform
  // filter those that are close to the player
  let closePlatforms = state.platforms.filter(p => Math.abs(p.y - state.y) < height);
  if (!state.hit) {
    for (let p of closePlatforms) {
      if (state.x >= p.x - ledgeCheat && state.x <= p.x + p.w + ledgeCheat) {
        if (prevY > p.y && state.y - state.radius < p.y) {
          // Collision
          state.y = p.y + state.radius - 2;
          state.dy = 0;
          state.jumping = false;
          break;
        }
      }
    }
  }

  if (!state.hit && state.y - state.radius < FLOOR) {
    state.y = FLOOR + state.radius;
    state.dy = 0;
    state.jumping = false;
  }

  // mark as falling
  if (state.dy < 0) {
    state.jumping = true;
  }

  // if falling too fast, mark as hit
  if (state.dy < -2400) {
    state.hit = true;
  }

  // update clouds close to player
  updateClouds(
    state.clouds.filter(c => Math.abs(c.y - state.y) < height),
    width,
    delta
  );

  // update birds
  updateBirds(
    state.birds.filter(b => b.alive && Math.abs(b.y - state.y) < height),
    width,
    delta
  );

  // calculate collisions with birds
  let playerCollision = false;
  let playerAttack = false;

  let playerColX = state.x - PLAYER_WIDTH / 2;
  let playerColY = state.y + PLAYER_HEIGHT / 2;

  let closeBirds = state.birds.filter(b => b.alive && Math.abs(b.y - state.y) < 200);

  if (!state.hit) {
    for (let bird of closeBirds) {
      let birdColX = bird.x + BIRD_SPRITE_WIDTH / 2 - BIRD_WIDTH / 2;
      let birdColY = bird.y - BIRD_SPRITE_HEIGHT / 2 + BIRD_HEIGHT / 2;

      if (
        !(
          playerColX + PLAYER_WIDTH < birdColX ||
          playerColX > birdColX + BIRD_WIDTH ||
          playerColY - PLAYER_HEIGHT > birdColY ||
          playerColY < birdColY - BIRD_HEIGHT
        )
      ) {
        playerCollision = bird;

        // If true, the player wins in the collision
        playerAttack = playerColY - PLAYER_HEIGHT / 2 > birdColY - BIRD_HEIGHT / 2;
        break;
      }
    }
  }

  // Resolve collisions
  if (playerCollision) {
    if (playerAttack) {
      // mark hit birds as not alive, give player a boost
      playerCollision.alive = false;
      state.dy = ATTACK_SPEED;
    } else {
      // player was hit
      state.hit = true;
    }
  }

  if (state.hit) {
    state.r += HIT_ROTATION_SPEED * delta;

    // Restart the game if we fell under ground
    if (state.y < -800) {
      console.log('RESTART');
      return initState(width);
    }
  }

  // DRAW

  // draw clouds
  state.clouds.forEach(c => {
    let cloudCameraY = toCameraY(c.y, state.camera, height);
    if (!inCamera(cloudCameraY, height, CLOUD_HEIGHT)) return;

    ctx.drawImage(assets.cloud.image, c.x, cloudCameraY, CLOUD_WIDTH, CLOUD_HEIGHT);
  });

  // draw birds
  state.birds.forEach(b => {
    if (!b.alive) return;
    let birdCameraY = toCameraY(b.y, state.camera, height);
    if (!inCamera(birdCameraY, height, BIRD_HEIGHT)) return;

    animations.drawAnimation(
      b.a,
      b.x,
      birdCameraY,
      BIRD_SPRITE_WIDTH,
      BIRD_SPRITE_HEIGHT,
      assets,
      delta,
      ctx
    );
  });

  // make the camera follow the player
  let distToPlayer = state.camera - state.y + height / 2;
  state.camera = Math.max(Math.trunc(state.camera - distToPlayer * CAMERA_SMOOTHING), 0);

  let playerCameraY = toCameraY(state.y, state.camera, height);

  let flip = false;
  if (state.jumping) {
    state.currentAnimation = state.jumpAnimation;
    if (dx !== 0) {
      flip = dx < 0;
      state.facingDir = flip ? -1 : 1;
    } else {
      flip = state.facingDir === 1 ? false : true;
    }
  } else if (dx !== 0) {
    flip = dx < 0;
    state.facingDir = flip ? -1 : 1;
    state.currentAnimation = state.walkAnimation;
  } else {
    flip = state.facingDir === 1 ? false : true;
    state.currentAnimation = state.idleAnimation;
  }

  ctx.save();
  animations.drawAnimation(
    state.currentAnimation,
    state.x - PLAYER_SPRITE_WIDTH / 2,
    playerCameraY - PLAYER_SPRITE_HEIGHT / 2,
    PLAYER_SPRITE_WIDTH,
    PLAYER_SPRITE_HEIGHT,
    assets,
    delta,
    ctx,
    flip,
    state.r * delta
  );
  ctx.restore();

  ctx.strokeStyle = 'black';
  ctx.lineWidth = 4;

  let floorCameraY = toCameraY(FLOOR, state.camera, height);

  if (inCamera(floorCameraY, height, 4)) {
    ctx.beginPath();
    ctx.moveTo(0, floorCameraY);
    ctx.lineTo(width, floorCameraY);
    ctx.stroke();

    ctx.fillStyle = 'green';
    ctx.fillRect(0, floorCameraY, width, height);
  }
  closePlatforms.forEach(p => {
    let cameraY = toCameraY(p.y, state.camera, height);
    if (!inCamera(cameraY, height, 20)) return;

    ctx.drawImage(assets.platform.image, p.x, cameraY, PLATFORM_WIDTH, PLATFORM_HEIGHT);
  });

  // Calculate score
  state.score = Math.trunc(Math.max(state.y - FLOOR - PLAYER_HEIGHT / 2, state.score));
  let stateStr = pad(state.score, 5);

  // TEST TEXT DRAWING
  drawText(stateStr, width - state.scoreWidth, 0, 15, state.font, ctx, assets);

  return state;
}

function pad(n, w) {
  let s = String(n);
  while (s.length < w) {
    s = '0' + s;
  }
  return s;
}
