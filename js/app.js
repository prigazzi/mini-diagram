import FlowchartBlock from './FlowchartBlock.js';
import Connection from './Connection.js';
import Canvas from './Canvas.js';
import StateManager from './StateManager.js';

class FlowchartApp {
    constructor() {
        this.canvas = new Canvas(document.getElementById('canvas'));
        this.stateManager = new StateManager();
        this.blocks = [];
        this.connections = [];
        this.activeBlock = null;
        this.draggedConnection = null;
        this.tempConnectionEnd = null;
        this.draggedBlockType = null; // Track the type of block being dragged from sidebar
        this.previewBlock = null; // Add preview block tracking
        this.lastClickTime = 0;
        this.editingBlock = null;

        this.setupEventListeners();
        this.loadSavedState();
        this.startRenderLoop();
    }

    loadSavedState() {
        const savedState = this.stateManager.loadFromURL();
        if (savedState) {
            // Create blocks
            savedState.blocks.forEach(block => {
                this.blocks.push(new FlowchartBlock(block.t, block.x, block.y));
            });

            // Create connections
            savedState.connections.forEach(conn => {
                this.connections.push(new Connection(
                    this.blocks[conn.s],
                    conn.sk,
                    this.blocks[conn.e],
                    conn.ek
                ));
            });
        }
    }

    updateState() {
        this.stateManager.updateURL(this.blocks, this.connections);
    }

    setupEventListeners() {
        // Block creation from sidebar
        document.querySelectorAll('.block-icon').forEach(icon => {
            // Replace click with mousedown for drag start
            icon.addEventListener('mousedown', (e) => {
                e.preventDefault(); // Prevent text selection while dragging
                this.draggedBlockType = e.currentTarget.dataset.type;
                
                // Create preview block at current mouse position
                const rect = this.canvas.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this.previewBlock = new FlowchartBlock(this.draggedBlockType, x, y);
                
                // Add temporary event listeners for drag operation
                document.addEventListener('mousemove', this.handleSidebarDrag);
                document.addEventListener('mouseup', this.handleSidebarDrop);
                
                // Change cursor during drag
                document.body.style.cursor = 'grabbing';
            });
        });

        // Canvas mouse events
        this.canvas.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // Click outside handler
        document.addEventListener('click', (e) => {
            if (e.target !== this.canvas.canvas) {
                this.connections.forEach(conn => conn.isSelected = false);
            }
        });

        // Bind the sidebar drag handlers to maintain 'this' context
        this.handleSidebarDrag = this.handleSidebarDrag.bind(this);
        this.handleSidebarDrop = this.handleSidebarDrop.bind(this);

        // Add keyboard event listener for text editing
        document.addEventListener('keydown', (e) => {
            if (this.editingBlock) {
                this.editingBlock.handleKeyPress(e.key);
                if (e.key !== 'F5' && e.key !== 'F12') {
                    e.preventDefault(); // Prevent default for most keys while editing
                }
                this.updateState();
            }
        });
    }

    handleSidebarDrag = (e) => {
        if (this.draggedBlockType && this.previewBlock) {
            const rect = this.canvas.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Update preview block position
            this.previewBlock.x = x;
            this.previewBlock.y = y;
            this.previewBlock.updateConnections();
            
            document.body.style.cursor = 'grabbing';
        }
    }

    handleSidebarDrop = (e) => {
        if (this.draggedBlockType && this.previewBlock) {
            const rect = this.canvas.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (e.target === this.canvas.canvas || this.canvas.canvas.contains(e.target)) {
                this.blocks.push(new FlowchartBlock(this.draggedBlockType, x, y));
                this.updateState(); // Update state when adding a block
            }

            this.draggedBlockType = null;
            this.previewBlock = null;
            document.body.style.cursor = 'default';
            document.removeEventListener('mousemove', this.handleSidebarDrag);
            document.removeEventListener('mouseup', this.handleSidebarDrop);
        }
    }

    handleMouseDown(e) {
        const pos = this.canvas.getMousePosition(e);
        const currentTime = new Date().getTime();
        const isDoubleClick = (currentTime - this.lastClickTime) < 300;
        this.lastClickTime = currentTime;

        // Check for block delete button first
        for (let i = this.blocks.length - 1; i >= 0; i--) {
            const block = this.blocks[i];
            if (block.isPointOnDeleteButton(pos.x, pos.y)) {
                // Remove all connections related to this block
                this.connections = this.connections.filter(conn => 
                    conn.startBlock !== block && conn.endBlock !== block
                );
                // Remove the block
                this.blocks.splice(i, 1);
                this.updateState();
                return;
            }
        }

        // Check for connection delete button
        for (let i = this.connections.length - 1; i >= 0; i--) {
            const conn = this.connections[i];
            if (conn.isPointOnDeleteButton(pos.x, pos.y)) {
                this.connections.splice(i, 1);
                this.updateState();
                return;
            }
        }

        // Check if clicking on a connection line
        for (const conn of this.connections) {
            if (conn.isPointNearLine(pos.x, pos.y)) {
                this.connections.forEach(c => c.isSelected = false);
                this.blocks.forEach(b => b.isSelected = false);
                conn.isSelected = !conn.isSelected;
                if (this.editingBlock) {
                    this.editingBlock.stopEditing();
                    this.editingBlock = null;
                }
                return;
            }
        }

        // Check for block selection and double-click
        for (let i = this.blocks.length - 1; i >= 0; i--) {
            const block = this.blocks[i];
            if (block.isPointInside(pos.x, pos.y)) {
                // Check if clicking on a connection point
                const connection = block.getConnectionAtPoint(pos.x, pos.y);
                if (connection) {
                    this.draggedConnection = { block, ...connection };
                    return;
                }

                // Handle block selection and double-click
                this.connections.forEach(c => c.isSelected = false);
                this.blocks.forEach(b => {
                    if (b !== block) b.isSelected = false;
                });
                block.isSelected = true;

                if (isDoubleClick) {
                    // Stop editing any other block
                    if (this.editingBlock && this.editingBlock !== block) {
                        this.editingBlock.stopEditing();
                    }
                    // Start editing this block
                    block.startEditing();
                    this.editingBlock = block;
                    return;
                }

                // Set up dragging
                this.activeBlock = block;
                block.isDragging = true;
                block.dragOffset.x = pos.x - block.x;
                block.dragOffset.y = pos.y - block.y;
                return;
            }
        }

        // If we clicked empty space, deselect everything and stop editing
        this.connections.forEach(conn => conn.isSelected = false);
        this.blocks.forEach(block => block.isSelected = false);
        if (this.editingBlock) {
            this.editingBlock.stopEditing();
            this.editingBlock = null;
            this.updateState();
        }
    }

    handleMouseMove(e) {
        const pos = this.canvas.getMousePosition(e);

        // Handle block dragging
        if (this.activeBlock && this.activeBlock.isDragging) {
            this.activeBlock.x = pos.x - this.activeBlock.dragOffset.x;
            this.activeBlock.y = pos.y - this.activeBlock.dragOffset.y;
            this.activeBlock.updateConnections();
        }

        // Handle connection dragging
        if (this.draggedConnection) {
            this.tempConnectionEnd = pos;
        }

        // Reset hover states
        let hoveredAny = false;
        let isOverConnection = false;
        let isOverBlock = false;

        // Check blocks and their connections
        this.blocks.forEach(block => {
            // Reset connection hover state
            block.hoveredConnection = null;
            
            // Check for connection point hover
            if (block.checkConnectionHover(pos.x, pos.y)) {
                hoveredAny = true;
                isOverConnection = true;
            }
            
            // Check for block hover
            block.isHovered = block.isPointInside(pos.x, pos.y);
            if (block.isHovered) {
                hoveredAny = true;
                isOverBlock = true;
            }
        });

        // Check connections
        this.connections.forEach(conn => {
            conn.isHovered = conn.isPointNearLine(pos.x, pos.y);
            if (conn.isHovered) hoveredAny = true;
        });

        // Update cursor based on what's being hovered
        if (!hoveredAny) {
            this.canvas.canvas.style.cursor = 'default';
        } else if (isOverConnection) {
            this.canvas.canvas.style.cursor = 'pointer';
        } else if (isOverBlock) {
            this.canvas.canvas.style.cursor = 'move';
        } else {
            this.canvas.canvas.style.cursor = 'pointer';
        }
    }

    handleMouseUp(e) {
        const pos = this.canvas.getMousePosition(e);

        if (this.draggedConnection) {
            for (const block of this.blocks) {
                if (block !== this.draggedConnection.block) {
                    const endConnection = block.getConnectionAtPoint(pos.x, pos.y);
                    if (endConnection) {
                        this.connections.push(new Connection(
                            this.draggedConnection.block,
                            this.draggedConnection.key,
                            block,
                            endConnection.key
                        ));
                        this.updateState(); // Update state when adding a connection
                    }
                }
            }
            this.draggedConnection = null;
            this.tempConnectionEnd = null;
        }

        if (this.activeBlock) {
            this.activeBlock.isDragging = false;
            this.activeBlock = null;
            this.updateState(); // Update state when finishing block drag
        }
    }

    render() {
        this.canvas.clear();
        this.canvas.drawGrid();
        
        this.blocks.forEach(block => block.draw(this.canvas.ctx));
        this.connections.forEach(conn => conn.draw(this.canvas.ctx));
        
        // Draw preview block with semi-transparency
        if (this.previewBlock) {
            this.canvas.ctx.globalAlpha = 0.6;
            this.previewBlock.draw(this.canvas.ctx);
            this.canvas.ctx.globalAlpha = 1.0;
        }
        
        if (this.draggedConnection && this.tempConnectionEnd) {
            this.canvas.ctx.beginPath();
            this.canvas.ctx.setLineDash([5, 5]);
            const startConn = this.draggedConnection.point;
            this.canvas.ctx.moveTo(startConn.x, startConn.y);
            this.canvas.ctx.lineTo(this.tempConnectionEnd.x, this.tempConnectionEnd.y);
            this.canvas.ctx.strokeStyle = '#000';
            this.canvas.ctx.stroke();
            this.canvas.ctx.setLineDash([]);
        }
    }

    startRenderLoop() {
        const animate = () => {
            this.render();
            requestAnimationFrame(animate);
        };
        animate();
    }
}

// Initialize the application
new FlowchartApp(); 