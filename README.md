# Privacy-aware and time-based heatmaps

The goal is to create a visualization similar to Strava: a heatmap of the most popular hikes.
And in a second step add time slider.

First we create a GeoTiff where each pixel stores the number of tracks going through it.
Then we colorize this GeoTiff in OpenLayers.

By creating one geotiff per time slot (day, or month) it should be possible to see the evolution of hikes popularity as time flows.

The created GeoTiff can be opened in QGIS for inspection.
