class FlowchartBlock {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = 120;
        this.height = 80;
        this.connections = this.createConnections();
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.isHovered = false;
        this.hoveredConnection = null;
        this.isSelected = false;
        this.text = '';
        this.isEditing = false;
        this.editingText = '';
        this.cursorVisible = true;
        this.lastCursorBlink = 0;
    }

    createConnections() {
        return {
            top: { x: this.x + this.width/2, y: this.y },
            right: { x: this.x + this.width, y: this.y + this.height/2 },
            bottom: { x: this.x + this.width/2, y: this.y + this.height },
            left: { x: this.x, y: this.y + this.height/2 }
        };
    }

    updateConnections() {
        this.connections.top = { x: this.x + this.width/2, y: this.y };
        this.connections.right = { x: this.x + this.width, y: this.y + this.height/2 };
        this.connections.bottom = { x: this.x + this.width/2, y: this.y + this.height };
        this.connections.left = { x: this.x, y: this.y + this.height/2 };
    }

    startEditing() {
        this.isEditing = true;
        this.editingText = this.text;
        this.cursorVisible = true;
        this.lastCursorBlink = Date.now();
    }

    stopEditing() {
        this.isEditing = false;
        this.text = this.editingText;
        this.editingText = '';
    }

    handleKeyPress(key) {
        if (!this.isEditing) return;

        if (key === 'Enter') {
            this.stopEditing();
        } else if (key === 'Backspace') {
            this.editingText = this.editingText.slice(0, -1);
        } else if (key === 'Escape') {
            this.isEditing = false;
            this.editingText = '';
        } else if (key.length === 1) { // Single character
            // Only add character if text width won't exceed block width
            const tempText = this.editingText + key;
            const ctx = document.querySelector('canvas').getContext('2d');
            ctx.font = '14px Arial';
            const textWidth = ctx.measureText(tempText).width;
            if (textWidth < this.width - 20) {
                this.editingText += key;
            }
        }
    }

    draw(ctx) {
        ctx.strokeStyle = this.isHovered || this.isSelected ? '#4a90e2' : '#000';
        ctx.lineWidth = this.isHovered || this.isSelected ? 3 : 2;
        
        switch(this.type) {
            case 'input':
                ctx.beginPath();
                ctx.moveTo(this.x + 20, this.y);
                ctx.lineTo(this.x + this.width, this.y);
                ctx.lineTo(this.x + this.width, this.y + this.height);
                ctx.lineTo(this.x + 20, this.y + this.height);
                ctx.lineTo(this.x, this.y + this.height/2);
                ctx.closePath();
                break;
            case 'process':
                ctx.beginPath();
                ctx.rect(this.x, this.y, this.width, this.height);
                break;
            case 'decision':
                ctx.beginPath();
                ctx.moveTo(this.x + this.width/2, this.y);
                ctx.lineTo(this.x + this.width, this.y + this.height/2);
                ctx.lineTo(this.x + this.width/2, this.y + this.height);
                ctx.lineTo(this.x, this.y + this.height/2);
                ctx.closePath();
                break;
            case 'output':
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x + this.width - 20, this.y);
                ctx.lineTo(this.x + this.width, this.y + this.height/2);
                ctx.lineTo(this.x + this.width - 20, this.y + this.height);
                ctx.lineTo(this.x, this.y + this.height);
                ctx.closePath();
                break;
        }
        
        ctx.stroke();

        // Draw text or editing interface
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const centerX = this.x + this.width/2;
        const centerY = this.y + this.height/2;

        if (this.isEditing) {
            // Draw editing background
            ctx.fillStyle = '#f0f0f0';
            const padding = 5;
            const textWidth = ctx.measureText(this.editingText).width;
            const bgWidth = Math.max(60, textWidth + 2 * padding);
            ctx.fillRect(
                centerX - bgWidth/2,
                centerY - 12,
                bgWidth,
                24
            );

            // Draw editing text
            ctx.fillStyle = '#000';
            ctx.fillText(this.editingText, centerX, centerY);

            // Draw cursor
            if (this.cursorVisible) {
                const textWidth = ctx.measureText(this.editingText).width;
                const cursorX = centerX + textWidth/2 + 2;
                ctx.beginPath();
                ctx.moveTo(cursorX, centerY - 8);
                ctx.lineTo(cursorX, centerY + 8);
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Blink cursor
            if (Date.now() - this.lastCursorBlink > 500) {
                this.cursorVisible = !this.cursorVisible;
                this.lastCursorBlink = Date.now();
            }
        } else if (this.text) {
            ctx.fillStyle = '#000';
            ctx.fillText(this.text, centerX, centerY);
        }

        // Draw connection points
        Object.entries(this.connections).forEach(([key, conn]) => {
            ctx.beginPath();
            ctx.arc(conn.x, conn.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = (this.hoveredConnection === key) ? '#000' : '#fff';
            ctx.fill();
            ctx.stroke();
        });

        // Draw delete button if selected
        if (this.isSelected) {
            const buttonX = this.x + this.width - 12;
            const buttonY = this.y + 12;
            
            // Draw white circle background
            ctx.beginPath();
            ctx.arc(buttonX, buttonY, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.strokeStyle = '#ff4444';
            ctx.stroke();
            
            // Draw X
            ctx.beginPath();
            ctx.moveTo(buttonX - 4, buttonY - 4);
            ctx.lineTo(buttonX + 4, buttonY + 4);
            ctx.moveTo(buttonX + 4, buttonY - 4);
            ctx.lineTo(buttonX - 4, buttonY + 4);
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    isPointInside(x, y) {
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }

    getConnectionAtPoint(x, y, radius = 10) {
        for (const [key, conn] of Object.entries(this.connections)) {
            const distance = Math.sqrt(
                Math.pow(x - conn.x, 2) + Math.pow(y - conn.y, 2)
            );
            if (distance <= radius) {
                return { key, point: conn };
            }
        }
        return null;
    }

    checkConnectionHover(x, y) {
        const connection = this.getConnectionAtPoint(x, y);
        this.hoveredConnection = connection ? connection.key : null;
        return this.hoveredConnection !== null;
    }

    isPointOnDeleteButton(x, y) {
        if (!this.isSelected) return false;
        const buttonX = this.x + this.width - 12;
        const buttonY = this.y + 12;
        const radius = 8;
        const distance = Math.sqrt(
            Math.pow(x - buttonX, 2) + 
            Math.pow(y - buttonY, 2)
        );
        return distance <= radius;
    }
}

export default FlowchartBlock; 