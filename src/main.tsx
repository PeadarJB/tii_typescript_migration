import ReactDOM from 'react-dom/client';
import App from './App';
import esriConfig from '@arcgis/core/config.js'; // Import esriConfig

// Set the API key from environment variables
const arcgisApiKey = import.meta.env.VITE_ARCGIS_API_KEY;
if (arcgisApiKey) {
  esriConfig.apiKey = arcgisApiKey;
} else {
  console.warn("ArcGIS API key is not set. Private resources may not be accessible.");
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <App />
  );
} else {
  throw new Error("Root element with id 'root' not found.");
}