import proj4 from 'proj4';
import {register} from 'ol/proj/proj4.js';
import {get as getProjection, Projection} from 'ol/proj.js';

proj4.defs(
  "EPSG:2056",
  "+proj=somerc +lat_0=46.9524055555556 +lon_0=7.43958333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs +type=crs",
);
register(proj4);

export const projection = getProjection('EPSG:2056') as Projection;
projection.setExtent([2420000, 1030000, 2900000, 1350000]);