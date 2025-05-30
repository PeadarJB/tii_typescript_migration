// SwipeControlsUI.js
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
                    Layer Comparison Tool <span id="swipe-toggle-icon" class="swipe-toggle-icon">&#9660;</span> </button>
                <div id="swipe-panel-collapsible-content" class="swipe-panel-collapsible-content" style="display: none;">
                    <div class="control-group">
                        <label for="left-layer-select">Left/Top Layer:</label>
                        <select id="left-layer-select">
                            <option value="">Select a layer...</option>
                        </select>
                    </div>
                    
                    <div class="control-group">
                        <label for="right-layer-select">Right/Bottom Layer:</label>
                        <select id="right-layer-select">
                            <option value="">Select a layer...</option>
                        </select>
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
                        <button id="remove-swipe-btn" class.btn btn-secondary" disabled>Remove Swipe</button>
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
            leftLayerSelect: document.getElementById('left-layer-select'),
            rightLayerSelect: document.getElementById('right-layer-select'),
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
        const { leftLayerSelect, rightLayerSelect } = this.elements;
        
        this.webmap.layers.forEach(layer => {
            // Create option for left dropdown
            const leftOption = document.createElement('option');
            leftOption.value = layer.title;
            leftOption.textContent = layer.title;
            leftLayerSelect.appendChild(leftOption);
            
            // Create option for right dropdown
            const rightOption = document.createElement('option');
            rightOption.value = layer.title;
            rightOption.textContent = layer.title;
            rightLayerSelect.appendChild(rightOption);
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
        } else {
            swipePanelCollapsibleContent.style.display = 'none';
            swipeToggleIcon.innerHTML = '&#9660;'; // Down arrow
        }
    }

    // Handle create swipe button click
    async handleCreateSwipe() {
        const {
            leftLayerSelect,
            rightLayerSelect,
            directionSelect,
            positionSlider,
            createSwipeBtn,
            removeSwipeBtn,
            swipeStatus
        } = this.elements;

        const leftLayer = leftLayerSelect.value;
        const rightLayer = rightLayerSelect.value;
        const direction = directionSelect.value;
        const position = parseInt(positionSlider.value);

        // Validation
        if (!leftLayer || !rightLayer) {
            this.showStatus('Please select both layers for comparison.', 'error');
            return;
        }

        if (leftLayer === rightLayer) {
            this.showStatus('Please select different layers for comparison.', 'error');
            return;
        }

        // Show loading
        this.showStatus('Creating swipe widget...', 'loading');
        createSwipeBtn.disabled = true;

        try {
            const success = await this.swipeManager.initializeSwipe(leftLayer, rightLayer, position, direction);
            
            if (success) {
                this.showStatus('✓ Swipe widget created successfully!', 'success');
                this.setSwipeActiveState(true);
            } else {
                this.showStatus('Failed to create swipe widget. Check console for details.', 'error');
                createSwipeBtn.disabled = false;
            }
        } catch (error) {
            console.error('SwipeControlsUI: Error creating swipe widget:', error);
            this.showStatus('Error creating swipe widget. Check console for details.', 'error');
            createSwipeBtn.disabled = false;
        }
    }

    // Handle remove swipe button click
    handleRemoveSwipe() {
        const success = this.swipeManager.destroy();
        
        if (success) {
            this.showStatus('Swipe widget removed.', 'info');
            this.setSwipeActiveState(false);
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