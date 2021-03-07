
# Game Sandbox

A live editing framework for game prototyping in JavaScript.

*This project is still in a very early stage! Things may&mdash;and will&mdash;break*

# Features

  - Hot code reloading.
  - Maintains state between reloads.
  - Lightweight game utils library.


# Installation

```sh
$ npm install game-sandbox
```


# Quick Start

You can get started quickly by installing `game-sandbox` globally and generating an initial skeleton project:

```sh
$ npm install -g game-sandbox
$ game-sandbox init mygame
$ cd mygame
$ npm install
$ npm run start
```

Point your browser to `http://localhost:8080` to run the sample project. Then, open `src/game/index.js` in your favorite editor and start editing it. The changes will be visible immediately after they are saved in the browser window.

# Documentation

The Game Sandbox live-reload server is started via a Command Line Interface. Running `game-sandbox help` displays its documentation:

```
$ game-sandbox help

  Game Sandbox: A game prototyping framework

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
    -p, --port               Port to listen to (default: 8080)
```

Once started, the server serves all files under the directory specified in `base-dir`, such as the `index.html`, and also watches all files under the `watch-dir` directory and tells the browser to reload the game code.

The `runGame()` function is the entry point of your game. It is called like this:

```js
    import { runGame } from '/game-sandbox';

    runGame({
      width: 400,
      height: 400,
      canvasId: 'canvas',
      moduleUrl: './index.js',
    });
```

Where `width` and `height` are the game's canvas dimensions, `canvasId` is the `id` attribute of the canvas element in your html, and `moduleUrl` is the starting point of your game, relative to the directory passed to `watch-dir`. The file your specify in `moduleUrl` must export two functions, `setup()` and `draw()`.

When a file under `watch-dir` changes, the server generates a bundle with the game code and notifies the browser. The browser then reloads the `draw()` function between frames so your game is updated seamlessly.

## How it works

Game Sandbox is inspired by [Reprocessing](https://github.com/Schmavery/reprocessing), which in turn is influenced by [Processing](https://processing.org/). The main idea is the game state is separated from the game logic, which helps performing reloads without resetting the game.

Before the main loop is executed, the `setup()` function returns the initial game state, and then the `draw()` function returns an updated state every frame. The game state is just an object with
attributes that represent your game, such as the player's position, etc.

The `draw()` function has two parameters, the current game state and an `Environment` object, which contains attributes such as the game width and height, a reference to the canvas context, or the
user input.

### Example

```js
    export function setup(env) {
      return {
        x: 100,
        y: 100,
        speed: 10,
      };
    }

    export function draw(state, env) {

      let { input, ctx, width, height } = env;

      if (input.right) {
        state.x = Math.min(width, state.x + state.speed);
      }

      if (input.left) {
        state.x = Math.max(0, state.x - state.speed);
      }

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(state.x, state.y, 10, 0, Math.PI * 2)
      ctx.fill()


      return state;
    }
```

# Running the examples

To run the examples, clone the project from github, then go to the examples directory, npm install and run them. For example:

```sh

$ git clone https://github.com/dvvc/game-sandbox.git
$ cd game-sandbox/examples/jumpy
$ npm install
$ npm run start

```

Then point your browser to `http://localhost:8080` and edit `game-sandbox/examples/jumpy/src/game/index.js`

# Advanced usage

## Assets

Game Sandbox can load assets and update them in real time, same as the code. In order to do this, you must specify an `assets-dir` value in the `game-sandbox` server, and then call `env.assets.load()` in the `setup()` function.

The `assets.load()` function receives an object as a parameter where the keys are the names of the assets you'll use in your code to identify them, and the values are strings with a path to the asset, relative to the `assets-dir`. When `assets.load()` is called, it will start loading all the assets in the argument and set `env.assets.loaded` to true when they are loaded. This value can be consulted in the `draw()` function to decide when to start the game (usually you'll want to wait until all assets are loaded before doing anything).

# Acknowledgments

Most of the assets used in the examples come from [Kenney's Assets](https://kenney.nl)
