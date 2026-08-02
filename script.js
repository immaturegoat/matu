// this is honestly getting very messy and it's getting hard to keep track of things lol, i should've split this into multiple files
// this is me, 5 days later. should i still split this file up? i think this is fine rn
const add_hierarchy = document.getElementById('add-hierarchy');
const hierarchy_dropdown_content = document.getElementById('hierarchy-dropdown-content');
let dropdown_open = false;

const canvas = document.getElementById('matu-canvas');
const context = canvas.getContext('2d');
const world_width = 800;
const world_height =  400;
const viewport = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,

    update() {
        const scaleX = canvas.clientWidth / world_width;
        const scaleY = canvas.clientHeight / world_height;
        this.scale = Math.min(scaleX, scaleY);
        this.offsetX = (canvas.clientWidth - world_width * this.scale) / 2;
        this.offsetY = (canvas.clientHeight - world_height * this.scale) / 2;
    }
};
const scene_state = {bg_color: '#101014'};

const preview_window = document.getElementById('preview-window');
const preview_image = document.getElementById('preview-image');
const preview_header = document.getElementById('preview-header');
const preview_file = document.getElementById('preview-file');
const close_preview = document.getElementById('close-preview');

const preview_windows = new Map();
let max_z = 100;
let preview_index = 0;

const add_asset = document.getElementById('add-assets');
const asset_input = document.getElementById('asset-input');
const asset_list = document.getElementById('asset-list');
const asset_select = document.getElementById('asset-select');

let asset_names = new Set();
let asset_files = new Map();
let asset_tiles = new Map();
let asset_images = new Map(); 
let asset_urls = new Map();

const inspector_thumb = document.getElementById('inspector-thumb');
const inspector_filename = document.getElementById('inspector-filename');
const inspector_extension = document.getElementById('inspector-extension');
const inspector_rename = document.getElementById('inspector-rename');
const inspector_save = document.getElementById('inspector-save');
const close_inspector = document.getElementById('close-inspector');

const inspector_x = document.getElementById('inspector-x');
const inspector_y = document.getElementById('inspector-y');
const inspector_w = document.getElementById('inspector-width');
const inspector_h = document.getElementById('inspector-height');
let selected_object = null;

const local_storage_key = 'matu_project';
const save_browser_button = document.getElementById('save-browser-button');
const load_browser_button = document.getElementById('load-browser-button');
const save_file_button = document.getElementById('save-file-button');
const load_file_button = document.getElementById('load-file-button');
const project_file_input = document.getElementById('project-file-input');

const export_button = document.getElementById('export-button');
const export_modal = document.getElementById('export-modal');
const export_modal_close = document.getElementById('export-modal-close');
const export_confirm_button = document.getElementById('export-confirm-button');
const export_show_grid = document.getElementById('export-show-grid');
const export_auto_start = document.getElementById('export-auto-start');
const export_show_stop = document.getElementById('export-show-stop');

// hierarchy dropdown
add_hierarchy.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dropdown_open) {
        hierarchy_dropdown_content.classList.remove('open');
        dropdown_open = false;
        return;
    }
    hierarchy_dropdown_content.classList.add('open');
    dropdown_open = true;
});

document.addEventListener('click', () => {
    hierarchy_dropdown_content.classList.remove('open');
    dropdown_open = false;
});

hierarchy_dropdown_content.addEventListener('click', (e) => {
    e.stopPropagation();
});

const label_to_hierarchy = {
    'Group': 'group',
    'Object': 'object',
    'Sprite': 'sprite',
    'Audio': 'audio',
    'Label': 'label',
    'Script': 'script'
};

hierarchy_dropdown_content.querySelectorAll('button').forEach(button => {
    const type = label_to_hierarchy[button.textContent.trim()];
    if (!type) return;

    button.addEventListener('click', () => {
        addNode(type);
        hierarchy_dropdown_content.classList.remove('open');
        dropdown_open = false;
    });
});

// draw viewport grid
function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}

resizeCanvas();

function drawGrid() {
    const grid_size = 20;

    context.strokeStyle = '#2c2c33';
    context.lineWidth = 1 / viewport.scale;

    for (let x = 0; x < world_width; x += grid_size) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, world_height);
        context.stroke();
    }

    for (let y = 0; y < world_height; y += grid_size) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(world_width, y);
        context.stroke();
    }

    context.beginPath();
    context.moveTo(world_width, 0);
    context.lineTo(world_width, world_height);
    context.stroke();
}

function drawScene() {
    for (const {object_node, sprite_node} of getRenderables()) {
        drawObject(object_node, sprite_node);
    }

    for (const node of hierarchy_nodes.values()) {
        if (node.type !== 'object') continue;
        for (const child_id of node.child_ids) {
            const child = hierarchy_nodes.get(child_id);
            if (child && child.type === 'label') drawLabel(node, child);
        }
    }
}

function getAssetImage(name) {
    if (asset_images.has(name)) {
        return asset_images.get(name);
    }

    const file = asset_files.get(name);
    if (!file) return null;

    const img = new Image();
    img.src = URL.createObjectURL(file);
    asset_images.set(name, img);

    return null; 
}

function getAssetURL(name) {
    if (asset_urls.has(name)) return asset_urls.get(name);
    const file = asset_files.get(name);
    if (!file) return null;
    const url = URL.createObjectURL(file);
    asset_urls.set(name, url);
    return url;
}

function drawObject(object_node, sprite_node) {
    if (!sprite_node) return;

    const img = getAssetImage(sprite_node.asset_name);
    if (!img || !img.complete) return;

    const {x, y, width, height, rotation} = object_node.transform;
    const opacity = sprite_node.opacity ?? 1;

    context.save();
    context.globalAlpha = opacity;

    if (!rotation) {
        context.drawImage(img, x, y, width, height);
        context.restore();
        return;
    }

    context.translate(x + width / 2, y + height / 2);
    context.rotate(rotation);
    context.drawImage(img, -width / 2, -height / 2, width, height);
    context.restore();
}

function drawLabel(object, label) {
    if (!label.visible || !label.text) return;

    const {x, y, rotation} = object.transform;

    context.save();
    context.translate(x, y);
    if (rotation) context.rotate(rotation);

    context.fillStyle = label.color || '#ffffff';
    context.font = `${label.font_size}px "${label.font_family}"`;
    context.textBaseline = 'top';
    context.fillText(label.text, 0, 0);

    context.restore();
}

function screenToWorld(e) {
    const rect = canvas.getBoundingClientRect();

    const x = (e.clientX - rect.left - viewport.offsetX) / viewport.scale;
    const y = (e.clientY - rect.top - viewport.offsetY) / viewport.scale;

    return {x, y};
}

function render() {
    viewport.update();

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = scene_state.bg_color;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.translate(viewport.offsetX, viewport.offsetY);
    context.scale(viewport.scale, viewport.scale);

    drawGrid();
    drawScene();
    requestAnimationFrame(render);
}

render();

// get unique name for each asset
function getName(name) {
    if (!asset_names.has(name)) return name;

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

// shorten file name
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

function openInspector(name, ext) {
    closeNodeInspector();
    selected_node_id = null;
    renderUI();

    asset_select.style.display = 'flex';
    close_inspector.classList.add('show');
    const file = asset_files.get(name);
    if (!file) {
        console.warn('No file found for ', name);
        return;
    }
    const tile = asset_tiles.get(name);

    if (file.type.startsWith('image/')) {
        inspector_thumb.src = URL.createObjectURL(file);
    } else if (file.type.startsWith('audio/')) {
        inspector_thumb.src = '';
        inspector_thumb.alt = 'audio file';
    } else {
        inspector_thumb.src = '';
        inspector_thumb.alt = 'file';
    }

    inspector_filename.textContent = name;
    inspector_extension.textContent = 'File type: ' + ext;
    inspector_rename.value = name;

    inspector_save.onclick = () => {
        const current_name = inspector_filename.textContent;
        renameAsset(current_name);
    };
}

function updateInspector(obj) {
    if (!inspector_x || !inspector_y || !inspector_w || !inspector_h) return;
    inspector_x.value = obj.x;
    inspector_y.value = obj.y;
    inspector_w.value = obj.width;
    inspector_h.value = obj.height;
}

if (inspector_x) {
    inspector_x.oninput = (e) => {
        if (!selected_object) return;
        selected_object.x = Number(e.target.value);
    };
}

function closeInspector(item, remove_item) {
    asset_select.style.display = 'none';
    close_inspector.classList.remove('show');
    item.classList.remove(remove_item);
}

close_inspector.addEventListener('click', () => {
    const selected_tile = document.querySelector('.asset-selected');
    if (selected_tile) {
        closeInspector(selected_tile, 'asset-selected');
    } else {
        asset_select.style.display = 'none';
        close_inspector.classList.remove('show');
    }
});

function openPreview(name) {
    if (preview_windows.has(name)) {
        const preview = preview_windows.get(name);

        centerWindow(preview);

        preview.style.display = 'flex';
        bringToFront(preview);

        return;
    }

    const file = asset_files.get(name);
    if (!file) {
        console.warn('No file found for ', name);
        return;
    }

    const preview = document.createElement('div');

    preview.style.display = 'flex';
    preview.className = 'preview-window';

    preview.innerHTML = `
        <div class="preview-window-header panel-header">
            <h1 class="preview-header">Preview</h1>
            <p class="preview-file">${shortenName(name)}</p>
            <button class="close-preview close-button">x</button>
        </div>
    `;

    const header = preview.querySelector('.preview-window-header');
    const close = preview.querySelector('.close-preview');

    let content = null;

    if (file.type.startsWith('image/')) {
        content = document.createElement('img');
        content.className = 'preview-image';
        content.src = URL.createObjectURL(file);

        content.onload = () => {
            centerWindow(preview);
        };
    } else if (file.type.startsWith('audio/')) {
        content = document.createElement('audio');
        content.className = 'preview-audio';
        content.controls = true;
        content.src = URL.createObjectURL(file);

        content.onloadedmetadata = () => {
            centerWindow(preview);
            content.play().catch(() => {});
        };
    } else {
        content = document.createElement('div');
        content.className = 'preview-unsupported';
        content.textContent = 'No preview available';
        centerWindow(preview);
    }

    preview.appendChild(content);

    document.getElementById('center').appendChild(preview);

    dragElement(preview, header);
    bringToFront(preview);

    preview_windows.set(name, preview);

    close.onclick = () => {
        closePreview(preview, name);
    };

    function centerWindow(preview) {
        const parent = document.getElementById("center");

        const centerX = (parent.clientWidth - preview.offsetWidth) / 2;
        const centerY = (parent.clientHeight - preview.offsetHeight) / 2;

        const offsets = [
            {x: 0,  y: 0},
            {x: 30, y: 30},
            {x: 60, y: 15},
            {x: 15, y: 60}
        ];

        const offset = offsets[preview_index];
        preview_index = (preview_index + 1) % offsets.length;
        preview.style.left = centerX + offset.x + "px";
        preview.style.top  = centerY + offset.y + "px";
    }
}

function closePreview(preview, name) {
    const audio = preview.querySelector('audio');
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }

    preview_windows.delete(name);
    preview.remove();
}

// arigato w3 schools

function dragElement(element, handle=element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    handle.addEventListener('mousedown', dragMouseDown);

    function dragMouseDown(e) {
        e.preventDefault();

        bringToFront(element);

        pos3 = e.clientX;
        pos4 = e.clientY;

        document.addEventListener('mousemove', elementDrag);
        document.addEventListener('mouseup', stopDrag);
    }

    function elementDrag(e) {
        e.preventDefault();

        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        element.style.left = element.offsetLeft - pos1 + 'px';
        element.style.top = element.offsetTop - pos2 + 'px';
    }

    function stopDrag() {
        document.removeEventListener('mousemove', elementDrag);
        document.removeEventListener('mouseup', stopDrag);
    }
}

function bringToFront(window) {
    window.style.zIndex = ++max_z;
}

function renameAsset(old_name) {
    let new_name_raw = inspector_rename.value.trim();
    if (!new_name_raw) {
        return;
    }

    const dot_index = old_name.lastIndexOf('.');
    const original_extension = dot_index !== -1 ? old_name.slice(dot_index) : '';

    if (!new_name_raw.endsWith(original_extension)) {
        new_name_raw += original_extension;
    }

    if (new_name_raw === old_name) {
        return;
    }

    const new_name = getName(new_name_raw);

    const file = asset_files.get(old_name);
    const tile = asset_tiles.get(old_name);

    tile.dataset.name = new_name;

    asset_files.delete(old_name);
    asset_tiles.delete(old_name);

    asset_files.set(new_name, file);
    asset_tiles.set(new_name, tile);

    if (asset_images.has(old_name)) {
        asset_images.set(new_name, asset_images.get(old_name));
        asset_images.delete(old_name);
    }

    asset_names.delete(old_name);
    asset_names.add(new_name);

    const label = tile.querySelector('.asset-label');
    label.textContent = shortenName(new_name);

    inspector_filename.textContent = new_name;

    if (preview_windows.has(old_name)) {
        const preview = preview_windows.get(old_name);

        const preview_file = preview.querySelector('.preview-file');
        preview_file.textContent = shortenName(new_name);

        preview_windows.delete(old_name);
        preview_windows.set(new_name, preview);
    }

    refreshAssets();
}

function refreshAssets() {
    const selected = getSelected();
    if (!selected) return;

    if (selected.type === 'sprite') {
        assetOptions(node_sprite_asset, 'image/', selected.asset_name);
    } else if (selected.type === 'audio') {
        assetOptions(node_audio_asset, 'audio/', selected.asset_name);
    }
}

function registerAsset(file, forced_name=null) {
    const unique_name = forced_name || getName(file.name);
    asset_names.add(unique_name);

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

    const delete_button = document.createElement('button');
    delete_button.classList.add('delete-asset');
    delete_button.textContent = 'x';
    delete_button.addEventListener('click', (e) => {
        e.stopPropagation();

        const current_name = item.dataset.name;

        if (preview_windows.has(current_name)) {
            const preview = preview_windows.get(current_name);
            closePreview(preview, current_name);
        }

        asset_list.removeChild(item);
        asset_names.delete(current_name);
        asset_files.delete(current_name);
        asset_tiles.delete(current_name);
        asset_images.delete(current_name);
        asset_urls.delete(current_name);

        const belongs_to_asset = asset_select.style.display !== 'none' && inspector_filename.textContent === current_name;

        if (belongs_to_asset) {
            closeInspector(item, 'asset-item');
        }

        refreshAssets();
    });

    const label_element = document.createElement('div');
    label_element.classList.add('asset-label');
    label_element.textContent = shortenName(unique_name);

    item.appendChild(thumbnail);
    item.appendChild(label_element);
    item.appendChild(delete_button);
    item.dataset.name = unique_name;
    asset_list.appendChild(item);

    asset_files.set(unique_name, file);
    asset_tiles.set(unique_name, item);

    refreshAssets();

    item.addEventListener('click', () => {
        asset_tiles.forEach(tile => tile.classList.remove('asset-selected'));
        item.classList.add('asset-selected');

        const current_name = item.dataset.name;

        const dot_index = current_name.lastIndexOf('.');
        const extension = current_name.substring(dot_index);
        openInspector(current_name, ext);
    });

    item.addEventListener('dblclick', () => {
        asset_tiles.forEach(tile => tile.classList.remove('asset-selected'));
        item.classList.add('asset-selected');
        const current_name = item.dataset.name;
        openPreview(current_name);
    });

    return unique_name;
}

asset_input.addEventListener('change', () => {
    const files = Array.from(asset_input.files);
    files.forEach(file => registerAsset(file));
    asset_input.value = "";
});

function fileToURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function URLToFile(data_url, filename, mime) {
    const [, base64] = data_url.split(',');
    const bstr = atob(base64);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, {type: mime || 'application/octet-stream'});
}

async function serializeAssets() {
    const assets = [];
    for (const [name, file] of asset_files.entries()) {
        const data_url = await fileToURL(file);
        assets.push({name, type: file.type, data_url});
    }
    return assets;
}

async function serializeProject() {
    if (runtime.running) stopRun();

    const nodes = [];
    for (const node of hierarchy_nodes.values()) {
        const clone = {...node};
        delete clone.compiled;
        delete clone.error;
        nodes.push(clone);
    }

    return {
        version: 1,
        next_node_id,
        hierarchy_roots: [...hierarchy_roots],
        nodes,
        bg_color: scene_state.bg_color,
        world_width,
        world_height,
        assets: await serializeAssets()
    };
}

function clearProject() {
    for (const id of [...script_popouts.keys()]) closePopout(id);
    for (const [name, preview] of [...preview_windows.entries()]) closePreview(preview, name);

    hierarchy_nodes.clear();
    hierarchy_roots.length = 0;
    selected_node_id = null;
    closeNodeInspector();

    asset_list.innerHTML = '';
    asset_names.clear();
    asset_files.clear();
    asset_tiles.clear();
    asset_images.clear();
    asset_urls.clear();
}

async function loadProject(data) {
    if (runtime.running) stopRun();
    clearProject();

    for (const asset of data.assets || []) {
        const file = URLToFile(asset.data_url, asset.name, asset.type);
        registerAsset(file, asset.name);
    }

    next_node_id = data.next_node_id;

    for (const node_data of data.nodes) {
        const node = {...node_data};
        if (node.type === 'script') {
            node.compiled = null;
            node.error = null;
        }

        hierarchy_nodes.set(node.id, node);
    }

    hierarchy_roots.push(...data.hierarchy_roots);
    scene_state.bg_color = data.bg_color || '#101014';

    renderUI();
    compileAll();
}

async function saveToBrowser() {
    try {
        const data = await serializeProject();
        localStorage.setItem(local_storage_key, JSON.stringify(data));
        logToConsole('Project saved to browser storage', 'info');
    } catch (error) {
        logToConsole(`Failed to save to browser storage: ${error.message}`, 'error');
        console.error(error);
    }
}

async function loadFromBrowser() {
    const raw = localStorage.getItem(local_storage_key);
    if (!raw) {
        logToConsole('No project found in browser storage', 'warn');
        return;
    }

    try {
        const data = JSON.parse(raw);
        await loadProject(data);
        logToConsole('Project loaded from browser storage', 'warn');
    } catch (error) {
        logToConsole(`Failed to load from browser storage: ${error.message}`, 'error');
        console.error(error);
    }
}

async function saveToFile() {
    const data = await serializeProject();
    const json = JSON.stringify(data);
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'matu-project.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    logToConsole('Project saved to file', 'info');
}

async function loadFromFile(file) {
    const text = await file.text();
    const data = JSON.parse(text);
    await loadProject(data);
}

function downloadTextFile(filename, content, mime) {
    const blob = new Blob([content], {type: mime});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

async function exportProject() {
    const config = {
        show_grid: export_show_grid.checked,
        auto_start: export_auto_start.checked,
        show_stop_button: export_show_stop.checked
    };

    const project_data = await serializeProject();
    
    downloadTextFile('index.html', buildExportHTML(config), 'text/html');
    downloadTextFile('style.css', buildExportCSS(), 'text/css');
    downloadTextFile('game.js', buildExportJS(project_data, config), 'text/javascript');

    logToConsole('Game exported', 'info');
}

function buildExportHTML(config) {
    const start_button = config.auto_start ? '' : '        <button id="start-button" class="matu-button">Start</button>\n';
    const stop_button = config.show_stop_button ? '        <button id="stop-button" class="matu-button stop">Stop</button>\n' : '';

    return '<!DOCTYPE html>\n' + 
'<html lang="en">\n' +
'<head>\n' +
'    <meta charset="UTF-8">\n' +
'    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'    <title>matu game</title>\n' +
'    <!-- built with matu: matuengine.vercel.app -->\n' +
'    <link rel="stylesheet" href="style.css">\n' +
'</head>\n' +
'<body>\n' +
'    <div id="game-wrapper">\n' +
'        <canvas id="matu-canvas"></canvas>\n' +
'        <div id="loading-screen">\n' +
'            <div id="loading-text">built with matu</div>\n' +
'            <div id="loading-sub">matuengine.vercel.app</div>\n' +
'        </div>\n' +
'        <div id="matu-controls">\n' +
start_button +
stop_button +
'        </div>\n' +
'    </div>\n' +
'    <script src="game.js"></script>\n' +
'</body>\n' +
'</html>\n';
}

function buildExportCSS() {
    return '/* built with matu: matuengine.vercel.app */\n\n' +
'* {box-sizing: border-box;}\n\n' +
'html, body {\n' +
'    margin: 0;\n' +
'    height: 100%;\n' +
'    background: #000;\n' +
'}\n\n' + 
'#game-wrapper {\n' +
'    position: relative;\n' +
'    width: 100vw;\n' +
'    height: 100vh;\n' +
'    background: #000;\n' +
'}\n\n' +
'#matu-canvas {\n' +
'    display: block;\n' +
'    width: 100%;\n' +
'    height: 100%;\n' +
'}\n\n' +
'#loading-screen {\n' +
'    position: absolute;\n' +
'    inset: 0;\n' +
'    background: #000\n' +
'    display: flex;\n' +
'    flex-direction: column;\n' +
'    align-items: center;\n' +
'    justify-content: center;\n' +
'    color: #eef1f4;\n' +
'    gap: 8px\n' +
'    transition: opacity 0.3s ease;\n' +
'    z-index: 20;\n' +
'}\n\n' +
'#loading-text {\n' +
'    font-size: 1.4rem;\n' +
'    font-weight: 600;\n' +
'    letter-spacing: 0.05em; \n' +
'}\n\n' +
'#loading-sub {\n' +
'    font-size: 0.85rem;\n' +
'    opacity: 0.6;\n' +
'}\n\n' +
'#loading-screen.hidden {\n' +
'    opacity: 0;\n' +
'    pointer-events: none;\n' +
'}\n\n' +
'#matu-controls {\n' +
'    position: absolute;\n' +
'    top: 12px;\n' +
'    left: 12px\n' +
'    display; flex;\n' +
'    gap: 8px;\n' +
'    z-index: 10;\n' +
'}\n\n' +
'.matu-button {\n' +
'    padding: 8px 18px;\n' +
'    border-radius: 4px;\n' +
'    border: 2px solid #0e8f4a;\n' +
'    background: transparent;\n' +
'    color: #0e8f4a;\n' +
'    font-family: inherit;\n' +
'    font-size: 0.85rem;\n' +
'    cursor: pointer;\n' +
'    transition: all 0.2s ease;\n' +
'}\n\n' +
'.matu-button:hover:not(:disabled) {\n' +
'    background: #0e8f4a;\n' +
'    color: #000;\n' +
'}\n\n' +
'.matu-button:disabled {\n' +
'    opacity: 0.35;\n' +
'    cursor: default;\n' +
'}\n\n' +
'.matu-button.stop {\n' +
'    border-color: #8f0e0e;\n' +
'    color: #ff6b6b;\n' +
'}\n\n' +
'.matu-button.stop:hover:not(:disabled) {\n' +
'    background #8f0e0e;\n' +
'    color: #eef1f4;\n' +
'}\n';
}

const export_runtime_source = `
const valid_children = {
    group: ['group', 'object'],
    object: ['sprite', 'audio', 'label', 'script'],
    sprite: [], audio: [], label: [], script: []
};
const prefix_to_type = {G: 'group', O: 'object', S: 'sprite', A: 'audio', L: 'label', C: 'script'};

let next_node_id = 1;
const hierarchy_nodes = new Map();
const hierarchy_roots = [];

const asset_map = new Map();
project_data.assets.forEach(function(asset) {asset_map.set(asset.name, asset);});

const asset_images = new Map();
const audio_elements = new Map();
const globals = new Map();
const active_timers = new Map();
let next_timer_id = 1;

const scene_state = {bg_color: project_data.bg_color || '#101014'};

const runtime = {running: false, raf_id: null, last_time: 0, keys_down: new Set()};

function makeNodeID() {
    return 'node_' + (next_node_id++);
}

function childAcceptable(parent_type, child_type) {
    return (valid_children[parent_type] || []).includes(child_type);
}

function isDescendant(candidate_id, ancestor_id) {
    let node = hierarchy_nodes.get(candidate_id);
    while (node && node.parent_id) {
        if (node.parent_id === ancestor_id) return true;
        node = hierarchy_nodes.get(node.parent_id);
    }
    return false;
}

function createNode(type, parent_id, name) {
    if (parent_id === null && type !== 'group' && type !== 'object') return null;
    if (parent_id !== null) {
        const parent = hierarchy_nodes.get(parent_id);
        if (!parent || !childAcceptable(parent.type, type)) return null;
    }

    const id = makeNodeID();
    const node = {id: id, type: type, name: name || (type + '_' + id), parent_id: parent_id, child_ids: []};

    if (type === 'object') {
        node.transform = {x: 0, y: 0, width: 100, height: 100, rotation: 0};
        node.selected_sprite = null;
    } else if (type === 'sprite') {
        node.asset_name = null;
        node.visible = true;
        node.opacity = 1;
    } else if (type === 'audio') {
        node.asset_name = null;
        node.volume = 1;
        node.loop = false;
    } else if (type === 'label') {
        node.text = 'Label';
        node.font_size = 16;
        node.font_family = 'JetBrains Mono';
        node.color = '#ffffff';
        node.visible = true;
    } else if (type === 'script') {
        node.code = '';
        node.compiled = null;
        node.error = null;
    }

    hierarchy_nodes.set(id, node);
    if (parent_id) hierarchy_nodes.get(parent_id).child_ids.push(id);
    else hierarchy_roots.push(id);

    return node;
}

function deleteNode(id) {
    const node = hierarchy_nodes.get(id);
    if (!node) return;
    node.child_ids.slice().forEach(function(child_id) {deleteNode(child_id);});
    if (node.parent_id) {
        const parent = hierarchy_nodes.get(node.parent_id);
        if (parent) parent.child_ids = parent.child_ids.filter(function(cid) {return cid !== id;});
    } else {
        const index = hierarchy_roots.indexOf(id);
        if (index !== -1) hierarchy_roots.splice(index, 1);    
    }
    hierarchy_nodes.delete(id);
}

function cloneNodeTree(source_id, new_parent_id) {
    const source = hierarchy_nodes.get(source_id);
    if (!source) return null;
    const id = makeNodeID();
    const clone = Object.assign({}, source, {id: id, parent_id: new_parent_id, child_ids: []});
    if (source.type === 'object') clone.transform = Object.assign({}, source.transform);
    if (source.type === 'script') {
        clone.compiled = null;
        clone.error = null;
    }
    hierarchy_nodes.set(id, clone);
    if (new_parent_id) hierarchy_nodes.get(new_parent_id).child_ids.push(id);
    else hierarchy_roots.push(id);
    source.child_ids.forEach(function(child_id) {cloneNodeTree(child_id, id);});
    return clone;
}

function getSprite(object) {
    if (object.selected_sprite) {
        const sprite = hierarchy_nodes.get(object.selected_sprite);
        if (sprite) return sprite;
    }
    return object.child_ids.map(function(id) {return hierarchy_nodes.get(id);}).find(function(n) {return n && n.type === 'sprite';});
}

function getRenderables() {
    const results = [];
    for (const node of hierarchy_nodes.values()) {
        if (node.type !== 'object') continue;
        let sprite_node = null;
        if (node.selected_sprite) {
            const candidate = hierarchy_nodes.get(node.selected_sprite);
            if (candidate && candidate.type === 'sprite' && candidate.visible && candidate.asset_name) sprite_node = candidate;
        }
        if (!sprite_node) {
            sprite_node = node.child_ids.map(function(id) {return hierarchy_nodes.get(id);}).find(function(child) {return child && child.type === 'sprite' && child.visible && child.asset_name;});
        }
        results.push({object_node: node, sprite_node: sprite_node});
    }
    return results;
}

function collectScripts(node, out) {
    out = out || [];
    if (node.type === 'script') out.push(node);
    node.child_ids.forEach(function(child_id) {
        const child = hierarchy_nodes.get(child_id);
        if (child) collectScripts(child, out);
    });
    return out;
}

function getAssetImage(name) {
    if (asset_images.has(name)) return asset_images.get(name);
    const asset = asset_map.get(name);
    if (!asset) return null;
    const img = new Image();
    img.src = asset.data_url;
    asset_images.set(name, img);
    return null;
}

function getAssetURL(name) {
    const asset = asset_map.get(name);
    return asset ? asset.data_url : null;
}

function getAudioElement(node) {
    let audio = audio_elements.get(node.id);
    if (!audio) {
        audio = new Audio();
        audio_elements.set(node.id, audio);
    }
    return audio;
}

function getOBB(node) {
    const t = node.transform;
    return {cx: t.x + t.width / 2, cy: t.y + t.height / 2, hw: t.width / 2, hh: t.height / 2, angle: t.rotation || 0};
}

function getOBBCorners(obb) {
    const cos = Math.cos(obb.angle);
    const sin = Math.sin(obb.angle);
    const corners = [];
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function(pair) {
        const lx = pair[0] * obb.hw;
        const ly = pair[1] * obb.hh;
        corners.push({x: obb.cx + lx * cos - ly * sin, y: obb.cy + lx * sin + ly * cos});
    });
    return corners;
}

function getOBBAxes(obb) {
    const cos = Math.cos(obb.angle);
    const sin = Math.sin(obb.angle);
    return [{x: cos, y: sin}, {x: -sin, y: cos}];
}

function projectAxis(corners, axis) {
    let min = Infinity;
    let max = -Infinity;
    corners.forEach(function(c) {
        const p = c.x * axis.x + c.y * axis.y;
        if (p < min) min = p;
        if (p > max) max = p;
    });
    return {min: min, max: max};
}

function obbIntersects(node_a, node_b) {
    const obb_a = getOBB(node_a);
    const obb_b = getOBB(node_b);
    const corners_a = getOBBCorners(obb_a);
    const corners_b = getOBBCorners(obb_b);
    const axes = getOBBAxes(obb_a).concat(getOBBAxes(obb_b));
    for (const axis of axes) {
        const proj_a = projectAxis(corners_a, axis);
        const proj_b = projectAxis(corners_b, axis);
        if (proj_a.max < proj_b.min || proj_b.max < proj_a.min) return false;
    }
    return true;
}

function reportScriptError(node, error) {
    node.error = error.message;
    console.error('Script error in ' + node.name + ': ', error);
}

const matuAPI = {
    getNode: function(name) {
        const match = /^([GOSALC]):(.+)$/.exec(name);
        if (match) {
            const type = prefix_to_type[match[1]];
            for (const node of hierarchy_nodes.values()) {
                if (node.type === type && node.name === match[2]) return node;
            }
            return null;
        }
        for (const node of hierarchy_nodes.values()) {
            if (node.name === name) return node;
        }
        return null;
    },
    getNodeByID: function(id) {
        return hierarchy_nodes.get(id) || null;
    },
    spawn: function(type, parent_id, name) {
        const node = createNode(type, parent_id, name);
        if (!node) return null;
        const script_nodes = collectScripts(node);
        script_nodes.forEach(compileScript);
        script_nodes.forEach(function(script_node) {
            const owner = hierarchy_nodes.get(script_node.parent_id);
            try {
                if (script_node.compiled && script_node.compiled.start) script_node.compiled.start(owner, matuAPI);
            } catch (error) {
                reportScriptError(script_node, error);
            }
        });
        return node;
    },
    clone: function(node, parent_override_id) {
        if (!node) return null;
        const parent_id = parent_override_id !== undefined ? parent_override_id : node.parent_id;
        const clone = cloneNodeTree(node.id, parent_id);
        if (!clone) return null;
        const script_nodes = collectScripts(clone);
        script_nodes.forEach(compileScript);
        script_nodes.forEach(function(script_node) {
            const owner = hierarchy_nodes.get(script_node.parent_id);
            try {
                if (script_node.compiled && script_node.compiled.start) script_node.compiled.start(owner, matuAPI);
            } catch (error) {
                reportScriptError(script_node, error);
            }
            try {
                if (script_node.compiled && script_node.compiled.onClone) script_node.compiled.onClone(owner, matuAPI, node);
            } catch (error) {
                reportScriptError(script_node, error);
            }
        });
        return clone;
    },
    destroy: function(node) {
        if (!node) return;
        const script_nodes = collectScripts(node);
        script_nodes.forEach(function(script_node) {
            const owner = hierarchy_nodes.get(script_node.parent_id);
            try {
                if (script_node.compiled && script_node.compiled.onDestroy) script_node.compiled.onDestroy(owner, matuAPI);
            } catch (error) {
                reportScriptError(script_node, error);
            }
        });
        deleteNode(node.id);
    },
    runtime: {
        stop: function() {
            stopRun();
        },
        isRunning: function() {
            return runtime.running;
        }
    },
    input: {
        isDown: function(key) {
            return runtime.keys_down.has(key.toLowerCase());
        }
    },
    log: function() {
        const args = Array.prototype.slice.call(arguments);
        console.log.apply(console, ['[script]'].concat(args));
    },
    object: {
        setPosition: function(node, x, y) {
            if (!node || node.type !== 'object') return;
            node.transform.x = x;
            node.transform.y = y;
        },
        move: function(node, dx, dy) {
            if (!node || node.type !== 'object') return;
            node.transform.x += dx;
            node.transform.y += dy;
        },
        setRotation: function(node, degrees) {
            if (!node || node.type !== 'object') return;
            node.transform.rotation = degrees * Math.PI / 180;
        },
        rotate: function(node, degrees_delta) {
            if (!node || node.type !== 'object') return;
            node.transform.ortation += degrees_delta * Math.PI / 180;
        },
        setSize: function(node, width, height) {
            if (!node || node.type !== 'object') return;
            node.transform.width = width;
            node.transform.height = height;
        },
        setSprite: function(node, sprite) {
            if (!node || node.type !== 'object') return;
            if (sprite === null) {
                node.selected_sprite = null;
                return;
            }
            if (typeof sprite !== 'object' || sprite.type !== 'sprite') return;
            if (node.child_ids.indexOf(sprite.id) === -1) return;
            node.selected_sprite = sprite.id;
        },
        getSprite: function(node) {
            if (!node || node.type !== 'object') return null;
            return getSprite(node);
        }
    },
    sprite: {
        setOpacity: function(node, value) {
            if (!node || node.type !== 'sprite') return;
            node.opacity = Math.min(1, Math.max(0, value));
        },
        setVisible: function(node, visible) {
            if (!node || node.type !== 'sprite') return;
            node.visible = !!visible;
        },
        setAsset: function(node, asset_name) {
            if (!node || node.type !== 'sprite') return;
            node.asset_name = asset_name;
        }
    },
    audio: {
        play: function(node) {
            if (!node || node.type !== 'audio') return;
            if (!node.asset_name) {
                console.warn(node.name + ' has no audio asset assigned');
                return;
            }
            const url = getAssetURL(node.asset_name);
            if (!url) return;
            const audio = getAudioElement(node);
            if (audio.src !== url) audio.src = url;
            audio.loop = node.loop;
            audio.volume = node.volume != null ? node.volume : 1;
            audio.currentTime = 0;
            audio.play().catch(function() {});
        },
        stop: function(node) {
            const audio = audio_elements.get(node.id);
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        },
        pause: function(node) {
            const audio = audio_elements.get(node.id);
            if (audio) audio.pause();
        },
        resume: function(node) {
            const audio = audio_elements.get(node.id);
            if (audio) audio.play().catch(function() {});
        },
        isPlaying: function(node) {
            const audio = audio_elements.get(node.id);
            return !!audio && !audio.paused;
        },
        setVolume: function(node, value) {
            if (!node || node.type !== 'audio') return;
            node.volume = Math.min(1, Math.max(0, value));
            const audio = audio_elements.get(node.id);
            if (audio) audio.volume = node.volume;
        },
        setLoop: function(node, loop) {
            if (!node || node.type !== 'audio') return;
            node.loop = !!loop;
            const audio = audio_elements.get(node.id);
            if (audio) audio.loop = node.loop;
        },
        setAsset: function(node, asset_name) {
            if (!node || node.type !== 'audio') return;
            node.asset_name = asset_name;
            const audio = audio_elements.get(node.id);
            if (audio) audio.pause();
            audio_elements.delete(node.id);
        }
    },
    label: {
        setText: function(node, text) {
            if (!node || node.type !== 'label') return;
            node.text = String(text);
        },
        setFontSize: function(node, size) {
            if (!node || node.type !== 'label') return;
            node.font_size = size;
        },
        setFont: function(node, font_family) {
            if (!node || node.type !== 'label') return;
            node.font_family = font_family;
        },
        setColor: function(node, color) {
            if (!node || node.type !== 'label') return;
            node.color = color;
        },
        setVisible: function(node, visible) {
            if (!node || node.type !== 'label') return;
            node.visible = !!visible;
        }
    },
    physics: {
        intersects: function(a, b) {
            if (!a || !b || a.type !== 'object' || b.type !== 'object') return false;
            return obbIntersects(a, b);
        },
        getCollisions: function(node) {
            const results = [];
            for (const other of hierarchy_nodes.values()) {
                if (other.type !== 'object' || other.id === node.id) continue;
                if (matuAPI.physics.intersects(node, other)) results.push(other);
            }
            return results;
        }
    },
    globals: {
        get: function(key, fallback) {
            fallback = fallback === undefined ? null : fallback;
            return globals.has(key) ? globals.get(key) : fallback;
        },
        set: function(key, value) {
            globals.set(key, value);
        },
        has: function(key) {
            return globals.has(key);
        },
        delete: function(key) {
            globals.delete(key);
        }
    },
    scene: {
        setBackgroundColor: function(color) {
            scene_state.bg_color = color;
        },
        getBackgroundColor: function() {
            return scene_state.bg_color;
        }
    },
    timer: {
        after: function(seconds, callback) {
            const id = next_timer_id++;
            active_timers.set(id, {time: seconds, interval: null, repeat: false, callback: callback});
            return id;
        },
        every: function(seconds, callback) {
            const id = next_timer_id++;
            active_timers.set(id, {time: seconds, interval: seconds, repeat: true, callback: callback});
            return id;
        },
        cancel: function(id) {
            active_timers.delete(id);
        }
    }
};

window.addEventListener('keydown', function(e) {
    runtime.keys_down.add(e.key.toLowerCase());
});
window.addEventListener('keyup', function(e) {
    runtime.keys_down.delete(e.key.toLowerCase());
});

function wrapScript(code) {
    return code + '\n' +
        'export const __start = typeof start === "function" ? start : undefined;\n' +
        'export const __update = typeof update === "function" ? update : undefined;\n' +
        'export const __end = typeof end === "function" ? end : undefined;\n' +
        'export const __onClone = typeof OnClone === "function" ? OnClone : undefined;\n' +
        'export const __onDestroy = typeof OnDestroy === "function" ? OnDestroy : undefined;\n';
}

function compileScript(node) {
    if (!node || node.type !== 'script') return Promise.resolve();

    const module_source = wrapScript(node.code);
    const blob = new Blob([module_source], {type: 'text/javascript'});
    const url = URL.createObjectURL(blob);

    return import(url).then(function(module) {
        node.compiled = {
            start: module.__start || null,
            update: module.__update || null,
            end: module.__end || null,
            onClone: module.__onClone || null,
            onDestroy: module.__onDestroy || null
        };
        node.error = null;
    }).catch(function(error) {
        node.compiled = null;
        node.error = error.message;
        console.error('Compiler error in ' + node.name + ': ' + error.message);
    }).finally(function() {
        URL.revokeObjectURL(url);
    });
}

function compileAll() {
    const script_nodes = [];
    hierarchy_nodes.forEach(function(node) {
        if (node.type === 'script') script+nodes.push(node);
    });
    return Promise.all(script_nodes.map(compileScript)).then(function() {
        return script_nodes.every(function(node {
            return !node.error;
        }));
    });
}

function loadProjectData(data) {
    next_node_id = data.next_node_id;
    data.nodes.forEach(function(n) {
        const node = Object.assign({}, n);
        if (node.type === 'script') {
            node.compiled = null;
            node.error = null;
        }
        hierarchy_nodes.set(node.id, node);
    });
    hierarchy_roots.push.apply(hierarchy_roots, data.hierarchy_roots);
}

const canvas = document.getElementById('matu-canvas');
const context = canvas.getContext('2d');
const world_width = project_data.world_width || 800;
const world_height = project_data.world_height || 400;

const viewport = {
    scale: 1, offsetX: 0, offsetY: 0,
    update: function() {
        const scaleX = canvas.clientWidth / world_width;
        const scaleY = canvas.clientHeight / world_height;
        this.scale = Math.min(scaleX, scaleY);
        this.offsetX = (canvas.clientWidth - world_width * this.scale) / 2;
        this.offsetY = (canvas.clientHeight - world_height * this.scale) / 2;
    }
};

function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function drawGrid() {
    const grid_size = 20;context.strokeStyle = '#2c2c33';
    context.lineWidth = 1 / viewport.scale;
    for (let x = 0; x < world_width; x += grid_size) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, world_height);
        context.stroke();
    }
    for (let y = 0; y < world_height; y += grid_size) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(world_width, y);
        context.stroke();
    }
    context.beginPath();
    context.moveTo(world_width, 0);
    context.lineTo(world_width, world_height);
    context.stroke();
}

function drawObject(object_node, sprite_node) {
    if (!sprite_node) return;
    const img = getAssetImage(sprite_node.asset_name);
    if (!img || !img.complete) return;
    const t = object_node.transform;
    const opacity = sprite_node.opacity != null ? sprite_node.opacity : 1;
    context.save();
    context.globalAlpha = opacity;
    if (!t.rotation) {
        context.drawImage(img, t.x, t.y, t.width, t.height);
        context.restore();
        return;
    }
    context.translate(t.x + t.width / 2, t.y + t.height / 2);
    context.rotate(t.rotation);
    context.drawImage(img, -t.width / 2, -t.height / 2, t.width, t.height);
    context.restore();
}

function drawLabel(object_node, label_node) {
    if (!label_node.visible || !label_node.text) return;
    const t = object_node.transform;
    context.save();
    context.translate(t.x, t.y);
    if (t.rotation) context.rotate(t.rotation);
    context.fillStyle = label_node.color || '#ffffff';
    context.font = label_node.font_size + 'px "' + label_node.font_family + '"';
    context.textBaseline = 'top';
    context.fillText(label_node.text, 0, 0);
    context.restore();
}

function drawScene() {
    getRenderables().forEach(function(pair) {
        drawObject(pair.object_node, pair.sprite_node);
    });
    for (const node of hierarchy_nodes.values()) {
        if (node.type !== 'object') continue;
        node.child_ids.forEach(function(child_id) {
            const child = hierarchy_nodes.get(child_id);
            if (child && child.type === 'label') drawLabel(node, child);
        });
    }
}

function render() {
    viewport.update();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.translate(viewport.offsetX, viewport.offsetY);
    context.scale(viewport.scale, viewport.scale);
    context.fillStyle = scene_state.bg_color;
    context.fillRect(0, 0, world_width, world_height);
    if (show_grid) drawGrid();
    drawScene();
    context.restore();
    requestAnimationFrame(render);
}

function takeSnapshot() {
    const snap = new Map();
    for (const node of hierarchy_nodes.values()) {
        if (node.type === 'object') snap.set(node.id, {transform: Object.assign({}, node.transform)});
        else if (node.type === 'sprite') snap.set(node.id, {visible: node.visible, asset_name: node.asset_name, opacity: node.opacity});
        else if (node.type === 'audio') snap.set(node.id, {volume: node.volume, loop: node.loop, asset_name, node.asset_name});
        else if (node.type === 'label') snap.set(node.id, {text: node.text, font_size: node.font_size, font_family: node.font_family, color: node.color, visible: node.visible});
    }

    return {nodes: snap, bg_color: scene_state.bg_color, existing_ids: new Set(hierarchy_nodes.keys())};
}

function restoreSnapshot(snap) {
    const runtime_created_ids = Array.from(hierarchy_nodes.keys()).filter(function(id) {
        return !snap.existing_ids.has(id);
    });
    runtime_created_ids.forEach(function(id) {
        deleteNode(id);
    });

    snap.nodes.forEach(function(saved, id) {
        const node = hierarchy_nodes.get(id);
        if (!node) return;
        if (node.type === 'object') node.transform = Object.assign({}, saved.transform);
        else if (node.type === 'sprite') {
            node.visible = saved.visible;
            node.asset_name = saved.asset_name;
            node.opacity = saved.opacity;
        } else if (node.type === 'audio') {
            node.volume = saved.volume;
            node.loop = saved.loop;
            node.asset_name = saved.asset_name;
        } else if (node.type === 'label') {
            node.text = saved.text;
            node.font_size = saved.font_size;
            node.font_family = saved.font_family;
            node.color = saved.color
            node.visible = saved.visible;
        }
    });
    scene_state.bg_color = snap.bg_color;
}

let stored_snapshot = null;

function updateTimers(dt) {
    Array.from(active_timers.entries()).forEach(function(entry) {
        const id = entry[0];
        const timer = entry[1];
        timer.time -= dt;
        if (timer.time <= 0) {
            try {
                timer.callback();
            } catch (error) {
                console.error('Timer error: ' + error.message);
            }
            if (timer.repeat) timer.time += timer.interval;
            else active_timers.delete(id);
        }
    });
}

function tick(now) {
    if (!runtime.running) return;
    const dt = (now - runtime.last_time) / 1000;
    runtime.last_time = now;
    updateTimers(dt);
    for (const node of hierarchy_nodes.values()) {
        if (!runtime.running) break;
        if (node.type !== 'script' || !node.compiled || !node.compiled.update) continue;
        const owner = hierarchy_nodes.get(node.parent_id);
        try {
            node.compiled.update(owner, matuAPI, dt);
        } catch (error) {
            reportScriptError(node, error);
        }
    }
    runtime.raf_id = requestAnimationFrame(tick);
}

function startRun() {
    if (runtime.running) return;
    compileAll().then(function() {
        stored_snapshot = takeSnapshot();
        globals.clear();
        active_timers.clear();
        runtime.running = true;
        runtime.last_time = performance.now();
        runtime.keys_down.clear();
        if (start_button_element) start_button_element.disabled = true;
        if (stop_button_element) stop_button_element.disabled = false;
        for (const node of hierarchy_nodes.values()) {
            if (node.type !== 'script' || !node.compiled || !node.compiled.start) continue;
            const owner = hierarchy_nodes.get(node.parent_id);
            try {
                node.compiled.start(owner, matuAPI);
            } catch (error) {
                reportScriptError(node, error);
            }
        }
        runtime.raf_id = requestAnimationFrame(tick);
    });
}

function stopRun() {
    if (!runtime.running) return;
    for (const node of hierarchy_nodes.values()) {
        if (node.type !== 'script' || !node.compiled || !node.compiled.end) continue;
        const owner = hierarchy_nodes.get(node.parent_id);
        try {
            node.compiled.end(owner, matuAPI);
        } catch (error) {
            reportScriptError(node, error);
        }
    }
    if (runtime.raf_id) cancelAnimationFrame(runtime.raf_id);
    runtime.raf_id = null;
    runtime.running = false;
    audio_elements.forEach(function(audio) {
        audio.pause();
        audio.currentTime = 0;
    });
    if (stored_snapshot) restoreSnapshot(stored_snapshot);
    stored_snapshot = null;
    if (start_button_element) start_button_element.disabled = false;
    if (stop_button_element) stop_button_element.disabled = true;
}

const loading_screen = document.getElementById('loading-screen');
const start_button_element = document.getElementById('start-button');
const stop_button_element = document.getElementById('stop-button');

if (start_button_element) start_button_element.addEventListener('click', startRun);
if (stop_button_element) {
    stop_button_element.addEventListener('click', stopRun);
    stop_button_element.disabled = true;
}

function preloadImages() {
    const image_assets = project_data.assets.filter(function(a) {
        return a.type.indexOf('image/') === 0;
    });
    const promises = image_assets.map(function(asset) {
        return new Promise(function(resolve) {
            const img = new Image();
            img.onload = resolve;
            image.onerror = resolve;
            img.src = asset.data_url;
            asset_images.set(asset.name, img);
        });
    });
    return Promise.all(promises);
}

loadProjectData(project_data);

preloadImages().then(function() {
    if (loading_screen) loading_screen.classList.add('hidden');
    if (auto_start) startRun();
});

requestAnimationFrame(render);
`;

function buildExportJS(data, config) {
    return '// built with matu: matuengine.vercel.app\n\n' +
'const project_data = ' + JSON.stringify(data) + ';\n' +
'const show_grid = ' + (config.show_grid ? 'true' : 'false') + ';\n' +
'const auto_start = ' + (config.auto_start ? 'true' : 'false') + ';\n' +
export_runtime_source;
}

save_browser_button.addEventListener('click', () => {
    saveToBrowser();
});

load_browser_button.addEventListener('click', () => {
    loadFromBrowser();
});

save_file_button.addEventListener('click', () => {
    saveToFile();
});

load_file_button.addEventListener('click', () => {
    project_file_input.click();
});

project_file_input.addEventListener('change', async () => {
    const file = project_file_input.files[0];
    if (!file) return;

    try {
        await loadProject(file);
        logToConsole('Project loaded from file', 'info');
    } catch (error) {
        logToConsole(`Failed to load project file: ${error.message}`, 'error');
        console.error(error);
    }

    project_file_input.value = '';
});

export_button.addEventListener('click', () => {
    export_modal.classList.add('show');
});

export_modal_close.addEventListener('click', () => {
    export_modal.classList.remove('show');
});

export_modal.addEventListener('click', (e) => {
    if (e.target === export_modal) export_modal.classList.remove('show');
});

export_confirm_button.addEventListener('click', async () => {
    export_modal.classList.remove('show');
    await exportProject();
});
