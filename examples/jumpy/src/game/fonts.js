// ------- BEGIN FONTS ------
const FONT_HEIGHT = 84;

// k: [index, width]
const FONT_DEF = {
  a: [0, 68],
  b: [68, 68],
  c: [136, 68],
  d: [204, 68],
  e: [272, 68],
  f: [340, 68],
  g: [408, 68],
  h: [476, 68],
  i: [544, 32],
  j: [576, 56],
  k: [632, 68],
  l: [700, 68],
  m: [768, 80],
  n: [848, 68],
  o: [916, 68],
  p: [984, 68],
  q: [1052, 68],
  r: [1120, 68],
  s: [1188, 68],
  t: [1256, 56],
  u: [1312, 68],
  v: [1380, 68],
  w: [1448, 80],
  x: [1528, 68],
  y: [1596, 68],
  z: [1664, 68],
  0: [1732, 68],
  1: [1800, 44],
  2: [1844, 68],
  3: [1912, 68],
  4: [1980, 68],
  5: [2048, 68],
  6: [2116, 68],
  7: [2184, 68],
  8: [2252, 68],
  9: [2320, 68],
  '!': [2388, 32],
  '?': [2420, 68],
  '.': [2488, 32],
  ',': [2520, 32],
  "'": [2552, 32],
  '"': [2584, 56],
  ':': [2640, 32],
  ';': [2672, 32],
  ' ': [2704, 68],
};

export function initFont(assetsName, height) {
  return {
    assetsName,
    height,
  };
}

export function drawText(text, x, y, h, font, ctx, assets) {
  let asset = assets[font.assetsName];
  if (!asset || !asset.loaded) {
    throw new Error(`Font assets not loaded!`);
  }

  let accX = x;
  let scaleRatio = h / font.height;

  text
    .toLowerCase()
    .split('')
    .forEach(c => {
      let arr = FONT_DEF[c] || FONT_DEF[' '];
      let [i, w] = arr;

      ctx.drawImage(
        asset.image,
        i,
        0,
        w,
        font.height,
        accX,
        y,
        w * scaleRatio,
        font.height * scaleRatio
      );

      accX += w * scaleRatio;
    });
}

export function measureText(text, h, font) {
  let accX = 0;
  let scaleRatio = h / font.height;
  let width = 0;

  text
    .toLowerCase()
    .split('')
    .forEach(c => {
      let arr = FONT_DEF[c] || FONT_DEF[' '];
      let [_, w] = arr;
      width += w;
    });

  return [width * scaleRatio, font.height * scaleRatio];
}
// ------ END FONTS -------
