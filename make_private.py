import numpy as np
import sys
from rasterio import open

sourcepath = sys.argv[1]
outputpath = sys.argv[2]
mincount = int(sys.argv[3])

@np.vectorize
def privatize(value):
    if value >= mincount:
        return value
    else:
        # if value != 0:
        #     print('zzzz', value, '->', 0)
        return 0

        
@np.vectorize
def check(value):
    if value != 0 and value < mincount:
        raise Exception("Bad value" + str(value))
    return 0


with open(sourcepath,
    'r',
    driver='GTiff',
) as src:
    band1 = src.read(1)

    with open(outputpath,
        'w',
        height=src.height,
        width=src.width,
        count=1,
        dtype=src.dtypes[0],
        crs=src.crs,
        # Adding the nodata parameter makes the file smaller after optimisation
        # nodata=0,
        transform=src.transform,
        driver='cog',
        nodata=0,
        SPARSE_OK="TRUE",
        STATISTICS="YES",
        GEOTIFF_VERSION="1.1",
        OVERVIEWS="IGNORE_EXISTING",
        COMPRESS="LERC_ZSTD",
        PREDICTOR=2,
    ) as dst:
        print(sourcepath, '->', outputpath, 'with at least', mincount, src.dtypes)
        priv_band = privatize(band1)
        check(priv_band)

        dst.write(priv_band, 1)
