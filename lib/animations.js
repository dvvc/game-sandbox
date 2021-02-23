/**
 * Draw the current state of an animation, and update it
 *
 * parameters:
 *  - animation: The animation object, as returned by `createAnimation`
 *  - x, y:      The coordinates where to draw the animation
 *  - width:     The destination image width
 *  - height:    The destination image height
 *  - assets:    The assets object
 *  - delta:     The time passed since last frame draw
 *  - ctx:       The context object
 *  - flip:      Wheter to draw this animation flipped
 */
// FIXME: Can we reduce the number of computations every draw cycle?
export function drawAnimation(animation, x, y, width, height, assets, delta, ctx, flip = false) {
  let asset = assets[animation.assetName];
  if (!asset || !asset.loaded) {
    throw new Error(`Asset ${animation.assetName} not loaded!!!`);
  }

  animation.time += delta;
  // FIXME: This assumes looping always
  if (animation.time > animation.timePerFrame) {
    animation.time = 0;
    animation.currentFrame = (animation.currentFrame + 1) % animation.frames.length;
  }

  let columns = asset.image.width / animation.width;

  let sourceY = Math.trunc(animation.currentFrame / columns) * animation.height; //96;
  let sourceX = (animation.currentFrame % columns) * animation.width; //96;

  if (flip) {
    x += width;
  }

  ctx.save();
  ctx.translate(x, y);
  if (flip) {
    ctx.scale(-1, 1);
  }

  ctx.drawImage(
    asset.image,
    sourceX,
    sourceY,
    animation.width,
    animation.height,
    0,
    0,
    width,
    height
  );

  ctx.restore();
}

/**
 * Creates a new animation object that can be stored in the state
 */
export function createAnimation(assetName, { width, height, speed, loop, frames }) {
  return {
    currentFrame: 0,
    time: 0,
    assetName,
    loop,
    width,
    height,
    frames,
    timePerFrame: 1 / speed,
  };
}