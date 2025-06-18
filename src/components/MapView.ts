/**
 * MapView initialization module with TypeScript
 * Handles ArcGIS Maps SDK initialization with proper error handling
 */

import WebMap from "@arcgis/core/WebMap";
import MapView from "@arcgis/core/views/MapView";
import type Layer from "@arcgis/core/layers/Layer";
import { CONFIG } from "@/config/appConfig";

// By referencing the types, we make the global __esri namespace available
/// <reference types="@arcgis/core" />

// Module-level variables for singleton pattern
let view: __esri.MapView | null = null;
let webmap: __esri.WebMap | null = null;

export interface MapInitResult {
  view: __esri.MapView;
  webmap: __esri.WebMap;
}

export async function initializeMapView(containerId = "viewDiv"): Promise<MapInitResult> {
  if (view && webmap) {
    // eslint-disable-next-line no-console
    console.warn("MapView.ts: MapView has already been initialized.");

    return { view, webmap };
  }

  try {
    webmap = new WebMap({
      portalItem: {
        id: CONFIG.webMapId,
      },
    });

    view = new MapView({
      container: containerId,
      map: webmap,
      popup: {
        dockEnabled: true,
        dockOptions: {
          buttonEnabled: false,
          breakpoint: false,
        },
      },
      ui: {
        components: ["zoom", "compass", "attribution"],
      },
      constraints: {
        rotationEnabled: false,
      },
    });

    await view.when();

    setupEventHandlers(view);

    return { view, webmap };
  } catch (error) {
    console.error("MapView.ts: Error initializing MapView or WebMap:", error);

    if (view) {
      view.destroy();
      view = null;
    }

    webmap = null;

    const mapContainer = document.getElementById(containerId);

    if (mapContainer) {
      mapContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 20px; text-align: center; background: #f5f5f5;">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ff4d4f" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h2 style="color: #ff4d4f; margin: 16px 0 8px;">Error Loading Map</h2>
          <p style="color: #666; max-width: 400px;">
            ${error instanceof Error ? error.message : String(error)}
          </p>
          <p style="color: #999; font-size: 14px; margin-top: 16px;">
            Please check the WebMap ID and ensure it is publicly accessible.
          </p>
        </div>
      `;
    }

    throw error;
  }
}

function setupEventHandlers(mapView: __esri.MapView): void {
  mapView.watch("stationary", (stationary: boolean) => {
    if (stationary && import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("MapView: View is stationary.");
    }
  });

  mapView.on("click", (event: __esri.ViewClickEvent) => {
    void (async () => {
      try {
        const response = await mapView.hitTest(event);

        if (response.results.length > 0) {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.log("MapView: Features clicked:", response.results);
          }
        }
      } catch (error) {
        console.error("MapView: Error during hit test:", error);
      }
    })();
  });

  mapView.map.layers.on("change", () => {
    const visibleLayers = mapView.map.layers
      .filter((layer: Layer) => layer.visible === true)
      .map((layer: Layer) => layer.title);
    
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("MapView: Visible layers:", visibleLayers);
    }
  });
}

export function getMapView(): __esri.MapView | null {
  return view;
}

export function getWebMap(): __esri.WebMap | null {
  return webmap;
}

export function isMapInitialized(): boolean {
  return view !== null && webmap !== null;
}

export function destroyMapView(): void {
  if (view) {
    view.destroy();
    view = null;
  }
  webmap = null;
}

export async function updateMapExtent(
  extent: __esri.Extent,
  options?: __esri.GoToOptions2D
): Promise<void> {
  if (view === null) {
    throw new Error("MapView not initialized");
  }

  await view.goTo(extent, options);
}

export async function takeMapScreenshot(
  options?: __esri.MapViewTakeScreenshotOptions
): Promise<__esri.Screenshot> {
  if (view === null) {
    throw new Error("MapView not initialized");
  }

  return view.takeScreenshot(options);
}