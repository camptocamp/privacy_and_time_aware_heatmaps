from math import floor
import numpy as np
import rasterio.transform
from shapely.geometry import MultiLineString, LineString, box
from PIL import Image, ImageDraw
from shapely import wkb
import psycopg
from psycopg import sql
from typing import Tuple
import rasterio
from rasterio.crs import CRS
from os import environ, path


# Something like:
# CONNINFO = path.expandvars('postgres://$DB_USER:$DB_PASS@$PGHOST:$PGPORT/$DB_NAME_USER?sslmode=require')
CONNINFO = environ['CONNINFO']

PROJ_2056_BOUNDS = ((2_484_273.3, 1_073_150.16), (2_837_939.88, 1_299_970.97))

EXTENT = ((46.385559, 7.082534), (46.406313, 7.115960))
EXTENT = ((45.813500, 6.725255), (46.546680, 8.314939))
EXTENT = None

TABLE_GEOM = ("recordedtracks", "recorded_geom")
TABLE_GEOM = ("tracks", "geom")


def save_canvas(canvas):
    # The image is upside down, ... so we flip it
    flipped_canvas = np.flipud(canvas)
    # Normalize and clip intensities to 8-bit range
    # canvas_normalized = np.clip(canvas, 0, 255).astype(np.uint8)

    with rasterio.open(
        './heat.tif',
        'w',
        driver='GTiff',
        height=proj.height,
        width=proj.width,
        count=1,
        dtype=rasterio.uint32,
        crs=CRS.from_epsg(2056),
        transform=rasterio.transform.from_bounds(proj.minx, proj.miny, proj.maxx, proj.maxy, proj.width, proj.height),
    ) as dst:
        dst.write(flipped_canvas, 1)


class Proj:
    def __init__(self, proj: Tuple[Tuple[float, float], Tuple[float, float]]):
        self.factor = 100
        self.minx = proj[0][0]
        self.maxx = proj[1][0]
        self.miny = proj[0][1]
        self.maxy = proj[1][1]
        self.width = floor((self.maxx - self.minx) / self.factor)
        self.height = floor((self.maxy - self.miny) / self.factor)
        print(self.width, self.height)
    
    def map(self, coo: Tuple[float, ...]) -> Tuple[int, int]:
        x = floor((coo[0] - self.minx) / 100)
        y = floor((coo[1] - self.miny) / 100)
        return (x, y)

proj = Proj(PROJ_2056_BOUNDS)


def fetch_geometries(table_name: str, geom_column: str, srid: int):
    with psycopg.connect(CONNINFO) as conn:
        print("Connected to DB")
        # Giving a name is very important to save memory.
        # See https://www.psycopg.org/docs/usage.html#server-side-cursors
        with conn.cursor("heatcursor", scrollable=False) as cursor:
            print("Got DB cursor")
            cursor.itersize = 20  # the number of items to fetch each time the cursor is empty (default 100)
            if EXTENT:
                sbbox = box(EXTENT[0][0], EXTENT[0][1], EXTENT[1][0], EXTENT[1][1])
                query = sql.SQL("SELECT ST_Transform({geom}, {srid}) FROM {table} where ST_Intersects({geom} , %s) AND abs(st_ymax({geom})) <90 AND abs(st_xmax({geom})) <90 ;").format(
                    geom=sql.Identifier(geom_column),
                    table=sql.Identifier(table_name),
                    srid=sql.Literal(2056),)
                print(query, (f'SRID=4326;{sbbox.wkt}',))
                cursor.execute(query, (f'SRID=4326;{sbbox.wkt}',))
            else:
                query = sql.SQL("SELECT ST_Transform({geom}, {srid}) FROM {table} where abs(st_ymax({geom})) <90 AND abs(st_xmax({geom})) <90 ;").format(
                    geom=sql.Identifier(geom_column),
                    table=sql.Identifier(table_name),
                    srid=sql.Literal(2056),)
                cursor.execute(query)
            for record in cursor:
                wkb_geom = record[0]
                geom = wkb.loads(wkb_geom, hex=True)
                if isinstance(geom, LineString) or isinstance(geom, MultiLineString):
                    yield geom
                else:
                    print('KO')


canvas = np.zeros((proj.height, proj.width), dtype=np.uint32)

count = 0
for geom in fetch_geometries(TABLE_GEOM[0], TABLE_GEOM[1], 2056):
    img = Image.new("I;16", (proj.width, proj.height), 0)
    draw = ImageDraw.Draw(img)
    lines = [geom] if isinstance(geom, LineString) else geom.geoms
    for line in lines:
        coords = [proj.map(coord) for coord in line.coords]
        draw.line(coords, fill=1, width=1)
    count += 1
    canvas += np.array(img)
    if count % 1000 == 0:
        print('status', count)
        save_canvas(canvas)
