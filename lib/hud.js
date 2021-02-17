const HUD_COMMANDS = ['Toggle FPS', 'Take state snapshot', 'Load state snapshot'];

const COMMAND_BG = '#555555';
const COMMAND_FG = '#eeeeee';

function setHudBoundingBox(hudElement, boundingBox) {
  hudElement.style.top = boundingBox.top + 'px';
  hudElement.style.left = boundingBox.left + 'px';
  hudElement.style.width = boundingBox.width + 'px';
  hudElement.style.height = boundingBox.height + 'px';
}

function buildHudElement(boundingBox) {
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

  HUD_COMMANDS.forEach(cmd => {
    let commandItem = document.createElement('li');
    commandItem.innerHTML = cmd;
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

/**
 * Initialize the HUD, create the HTML code
 *
 */
export function initHud(canvasBoundingBox) {
  let hudElement = buildHudElement(canvasBoundingBox);
  document.body.appendChild(hudElement);

  return {
    active: false,
    selectedCommand: 0,
    element: hudElement,
  };
}

export function toggleHud(hud, canvasBoundingBox) {
  hud.active = !hud.active;
  if (hud.active) {
    setHudBoundingBox(hud.element, canvasBoundingBox);
  }
  hud.element.style.opacity = Number(hud.active);
}

function updateHudCommandSelection(hud, input) {
  // update the selected command if the arrows were pressed
  let newCommandIndex = hud.selectedCommand;

  if (input.downp) {
    newCommandIndex = (hud.selectedCommand + 1) % HUD_COMMANDS.length;
  } else if (input.upp) {
    newCommandIndex = (hud.selectedCommand - 1 + HUD_COMMANDS.length) % HUD_COMMANDS.length;
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

export function updateHud(hud, input) {
  // check if the current command has been selected
  if (input.enterp) {
    return hud.selectedCommand;
  }

  // Otherwise, update the selection if necessary
  updateHudCommandSelection(hud, input);
}
