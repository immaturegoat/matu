# Platformer tutorial for matu

---

## 0. Before you start

Upload three placeholder images via the Assets panel's **+** button:
- A small square for the **player** (`player.png`)
- A wide rectangle for a **platform** (`platform.png`)
- A small distinct shape for the **goal** (`goal.png`)

Any images will work for this tutorial. 

---

## 1. Build the ground and a platform

1. **+** and then **Object** (root level). Rename it `Ground`.
   - Set **X, Y** to `0, 380` and **Width, Height** to `800, 20`. 
2. Select `Ground`, **+** and then **Sprite**. Rename it `GroundSprite`, and set its **Image asset** to your platform image.
3. **+** and then **Object** (root level). Rename it `Platform1`.
   - Set **X, Y** to `300, 280` and **Width, Height** to `150, 20`.
4. Select `Platform1`, **+** and then **Sprite**. Rename it `Platform1Sprite`, and set its asset to the same platform image.

You should see a long strip along the bottom and a shorter platform floating above it.

---

## 2. Build the player

1. **+** and then **Object** (root level). Rename it `Player`.
   - Set **X, Y** to `50, 300` and **Width, Height** to `40, 40`.
2. Select `Player`, **+** and then **Sprite**. Rename it `PlayerSprite`, and set its asset to your player image.

---

## 3. Build the goal

1. **+** and then **Object** (root level). Rename it `Goal`.
   - Set **X, Y** to `350, 150` and **Width, Height** to `40, 40`

2. Select `Goal`, **+** and then **Sprite**. Rename it `GoalSprite`, and set its asset to your goal image.

---

## 4. Add the status label

1. **+** and then **Object** (root level). Rename it `HUD`. Then, set **X, Y** to `10, 10`.
2. Select `HUD`, **+** and then **Label**. Rename it `StatusLabel`.
3. Set **Message** to `Reach the goal!`, and pick a readable **Color**, **Font size** around `18`.

---

## 5. The player controller — gravity, landing, and jumping

Select `Player`, **+** and then **Script**. Rename it `PlayerController`, and paste:

```js
const gravity = 900;     
const jump_force = -420;     
const move_speed = 220;
const world_bottom = 400;
const spawn_x = 50;
const spawn_y = 300;

let velocity_y = 0;
let grounded = false;

function start(owner, matu) {
    velocity_y = 0;
    grounded = false;
    matu.object.setPosition(owner, spawn_x, spawn_y);
}

function update(owner, matu, dt) {
    if (matu.input.isDown('a') || matu.input.isDown('arrowleft')) {
        matu.object.move(owner, -move_speed * dt, 0);
    }
    if (matu.input.isDown('d') || matu.input.isDown('arrowright')) {
        matu.object.move(owner, move_speed * dt, 0);
    }

    velocity_y += gravity * dt;
    matu.object.move(owner, 0, velocity_y * dt);

    grounded = false;
    const solids = [matu.getNode('O:Ground'), matu.getNode('O:Platform1')];

    for (const solid of solids) {
        if (!solid) continue;
        if (velocity_y >= 0 && matu.physics.intersects(owner, solid)) {
            const new_y = solid.transform.y - owner.transform.height;
            matu.object.setPosition(owner, owner.transform.x, new_y);
            velocity_y = 0;
            grounded = true;
        }
    }

    if (grounded && matu.input.isDown(' ')) {
        velocity_y = jump_force;
        grounded = false;
    }

    if (owner.transform.y > world_bottom) {
        start(owner, matu);
    }

    const goal = matu.getNode('O:Goal');
    if (goal && matu.physics.intersects(owner, goal)) {
        matu.label.setText(matu.getNode('L:StatusLabel'), 'You reached the goal!');
        matu.runtime.stop();
    }
}
```

Hit **Run**. You should fall onto the ground, be able to move with A/D (or the arrow keys), jump with Space while grounded, land cleanly on `Platform1`, and end the game by touching the goal.

---