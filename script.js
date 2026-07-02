const canvas = document.getElementById('matu-canvas');
const context = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}

resizeCanvas();

function drawGrid() {
    const grid_size = 32;
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = '#2C2C33';
    context.lineWidth = 1;

    for (let x = 0; x < canvas.width; x += grid_size) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, canvas.height);
        context.stroke();
    }

    for (let y = 0; y < canvas.height; y += grid_size) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(canvas.width, y);
        context.stroke();
    }
}

drawGrid();