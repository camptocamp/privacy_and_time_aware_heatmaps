// FIXME: add to @geoblocks/sources ?

import WMTSSource from 'ol/source/WMTS.js';
import WMTSTileGrid from 'ol/tilegrid/WMTS.js';
import {getTopLeft} from 'ol/extent.js';
import type {Options as WMTSOptions} from 'ol/source/WMTS';

import {projection as epsg2056} from './proj.js';

type ImageExtension = 'jpeg' | 'png';
export const RESOLUTIONS = [
  4000, 3750, 3500, 3250, 3000, 2750, 2500, 2250, 2000, 1750, 1500, 1250, 1000,
  750, 650, 500, 250, 100, 50, 20, 10, 5, 2.5, 2, 1.5, 1, 0.5, 0.25, 0.1,
];


function swisstopoWMTSTileGrid(maxZoom: number) {
  const resolutions = RESOLUTIONS.slice(0, maxZoom + 1);
  return new WMTSTileGrid({
    origin: getTopLeft(epsg2056.getExtent()),
    extent: epsg2056.getExtent(),
    resolutions: resolutions,
    matrixIds: resolutions.map((_value, index) => String(index)),
  });
}

export default class SwisstopoWMTS extends WMTSSource {
  constructor(
    layer: string,
    timestamp: string,
    extension: ImageExtension,
    maxZoom: number,
    options?: Partial<WMTSOptions>,
  ) {
    const tileCoordinateUrl = '2056/{TileMatrix}/{TileCol}/{TileRow}';
    super(
      Object.assign(
        {
          url: `https://wmts100.geo.admin.ch/1.0.0/${layer}/default/{Time}/${tileCoordinateUrl}.${extension}`,
          layer: layer,
          projection: epsg2056,
          style: 'default',
          matrixSet: '2056',
          requestEncoding: 'REST',
          dimensions: {
            Time: timestamp,
          },
          tileGrid: swisstopoWMTSTileGrid(maxZoom),
          transition: 0,
          tilePixelRatio: 1,
          zDirection: 0,
          crossOrigin: 'anonymous',
        },
        options,
      ),
    );
  }
}
