import { useEffect, useRef } from 'react';
import { useMapState, useUIState } from '@/store/useAppStore';

import Legend from '@arcgis/core/widgets/Legend';
import LayerList from '@arcgis/core/widgets/LayerList';
import BasemapGallery from '@arcgis/core/widgets/BasemapGallery';
import Expand from '@arcgis/core/widgets/Expand';
import { CONFIG } from '@/config/appConfig';

const MapWidgets = () => {
    const { mapView } = useMapState();
    const { activePage } = useUIState();

    // Use refs to hold widget instances to prevent re-creation on every render
    const legendRef = useRef<Expand | null>(null);
    const layerListRef = useRef<Expand | null>(null);
    const basemapGalleryRef = useRef<Expand | null>(null);

    useEffect(() => {
        if (!mapView) {
            return;
        }

        // --- Cleanup previous widgets before creating new ones ---
        const cleanup = () => {
            if (legendRef.current) {
                mapView.ui.remove(legendRef.current);
                legendRef.current.destroy();
                legendRef.current = null;
            }
            if (layerListRef.current) {
                mapView.ui.remove(layerListRef.current);
                layerListRef.current.destroy();
                layerListRef.current = null;
            }
            if (basemapGalleryRef.current) {
                mapView.ui.remove(basemapGalleryRef.current);
                basemapGalleryRef.current.destroy();
                basemapGalleryRef.current = null;
            }
        };
        cleanup();

        // --- Create and add new widgets ---

        // Basemap Gallery
        const basemapGallery = new BasemapGallery({ view: mapView });
        basemapGalleryRef.current = new Expand({
            view: mapView,
            content: basemapGallery,
            expandIcon: 'basemap',
            group: 'top-left',
        });
        mapView.ui.add(basemapGalleryRef.current, 'top-left');

        // Legend
        const legend = new Legend({ view: mapView });
        legendRef.current = new Expand({
            view: mapView,
            content: legend,
            expandIcon: 'legend',
            group: 'top-left',
        });
        mapView.ui.add(legendRef.current, 'top-left');
        
        // Get the list of allowed layer titles for the current page from the config
        const allowedLayersForPage = CONFIG.pageLayerVisibility[activePage] || [];
        
        // Layer List (Context-Aware)
        const layerList = new LayerList({
            view: mapView,
            listItemCreatedFunction: (event) => {
                const item = event.item;
                const layerTitle = item.layer.title;

                // Only show layers that are in the allowed list for the current page
                if (typeof layerTitle === 'string' && allowedLayersForPage.includes(layerTitle)) {
                    // This layer is allowed, configure it
                    item.panel = {
                        content: 'legend',
                        open: false,
                    };
                } else {
                    // This layer is not in the allowed list, so hide it completely from the widget
                    item.visible = false;
                }
            },
        });
        layerListRef.current = new Expand({
            view: mapView,
            content: layerList,
            expandIcon: 'layers',
            group: 'top-left',
        });
        mapView.ui.add(layerListRef.current, 'top-left');


        // Return a cleanup function to run when the component unmounts or deps change
        return cleanup;

    }, [mapView, activePage]); // Re-run this effect if the map or the active page changes

    return null; // This component does not render any JSX itself
};

export default MapWidgets;