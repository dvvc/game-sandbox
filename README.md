
# Game Sandbox

A live editing framework for game prototyping in JavaScript.

# Features

  - Hot code reloading.
  - Maintains state between reloads.
  - Lightweight game utils library.


# Installation

```sh
$ npm install game-sandbox
```


# Quick Start

Create a new npm project, install the npm `game-sandbox` module and create a skeleton project:

```sh
$ mkdir mygame
$ cd mygame
$ npm init -y
$ npm install game-sandbox
$ game-sandbox init
```

Start the server:

```sh
$ game-sandbox start \
   --watch \
   --base-dir src \
   --watch-dir src/game \
   --assets-dir assets \
   --output-dir dist
```

Point your browser to `http://localhost:8080`, and start modifying the source in `src/game/index.js`.

# Usage

The `runGame()` function is the entry point of your game. It is called like this:

```js
    import { runGame } from '/game-sandbox';

    runGame({
      width: 400,
      height: 400,
      canvasId: 'game-canvas',
      moduleUrl: './mygame.js',
    });
```

The game logic is defined inside two functions: `setup()` and `draw()`, which must be exported by the module defined in the `moduleUrl` attribute passed to `runGame()`.

Once started, the Game Sandbox server watches the directory specified in the `watch-dir` option. When a file is changed, it generates a bundle with the game code and notifies the browser. The browser then reloads the `draw()` function between frames so your game is updated seamlessly.

# How it works

Game Sandbox is inspired by [Reprocessing](https://github.com/Schmavery/reprocessing), which in turn is influenced by [Processing](https://processing.org/). The main idea is the game state is separated from the game logic, which helps performing reloads without resetting the game.

Before the main loop is executed, the `setup()` function returns the initial game state, and then the `draw()` function returns an updated state every frame. The game state is just an object with
attributes that represent your game, such as the player's position, etc.

The `draw()` function has two parameters, the current game state and an `Environment` object, which contains attributes such as the game width and height, a reference to the canvas context, or the
user input.

## Example

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

# Advanced usage

## Assets

Game Sandbox can load assets and update them in real time, same as the code. In order to do this, you must specify an `assets-dir` value in the `game-sandbox` server, and then call `env.assets.load()` in the `setup()` function.

The `assets.load()` function receives an object as a parameter where the keys are the names of the assets you'll use in your code to identify them, and the values are strings with a path to the asset, relative to the `assets-dir`. When `assets.load()` is called, it will start loading all the assets in the argument and set `env.assets.loaded` to true when they are loaded. This value can be consulted in the `draw()` function to decide when to start the game (usually you'll want to wait until all assets are loaded before doing anything).
