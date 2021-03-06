const path = require('path');
const fs = require('fs');

const parentPackageJson = require('../package.json');

const PACKAGE_JSON = `{
  "name": "$NAME$",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "start": "game-sandbox start -w -d src --watch-dir src/game -o dist -a assets"
  },
  "dependencies": {
    "game-sandbox": "^$PKG_VERSION$"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}`;

const INDEX_HTML = `<!doctype html>
<html>
  <head>
    <title>$NAME$</title>
    <meta charset="utf-8" />
    <script  type="module">
     import { runGame } from '/game-sandbox.js';

     runGame({
       width: 400,
       height: 400,
       canvasId: 'main',
       moduleUrl: './index.js',
     });

    </script>
    <style>
     html, body {
       margin: 0;
       padding: 0;
       width: 100%;
       height: 100%;
     }

     body {
       background-color: #3f3f3f;
     }

     canvas {
       background-color: #ffffff;
       position: absolute;
       left: 50%;
       top: 50%;
       transform: translate(-50%,-50%);
     }
    </style>
  </head>
  <body>
    <canvas id="main"></canvas>
  </body>
</html>`;

const INDEX_JS = `const SPEED = 200;
const COLOR = '#77EEAA';

export function setup({ width, height }) {
  return {
    x: Math.trunc(width / 3),
    y: Math.trunc(height / 2),
    radius: 20,
    dx: 1,
    dy: 1,
  };
}

export function draw(state, { delta, width, height, ctx }) {
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  let speed = SPEED * delta;

  let x = state.x + speed * state.dx;
  let y = state.y + speed * state.dy;

  let dx = x >= width || x <= 0 ? state.dx * -1 : state.dx;
  let dy = y >= height || y <= 0 ? state.dy * -1 : state.dy;

  ctx.fillStyle = COLOR;
  ctx.beginPath();
  ctx.arc(state.x, state.y, state.radius, 0, Math.PI * 2);
  ctx.fill();

  return {
    ...state,
    x,
    y,
    dx,
    dy,
  };
}
`;

/**
 * Creates a new project with some basic files
 *
 */
module.exports = function init(absoluteProjectName) {
  if (!path.isAbsolute(absoluteProjectName)) {
    throw new Error(`Project name must be absolute`);
  }

  // Ensure the project directory does not exist
  let exists = true;
  try {
    fs.accessSync(absoluteProjectName);
  } catch (_) {
    exists = false;
  }

  if (exists) {
    throw new Error(`Directory ${absoluteProjectName} already exists!`);
  }

  // Create the directory
  fs.mkdirSync(absoluteProjectName, { recursive: true });

  // Add a package.json file
  let packageJson = path.resolve(absoluteProjectName, 'package.json');
  let projectName = path.basename(absoluteProjectName);
  let packageVersion = parentPackageJson.version;

  let packageJsonContents = PACKAGE_JSON.replace('$NAME$', projectName).replace(
    '$PKG_VERSION$',
    packageVersion
  );

  fs.writeFileSync(packageJson, packageJsonContents, 'utf8');

  // Create source and asset directories
  let sourceDir = path.resolve(absoluteProjectName, 'src/game');
  let assetsDir = path.resolve(absoluteProjectName, 'assets');

  fs.mkdirSync(sourceDir, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });

  // Create source files
  let indexHtml = path.resolve(absoluteProjectName, 'src/index.html');
  let indexHtmlContents = INDEX_HTML.replace('$NAME$', projectName);
  fs.writeFileSync(indexHtml, indexHtmlContents, 'utf8');

  let indexJs = path.resolve(sourceDir, 'index.js');
  let indexJsContents = INDEX_JS;
  fs.writeFileSync(indexJs, indexJsContents);
};
