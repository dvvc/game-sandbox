const ASSETS_URL = '/assets/';

/**
 * Returns a promise that resolves when the image passed is loaded and also updates the asset's
 * `loaded` attribute. The promise rejects if there is a loading error
 *
 */
function imageLoaded(image, asset) {
  return new Promise((resolve, reject) => {
    if (image.complete) {
      asset.loaded = true;
      resolve(asset);
    } else {
      const markImageLoaded = () => {
        asset.loaded = true;
        image.removeEventListener('load', markImageLoaded);
        resolve(asset);
      };

      const imageLoadError = e => {
        image.removeEventListener('error', imageLoadError);
        reject(e);
      };

      image.addEventListener('load', markImageLoaded);
      image.addEventListener('error', imageLoadError);
    }
  });
}

/**
 * Helper to return an asset URL from a file path relative to `assets-dir`
 *
 */
function getAssetUrl(assetPath) {
  return ASSETS_URL + assetPath;
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
    let image = new Image();
    assets[k] = { loaded: false, image };
    assets[k].path = v;
    assets[k].image.src = getAssetUrl(v);
    imageLoadedPromises.push(imageLoaded(image, assets[k]));
  });

  // When all images have been loaded, set the `loaded` flag to true
  return Promise.all(imageLoadedPromises)
    .then(() => {
      assets.loaded = true;
    })
    .catch(e => {
      console.error(`Error loading assets`, e);
    });
}

export function initAssets() {
  let assets = {
    load: assetsDescription => loadAssets(assets, assetsDescription),
  };

  return assets;
}

/**
 * Called when there's been a change in an asset file. When that happens, we create a new image with
 * the new asset and then switch with the original when it is loaded.
 *
 */
export async function reloadAsset(assets, assetPath) {
  // find the asset that has changed
  let allAssets = Object.values(assets);
  let changedAsset = allAssets.find(a => a.path === assetPath);

  if (!changedAsset) {
    console.log(`Could not find the asset for ${assetPath}, no updates performed`);
    return;
  }

  // Do the update
  let newImage = new Image();
  newImage.src = getAssetUrl(assetPath) + `?t=${new Date().getTime()}`;

  // Wait until the asset is loaded, then swap the image with the old one
  try {
    await imageLoaded(newImage, changedAsset);
    changedAsset.path = assetPath;
    changedAsset.image = newImage;
  } catch (e) {
    console.error(e);
  }
}
