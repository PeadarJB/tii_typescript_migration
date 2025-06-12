// SwipeControlsUI.js
import { CONFIG } from '../config/appConfig.js';
import {animate, stagger} from 'animejs'; 
// This component handles all the UI elements and user interactions for the swipe widget

export class SwipeControlsUI {
    constructor(containerId, swipeManager, webmap) {
        this.containerId = containerId;
        this.swipeManager = swipeManager;
        this.webmap = webmap;
        this.container = null;
        this.elements = {}; // Store references to DOM elements
        this.isSwipeContentVisible = false; // Track visibility state
    }

    // Initialize the UI - creates HTML and sets up event listeners
    async initialize() {
        try {
            this.createContainer();
            this.createHTML();
            this.populateLayerOptions(); // This will now use our new logic
            this.setupEventListeners();
            console.log("SwipeControlsUI: Successfully initialized");
            return true;
        } catch (error) {
            console.error("SwipeControlsUI: Failed to initialize", error);
            return false;
        }
    }

    // Create or find the container element
    createContainer() {
        this.container = document.getElementById(this.containerId);
        
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = this.containerId;
            // Note: The main container class 'swipe-controls' was removed as we are now styling '#swipe-controls-container' directly
            
            const filterContainer = document.getElementById('filter-controls-container');
            if (filterContainer) {
                filterContainer.parentNode.insertBefore(this.container, filterContainer.nextSibling);
            } else {
                document.body.appendChild(this.container);
            }
        }
    }

    // Create the HTML structure
    createHTML() {
        this.container.innerHTML = `
            <div class="swipe-control-panel">
                <button id="swipe-panel-toggle-btn" class="swipe-panel-toggle">
                    Layer Comparison Tool 
                    <span id="swipe-toggle-icon" class="swipe-toggle-icon">&#9660;</span>
                </button>
                <div id="swipe-panel-collapsible-content" class="swipe-panel-collapsible-content" style="display: none;">
                    <div class="control-group">
                        <label>Left/Top Layer(s) (RCP 4.5):</label>
                        <div id="left-layer-checkboxes" class="checkbox-group">
                            {/* Checkboxes will be populated here */}
                        </div>
                    </div>
                    
                    <div class="control-group">
                        <label>Right/Bottom Layer(s) (RCP 8.5):</label>
                        <div id="right-layer-checkboxes" class="checkbox-group">
                            {/* Checkboxes will be populated here */}
                        </div>
                    </div>
                    
                    <div class="control-group">
                        <label for="direction-select">Swipe Direction:</label>
                        <select id="direction-select" class="esri-select">
                            <option value="horizontal">Horizontal (Left/Right)</option>
                            <option value="vertical">Vertical (Up/Down)</option>
                        </select>
                    </div>
                    
                    <div class="control-group">
                        <label for="position-slider">Swipe Position: <span id="position-value">50</span>%</label>
                        <input type="range" id="position-slider" min="0" max="100" value="50">
                    </div>
                    
                    <div class="control-group">
                        <button id="create-swipe-btn" class="btn btn-primary">Create Swipe</button>
                        <button id="remove-swipe-btn" class="btn btn-secondary" disabled>Remove Swipe</button>
                    </div>
                    
                    <div id="swipe-status" class="status-message"></div>
                </div>
            </div>
        `;


        // Store references to elements for easy access
        this.elements = {
            swipePanelToggleBtn: document.getElementById('swipe-panel-toggle-btn'),
            swipeToggleIcon: document.getElementById('swipe-toggle-icon'),
            swipePanelCollapsibleContent: document.getElementById('swipe-panel-collapsible-content'),
            leftLayerCheckboxes: document.getElementById('left-layer-checkboxes'),
            rightLayerCheckboxes: document.getElementById('right-layer-checkboxes'),
            directionSelect: document.getElementById('direction-select'),
            positionSlider: document.getElementById('position-slider'),
            positionValue: document.getElementById('position-value'),
            createSwipeBtn: document.getElementById('create-swipe-btn'),
            removeSwipeBtn: document.getElementById('remove-swipe-btn'),
            swipeStatus: document.getElementById('swipe-status')
        };
    }

    /**
     * MODIFIED: This function now populates the checkboxes from your specific lists.
     */
    populateLayerOptions() {
        const { leftLayerCheckboxes, rightLayerCheckboxes } = this.elements;

        leftLayerCheckboxes.innerHTML = '';
        rightLayerCheckboxes.innerHTML = '';
        
        // Get the layer configuration objects from the central config
        const leftLayers = CONFIG.swipeLayerConfig.leftPanel.layers;
        const rightLayers = CONFIG.swipeLayerConfig.rightPanel.layers;

        // The helper function now accepts a layer object { title, label }
        const createCheckboxItem = (layer) => {
            const label = document.createElement('calcite-label');
            label.className = 'checkbox-label';
            label.layout = 'inline-flex';

            const checkbox = document.createElement('calcite-checkbox');
            
            // The internal value of the checkbox MUST be the actual layer title
            checkbox.value = layer.title; 
            
            label.appendChild(checkbox);

            // The visible text is now the user-friendly label
            label.append(` ${layer.label}`); 

            return label;
        };

        // Populate the lists using the new structure
        leftLayers.forEach(layer => {
            leftLayerCheckboxes.appendChild(createCheckboxItem(layer));
        });

        rightLayers.forEach(layer => {
            rightLayerCheckboxes.appendChild(createCheckboxItem(layer));
        });
    }

    /**
     * NEW: This function un-ticks all checkboxes.
     */
    clearAllCheckboxes() {
        const checkboxes = this.container.querySelectorAll('calcite-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
    }

    // Setup all event listeners
    setupEventListeners() {
        // ... (this function's content remains the same) ...
        const {
            swipePanelToggleBtn,
            directionSelect,
            positionSlider,
            positionValue,
            createSwipeBtn,
            removeSwipeBtn,
        } = this.elements;
        swipePanelToggleBtn.addEventListener('click', () => this.toggleSwipePanel());
        positionSlider.addEventListener('input', (e) => {
            const position = e.target.value;
            positionValue.textContent = position;
            if (this.swipeManager.isActive()) {
                this.swipeManager.updatePosition(parseInt(position));
            }
        });
        directionSelect.addEventListener('change', (e) => {
            const direction = e.target.value;
            if (this.swipeManager.isActive()) {
                this.swipeManager.updateDirection(direction);
            }
        });
        createSwipeBtn.addEventListener('click', () => this.handleCreateSwipe());
        removeSwipeBtn.addEventListener('click', () => this.handleRemoveSwipe());
    }

    toggleSwipePanel() {
        // ... (this function's content remains the same) ...
        this.isSwipeContentVisible = !this.isSwipeContentVisible;
        const { swipePanelCollapsibleContent, swipeToggleIcon } = this.elements;
        if (this.isSwipeContentVisible) {
            swipePanelCollapsibleContent.style.display = 'flex';
            swipeToggleIcon.innerHTML = '&#9650;'; 
            const elementsToAnimate = swipePanelCollapsibleContent.children;
            for (const el of elementsToAnimate) {
                el.style.opacity = 0;
            }
            animate(
                elementsToAnimate,
                {
                    x: [200, 0], 
                    opacity: [1],
                    delay: stagger(70),
                    duration: 300,
                });
        } else {
            swipePanelCollapsibleContent.style.display = 'none';
            swipeToggleIcon.innerHTML = '&#9660;';
        }
    }
    
    getCheckedValues(container) {
        // ... (this function's content remains the same) ...
        const checkedValues = [];
        const checkboxes = container.querySelectorAll('calcite-checkbox');
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                checkedValues.push(checkbox.value);
            }
        });
        return checkedValues;
    }

    async handleCreateSwipe() {
        // ... (this function's content remains the same) ...
        const {
            leftLayerCheckboxes, 
            rightLayerCheckboxes, 
            directionSelect,
            positionSlider,
            createSwipeBtn,
        } = this.elements;
        const leftLayerTitles = this.getCheckedValues(leftLayerCheckboxes);
        const rightLayerTitles = this.getCheckedValues(rightLayerCheckboxes);
        const direction = directionSelect.value;
        const position = parseInt(positionSlider.value);
        if (leftLayerTitles.length === 0 || rightLayerTitles.length === 0) {
            this.showStatus('Please select at least one layer for each side.', 'error');
            return;
        }
        const commonLayers = leftLayerTitles.filter(title => rightLayerTitles.includes(title));
        if (commonLayers.length > 0) {
            this.showStatus(`Layer(s) "${commonLayers.join(', ')}" cannot be selected on both sides.`, 'error');
            return;
        }
        this.showStatus('Creating swipe widget...', 'loading');
        createSwipeBtn.disabled = true;
        try {
            const success = await this.swipeManager.initializeSwipe(leftLayerTitles, rightLayerTitles, position, direction);
            if (success) {
                this.showStatus('✓ Swipe widget created successfully!', 'success');
                this.setSwipeActiveState(true);
                if (this.isSwipeContentVisible) {
                    this.toggleSwipePanel();
                }
            } else {
                this.showStatus('Failed to create swipe widget. Check console for details.', 'error');
                createSwipeBtn.disabled = false;
            }
        } catch (error) {
            console.error('SwipeControlsUI: Error creating swipe widget:', error);
            this.showStatus(`Error: ${error.message || 'Check console for details.'}`, 'error');
            createSwipeBtn.disabled = false;
        }
    }

    /**
     * MODIFIED: This function now calls clearAllCheckboxes().
     */
    handleRemoveSwipe() {
        const success = this.swipeManager.destroy();
        
        if (success) {
            this.showStatus('Swipe widget removed.', 'info');
            this.setSwipeActiveState(false);
            this.clearAllCheckboxes(); // Untick all the boxes

            if (this.isSwipeContentVisible) {
                this.toggleSwipePanel();
            }
        }
    }

    setSwipeActiveState(isActive) {
        // ... (this function's content remains the same) ...
        const {
            createSwipeBtn,
            removeSwipeBtn
        } = this.elements;
        createSwipeBtn.disabled = isActive;
        removeSwipeBtn.disabled = !isActive;
    }

    showStatus(message, type = 'info') {
        // ... (this function's content remains the same) ...
        const { swipeStatus } = this.elements;
        const colors = {
            error: 'red',
            success: 'green',
            loading: 'blue',
            info: 'blue'
        };
        swipeStatus.innerHTML = `<span style="color: ${colors[type]};">${message}</span>`;
    }

    destroy() {
        // ... (this function's content remains the same) ...
        if (this.container) {
            this.container.remove();
        }
        this.elements = {};
        this.container = null;
    }
}