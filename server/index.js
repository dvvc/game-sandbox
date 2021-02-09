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
 * Start a WS Server, then watch for changes in watchDir and rebuild the bundle accordingly
 *
 */
function runFileWatcher(server, watchDir, outputDir) {
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

  let watcher = chokidar.watch(watchDir, {
    ignoreInitial: true,
    ignored: filePath => path.basename(filePath).match(/^(\.|#)/),
  });

  watcher.on('all', (event, filePath) => {
    let relative = path.relative(watchDir, filePath);
    console.log('WATCH', event, relative);

    // No client has connected with a valid entrypoint yet, do not rebuild
    if (!entryPoint) {
      console.log(`No entry point defined, skipping update`);
      return;
    }

    // Otherwise, rebuild and notify
    rebuildBundle(wss, entryPoint, outputDir);
  });
}

/**
 * Ensures the server options are valid
 *
 */
function validateOptions({ baseDir, outputDir, watchDir }) {
  if (!baseDir) {
    throw new Error(`Missing baseDir`);
  }

  if (!outputDir) {
    throw new Error(`Missing outputDir`);
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
 *   watch:     (Optional) Whether to watch for file changes
 *   watchDir:  (Optional) Directory to monitor for changes
 *   port:      (Optional) Port to bind to
 *
 */
function run(args) {
  validateOptions(args);

  let { baseDir, outputDir, watchDir } = args;

  // Create the output dir if it doesn't exist
  fs.mkdirSync(outputDir, { recursive: true });

  const buildServer = serveStatic(outputDir);
  const rootServer = serveStatic(baseDir);

  // Convenience endpoint to serve the dist library
  const libPath = path.resolve('node_modules/game-sandbox/dist');
  const libServer = serveStatic(libPath);

  const server = http.createServer((req, res) => {
    const done = finalHandler(req, res, { onerror });

    if (req.url.startsWith('/build')) {
      // TODO: This is kind of sloppy
      req.url = req.url.substr(6);
      return buildServer(req, res, done);
    } else if (req.url.startsWith('/game-sandbox.js')) {
      return libServer(req, res, done);
    }

    return rootServer(req, res, done);
  });

  // File watcher
  if (args.watch) {
    runFileWatcher(server, watchDir, outputDir);
  }

  server.listen(args.port || 8080, () => {
    const address = server.address();
    console.log(`Server listening at ${address.address}:${address.port}`);
    console.log(`Serving files from ${baseDir}`);
    console.log(`Watching changes in ${watchDir}`);
    console.log(`Generating output in ${outputDir}`);
    console.log(`Serving game-sandbox.js from ${libPath}`);
    console.log();
  });
}

module.exports = { run };
