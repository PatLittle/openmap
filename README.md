# openmap
Open Maps Viewer | Visualisateur de Cartes ouvertes

## Viewer URLs

| Language | With an explicit language segment | With the language inferred |
| --- | --- | --- |
| English | `/openmap/en/{uuid}` | `/openmap/{uuid}` |
| French | `/carteouverte/fr/{uuid}` | `/carteouverte/{uuid}` |

Join multiple dataset UUIDs with commas in the final segment. Legacy links
such as `/openmap/en.html#{uuid}` open the same dataset and update the browser
address to the new path.

### File layers

Append `?file={url},{url}` to load files on any viewer route, with or without
GeoCore UUIDs. Use direct HTTP(S) download URLs that allow cross-origin access
(CORS) from the viewer. Supported extensions are `.geojson` and `.json`
(GeoJSON), `.csv` (with latitude and longitude), `.kml`, `.gpkg`, `.shp`
(with its companion files) or `.zip` (shapefile archive), and `.tif` or
`.tiff` (GeoTIFF). Each file loads independently.

For example, `/openmap/en?file=https://example.org/points.geojson,https://example.org/routes.kml`.
Percent-encode individual URLs that contain their own query parameters or
percent escapes, then join them with literal commas. Escape any comma inside
an individual URL as `%2C` before encoding the URL for the query parameter.

Netlify serves these routes through the `_redirects` file in the publish
directory. On other hosts, configure internal rewrites to serve `en.html`
for the English routes and `fr.html` for the French routes, keeping the public
path in the address bar. Both pages use shared assets under `/openmap/`.
Keep the old HTML entry points and exclude asset paths from viewer rewrites.

## Adobe Analytics

Open Maps keeps the existing GC CDTS/Adobe page-view tag. The viewer calls
`_satellite.track('openmaps_interaction', detail)` for map readiness, pan,
zoom, identify clicks, basemap and projection changes, layer visibility and removal, panel
activation and map tool clicks. It also emits dataset, analytics and language
link clicks. Map interactions are custom link hits after the Adobe rule is
configured. Existing page views and Google Analytics calls are separate.

### Adobe Tags configuration

In the GC Adobe tag property, create a **Core → Direct Call** rule with
identifier `openmaps_interaction`. Configure the Adobe Analytics extension to
set the assigned eVars and send a custom link beacon (link type `o`). Use
`openmaps:` + `event.detail.action` as the link name. Use a per-hit variable
override or clear the custom variables after sending. Set the link-hit page URL
to the site's origin plus `event.detail.pagePath` so file URLs in the query are
excluded. Confirm the centrally assigned eVar and success-event numbers in the
report suite before publishing. Test the rule in a development or staging suite.

| Payload fields on `event.detail` | Report dimensions |
| --- | --- |
| `application`, `action`, `version` | Viewer, interaction, payload version |
| `language`, `pagePath`, `requestType` | Language, viewer route, input type |
| `datasetId`, `datasetIds`, `datasetCount`, `fileCount` | First requested GeoCore UUID, first six UUIDs, total requested UUIDs and unique file entries |
| `projection`, `zoom`, `basemap` | EPSG code, whole-number zoom, basemap ID |
| `layerSource`, `layerDatasetId` | Layer source and GeoCore UUID when available |
| `value`, `previousValue` | Selected tool, panel, language or visibility state, and previous basemap or projection when applicable |

Use hit expiry for map interaction dimensions. Optional fields apply only on
hits where they are populated. The event payload excludes raw URLs, search
terms, coordinates, feature attributes, and user-provided file or layer names.
