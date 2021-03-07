const COMMAND_BG = '#555555';
const COMMAND_FG = '#eeeeee';

/**
 * Initialize the HUD, register callbacks for available commands, and create the HTML code
 *
 * The `hudCommands` parameter is an array of objects with the type:
 *
 * {label: <string>, action: <callback>},
 *
 * where `label` is a human-readable string tha will be displayed in the hud, and `action` is a
 * callback that will be executed when the corresponding command is selected. The callback receives
 * as parameters the frame's state before it's been drawn and the environment object. The callback
 * must return the new updated state.
 *
 */
export function initHud(canvasBoundingBox, hudCommands) {
  let hudElement = buildHudElement(canvasBoundingBox, hudCommands);
  document.body.appendChild(hudElement);

  return {
    active: false,
    selectedCommand: 0,
    element: hudElement,
    commands: hudCommands,
  };
}

function setHudBoundingBox(hudElement, boundingBox) {
  hudElement.style.top = boundingBox.top + 'px';
  hudElement.style.left = boundingBox.left + 'px';
  hudElement.style.width = boundingBox.width + 'px';
  hudElement.style.height = boundingBox.height + 'px';
}

function buildHudElement(boundingBox, hudCommands) {
  let hudElement = document.createElement('div');
  hudElement.style.position = 'absolute';
  setHudBoundingBox(hudElement, boundingBox);
  hudElement.style.backgroundColor = COMMAND_BG;
  hudElement.style.opacity = 0;
  hudElement.style.transition = 'opacity 0.3s ease';

  let hudCommandList = document.createElement('ul');
  hudCommandList.style.color = COMMAND_FG;
  hudCommandList.style.listStyle = 'none';
  hudCommandList.style.padding = '0 20px';
  hudCommandList.style.marginTop = '40px';
  hudCommandList.style.fontFamily = 'monospace';

  hudCommands.forEach(cmd => {
    let commandItem = document.createElement('li');
    commandItem.innerHTML = cmd.label;
    commandItem.style.lineHeight = 1.6;
    commandItem.style.padding = '2px 10px';
    hudCommandList.appendChild(commandItem);
  });

  // Highlight the first element
  hudCommandList.children.item(0).style.backgroundColor = COMMAND_FG;
  hudCommandList.children.item(0).style.color = COMMAND_BG;

  hudElement.appendChild(hudCommandList);

  return hudElement;
}

export function toggleHud(hud) {
  hud.active = !hud.active;
  // This will not be necessary once we position the HUD HTML correctly, and it's a pain to pass the
  // canvasBoundingBox around all the time, commenting for now
  // if (hud.active) {
  //   setHudBoundingBox(hud.element, canvasBoundingBox);
  // }
  hud.element.style.opacity = Number(hud.active);
}

function updateHudCommandSelection(hud, input) {
  // update the selected command if the arrows were pressed
  let newCommandIndex = hud.selectedCommand;
  let commands = hud.commands;

  if (input.downp) {
    newCommandIndex = (hud.selectedCommand + 1) % commands.length;
  } else if (input.upp) {
    newCommandIndex = (hud.selectedCommand - 1 + commands.length) % commands.length;
  }

  if (newCommandIndex !== hud.selectedCommand) {
    let commandList = hud.element.firstChild;

    // remove background of old command
    commandList.children.item(hud.selectedCommand).style.backgroundColor = null;
    commandList.children.item(hud.selectedCommand).style.color = COMMAND_FG;

    // set background of new command
    commandList.children.item(newCommandIndex).style.backgroundColor = COMMAND_FG;
    commandList.children.item(newCommandIndex).style.color = COMMAND_BG;

    hud.selectedCommand = newCommandIndex;
  }
}

export function processHud(state, env) {
  let hud = env.engine.hud;
  let selectedCommand = updateHud(hud, env.engine.internalInput, env.input);

  // If a command was selected, execute that command
  if (selectedCommand !== undefined) {
    let callback = hud.commands[hud.selectedCommand].action;
    return callback(state, env);
  }

  // Otherwise, just return the same updatedState
  return state;
}

function updateHud(hud, internalInput, input) {
  // check if the current command has been selected
  if (internalInput.enterp) {
    return hud.selectedCommand;
  }

  // Otherwise, update the selection if necessary
  updateHudCommandSelection(hud, input);
}
