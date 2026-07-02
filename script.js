// draw viewport grid
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

// add asset button
const add_asset = document.getElementById('add-assets');
const asset_input = document.getElementById('asset-input');
const asset_list = document.getElementById('asset-list');

let asset_names = new Set();
let asset_files = new Map();

function getName(name) {
    if (!asset_names.has(name)) {
        return name;
    }

    let base = name;
    let extension = '';

    const dot_index = name.lastIndexOf('.');
    if (dot_index !== -1) {
        base = name.substring(0, dot_index);
        extension = name.substring(dot_index);
    }

    let counter = 1;
    let new_name = `${base}(${counter})${extension}`;

    while (asset_names.has(new_name)) {
        counter++;
        new_name = `${base}(${counter})${extension}`;
    }

    return new_name;
}

function shortenName(name, max_length = 14) {
    const dot_index = name.lastIndexOf('.');
    const extension = dot_index !== -1 ? name.slice(dot_index) : '';
    const base = dot_index !== -1 ? name.slice(0, dot_index) : name;

    if (name.length <= max_length) return name;

    const keep = max_length - extension.length - 3;
    const start = Math.ceil(keep / 2);
    const end = Math.floor(keep / 2);

    return base.slice(0, start) + '...' + base.slice(base.length - end) + extension;
}

add_asset.addEventListener('click', () => {
    asset_input.click();
});

asset_input.addEventListener('change', () => {
    const files = Array.from(asset_input.files);
    files.forEach(file => {
        const unique_name = getName(file.name);
        asset_names.add(unique_name);

        asset_files.set(unique_name, file);

        const item = document.createElement('div');
        item.classList.add('asset-item');

        let thumbnail;
        if (file.type.startsWith('image/')) {
            thumbnail = document.createElement('img');
            thumbnail.classList.add('asset-thumb');
            thumbnail.src = URL.createObjectURL(file);
        } else if (file.type.startsWith('audio/')) {
            thumbnail = document.createElement('div');
            thumbnail.classList.add('asset-audio-thumb');
            thumbnail.textContent = '🎵';
        } else {
            thumbnail = document.createElement('div');
            thumbnail.classList.add('asset-generic-thumb');
            thumbnail.textContent = '📄';
        }

        const label = document.createElement('div');
        label.classList.add('asset-label');
        label.textContent = shortenName(unique_name);

        item.appendChild(thumbnail);
        item.appendChild(label);
        asset_list.appendChild(item);
    });

    asset_input.value = "";
});