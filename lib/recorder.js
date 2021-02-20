const MAX_RECORDER_SIZE = 60 * 60 * 5; // 60 FPS * 60 secs/min * 5 mins

export function initRecorder() {
  return {
    recording: false,
    playing: false,
    currentInput: 0,
    stateSnapshot: undefined,
    inputHistory: [],
  };
}

export function startRecording(env, updatedState) {
  let recorder = env.engine.recorder;
  recorder.recording = true;
  recorder.stateSnapshot = updatedState;
  recorder.playing = false;
  recorder.currentInput = 0;
  recorder.stateSnapshot = { ...updatedState }; // FIXME: This is a shallow copy!
  recorder.inputHistory = [];
}

export function playRecording(env) {
  let recorder = env.engine.recorder;
  stopRecording(env);

  recorder.playing = true;
  recorder.currentInput = 0;
}

export function stopRecording(env) {
  let recorder = env.engine.recorder;
  recorder.recording = false;
}

/**
 * Returns the next entry in the recording's input history and this frame's state, which could be
 * the same as `currentState`, or the initial recorded snapshot if it has reached the beginning of
 * the history.
 *
 */
export function playInputHistory(recorder, currentState) {
  if (!recorder.playing) {
    throw new Error(`Tried to play input history, but recorder is not playing`);
  }

  if (recorder.inputHistory.length === 0) {
    throw new Error(`Recorder input history is empty!!`);
  }

  let input = recorder.inputHistory[recorder.currentInput];
  let state = currentState;

  // if we reached the first input entry, reset the state
  if (recorder.currentInput === 0) {
    state = { ...recorder.stateSnapshot };
  }

  // increase the played input
  recorder.currentInput = (recorder.currentInput + 1) % recorder.inputHistory.length;
  return { state, input };
}

export function recordInput(recorder, input) {
  if (!recorder.recording) {
    throw new Error(`Tried to record input, but recorder is not recording`);
  }

  recorder.inputHistory.push({ ...input });

  // FIXME: Do something about this
  if (recorder.inputHistory.length > MAX_RECORDER_SIZE) {
    throw new Error(`Max record input exceeded!!`);
  }
}

// export function processRecording(env) {}
