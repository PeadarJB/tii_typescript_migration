// Import Node.js path module for file path operations
const path = require("path");
// Plugin to generate HTML files and inject webpack bundles
const HtmlWebpackPlugin = require("html-webpack-plugin");
// Plugin to clean/delete the output directory before each build
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
// ArcGIS-specific webpack plugin for optimizing ArcGIS Maps SDK builds
const ArcGISPlugin = require("@arcgis/webpack-plugin");
// Plugin to copy files and directories during the build process
const CopyWebpackPlugin = require("copy-webpack-plugin");

// Export the webpack configuration object
module.exports = {
    // Entry point - the main JavaScript file where webpack starts building the dependency graph
    entry: "./src/main.js", // Your main JavaScript entry file
    
    // Output configuration - where and how webpack should output the bundles
    output: {
        filename: "bundle.js", // Name of the output JavaScript bundle
        path: path.resolve(__dirname, "dist"), // Absolute path to output directory
    },
    
    // Generate source maps for easier debugging (maps minified code back to original)
    devtool: "source-map", // For easier debugging
    
    // Module rules - how webpack should process different file types
    module: {
        rules: [
            {
                // Rule for CSS files - matches files ending in .css
                test: /\.css$/,
                // Use style-loader to inject CSS into DOM and css-loader to process CSS imports
                use: ["style-loader", "css-loader"],
            },
            // If you plan to use TypeScript, you'll add a rule for .ts files here
            // e.g., { test: /\.tsx?$/, loader: "ts-loader", exclude: /node_modules/ }
        ],
    },
    
    // Plugins extend webpack's functionality
    plugins: [
        // Cleans the dist folder before each build to remove old files
        new CleanWebpackPlugin(), // Cleans the dist folder before each build
        
        // Optimizes ArcGIS Maps SDK for JavaScript builds (handles AMD modules, etc.)
        new ArcGISPlugin(), // Optimizes ArcGIS Maps SDK for JavaScript builds
        
        // Generates an HTML file and automatically injects webpack bundles
        new HtmlWebpackPlugin({
            template: "./src/index.html", // Source HTML template file
            filename: "index.html",       // Name of generated HTML file in output
            chunksSortMode: "none",       // Don't sort chunks (good for ArcGIS builds)
        }),
        
        // Copies static assets from source to destination
        new CopyWebpackPlugin({ // Copies Calcite assets
            patterns: [
                {
                    // Copy Calcite Components assets (icons, fonts, etc.) to output directory
                    from: "node_modules/@esri/calcite-components/dist/calcite/assets",
                    to: "assets/calcite/assets"
                }
            ]
        })
    ],
    
    // Configure how webpack resolves modules
    resolve: {
        // Directories where webpack should look for modules
        modules: [path.resolve(__dirname, "src"), "node_modules"],
        // File extensions webpack should resolve automatically
        extensions: [".js", ".css"], // Add .ts, .tsx if using TypeScript
    },
    
    // Development server configuration
    devServer: {
        static: {
            // Directory to serve static files from
            directory: path.join(__dirname, "dist"),
        },
        compress: true, // Enable gzip compression
        port: 3001, // Port for the development server
        hot: true, // Enable Hot Module Replacement (updates without full page reload)
    },
    
    
};
