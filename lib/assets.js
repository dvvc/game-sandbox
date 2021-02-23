const ASSETS_URL = '/assets/';

/**
 * Helper that returns a promise that resolves when all images have finished loaded
 *
 */
function imageLoaded(asset) {
  return new Promise((resolve, reject) => {
    if (asset.image.complete) {
      asset.loaded = true;
      resolve(asset);
    } else {
      asset.image.addEventListener('load', () => {
        asset.loaded = true;
        resolve(asset);
      });
      asset.image.addEventListener('error', reject);
    }
  });
}

/**
 * Load the game assets. It receives a description of the game assets with the form:
 *
 * {
 *   assetKey: assetPath,
 *   ...
 * }
 *
 * Where `assetKey` is the name by which the asset will be referenced (e.g. env.assets.tree) and
 * `assetPath` is a string with the relative path to the asset file (relative to the `assets-dir`
 * passed to the game-sandbox server
 */
function loadAssets(assets, assetsDescription) {
  let imageLoadedPromises = [];
  assets.loaded = false;

  Object.entries(assetsDescription).forEach(([k, v]) => {
    assets[k] = { loaded: false, image: new Image() };
    assets[k].image.src = ASSETS_URL + v;
    imageLoadedPromises.push(imageLoaded(assets[k]));
  });

  // When all images have been loaded, set the `loaded` flag to true
  // TODO: Deal with errors
  Promise.all(imageLoadedPromises).then(() => {
    assets.loaded = true;
  });
}

export function initAssets() {
  let assets = {
    load: assetsDescription => loadAssets(assets, assetsDescription),
  };

  return assets;
}
