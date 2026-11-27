(() => {
    const DIRECT_CALL = 'openmaps_interaction';
    const panelIds = new Set(['layers', 'data-table', 'details', 'geochart', 'time-slider', 'guide']);
    const tools = new Set(['home', 'fullscreen', 'location', 'export', 'geolocator', 'legend', 'attribution']);
    const basemapIds = new Set(['transport', 'osm', 'simple', 'nogeom', 'shaded', 'imagery', 'labeled']);

    function bind(viewer, fileCount) {
        const mapId = viewer.mapId;
        const requestType = datasetUuids.length
            ? (fileCount ? 'mixed' : 'geocore')
            : (fileCount ? 'file' : 'empty');
        let basemapId;
        let ready = false;
        let previousView;

        function track(action, details = {}) {
            try {
                const zoom = viewer.getView().getZoom();
                window._satellite?.track?.(DIRECT_CALL, {
                    version: 1,
                    application: 'openmaps',
                    action,
                    language: langcode,
                    pagePath: viewerPath(langcode, []),
                    requestType,
                    datasetId: datasetUuids[0],
                    datasetIds: datasetUuids.length ? datasetUuids.slice(0, 6).join(',') : undefined,
                    datasetCount: datasetUuids.length,
                    fileCount,
                    projection: viewer.getProjectionEPSG(),
                    zoom: Number.isFinite(zoom) ? Math.round(zoom) : undefined,
                    basemap: basemapId,
                    ...details,
                });
            } catch {
                // Tag failures must not interrupt the viewer or page navigation.
            }
        }

        function layerContext(path) {
            const root = path.split('/')[0].toLowerCase();
            if (UUID_REGEX.test(root)) return { layerSource: 'geocore', layerDatasetId: root };
            if (/^file-layer-\d+$/.test(root)) return { layerSource: 'file' };
            return { layerSource: 'other' };
        }

        function updateBasemap(basemap) {
            const next = basemap?.basemapOptions?.basemapId;
            if (!basemapIds.has(next) || next === basemapId) return;
            const previous = basemapId;
            basemapId = next;
            if (ready && previous) track('basemap_change', { previousValue: previous });
        }

        updateBasemap(viewer.basemap.activeBasemap);
        viewer.basemap.onBasemapChanged((_, { basemap }) => updateBasemap(basemap));
        function currentView() {
            const view = viewer.getView();
            return { zoom: view.getZoom(), center: view.getCenter(), projection: viewer.getProjectionEPSG() };
        }

        viewer.onMapReady(() => {
            previousView = currentView();
            ready = true;
            track('map_ready');
        });
        viewer.onMapMoveEnd(() => {
            if (!ready) return;
            const current = currentView();
            const previous = previousView;
            previousView = current;
            if (current.projection !== previous.projection) return;
            if (current.zoom !== previous.zoom) {
                track('map_zoom');
            } else if (current.center?.some((coordinate, index) => coordinate !== previous.center?.[index])) {
                track('map_pan');
            }
        });
        viewer.onMapSingleClick(() => {
            if (ready) track('map_identify');
        });
        viewer.onMapProjectionChanged((_, { previousProjection }) => {
            if (ready) track('projection_change', { previousValue: previousProjection.getCode() });
        });
        viewer.layer.onLayerVisibilityToggled((_, { layer, visible }) => {
            if (ready) track('layer_visibility', {
                ...layerContext(layer.getLayerPath()),
                value: visible ? 'shown' : 'hidden',
            });
        });

        viewer.layer.onLayerConfigRemoved((_, { layerPath }) => {
            if (ready) track('layer_remove', layerContext(layerPath));
        });

        // IDs are scoped to this viewer and matched against fixed controls.
        document.addEventListener('click', event => {
            if (!event.isTrusted) return;
            const control = event.target.closest?.('a[href], button, [role="tab"]');
            if (!control) return;

            if (control.closest('#dataset-list')) {
                const datasetId = new URL(control.href).pathname.split('/').pop();
                if (datasetUuids.includes(datasetId)) track('dataset_link', { layerDatasetId: datasetId });
            } else if (control.closest('#web-analytics')) {
                track('analytics_link');
            } else if (control.matches('#wb-lng a[hreflang]')) {
                const language = control.hreflang;
                if (language === 'en' || language === 'fr') track('language_switch', { value: language });
            } else if (control.id.startsWith(mapId + '-tab-')) {
                const panel = control.id.slice((mapId + '-tab-').length);
                if (panelIds.has(panel)) track('panel_activate', { value: panel });
            } else if (control.id.startsWith(mapId + '-')) {
                const tool = control.id.slice(mapId.length + 1).match(
                    /^(?:button-|appBar-)?(home|fullscreen|location|export|geolocator|legend|attribution)(?:-modal-btn|-panel-btn)?$/
                )?.[1];
                if (tools.has(tool)) track('map_tool', { value: tool });
            }
        }, true);
    }

    window.openMapsAnalytics = { bind };
})();
