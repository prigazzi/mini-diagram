class Connection {
    constructor(startBlock, startConnKey, endBlock, endConnKey) {
        this.startBlock = startBlock;
        this.startConnKey = startConnKey;
        this.endBlock = endBlock;
        this.endConnKey = endConnKey;
        this.isHovered = false;
        this.isSelected = false;
    }

    getMidpoint() {
        const start = this.startBlock.connections[this.startConnKey];
        const end = this.endBlock.connections[this.endConnKey];
        return {
            x: (start.x + end.x) / 2,
            y: (start.y + end.y) / 2
        };
    }

    isPointNearLine(x, y, tolerance = 5) {
        const start = this.startBlock.connections[this.startConnKey];
        const end = this.endBlock.connections[this.endConnKey];
        
        // Calculate distances
        const lineLength = Math.sqrt(
            Math.pow(end.x - start.x, 2) + 
            Math.pow(end.y - start.y, 2)
        );
        
        if (lineLength === 0) return false;
        
        const distance = Math.abs(
            (end.y - start.y) * x - 
            (end.x - start.x) * y + 
            end.x * start.y - 
            end.y * start.x
        ) / lineLength;
        
        // Check if point is within the line segment bounds
        const dotProduct = 
            ((x - start.x) * (end.x - start.x) + 
             (y - start.y) * (end.y - start.y)) / 
            (lineLength * lineLength);
            
        return distance <= tolerance && dotProduct >= 0 && dotProduct <= 1;
    }

    isPointOnDeleteButton(x, y) {
        if (!this.isSelected) return false;
        const mid = this.getMidpoint();
        const buttonRadius = 8;
        return Math.sqrt(
            Math.pow(x - mid.x, 2) + 
            Math.pow(y - mid.y, 2)
        ) <= buttonRadius;
    }

    draw(ctx) {
        const start = this.startBlock.connections[this.startConnKey];
        const end = this.endBlock.connections[this.endConnKey];

        // Draw the connection line
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = this.isHovered ? '#4a90e2' : '#000';
        ctx.lineWidth = this.isHovered ? 3 : 2;
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw delete button if selected
        if (this.isSelected) {
            const mid = this.getMidpoint();
            
            // Draw white circle background
            ctx.beginPath();
            ctx.arc(mid.x, mid.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.strokeStyle = '#ff4444';
            ctx.stroke();
            
            // Draw X
            ctx.beginPath();
            ctx.moveTo(mid.x - 4, mid.y - 4);
            ctx.lineTo(mid.x + 4, mid.y + 4);
            ctx.moveTo(mid.x + 4, mid.y - 4);
            ctx.lineTo(mid.x - 4, mid.y + 4);
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
}

export default Connection; 