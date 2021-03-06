// TODO: Move to sandbox lib
export function createTimer(period, loop) {
  return {
    loop,
    period,
    delta,
  };
}

export function updateTimer(timer, delta) {
  let newDelta = timer.delta + delta;
  let completed = newDelta >= period;

  if (completed) {
    if (timer.loop) {
      timer.delta = 0;
    }
  } else {
    timer.delta = newDelta;
  }

  return completed;
}
