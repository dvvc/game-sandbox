const http = require('http');
const serveStatic = require('serve-static');
const finalHandler = require('finalhandler');
const ws = require('ws');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const argv = require('minimist')(process.argv.slice(2));

// TODO: Fix this in some way? Do we have a single entry point? One per connection?
let entryPoint = undefined;

const USAGE = `Usage: ${process.argv[1]} --baseDir [-w] [-h]

 -h               Show this help and exit
 -w               Watch for changes
 --baseDir path   Serve files under path
`;
const ROOT_DIR = path.resolve(__dirname, '..');
const BUILD_DIR = path.resolve(ROOT_DIR, 'build');
const BUNDLE_FILE = path.resolve(BUILD_DIR, 'out.js');

function onerror(err) {
  console.error(err.stack || err.toString());
}

function printUsageAndExit(code) {
  console.log(USAGE);
  process.exit(code);
}

function getClientEntryPoint(url, baseDir) {
  let m = url.match(/.*\?module=([^&]+)$/);
  if (!m || !m[1]) throw new Error(`Invalid request ${url}`);

  return path.resolve(baseDir, m[1]);
}

async function rebuildBundle(entryPoint, wss) {
  try {
    console.time('esbuild');
    await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      outfile: BUNDLE_FILE,
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

function runFileWatcher(server, baseDir) {
  // Initialize the WS server
  const wss = new ws.Server({ server });
  wss.on('connection', (ws, req) => {
    entryPoint = getClientEntryPoint(req.url, baseDir);

    console.log(`New connection. Clients: ${Array.from(wss.clients).length}`);

    // Every time we get a new
    // FIXME: We are rebuilding every time there's a new connection. Also, we could be changing the
    // entryPoint, which doesn't make sense?
    rebuildBundle(entryPoint, wss);
  });

  wss.on('close', ws => {
    console.log(`CLOSE. Clients: ${wss.clients.indexOf(ws)}`);
  });

  wss.on('error', e => {
    console.log('ERROR', e);
  });

  let watcher = chokidar.watch(baseDir, {
    ignoreInitial: true,
    ignored: filePath => {
      let basename = path.basename(filePath);
      // TODO: Temporary: do not send updates when index.js changes
      // (Because we won't know the name of this file?)
      return basename !== 'index.js' && basename.match(/^(\.|#)/);
    },
  });
  watcher.on('all', (event, filePath) => {
    let relative = path.relative(baseDir, filePath);
    console.log('WATCH', event, relative);

    // No client has connected with a valid entrypoint yet, do not rebuild
    if (!entryPoint) {
      console.log(`No entry point defined, skipping update`);
      return;
    }

    // Otherwise, rebuild and notify
    rebuildBundle(entryPoint, wss);
  });
}

(function run() {
  if (!argv.baseDir) {
    printUsageAndExit(1);
  }

  if (argv.h) {
    printUsageAndExit(0);
  }

  const baseDir = path.isAbsolute(argv.baseDir)
    ? argv.baseDir
    : path.resolve(ROOT_DIR, argv.baseDir);

  let stats;
  try {
    stats = fs.statSync(baseDir);
  } catch (e) {
    console.error(`Could not find baseDir: ${e.message}`);
    process.exit(1);
  }

  if (!stats.isDirectory()) {
    console.error(`Could not open ${baseDir}, or not a valid directory`);
    process.exit(1);
  }

  // Create the build dir if it doesn't exist
  fs.mkdirSync(BUILD_DIR, { recursive: true });

  const buildServer = serveStatic(BUILD_DIR);
  const rootServer = serveStatic(baseDir);

  const server = http.createServer((req, res) => {
    const done = finalHandler(req, res, { onerror });

    if (req.url.startsWith('/build')) {
      // TODO: This is kind of sloppy
      req.url = req.url.substr(6);
      return buildServer(req, res, done);
    }

    return rootServer(req, res, done);
  });

  // File watcher
  if (argv.w) {
    runFileWatcher(server, baseDir);
  }

  server.listen(process.env.PORT || 8080, () => {
    const address = server.address();
    console.log(`Server listening at ${address.address}:${address.port}`);
    console.log(`Serving files from ${baseDir}`);
  });
})();
