cgpv.onMapInit((mapViewer) => {
    datasetUuids.forEach((uuid) => {
        cgpv.api.getMapViewer(mapViewer.mapId).layer.addGeoviewLayerByGeoCoreUUID(uuid);
    });
});

cgpv.init();
