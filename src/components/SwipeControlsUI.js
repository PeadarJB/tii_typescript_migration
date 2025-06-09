// SwipeControlsUI.js

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
            this.populateLayerOptions();
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
            this.container.className = 'swipe-controls';
            
            // Add it after the filter controls or to body
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
                    Layer Comparison Tool <span id="swipe-toggle-icon" class="swipe-toggle-icon">&#9660;</span>
                </button>
                <div id="swipe-panel-collapsible-content" class="swipe-panel-collapsible-content" style="display: none;">
                    <div class="control-group">
                        <label>Left/Top Layer(s):</label>
                        <div id="left-layer-checkboxes" class="checkbox-group">
                            {/* Checkboxes will be populated here */}
                        </div>
                    </div>
                    
                    <div class="control-group">
                        <label>Right/Bottom Layer(s):</label>
                        <div id="right-layer-checkboxes" class="checkbox-group">
                            {/* Checkboxes will be populated here */}
                        </div>
                    </div>
                    
                    <div class="control-group">
                        <label for="direction-select">Swipe Direction:</label>
                        <select id="direction-select">
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
            leftLayerCheckboxes: document.getElementById('left-layer-checkboxes'), // Updated
            rightLayerCheckboxes: document.getElementById('right-layer-checkboxes'), // Updated
            directionSelect: document.getElementById('direction-select'),
            positionSlider: document.getElementById('position-slider'),
            positionValue: document.getElementById('position-value'),
            createSwipeBtn: document.getElementById('create-swipe-btn'),
            removeSwipeBtn: document.getElementById('remove-swipe-btn'),
            swipeStatus: document.getElementById('swipe-status')
        };
    }

    // Populate the layer dropdown options
    populateLayerOptions() {
        const { leftLayerCheckboxes, rightLayerCheckboxes } = this.elements;

        // Clear existing options first
        leftLayerCheckboxes.innerHTML = '';
        rightLayerCheckboxes.innerHTML = '';
        
        this.webmap.layers.forEach(layer => {
            // Function to create a checkbox item
            const createCheckboxItem = (layerTitle) => {
                const label = document.createElement('calcite-label');
                label.className = 'checkbox-label';
                label.layout = 'inline-flex';

                const checkbox = document.createElement('calcite-checkbox');
                checkbox.value = layerTitle;
                
                label.appendChild(checkbox);
                label.append(layerTitle); // Add text next to checkbox

                return label;
            };

            // Add checkbox to both left and right containers
            leftLayerCheckboxes.appendChild(createCheckboxItem(layer.title));
            rightLayerCheckboxes.appendChild(createCheckboxItem(layer.title));
        });
    }

    // Setup all event listeners
    setupEventListeners() {
        const {
            swipePanelToggleBtn,
            directionSelect,
            positionSlider,
            positionValue,
            createSwipeBtn,
            removeSwipeBtn,
        } = this.elements;

        // Toggle button for collapsible content
        swipePanelToggleBtn.addEventListener('click', () => this.toggleSwipePanel());


        // Position slider updates
        positionSlider.addEventListener('input', (e) => {
            const position = e.target.value;
            positionValue.textContent = position;
            
            if (this.swipeManager.isActive()) {
                this.swipeManager.updatePosition(parseInt(position));
            }
        });

        // Direction changes
        directionSelect.addEventListener('change', (e) => {
            const direction = e.target.value;
            
            if (this.swipeManager.isActive()) {
                this.swipeManager.updateDirection(direction);
            }
        });

        // Create swipe button
        createSwipeBtn.addEventListener('click', () => this.handleCreateSwipe());

        // Remove swipe button
        removeSwipeBtn.addEventListener('click', () => this.handleRemoveSwipe());
    }

    // Method to toggle the visibility of the swipe panel content
    toggleSwipePanel() {
        this.isSwipeContentVisible = !this.isSwipeContentVisible;
        const { swipePanelCollapsibleContent, swipeToggleIcon } = this.elements;

        if (this.isSwipeContentVisible) {
            swipePanelCollapsibleContent.style.display = 'block';
            swipeToggleIcon.innerHTML = '&#9650;'; // Up arrow

            // Find all direct child elements to animate (the control groups)
        const elementsToAnimate = swipePanelCollapsibleContent.children;

        // Set initial state before animating
        for (const el of elementsToAnimate) {
            el.style.opacity = 0;
        }

        // Use Anime.js to animate them
        animate(
            elementsToAnimate,
            {
            x: [200, 0], // Animate from 50px to the right to 0
            opacity: [1],      // Fade them in
            delay: stagger(70), // Create the "one by one" effect
            duration: 300,
            //ease: 'inOutCirc',
        });

        } else {
            swipePanelCollapsibleContent.style.display = 'none';
            swipeToggleIcon.innerHTML = '&#9660;'; // Down arrow
        }
    }

    /**
     * ADD THIS METHOD
     * Helper function to get all selected values from a <select multiple> element.
     * @param {HTMLSelectElement} selectElement - The multiple select HTML element.
     * @returns {string[]} An array of selected values.
     */
    
    getCheckedValues(container) {
        const checkedValues = [];
        const checkboxes = container.querySelectorAll('calcite-checkbox');
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                checkedValues.push(checkbox.value);
            }
        });
        return checkedValues;
    }

    // Handle create swipe button click
    async handleCreateSwipe() {
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

        // Validation
        if (leftLayerTitles.length === 0 || rightLayerTitles.length === 0) {
            this.showStatus('Please select at least one layer for each side.', 'error');
            return;
        }

        // Check for overlap between selected layers
        const commonLayers = leftLayerTitles.filter(title => rightLayerTitles.includes(title));
        if (commonLayers.length > 0) {
            this.showStatus(`Layer(s) "${commonLayers.join(', ')}" cannot be selected on both sides.`, 'error');
            return;
        }

        this.showStatus('Creating swipe widget...', 'loading');
        createSwipeBtn.disabled = true;

        try {
            // Pass arrays of titles to the swipeManager
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

    // Handle remove swipe button click
    handleRemoveSwipe() {
        const success = this.swipeManager.destroy();
        
        if (success) {
            this.showStatus('Swipe widget removed.', 'info');
            this.setSwipeActiveState(false);

            if (this.isSwipeContentVisible) {
                    this.toggleSwipePanel();
                }
                
        }
    }

    // Update UI state when swipe is active/inactive
    setSwipeActiveState(isActive) {
        const {
            leftLayerSelect,
            rightLayerSelect,
            createSwipeBtn,
            removeSwipeBtn
        } = this.elements;

        createSwipeBtn.disabled = isActive;
        removeSwipeBtn.disabled = !isActive;
        // leftLayerSelect.disabled = isActive;
        // rightLayerSelect.disabled = isActive;
    }

    // Show status messages with different styles
    showStatus(message, type = 'info') {
        const { swipeStatus } = this.elements;
        const colors = {
            error: 'red',
            success: 'green',
            loading: 'blue',
            info: 'blue'
        };
        
        swipeStatus.innerHTML = `<span style="color: ${colors[type]};">${message}</span>`;
    }

    // Cleanup method
    destroy() {
        if (this.container) {
            this.container.remove();
        }
        this.elements = {};
        this.container = null;
    }
}