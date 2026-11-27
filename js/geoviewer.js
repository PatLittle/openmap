const DEFAULT_NRCAN_ATTRIBUTIONS = new Set([
    "© His Majesty the King in Right of Canada, as represented by the Minister of Natural Resources",
    "© Sa Majesté le Roi du Chef du Canada, représentée par le ministre des Ressources naturelles",
]);

const FILE_LAYER_TYPES = {
    geojson: 'GeoJSON',
    json: 'GeoJSON',
    csv: 'CSV',
    kml: 'KML',
    gpkg: 'GeoPackage',
    shp: 'shapefile',
    zip: 'shapefile',
    tif: 'GeoTIFF',
    tiff: 'GeoTIFF',
};

const GEOJSON_TYPES = new Set([
    'FeatureCollection', 'Feature', 'Point', 'MultiPoint', 'LineString',
    'MultiLineString', 'Polygon', 'MultiPolygon', 'GeometryCollection',
]);

function reportFileLayerError(message) {
    const status = document.getElementById('file-layer-status');
    const item = document.createElement('li');
    item.textContent = message;
    status.appendChild(item);
}

async function addFileLayer(layer, value, index) {
    let objectUrl;
    const id = `file-layer-${index + 1}`;
    const fallbackName = langcode === 'fr' ? `fichier ${index + 1}` : `file ${index + 1}`;
    let name = fallbackName;

    try {
        const url = new URL(value);
        if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
            throw new Error('Expected a public HTTP(S) URL');
        }
        const filename = decodeURIComponent(url.pathname.split('/').pop());
        const extension = filename.match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase();
        const type = Object.hasOwn(FILE_LAYER_TYPES, extension) && FILE_LAYER_TYPES[extension];
        name = filename.replace(/\.[^.]+$/, '') || fallbackName;
        if (!type) {
            reportFileLayerError(langcode === 'fr'
                ? `Format de fichier non pris en charge : ${name}.`
                : `Unsupported file format: ${name}.`);
            return;
        }

        let config;
        if (extension === 'shp' || extension === 'gpkg') {
            // GeoView reads GeoPackages and resolves shapefile sidecars from the original URL.
            ({ configInfo: config } = await cgpv.api.config.createInitConfigFromType(type, id, name, url.href));
            config.geoviewLayerName = name;
        } else {
            const response = await fetch(url, { credentials: 'omit' });
            if (!response.ok) throw new Error('Download failed');

            if (extension === 'zip') {
                // The shapefile reader accepts a blob URL for a downloaded ZIP archive.
                objectUrl = URL.createObjectURL(await response.blob());
                ({ configInfo: config } = await cgpv.api.config.createInitConfigFromType(type, id, name, objectUrl));
                URL.revokeObjectURL(objectUrl);
                objectUrl = undefined;
                config.geoviewLayerName = name;
            } else {
                const source = {};
                if (type === 'GeoJSON') {
                    const data = await response.json();
                    if (!GEOJSON_TYPES.has(data?.type) ||
                        (data.type === 'FeatureCollection' && !Array.isArray(data.features))) {
                        throw new Error('Expected GeoJSON');
                    }
                    source.geojson = JSON.stringify(data);
                    source.dataAccessPath = url.href;
                } else {
                    // Retain the downloaded file for GeoView to read and reuse during this page's lifetime.
                    objectUrl = URL.createObjectURL(await response.blob());
                    source.dataAccessPath = objectUrl;
                }
                config = {
                    geoviewLayerId: id,
                    geoviewLayerName: name,
                    geoviewLayerType: type,
                    listOfLayerEntryConfig: [{ layerId: 'data', layerName: name, source }],
                };
            }
        }
        await layer.addGeoviewLayer(config).promiseLayer;
    } catch {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        reportFileLayerError(langcode === 'fr'
            ? `Impossible de charger ${name}.`
            : `Could not load ${name}.`);
    }
}

function customizeBasemapAttribution(mapViewer) {
    const applyAttribution = (basemap) => {
        const credits = basemap.attribution.map(credit =>
            DEFAULT_NRCAN_ATTRIBUTIONS.has(credit) ? 'OGL-Canada 2.0' : credit
        );
        mapViewer.controllers.mapController.setAttribution(credits);
    };

    mapViewer.basemap.onBasemapChanged((_, { basemap }) => applyAttribution(basemap));
    if (mapViewer.basemap.activeBasemap) {
        applyAttribution(mapViewer.basemap.activeBasemap);
    }
}

cgpv.onMapInit((mapViewer) => {
    const viewer = cgpv.api.getMapViewer(mapViewer.mapId);
    customizeBasemapAttribution(viewer);
    const { layer } = viewer;
    datasetUuids.forEach((uuid) => {
        layer.addGeoviewLayerByGeoCoreUUID(uuid);
    });

    const urls = new URLSearchParams(search).getAll('file')
        .flatMap(value => value.split(','))
        .map(value => value.trim())
        .filter(Boolean);
    const fileUrls = [...new Set(urls)];
    window.openMapsAnalytics?.bind(viewer, fileUrls.length);
    fileUrls.forEach((url, index) => {
        void addFileLayer(layer, url, index);
    });
});

cgpv.init();
