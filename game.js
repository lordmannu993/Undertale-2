const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const keys = new Set();
const pressed = new Set();

const rooms = {
  ruins: {
    id: 'ruins',
    name: 'Ruins - Entrance',
    exits: { right: 'hall' },
    npc: {
      x: 300,
      y: 220,
      text: ['* Howdy!', '* This is a compact fan-made prototype.', '* Move right to continue.'],
    },
  },
  hall: {
    id: 'hall',
    name: 'Ruins - Hallway',
    exits: { left: 'ruins', right: 'battle' },
    npc: null,
  },
  battle: {
    id: 'battle',
    name: 'Battle Trigger',
    exits: { left: 'hall' },
    npc: { x: 320, y: 200, text: ['* A wild Froggit jumps in front of you!'] },
  },
};

const state = {
  mode: 'overworld',
  room: rooms.ruins,
  player: { x: 60, y: 240, w: 16, h: 20, speed: 2 },
  dialog: null,
  hp: 20,
  enemyHp: 10,
  turn: 'menu',
  menuIndex: 0,
  soul: { x: 320, y: 390, w: 12, h: 12, speed: 3 },
  bones: [],
  invuln: 0,
  attackTimer: 0,
  encounterWon: false,
};

const menuItems = ['FIGHT', 'ACT', 'ITEM', 'MERCY'];

window.addEventListener('keydown', (e) => {
  const key = e.key;
  if (!keys.has(key)) pressed.add(key);
  keys.add(key);

  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key)) {
    e.preventDefault();
  }

  if (key.toLowerCase() === 'z') handleConfirm();
  if (key.toLowerCase() === 'x') handleBack();
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.key);
});

function wasPressed(key) {
  return pressed.has(key);
}

function clearPressed() {
  pressed.clear();
}

function handleConfirm() {
  if (state.dialog) {
    state.dialog.index += 1;
    if (state.dialog.index >= state.dialog.lines.length) {
      state.dialog = null;
    }
    return;
  }

  if (state.mode === 'battle' && state.turn === 'menu') {
    const choice = menuItems[state.menuIndex];
    if (choice === 'FIGHT') {
      state.enemyHp = Math.max(0, state.enemyHp - 3);
      state.turn = state.enemyHp <= 0 ? 'win' : 'enemy';
      state.attackTimer = 0;
      resetBones();
    } else if (choice === 'MERCY') {
      state.turn = 'flee';
    } else if (choice === 'ACT') {
      state.dialog = { lines: ['* You compliment Froggit.', '* Froggit seems pleased.'], index: 0 };
    } else {
      state.dialog = { lines: ['* You rummaged your bag.', '* But it is empty.'], index: 0 };
    }
  } else if (state.mode === 'overworld') {
    const npc = state.room.npc;
    if (npc && isNearNpc(state.player, npc)) {
      state.dialog = { lines: npc.text, index: 0 };
      if (state.room.id === 'battle') {
        startBattle();
      }
    }
  }
}

function handleBack() {
  if (state.mode !== 'battle') return;

  if (state.turn === 'flee' || state.turn === 'win') {
    if (state.turn === 'win') state.encounterWon = true;
    leaveBattle();
  }
}

function startBattle() {
  state.mode = 'battle';
  state.turn = 'menu';
  state.enemyHp = 10;
  state.menuIndex = 0;
  state.soul.x = 320;
  state.soul.y = 390;
  state.bones = [];
}

function leaveBattle() {
  state.mode = 'overworld';
  state.turn = 'menu';
  state.room = rooms.hall;
  state.player.x = 560;
  if (state.encounterWon) {
    rooms.battle.npc = null;
    rooms.battle.name = 'Battle Room - Cleared';
  }
}

function resetBones() {
  state.bones = Array.from({ length: 7 }, (_, i) => ({
    x: 160 + i * 50,
    y: -40 - i * 80,
    w: 10,
    h: 42,
    speed: 2.8,
  }));
}

function touching(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function isNearNpc(player, npc) {
  const centerX = player.x + player.w / 2;
  const centerY = player.y + player.h / 2;
  const npcCenterX = npc.x + 10;
  const npcCenterY = npc.y + 12;
  const dx = centerX - npcCenterX;
  const dy = centerY - npcCenterY;
  return Math.hypot(dx, dy) < 40;
}

function updateOverworld() {
  const p = state.player;
  if (keys.has('ArrowLeft')) p.x -= p.speed;
  if (keys.has('ArrowRight')) p.x += p.speed;
  if (keys.has('ArrowUp')) p.y -= p.speed;
  if (keys.has('ArrowDown')) p.y += p.speed;

  p.x = Math.max(8, Math.min(canvas.width - p.w - 8, p.x));
  p.y = Math.max(40, Math.min(canvas.height - p.h - 16, p.y));

  if (p.x < 10 && state.room.exits.left) {
    state.room = rooms[state.room.exits.left];
    p.x = canvas.width - p.w - 12;
  }
  if (p.x > canvas.width - p.w - 10 && state.room.exits.right) {
    state.room = rooms[state.room.exits.right];
    p.x = 12;
  }
}

function updateBattle() {
  if (state.turn === 'menu') {
    if (wasPressed('ArrowLeft')) {
      state.menuIndex = (state.menuIndex + menuItems.length - 1) % menuItems.length;
    }
    if (wasPressed('ArrowRight')) {
      state.menuIndex = (state.menuIndex + 1) % menuItems.length;
    }
  }

  if (state.turn === 'enemy') {
    state.attackTimer += 1;
    if (keys.has('ArrowLeft')) state.soul.x -= state.soul.speed;
    if (keys.has('ArrowRight')) state.soul.x += state.soul.speed;
    if (keys.has('ArrowUp')) state.soul.y -= state.soul.speed;
    if (keys.has('ArrowDown')) state.soul.y += state.soul.speed;

    state.soul.x = Math.max(170, Math.min(470, state.soul.x));
    state.soul.y = Math.max(290, Math.min(430, state.soul.y));

    for (const bone of state.bones) {
      bone.y += bone.speed;
      if (bone.y > 460) bone.y = -50;
      if (state.invuln <= 0 && touching(state.soul, bone)) {
        state.hp = Math.max(0, state.hp - 1);
        state.invuln = 30;
      }
    }

    state.invuln = Math.max(0, state.invuln - 1);

    if (state.attackTimer > 280 || state.hp <= 0) {
      state.turn = state.hp <= 0 ? 'lose' : 'menu';
    }
  }
}

function drawTextBox(lines) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(30, 340, 580, 120);
  ctx.fillStyle = '#000';
  ctx.fillRect(36, 346, 568, 108);
  ctx.fillStyle = '#fff';
  ctx.font = '20px Courier New';
  lines.forEach((line, i) => ctx.fillText(line, 56, 382 + i * 28));
}

function drawOverworld() {
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#fff';
  ctx.strokeRect(20, 50, 600, 270);

  ctx.fillStyle = '#fff';
  ctx.font = '18px Courier New';
  ctx.fillText(state.room.name, 24, 28);

  if (state.room.npc) {
    ctx.fillStyle = '#ffde59';
    ctx.fillRect(state.room.npc.x, state.room.npc.y, 20, 24);
  }

  ctx.fillStyle = '#f00';
  ctx.fillRect(state.player.x, state.player.y, state.player.w, state.player.h);

  if (state.dialog) {
    drawTextBox([state.dialog.lines[state.dialog.index]]);
  }
}

function drawBattle() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#fff';
  ctx.font = '18px Courier New';
  ctx.fillText(`FRISK  LV 1  HP ${state.hp}/20`, 32, 40);
  ctx.fillText(`FROGGIT HP ${state.enemyHp}/10`, 420, 40);

  ctx.strokeStyle = '#fff';
  ctx.strokeRect(160, 280, 320, 160);

  ctx.fillStyle = '#ff0';
  ctx.fillRect(300, 120, 40, 40);

  if (state.turn === 'enemy') {
    for (const bone of state.bones) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(bone.x, bone.y, bone.w, bone.h);
    }
    ctx.fillStyle = state.invuln > 0 && Math.floor(state.invuln / 4) % 2 === 0 ? '#fff6' : '#f00';
    ctx.fillRect(state.soul.x, state.soul.y, state.soul.w, state.soul.h);
  }

  if (state.turn === 'menu') {
    menuItems.forEach((item, idx) => {
      ctx.fillStyle = idx === state.menuIndex ? '#ff0' : '#fff';
      ctx.fillText(item, 45 + idx * 145, 470);
    });
  } else if (state.turn === 'win') {
    drawTextBox(['* Froggit was defeated!', '* Press X to return to the hallway.']);
  } else if (state.turn === 'flee') {
    drawTextBox(['* You spared Froggit.', '* Press X to return to the hallway.']);
  } else if (state.turn === 'lose') {
    drawTextBox(['* You cannot give up just yet...', '* Refresh to retry.']);
  }

  if (state.dialog) drawTextBox([state.dialog.lines[state.dialog.index]]);
}

function tick() {
  if (!state.dialog) {
    if (state.mode === 'overworld') updateOverworld();
    else updateBattle();
  }

  if (state.mode === 'overworld') drawOverworld();
  else drawBattle();

  clearPressed();
  requestAnimationFrame(tick);
}

tick();
