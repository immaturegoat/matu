# matu documentation

matu is a browser-based 2d game editor. You build a scene out of nodes in a hierarchy, attach scripts to bring it to life, hit Run to test, and export a standalone playable when you are done. 

This documentation will cover two things:
1. How the editor works

and 

2. The scripting API

---

# Part 1: How the editor works

## Layout

| Panel | Location | Purpose |
|---|---|---|
| **Hierarchy** | Left Sidebar | The hierarchy tree, holding every node in your game |
| **Viewport** | Center | The live canvas, an 800x400 screen that is where your game is displayed
| **Toolbar** | Center Top | Where you Run, Stop, Save, Load, and Export |
| **Assets** | Center Bottom | Where you upload image and audio files |
| **Inspector** | Right Sidebar, Top | Properties of whatever node or asset is selected |
| **Console** | Right Sidebar, Bottom | Logs from scripting, compile errors, and runtime errors |

## Node types

Every node lives in the Hierarchy panel and has a type, which is shown with a prefixed letter.

| Type | Prefix | Acceptable Children | Purpose |
|---|---|---|---|
| **Group** | `G:` | Group, Object | A group is simply a container for organization. It has no properties other than a name. |
| **Object** | `O:` | Sprite, Audio, Label, Script | The only node type with transform properties like position, size, and rotation. Everything visible or positioned hangs off an Object node. | 
| **Sprite** | `S:` | None | An image, which is attached to a parent Object. the parent's transform properties control where and how big the sprite is drawn. |
| **Audio** | `A:` | None | A sound, attached to a parent Object. |
| **Label** | `L:` | None | A textbox, draw at its parent Object's position. |
| **Script** | `S:` | None | Code that runs with its parent Object. |

Valid nesting is enforced automatically. When creating or rearranging nodes, the hirarchy wil not allow you to build an invalid structure. 

Groups and Objects can always be created at the root level of the hierarchy, meaning they do not require a parent. Sprite, Audio, Label, and Script nodes always need an Object as their direct parent. 

## Creating nodes

Click the **+** button at the top right of the Hierarchy sidebar to open a dropdown of node types. If you have a node selected that can contain the new type, it will be added as that node's child. Otherwise, it will be added at the root (for Group or Object nodes) or nothing will happen with a console warning (for types that require a parent).

## The Inspector (for nodes)

Select any node to see and edit its properties in the Inspector. 

**Object**
 - **X / Y** - position
 - **Width / Height** - size
 - **Lock dimensions** - when on, editing Width will auto-scale Height (and vice versa) to keep the current aspect ratio
 - **Keep proportions** - changes Width and Height to match the object's sprite's native image size
 - **Rotation** - in degrees
 - **Sprite** - which child Sprite is drawn (`Auto` picks the first visible one with an asset)

**Sprite**
 - **Image asset** - which uploaded image to draw
 - **Visible** - toggle
 - **Opacity** - 0 to 100%

**Audio**
 - **Audio asset** - which uploaded sound to play
 - **Volume** - 0 to 100%
 - **Loop** - toggle

**Label**
 - **Message** - the text to display
 - **Font** - font family
 - **Font size** - in pixels
 - **Color** - text color
 - **Visible** - toggle

**Script**
 - **Code** - a Javascript editor (see below)
 - A popout button (*) to open the same code in a floating window

Every node also has a **Name** field at the top of the Inspector. Names must be unique to each type.

## Rearranging the hierarchy
Drag any row onto another to reorder or reparent.
 - Drop near the **top** of a row to place it *before* it, with the same parent
 - Drop near the **bottom** of a row to place it *after* it, with the same parent
 - Drop in the **middle** of a row whose type accepts your dragged node's type to place it *inside* as a new child

## Running your game
**Run** compiles every script node in your game. If any fail to compile, the run will be aborted and the status bar will show which scripts need fixing. 

## Assets

Click **+** in the assets panel to upload images and audio. Uploaded files show as tiles that you can:
 - **Click** to open the asset Inspector
 - **Double-click** to open a floating preview window
 - **Delete** via the small `x` on eadch tile

## Saving and loading

| Button | Description |
|---|---|
| **Save** | Saves the whole project to browser `localStorage`. This is fast, but can hit a size limit depending on your browser. |
| **Load** | Restores the project saved via **Save**. |
| **Save to file** | Downloads a `.json` file with the same data as **Save**. |
| **Load from file** | Opens a file picker to restore a project from a previously saved `.json`. |

## Exporting a standalone
**Export Game** opens a dialog with three options:
 - **Keep grid visible** - whether the reference grid is shown in the standalone
 - **Auto-start on load** - removes the **Start** button and begins the game once the page loads
 - **Includ Stop button** - whether players get a way to stop or reset the game

Once exporting, matu will download three files, `index.html`, `style.css`, and `game.js`, though it may take some time. 

---

# Part 2: The scripting API (`matuAPI`)

Scripts are held in Script nodes and can define any of these top-level functions:

| Function | Called when |
|---|---|
| `start(owner, matu)` | Once, when a run starts (or when this node is spawned/cloned) |
| `update(owner, matu, dt)` | Every frame, `dt` being seconds since last frame |
| `end(owner, matu)` | Once, when a run stops |
| `OnClone(owner, matu, original)` | On a cloned script, right after the clone's own `start` runs. `original` is the source node it was cloned from |
| `OnDestroy(owner, matu)` | On a script and its descendants, right before `matu.destroy()` removes them |

`owner` is the parent node the script is attached to. `matu` is the API object described below.

### Top-level code runs before `matu` exists
Any code outside of the top level functions listed above runs the instant the script compiles. This means it runs before a run starts and before `matu`/`owner` exist. `matu` is only passed into the lifecycle functions. 

```js
// this is wrong and will throw "matu is not defined"
let bg1 = matu.getNode('O:bg1');
 
function update(owner, matu, dt) {
    matu.object.move(bg1, -1, 0);
}
```
```js
// this is the correct thing to do, declare at the top, and assign inside start()
let bg1;
function start(owner, matu) { 
    bg1 = matu.getNode('O:bg1'); 
}
function update(owner, matu, dt) { 
    matu.object.move(bg1, -1, 0); 
}
```

# Node lookup

**`matu.getNode(name)`** - finds a node by name. Be sure to prefix with its type letter and a colon to disambiguate (`G:`, `O:`, `S:`, `A:`, `L:`, `C:`). For example, `matu.getNode('O:Player')`. Without a prefix, it will return any node with that name. Returns `null` if not found. 

**`matu.getNodeByID(id)`** - finds a node by its internal id. Returns `null` if not found.

## Spawning, cloning, destroying
**`matu.spawn(type, parentId, name)`** - creates a new node of `type` (`'group', 'object', 'sprite', 'audio', 'label', or 'script'`) under `parentId`. `name` is optional. It compiles and runs `start()` on any scripts in the new node. It will return the new node, or `null` if creation failed.

**`matu.clone(node, parentOverrideId?)`** - clones `node` and its subtree. It will default to the same parent, but pass `parentOverrideId` to place it elsewhere (or `null` for root). Runs `start()` and then `OnClone(owner, matu, original)` on every script in the clone. It will return the clone. 

**`matu.destroy(node)`** - runs `OnDestroy(owner, matu)` on `node` and its subtree's scripts, then removes the node and its children. 

Both `spawn` and `clone` compile scripts asynchronously under the hood, but you don't need to `await` anything, as they still return the new node immediately. `start()`/`OnClone()` on the new node's scripts fire a moment later, not on the exact same line. 

## Input

**`matu.input.isDown(key)`** - `true` if `key` is currently held. Case-insensitive (`'a'`, `'ArrowUp'`, `'space'`, etc.).

## Logging
**`matu.log(...args)`** - logs to both the browser console and the in-editor console panel.

## Object transform (`matu.object`)
Only works on `object` nodes. 

| Function | Effect |
|---|---|
| `setPosition(node, x, y)` | Sets absolute position |
| `move(node, dx, dy)` | Adds `dx, dy` to current position |
| `setRotation(node, degrees)` | Sets absolute rotation |
| `rotate(node, degreesDelta)` | Adds `degreesDelta` to current rotation |
| `setSize(node, width, height)` | Sets absolute width and height |
| `setSprite(node, sprite)` | Sets which sprite child is displayed. Pass a sprite node or `null` for auto-selection |
| `getSprite(node)` | Returns the sprite node currently displayed, or `null` |

## Sprite (`matu.sprite`)

Only works on `sprite` nodes.

| Function | Effect |
|---|---|
| `setOpacity(node, value)` | Clamped to `0–1` |
| `setVisible(node, visible)` | Toggle |
| `setAsset(node, assetName)` | Swaps the image asset |
 
## Audio (`matu.audio`)
 
Only works on `audio` nodes.
 
| Function | Effect |
|---|---|
| `play(node)` | Plays from the start, but logs an error if no asset is assigned |
| `stop(node)` | Pauses and resets play position to 0 |
| `pause(node)` | Pauses without resetting |
| `resume(node)` | Resumes from current position |
| `isPlaying(node)` | Returns `true`/`false` |
| `setVolume(node, value)` | Clamped to `0–1` |
| `setLoop(node, loop)` | Toggle |
| `setAsset(node, assetName)` | Swaps the audio asset and stops any current playback of the old one |
 
## Label (`matu.label`)
 
Only works on `label` nodes.
 
| Function | Effect |
|---|---|
| `setText(node, text)` | Sets the displayed message |
| `setFontSize(node, size)` | In pixels |
| `setFont(node, fontFamily)` | Font family name |
| `setColor(node, color)` | Any CSS color string |
| `setVisible(node, visible)` | Toggle |
 
## Collision (`matu.physics`)
 
Only works on `object` nodes. 
 
**`matu.physics.intersects(a, b)`** — `true` if the two objects' rectangles overlap.
 
**`matu.physics.getCollisions(node)`** — returns every other `object` node currently overlapping `node`.
 
## Global variables (`matu.globals`)
 
Shared key/value store across all scripts. They are cleared at the start of every run.
 
| Function | Effect |
|---|---|
| `set(key, value)` | Stores a value |
| `get(key, fallback?)` | Retrieves a value, or `fallback` (default `null`) if unset |
| `has(key)` | Returns `true`/`false` |
| `delete(key)` | Removes a key |
 
## Scene (`matu.scene`)
 
**`matu.scene.setBackgroundColor(color)`** — sets the canvas background (any CSS color). Resets to its pre-run value when the run stops.
 
**`matu.scene.getBackgroundColor()`** — returns the current background color.
 
## Timers (`matu.timer`)
 
**`matu.timer.after(seconds, callback)`** — runs `callback` once after `seconds`. Returns a timer id.
 
**`matu.timer.every(seconds, callback)`** — runs `callback` repeatedly every `seconds`. Returns a timer id.
 
**`matu.timer.cancel(id)`** — cancels a pending/repeating timer.
 
## Runtime control (`matu.runtime`)
 
**`matu.runtime.stop()`** — stops the run from inside a script. Safe to call from `update()`. The current frame's remaining `update()` calls on other nodes are skipped once this fires.
 
**`matu.runtime.isRunning()`** — returns `true`/`false`.
 
## Reading node data directly
 
Most values don't need a getter. Nodes are plain objects and you can read fields straight off them.
 
**`object` nodes**
```js
node.transform.x          // number
node.transform.y          // number
node.transform.width      // number
node.transform.height     // number
node.transform.rotation   // number, in degrees
node.selected_sprite      // id of the explicitly chosen sprite child, or null for auto
```
 
**`sprite` nodes**
```js
node.opacity      // 0-1
node.visible      // boolean
node.asset_name   // string or null
```
 
**`audio` nodes**
```js
node.volume       // 0-1
node.loop         // boolean
node.asset_name   // string or null
```
 
**`label` nodes**
```js
node.text          // string
node.font_size      // number, in px
node.font_family    // string
node.color          // string
node.visible         // boolean
```
 
**All nodes**
```js
node.id          // internal id, like "node_7"
node.name        // display name
node.type        // 'group', 'object', 'sprite', 'audio', 'label', 'script'
node.parent_id    // parent's id, or null
node.child_ids    // array of child ids
```
 
You can edit these fields directly (`node.transform.x = 5`). The setters mainly exist for clamping and validation.
 
## Full example
 
```js
let bg1, bg2, score_label;
const bg_width = 800;
 
function start(owner, matu) {
    bg1 = matu.getNode('O:bg1');
    bg2 = matu.getNode('O:bg2');
    score_label = matu.getNode('L:ScoreLabel');
 
    matu.object.setPosition(bg1, 0, 0);
    matu.object.setPosition(bg2, bg_width, 0);
    matu.globals.set('score', 0);
 
    matu.timer.after(30, () => matu.runtime.stop());
}
 
function update(owner, matu, dt) {
    matu.object.move(bg1, -20 * dt, 0);
    matu.object.move(bg2, -20 * dt, 0);
 
    if (bg1.transform.x <= -bg_width) matu.object.setPosition(bg1, bg2.transform.x + bg_width, 0);
    if (bg2.transform.x <= -bg_width) matu.object.setPosition(bg2, bg1.transform.x + bg_width, 0);
 
    const target = matu.getNode('O:Enemy');
    if (target && matu.physics.intersects(owner, target)) {
        const score = matu.globals.get('score', 0) + 1;
        matu.globals.set('score', score);
        matu.label.setText(score_label, 'Score: ' + score);
        matu.audio.play(matu.getNode('A:HitSound'));
        matu.destroy(target);
    }
}
 
function OnClone(owner, matu, original) {
    matu.log('Cloned from', original.name);
}
 
function OnDestroy(owner, matu) {
    matu.log(owner.name, 'destroyed');
}
```
