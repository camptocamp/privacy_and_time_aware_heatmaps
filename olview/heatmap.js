import Map from 'ol/Map.js';
import View from 'ol/View.js';
import GeoTIFF from 'ol/source/GeoTIFF.js';
import WebGLTileLayer from 'ol/layer/WebGLTile.js';
import { projection } from './proj.js';
import SwisstopoWMTS from './swisstopo-wmts.js';
import TileLayer from 'ol/layer/Tile.js';


const tiffUrl = './heat_optim.tif';
let min = 0;
let w_min = 0;
let w_max = 255;
let w_mean = 100;
let w_dev = 0;

const geotiffSource = new GeoTIFF({
  sources: [{ url: tiffUrl }],
  normalize: false,
  convertToRGB: false,
  transition: 0,
  projection: projection,
  interpolate: false,
  sourceOptions: {
    
    // allowFullFile: true,
    // blockSize: 100000000, // with default value we see missing blocks
  }

  // You can adjust band selection and color mapping here if needed
});

const normalizedValueExpr = ['/', ['band', 1], ['var', 'w_max_div']];

// let palette = ['#3b4cc0', '#5977e3', '#7b9ff9', '#9ebeff', '#c0d4f5', '#dddcdc', '#f2cbb7', '#f7ac8e', '#ee8468', '#d65244', '#b40426'];
// palette = ['#00000070', '#5977e3', '#7b9ff9', '#9ebeff', '#c0d4f5', '#dddcdc', '#f2cbb7', '#f7ac8e', '#ee8468', '#d65244', '#b40426'];
// palette =  ["#00003366", "#001166cc", "#0066CCcc", "#33CCFFff", "#99FFFFff", "#ffFFFFff", "#ffFFFFff"];
// palette.forEach((p) => {
//   const div = document.createElement('div');
//   div.style=`width: 250px; background-color: ${p}`;
//   div.innerText = p;
//   document.body.appendChild(div);
// });

// const interpolateExpr = ['interpolate', ['linear'], ['band', 1], 0, 0, ['var', 'w_max'],  palette.length - 1];
// const paletteExpr = ['palette', interpolateExpr, palette];
const tiffLayer = new WebGLTileLayer({
  style: {
    variables: computeVariables(),
    color: ['case',
      ['<=', ['band', 1], ['var', 'show_min']], [0, 0, 0, 0], // hide if below some min value
    // paletteExpr, 
    // The - tries to keep some gain when the sliders goes up
    ['color', 0, 0, ['-', normalizedValueExpr, ['var', 'w_min_step']], 250]
    ],
  },
  source: geotiffSource,
  opacity: 0.5,
});

window.tiffLayer = tiffLayer;


geotiffSource.on('change', (evt) => {
  const metadata = geotiffSource.metadata_;
  console.log('metadata', metadata);
  if (metadata) {
    // Parse int? Float? what about actual type of data?
    // this metadata is created by GDAL COG output format: -of cog -co STATISTICS=YES
    const m = metadata[0][0];
    if (m) {
      w_min = Number.parseInt(m["STATISTICS_MINIMUM"]);
      w_max = Number.parseInt(m["STATISTICS_MAXIMUM"]);
      w_mean = Number.parseInt(m["STATISTICS_MEAN"]);
      w_dev = Number.parseInt(m["STATISTICS_STDDEV"]);
      console.log('stats', w_min, w_max, w_mean. w_dev)
      const selector = document.getElementById('min-input');
      selector.max = (w_mean + 2.5 * w_dev).toFixed(0);
      selector.value = '0';
      document.getElementById('current').innerText = 0;
    }
    
    tiffLayer.updateStyleVariables(computeVariables());
  }
});

function computeVariables() {
  const div =  w_max / 255;
  return {
    w_min: w_min,
    w_max: w_max,
    w_max_div: div,
    show_min: min,
    w_min_step: min / div
  }
}


document.getElementById('min-input').addEventListener('input', (event) => {
  min = parseFloat(event.target.value);
  document.getElementById('current').innerText = min;
  tiffLayer.updateStyleVariables(computeVariables());
  map.render();
});

const swissimageSource = new SwisstopoWMTS(
  'ch.swisstopo.swissimage',
  'current',
  'jpeg',
  28,
);

const hikingNetworkSource = new SwisstopoWMTS(
  'ch.swisstopo.swisstlm3d-wanderwege',
  'current',
  'png',
  26,
);
const map = new Map({
  target: 'map',
  layers: [new TileLayer({
    source: swissimageSource,
  }), new TileLayer({
    source: hikingNetworkSource,
    opacity: 0.7,
    maxResolution: 50,
  }) , tiffLayer],
  view: new View({
    projection: projection,
    center: [2600000, 1200000], // Center on Switzerland in EPSG:2056
    zoom: 2,
  }),
});

const infoDiv = document.getElementById('count');

map.on('pointermove', async function (evt) {
  const data = tiffLayer.getData(evt.pixel);
  if (data) {
    count.innerText = `Count: ${data}`;
  } else {
    count.innerText = 'Count: -';
  }
  // infoDiv.style.left = (evt.originalEvent.clientX + 10) + 'px';
  // infoDiv.style.top = (evt.originalEvent.clientY + 10) + 'px';
});

