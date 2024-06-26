<script setup lang="ts">
	import layersMp4 from "@source/users/layers/layers.mp4";
	import layersMobileMp4 from "@source/users/layers/layers-mobile.mp4";
</script>

# Map styles (layers)

FacilMap embeds the map styles of different OpenStreetMap-based services. Different styles present geographic features in a different way and are useful for different purposes.

You can switch the style of the map by clicking on the “Map style” item in the [toolbox](../ui/#toolbox). The dropdown menu contains three sections:
1. The first section are so-called “base layers”. These define the main style of the map. Only one base layer can be selected at a time.
2. The second section are so-called “overlays”. These are shown on top of the base layer to show additional information on the map. Multiple overlays can be shown at the same time.
3. The third section contains some links to open the current map area on another map service (such as Google Maps). Clicking these links will open a new browser tab.

<Screencast :desktop="layersMp4" :mobile="layersMobileMp4"></Screencast>

## Base layers

Base layers set the main style of the map. Only one base layer can be shown at the same time. FacilMap includes the following base layers:

| Base layer | Source | Purpose |
|------------|--------|---------|
| Lima Labs | [Lima Labs](https://maps.lima-labs.com/) | Good for a general geographic overview. Has a focus on car infrastructure and political borders. Supports high resolution displays. |
| Mapnik | [OpenStreetMap](https://www.openstreetmap.org/) | Good for a general geographic overview. Has a focus on car infrastructure and political borders. |
| TopPlus | [German state](https://gdz.bkg.bund.de/index.php/default/wms-topplusopen-wms-topplus-open.html) | Good for a general geographic overview, with more details than Mapnik. Has a focus on car infrastructure, political borders and topography. Unfortunately all labels are in German. |
| Map1.eu | [Map1.eu](https://www.map1.eu/) | Has a focus on cities/towns, car infrastructure and political borders. Aims to have the same level of detail as a paper map. Only available for Europe. |
| OpenTopoMap | [OpenTopoMap](https://opentopomap.org/) | Strong focus on topography, but also shows car and train infrastructure. Shows contour lines at higher zoom levels. |
| CyclOSM | [CyclOSM](https://cyclomap.org/) | Strong focus on bicycle infrastructure and sign-posted bicycle routes. |
| OpenCycleMap | [OpenCycleMap](https://www.opencyclemap.org/) | Strong focus on sign-posted bicycle routes. At higher zoom levels, details about cycling infrastructure are shown. |
| Hike & Bike Map | [Hike & Bike Map](https://hikebikemap.org/) | Emphasizes hiking trails and off-road tracks. |
| Mapnik Water | [FreieTonne](https://www.freietonne.de/) | Similar to Mapnik, but emphasizes lakes, rivers and the sea. |

Since these base layers are provided by third-party services, it can happen that some of them are unavailable at some point in time. In that case, FacilMap will show Mapnik as a fallback.

If you know of a free service that provides a base layer and think it would be a useful addition to FacilMap, please raise an [issue on GitHub](https://github.com/FacilMap/facilmap/issues).

## Overlays

Overlays are additional details that are shown on top of a base layer. Multiple overlays can be shown at the same time. FacilMap includes the following overlays:

| Overlay | Source | Purpose |
|---------|--------|---------|
| Public transportation | [Openptmap](https://www.openptmap.org/) | Shows train, tram, bus and ferry lines. |
| Hiking paths | [Waymarked Trails](https://waymarkedtrails.org/) | Shows marked/sign-posted hiking routes. |
| Bicycle routes | [Waymarked Trails](https://waymarkedtrails.org/) | Shows sign-posted bicycle routes. |
| Relief | [Wikimedia](https://tiles.wmflabs.org/) | Adds hill-shading to the map. |
| Graticule | FacilMap/[Leaflet.AutoGraticule](https://github.com/FacilMap/Leaflet.AutoGraticule) | Adds a grid of longitude and latitude coordinates to the map. |
| Sea marks | [FreieTonne](https://www.freietonne.de/) | Shows details about light houses, weirs, buoys and many other features relevant for nautical navigation. |

If you know of a free service that provides an overlay and think it would be a useful addition to FacilMap, please raise an [issue on GitHub](https://github.com/FacilMap/facilmap/issues).
