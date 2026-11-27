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
