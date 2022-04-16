/**
 * Update the animation. Returns if the animation is complete
 *
 */
export function updateAnimation(animation, delta) {
  animation.time += delta;

  let complete = false;
  if (animation.time > animation.timePerFrame) {
    animation.time = 0;

    // We spent enough time on the frame. If we are not on the last frame, advance to the next
    if (animation.currentFrame < animation.frames.length - 1) {
      animation.currentFrame++;
    } else {
      // We are at the last frame. Go back to the beginning if we are looping, or stay at the last
      // otherwise
      complete = true;
      if (animation.loop) {
        animation.currentFrame = 0;
      }
    }
  }

  return complete;
}

/**
 * Draw the current state of an animation
 *
 * parameters:
 *  - animation: The animation object, as returned by `createAnimation`
 *  - x, y:      The coordinates where to draw the animation
 *  - width:     The destination image width
 *  - height:    The destination image height
 *  - assets:    The assets object
 *  - ctx:       The context object
 *  - flip:      Wheter to draw this animation flipped
 */
// FIXME: Can we reduce the number of computations every draw cycle?
export function drawAnimation(
  animation,
  x,
  y,
  width,
  height,
  assets,
  ctx,
  flip = false,
  rotation = 0
) {
  let asset = assets[animation.assetName];
  if (!asset || !asset.loaded) {
    throw new Error(`Asset ${animation.assetName} not loaded!!!`);
  }

  let columns = asset.image.width / animation.width;

  let frameIndex = animation.frames[animation.currentFrame];

  let sourceY = Math.trunc(frameIndex / columns) * animation.height; //96;
  let sourceX = (frameIndex % columns) * animation.width; //96;

  if (flip) {
    x += width;
  }

  ctx.save();
  ctx.translate(x, y);
  if (rotation) {
    ctx.rotate(rotation);
  }
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
