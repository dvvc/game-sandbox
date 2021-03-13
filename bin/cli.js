#!/usr/bin/env node

const meow = require('meow');
const path = require('path');

const server = require('../server/index.js');
const init = require('../cli/init.js');

const VALID_COMMANDS = ['init', 'start', 'help'];
const DEFAULT_SERVER_PORT = 8080;

const USAGE = `
Usage: game-sandbox <command> [options]

Commands
  init <name>              Creates a basic project skeleton under directory <name>
  start                    Starts the development server
  help                     Show this help

General options
  -h, --help               Show this help
  -v, --version            Show the program version

Start options
  -d, --base-dir <path>    Serve files under path
  -o, --output <path>      Generate output files at path
  -a, --assets-dir <path>  Where assets are stored
  -w, --watch              Watch for changes (default: false)
      --watch-dir <path>   Directory where to watch file changes (default: base-dir)
  -p, --port               Port to listen to (default: ${DEFAULT_SERVER_PORT})

Init options
  --dev                    [Development only] Add a "watch" script to package.json
`;

function printUsageAndExit(code) {
  console.error(USAGE);
  process.exit(code);
}

function makeAbsoluteToCWD(pathStr) {
  return path.isAbsolute(pathStr) ? pathStr : path.resolve(process.cwd(), pathStr);
}

const cli = meow(USAGE, {
  allowUnknownFlags: false,
  flags: {
    dev: {
      type: 'boolean',
    },
    port: {
      alias: 'p',
    },
    watch: {
      alias: 'w',
      isRequired: flags => !!flags.watchDir,
    },
    watchDir: {
      type: 'string',
    },
    baseDir: {
      alias: 'd',
      isRequired: (_, input) => input[0] === 'start',
    },
    assetsDir: {
      alias: 'a',
    },
    outputDir: {
      alias: 'o',
      isRequired: (_, input) => input[0] === 'start',
    },
    help: {
      alias: 'h',
    },
    version: {
      alias: 'v',
    },
  },
});

if (cli.input.length < 1) {
  console.error(`Missing command.`);
  printUsageAndExit(1);
}

let command = cli.input[0];

if (!VALID_COMMANDS.includes(command)) {
  console.error(`Invalid command: ${command}.`);
  printUsageAndExit(1);
}

if (cli.flags.help || command === 'help') {
  cli.showHelp(0);
}

if (cli.flags.version) {
  cli.showVersion(0);
}

let numericPort = DEFAULT_SERVER_PORT;
if (cli.flags.port) {
  numericPort = parseInt(cli.flags.port);
  if (Number.isNaN(numericPort)) {
    console.error(`Invalid port: ${cli.flags.port}`);
    printUsageAndExit(1);
  }
}

if (command === 'start') {
  let absoluteBaseDir = makeAbsoluteToCWD(cli.flags.baseDir);
  let absoluteOutputDir = makeAbsoluteToCWD(cli.flags.outputDir);
  let absoluteAssetsDir = makeAbsoluteToCWD(cli.flags.assetsDir);
  let absoluteWatchDir = cli.flags.watchDir
    ? makeAbsoluteToCWD(cli.flags.watchDir)
    : absoluteBaseDir;

  server.run({
    port: numericPort,
    watch: cli.flags.watch,
    watchDir: absoluteWatchDir,
    baseDir: absoluteBaseDir,
    outputDir: absoluteOutputDir,
    assetsDir: absoluteAssetsDir,
  });
} else if (command === 'init') {
  let projectName = cli.input[1];
  if (!projectName) {
    console.error(`Missing project name`);
    printUsageAndExit(1);
  }

  let absoluteProjectName = makeAbsoluteToCWD(projectName);
  try {
    init(absoluteProjectName, cli.flags.dev);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
} else {
  console.error('NOT IMPLEMENTED YET!');
}
