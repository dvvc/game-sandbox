const http = require('http');
const serveStatic = require('serve-static');
const finalHandler = require('finalhandler');
const ws = require('ws');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

// TODO: Fix this in some way? Do we have a single entry point? One per connection?
let entryPoint = undefined;

function onerror(err) {
  console.error(err.stack || err.toString());
}

/**
 * Given a client request with the form "wss://host?module=./entrypoint.js", returns the absolute
 * path "<watchDir>/entrypoint.js"
 */
function getClientEntryPoint(url, watchDir) {
  let m = url.match(/.*\?module=([^&]+)$/);
  if (!m || !m[1]) throw new Error(`Invalid request ${url}`);

  return path.resolve(watchDir, m[1]);
}

/**
 * Rebuild the output bundle and send an update to all clients
 *
 */
async function rebuildBundle(wss, entryPoint, outputDir) {
  let outputFile = path.resolve(outputDir, 'out.js');

  try {
    console.time('esbuild');
    await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      outfile: outputFile,
      sourcemap: true,
      format: 'esm',
      incremental: true,
      external: ['/game-sandbox.js'],
    });
    console.timeEnd('esbuild');

    wss.clients.forEach(ws => {
      ws.send(`rebuild:./build/out.js`);
    });
  } catch (e) {
    console.timeEnd('esbuild');
    console.log('Error building module', e.message);
  }
}

/**
 * Notify clients that an asset has changed
 *
 */
async function notifyAssetChanged(wss, assetPath) {
  wss.clients.forEach(ws => {
    ws.send(`asset:${assetPath}`);
  });
}

/**
 * Start a WS Server, then watch for changes in watchDir and assetsDir. Then rebuild the bundle accordingly
 *
 */
function runFileWatcher(server, watchDir, outputDir, assetsDir) {
  // Initialize the WS server
  const wss = new ws.Server({ server });
  wss.on('connection', (ws, req) => {
    entryPoint = getClientEntryPoint(req.url, watchDir);

    console.log(`New connection. Clients: ${Array.from(wss.clients).length}`);

    // FIXME: We are rebuilding every time there's a new connection. Also, we could be changing the
    // entryPoint, which doesn't make sense?
    rebuildBundle(wss, entryPoint, outputDir);
  });

  wss.on('close', ws => {
    console.log(`CLOSE. Clients: ${wss.clients.indexOf(ws)}`);
  });

  wss.on('error', e => {
    console.log('ERROR', e);
  });

  let watcher = chokidar.watch([watchDir, assetsDir], {
    ignoreInitial: true,
    ignored: filePath => path.basename(filePath).match(/^(\.|#)/),
  });

  watcher.on('all', (event, filePath) => {
    // FIXME: This could cause problems if one directory is inside the other
    if (filePath.startsWith(watchDir)) {
      let relative = path.relative(watchDir, filePath);
      console.log(`[WATCHER:CODE:${event.toUpperCase()}] ${relative}`);
      // No client has connected with a valid entrypoint yet, do not rebuild
      if (!entryPoint) {
        console.log(`No entry point defined, skipping update`);
        return;
      }

      // Otherwise, rebuild and notify
      rebuildBundle(wss, entryPoint, outputDir);
    } else if (filePath.startsWith(assetsDir)) {
      let relative = path.relative(assetsDir, filePath);
      console.log(`[WATCHER:ASSET:${event.toUpperCase()}] ${relative}`);

      // We need to wait some time before notifying the clients because some asset editors
      // (e.g. GIMP) may take a long time between the moment the asset file is first modified and
      // the time it has saved everything. If we trigger the notification immediately, the client
      // may try to load the asset before it's in a valid state.
      setTimeout(() => {
        notifyAssetChanged(wss, relative);
      }, 500);
    } else {
      throw new Error(`Changed file is not in "watch-dir" or in "assets-dir"`);
    }
  });
}

/**
 * Ensures the server options are valid
 *
 */
function validateOptions({ baseDir, outputDir, watchDir, assetsDir }) {
  if (!baseDir) {
    throw new Error(`Missing baseDir`);
  }

  if (!outputDir) {
    throw new Error(`Missing outputDir`);
  }

  if (!assetsDir) {
    throw new Error(`Missing assetsDir`);
  }

  if (!watchDir) {
    throw new Error(`Missing watchDir`);
  }

  if (!path.isAbsolute(baseDir)) {
    throw new Error(`Base dir must be absolute`);
  }

  if (!path.isAbsolute(outputDir)) {
    throw new Error(`Output dir must be absolute`);
  }

  if (!path.isAbsolute(assetsDir)) {
    throw new Error(`Assets dir must be absolute`);
  }

  if (!path.isAbsolute(watchDir)) {
    throw new Error(`Watch dir must be absolute`);
  }

  let stats;
  try {
    stats = fs.statSync(baseDir);
  } catch (e) {
    console.error(`Could not find directory '${baseDir}'\n${e.message}`);
    process.exit(1);
  }

  if (!stats.isDirectory()) {
    console.error(`Could not open ${baseDir}, or not a valid directory`);
    process.exit(1);
  }

  try {
    stats = fs.statSync(assetsDir);
  } catch (e) {
    console.error(`Could not find directory '${assetsDir}'\n${e.messsage}`);
    process.exit(1);
  }

  if (!stats.isDirectory()) {
    console.error(`Could not open ${assetsDir}, or not a valid directory`);
    process.exit(1);
  }

  if (watchDir !== baseDir) {
    try {
      stats = fs.statSync(watchDir);
    } catch (e) {
      console.error(`Could not find directory '${watchDir}'\n${e.message}`);
      process.exit(1);
    }

    if (!stats.isDirectory()) {
      console.error(`Could not open ${watchDir}, or not a valid directory`);
      process.exit(1);
    }
  }
}

/**
 * Start the server. Arguments:
 *
 *   baseDir:   Where to serve files from
 *   outputDir: Where to create the output bundle
 *   assetsDir: Where the assets are stored
 *   watch:     (Optional) Whether to watch for file changes
 *   watchDir:  (Optional) Directory to monitor for changes
 *   port:      (Optional) Port to bind to
 *
 */
function run(args) {
  validateOptions(args);

  let { baseDir, outputDir, watchDir, assetsDir } = args;

  // Create the output dir if it doesn't exist
  fs.mkdirSync(outputDir, { recursive: true });

  const buildServer = serveStatic(outputDir);
  const rootServer = serveStatic(baseDir);
  const assetsServer = serveStatic(assetsDir);

  // Convenience endpoint to serve the dist library
  const libPath = path.resolve('node_modules/game-sandbox/dist');
  const libServer = serveStatic(libPath);

  const server = http.createServer((req, res) => {
    const done = finalHandler(req, res, { onerror });

    if (req.url.startsWith('/build')) {
      // TODO: This is kind of sloppy
      req.url = req.url.substr(6);
      return buildServer(req, res, done);
    } else if (req.url.startsWith('/assets')) {
      // TODO: This is kind of sloppy
      req.url = req.url.substr(7);
      return assetsServer(req, res, done);
    } else if (req.url.startsWith('/game-sandbox.js')) {
      return libServer(req, res, done);
    }

    return rootServer(req, res, done);
  });

  // File watcher
  if (args.watch) {
    runFileWatcher(server, watchDir, outputDir, assetsDir);
  }

  server.listen(args.port || 8080, () => {
    const address = server.address();
    console.log(`Server listening at ${address.address}:${address.port}`);
    console.log(`Serving files from ${baseDir}`);
    console.log(`Serving assets from ${assetsDir}`);
    console.log(`Watching changes in ${watchDir}`);
    console.log(`Generating output in ${outputDir}`);
    console.log(`Serving game-sandbox.js from ${libPath}`);
    console.log();
  });
}

module.exports = { run };
