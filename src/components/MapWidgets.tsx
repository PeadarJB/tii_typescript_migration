import { useEffect, useRef } from 'react';
import { useMapState, useUIState } from '@/store/useAppStore';

import Legend from '@arcgis/core/widgets/Legend';
import LayerList from '@arcgis/core/widgets/LayerList';
import BasemapGallery from '@arcgis/core/widgets/BasemapGallery';
import Expand from '@arcgis/core/widgets/Expand';
import { CONFIG } from '@/config/appConfig';

const MapWidgets = () => {
    const { mapView } = useMapState();
    const { activePage, isSwipeActive } = useUIState();

    // Use refs to hold widget instances to prevent re-creation on every render
    const legendRef = useRef<Expand | null>(null);
    const layerListRef = useRef<Expand | null>(null);
    const basemapGalleryRef = useRef<Expand | null>(null);

    useEffect(() => {
        if (!mapView?.map) {
            return;
        }

        // Set default layer visibility for the current page
        // This runs whenever the activePage changes, but not if a swipe session is active.
        if (!isSwipeActive) {
            // Capture the current extent before changing layer visibility
            const currentExtent = mapView.extent.clone();
            
            const defaultVisibleLayers = CONFIG.defaultLayerVisibility[activePage] || [];
            
            // Iterate only over the map's operational layers, not allLayers (which includes the basemap).
            mapView.map.layers.forEach(layer => {
                const layerTitle = layer.title;
                // Type guard to ensure layer.title is a string before using it
                if (typeof layerTitle === 'string') {
                    // The layer's title must be in the default list to be visible.
                    layer.visible = defaultVisibleLayers.includes(layerTitle);
                } else {
                    // If a layer has no title, it cannot be in the list, so ensure it's not visible.
                    layer.visible = false;
                }
            });

            // Restore the extent after layer visibility changes
            // Use immediate transition to prevent any zoom animation
            mapView.goTo(currentExtent, {
                animate: false
            }).catch(error => {
                console.error("Failed to maintain map extent after layer visibility change:", error);
            });
        }

        // --- Cleanup previous UI widgets before creating new ones ---
        const cleanup = () => {
            if (legendRef.current) mapView.ui.remove(legendRef.current);
            if (layerListRef.current) mapView.ui.remove(layerListRef.current);
            if (basemapGalleryRef.current) mapView.ui.remove(basemapGalleryRef.current);
        };
        cleanup();

        // --- Create and add new UI widgets ---

        // Basemap Gallery
        basemapGalleryRef.current = new Expand({
            view: mapView,
            content: new BasemapGallery({ view: mapView }),
            expandIcon: 'basemap',
            group: 'top-left',
        });
        mapView.ui.add(basemapGalleryRef.current, 'top-left');

        // Legend
        legendRef.current = new Expand({
            view: mapView,
            content: new Legend({ view: mapView }),
            expandIcon: 'legend',
            group: 'top-left',
        });
        mapView.ui.add(legendRef.current, 'top-left');
        
        // Layer List
        layerListRef.current = new Expand({
            view: mapView,
            content: new LayerList({ view: mapView }),
            expandIcon: 'layers',
            group: 'top-left',
        });
        mapView.ui.add(layerListRef.current, 'top-left');


        // Return a cleanup function to run when the component unmounts or deps change
        return cleanup;

    }, [mapView, activePage, isSwipeActive]); // Re-run effect if map, page, or swipe state changes

    return null; // This component does not render any JSX itself
};

export default MapWidgets;