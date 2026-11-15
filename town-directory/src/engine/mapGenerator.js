/**
 * Procedural battle maps in the style of a Donjon dungeon generator.
 * Dungeons are rooms and corridors, caves are carved caverns, buildings are
 * floor plans with a yard. Every map is a square grid, 5 feet to a square.
 */

export const MAP_TILE = {
  ROCK: 0,
  FLOOR: 1,
  DOOR: 2,
  STAIR_UP: 3,
  STAIR_DOWN: 4,
  WATER: 5,
  YARD: 6,
  PILLAR: 7,
};

const CELL = 28;

const PRESETS = {
  dungeon: {
    small: { w: 32, h: 24, rooms: [5, 8], rw: [4, 7], rh: [4, 6] },
    medium: { w: 46, h: 34, rooms: [8, 13], rw: [4, 9], rh: [4, 7] },
    large: { w: 60, h: 44, rooms: [14, 20], rw: [4, 10], rh: [4, 8] },
  },
  cave: {
    small: { w: 34, h: 26, chambers: 2 },
    medium: { w: 48, h: 36, chambers: 3 },
    large: { w: 62, h: 46, chambers: 5 },
  },
  building: {
    small: { w: 28, h: 22 },
    medium: { w: 40, h: 30 },
    large: { w: 52, h: 40 },
  },
};

const GLYPH = {
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['01110', '10001', '00001', '00110', '00001', '10001', '01110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['01110', '10000', '11110', '10001', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
};

export function randomMapSeed() {
  return 1 + Math.floor(Math.random() * 999999);
}

export function generateMap({ kind = 'dungeon', size = 'medium', seed = 1 } = {}) {
  const safeKind = PRESETS[kind] ? kind : 'dungeon';
  const safeSize = PRESETS[safeKind][size] ? size : 'medium';
  let numeric = Math.floor(Number(seed));
  if (!Number.isFinite(numeric) || numeric <= 0) numeric = 1;
  numeric %= 1000000000;
  const rng = makeRng(numeric);
  const preset = PRESETS[safeKind][safeSize];
  const built = safeKind === 'cave'
    ? generateCave(rng, preset)
    : safeKind === 'building'
      ? generateBuilding(rng, preset)
      : generateDungeon(rng, preset);
  const rooms = built.rooms || [];
  return {
    kind: safeKind,
    size: safeSize,
    seed: numeric,
    width: preset.w,
    height: preset.h,
    cell: chooseCell(preset.w, preset.h),
    tiles: built.tiles,
    facing: built.facing,
    rooms,
    roomOf: stampRooms(preset.w, preset.h, rooms),
    blurb: blurbFor(safeKind),
  };
}

export function describeMap(layout) {
  const size = layout.size === 'small' ? 'Small' : layout.size === 'large' ? 'Large' : 'Medium';
  if (layout.kind === 'cave') return `${size} cave · seed ${layout.seed}`;
  const label = layout.kind === 'building' ? 'building' : 'dungeon';
  const count = layout.rooms?.length || 0;
  const rooms = `${count} room${count === 1 ? '' : 's'}`;
  return `${size} ${label} · ${rooms} · seed ${layout.seed}`;
}

export function paintMapPixels(data, layout) {
  const gw = layout.width;
  const gh = layout.height;
  const cell = layout.cell || CELL;
  const pw = gw * cell;
  const ph = gh * cell;
  const pal = palette(layout.kind);
  const tiles = layout.tiles;
  const roomOf = layout.roomOf;
  fillRect(data, pw, ph, 0, 0, pw, ph, pal.rock);

  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const tile = tiles[y * gw + x];
      if (tile === MAP_TILE.ROCK) continue;
      const color = tileColor(pal, tile, roomOf ? roomOf[y * gw + x] : 0, x, y);
      fillRect(data, pw, ph, x * cell, y * cell, cell, cell, color);
    }
  }

  const grid = cell >= 22 ? 2 : 1;
  shadeWalls(data, pw, ph, tiles, gw, gh, cell, cell >= 20 ? 3 : 2);
  drawGrid(data, pw, ph, tiles, gw, gh, cell, pal, grid);

  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const tile = tiles[y * gw + x];
      if (tile === MAP_TILE.DOOR) drawDoor(data, pw, ph, x, y, cell, layout.facing[y * gw + x]);
      else if (tile === MAP_TILE.PILLAR) drawPillar(data, pw, ph, x, y, cell);
      else if (tile === MAP_TILE.STAIR_UP) drawStairs(data, pw, ph, x, y, cell, true);
      else if (tile === MAP_TILE.STAIR_DOWN) drawStairs(data, pw, ph, x, y, cell, false);
      else if (tile === MAP_TILE.WATER) drawRipple(data, pw, ph, x, y, cell);
    }
  }

  const ink = [62, 48, 36, 255];
  for (const room of layout.rooms || []) {
    if (room.w < 3 || room.h < 3) continue;
    const anchor = numberAnchor(layout, room);
    const scale = room.w >= 5 && room.h >= 4 ? 2 : 1;
    drawText(
      data,
      pw,
      ph,
      String(room.n),
      anchor.x * cell + cell / 2,
      anchor.y * cell + cell / 2,
      scale,
      ink,
    );
  }
}

export function drawMap(canvas, layout) {
  const pw = layout.width * (layout.cell || CELL);
  const ph = layout.height * (layout.cell || CELL);
  canvas.width = pw;
  canvas.height = ph;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(pw, ph);
  paintMapPixels(image.data, layout);
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function blurbFor(kind) {
  if (kind === 'cave') return 'A natural cavern on a 5-foot grid. Stairs that narrow toward the top are the way in.';
  if (kind === 'building') return 'Rooms and a yard on a 5-foot grid. The door in the south wall is the entrance.';
  return 'Rooms, corridors, and doors on a 5-foot grid. Stairs that narrow toward the top are the way in.';
}

function generateDungeon(rng, preset) {
  const { w, h } = preset;
  const tiles = new Uint8Array(w * h);
  const facing = new Uint8Array(w * h);
  const rooms = placeRooms(rng, preset);
  for (const room of rooms) fillTiles(tiles, w, room.x, room.y, room.w, room.h, MAP_TILE.FLOOR);
  connectRooms(tiles, w, h, rooms, rng);
  linkComponents(tiles, w, h);
  placeDoors(tiles, facing, w, h, rooms);
  placeDungeonStairs(tiles, w, rooms);
  placePillars(tiles, w, rooms, rng);
  placeWater(tiles, w, rooms, rng);
  return { tiles, facing, rooms };
}

function generateCave(rng, preset) {
  const { w, h } = preset;
  const tiles = new Uint8Array(w * h);
  const facing = new Uint8Array(w * h);
  const walks = preset.chambers + 3;
  const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (let n = 0; n < walks; n++) {
    let x = irand(rng, 5, w - 6);
    let y = irand(rng, 5, h - 6);
    const steps = irand(rng, Math.floor(w * h * 0.035), Math.floor(w * h * 0.07));
    let dir = irand(rng, 0, 3);
    clearDisk(tiles, w, h, x, y, irand(rng, 2, 3));
    for (let s = 0; s < steps; s++) {
      clearDisk(tiles, w, h, x, y, rng() < 0.22 ? 2 : 1);
      if (rng() < 0.18) dir = irand(rng, 0, 3);
      else if (rng() < 0.35) dir = (dir + 1 + (rng() < 0.5 ? 2 : 0)) % 4;
      x = Math.min(w - 5, Math.max(4, x + dirs[dir][0]));
      y = Math.min(h - 5, Math.max(4, y + dirs[dir][1]));
    }
  }
  roundCave(tiles, w, h);
  roundCave(tiles, w, h);
  linkComponents(tiles, w, h);
  sprinklePillars(tiles, w, h, rng);
  const ends = distantEnds(tiles, w, h, rng);
  if (ends) {
    tiles[ends.up] = MAP_TILE.STAIR_UP;
    if (ends.down !== ends.up) tiles[ends.down] = MAP_TILE.STAIR_DOWN;
  }
  placeCavePool(tiles, w, h, rng);
  return { tiles, facing, rooms: [] };
}

function generateBuilding(rng, preset) {
  const { w, h } = preset;
  const tiles = new Uint8Array(w * h);
  const facing = new Uint8Array(w * h);
  tiles.fill(MAP_TILE.YARD);
  const marginX = Math.max(3, Math.floor(w * 0.14));
  const marginY = Math.max(3, Math.floor(h * 0.14));
  const outer = { x: marginX, y: marginY, w: w - marginX * 2, h: h - marginY * 2 };
  fillTiles(tiles, w, outer.x, outer.y, outer.w, outer.h, MAP_TILE.ROCK);
  const interior = { x: outer.x + 1, y: outer.y + 1, w: outer.w - 2, h: outer.h - 2 };
  const rooms = [];
  splitBuilding(interior, rooms, rng, 0);
  rooms.forEach((room, index) => {
    room.n = index + 1;
    fillTiles(tiles, w, room.x, room.y, room.w, room.h, MAP_TILE.FLOOR);
  });
  punchBuildingDoors(tiles, w, rooms, rng);
  punchEntrance(tiles, w, h, outer, rooms, rng);
  placeDoors(tiles, facing, w, h, rooms);
  const largest = rooms.slice().sort((a, b) => b.w * b.h - a.w * a.h)[0];
  if (largest) {
    const sx = largest.x + 1;
    const sy = largest.y + 1;
    if (tiles[sy * w + sx] === MAP_TILE.FLOOR) tiles[sy * w + sx] = MAP_TILE.STAIR_UP;
  }
  return { tiles, facing, rooms };
}

function placeRooms(rng, preset) {
  const { w, h } = preset;
  const [minRooms, maxRooms] = preset.rooms;
  const target = irand(rng, minRooms, maxRooms);
  const rooms = [];
  let tries = 0;
  while (rooms.length < target && tries < target * 80) {
    tries += 1;
    const rw = irand(rng, preset.rw[0], preset.rw[1]);
    const rh = irand(rng, preset.rh[0], preset.rh[1]);
    const maxX = w - rw - 3;
    const maxY = h - rh - 3;
    if (maxX < 2 || maxY < 2) continue;
    const x = irand(rng, 2, maxX);
    const y = irand(rng, 2, maxY);
    const hit = rooms.some((room) =>
      x < room.x + room.w + 1 && x + rw + 1 > room.x && y < room.y + room.h + 1 && y + rh + 1 > room.y
    );
    if (hit) continue;
    rooms.push({ x, y, w: rw, h: rh, n: rooms.length + 1 });
  }
  if (rooms.length < 2) {
    rooms.length = 0;
    const rw = Math.min(6, w - 6);
    const rh = Math.min(5, h - 6);
    rooms.push({ x: 2, y: 2, w: rw, h: rh, n: 1 });
    rooms.push({ x: w - rw - 3, y: h - rh - 3, w: rw, h: rh, n: 2 });
  }
  return rooms;
}

function connectRooms(tiles, w, h, rooms, rng) {
  if (rooms.length < 2) return;
  const links = spanningLinks(rooms);
  const extra = Math.max(1, Math.round(rooms.length / 6));
  for (let n = 0; n < extra; n++) {
    const i = irand(rng, 0, rooms.length - 1);
    const j = irand(rng, 0, rooms.length - 1);
    if (i !== j) links.push([i, j]);
  }
  for (const [i, j] of links) {
    let carved = false;
    for (let attempt = 0; attempt < 18 && !carved; attempt++) {
      carved = carveLink(tiles, w, h, rooms, rooms[i], rooms[j], rng);
    }
  }
}

function spanningLinks(rooms) {
  const pending = rooms.map((_, index) => index);
  pending.shift();
  const joined = [0];
  const links = [];
  while (pending.length) {
    let best = null;
    for (const i of joined) {
      for (const j of pending) {
        const d = roomDist(rooms[i], rooms[j]);
        if (!best || d < best.d) best = { i, j, d };
      }
    }
    links.push([best.i, best.j]);
    joined.push(best.j);
    pending.splice(pending.indexOf(best.j), 1);
  }
  return links;
}

function carveLink(tiles, w, h, rooms, a, b, rng) {
  const from = pickExit(a, b, rng);
  const to = pickExit(b, a, rng);
  const bends = Math.abs(from.x - to.x) >= Math.abs(from.y - to.y) ? [true, false] : [false, true];
  for (const horizFirst of bends) {
    const path = elbowPath(from.x, from.y, to.x, to.y, horizFirst);
    if (!pathOk(path, w, h, rooms, a, b)) continue;
    for (const [x, y] of path) {
      if (roomAt(rooms, x, y)) continue;
      const i = y * w + x;
      if (tiles[i] === MAP_TILE.ROCK) tiles[i] = MAP_TILE.FLOOR;
    }
    return true;
  }
  return false;
}

function pathOk(path, w, h, rooms, a, b) {
  const doors = new Set([key(path[0][0], path[0][1]), key(path[path.length - 1][0], path[path.length - 1][1])]);
  for (const [x, y] of path) {
    if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) return false;
    const host = roomAt(rooms, x, y);
    if (host && host !== a && host !== b) return false;
    if (host) continue;
    let third = false;
    let touchesEnd = false;
    for (const [nx, ny] of around4(x, y)) {
      const near = roomAt(rooms, nx, ny);
      if (!near) continue;
      if (near === a || near === b) touchesEnd = true;
      else third = true;
    }
    if (third) return false;
    if (touchesEnd && !doors.has(key(x, y))) return false;
  }
  return true;
}

function pickExit(room, other, rng) {
  const dx = (other.x + other.w / 2) - (room.x + room.w / 2);
  const dy = (other.y + other.h / 2) - (room.y + room.h / 2);
  if (Math.abs(dx) >= Math.abs(dy)) {
    const dir = dx >= 0 ? 1 : -1;
    const y = room.y + irand(rng, 0, room.h - 1);
    const x = dir > 0 ? room.x + room.w : room.x - 1;
    return { x, y };
  }
  const dir = dy >= 0 ? 1 : -1;
  const x = room.x + irand(rng, 0, room.w - 1);
  const y = dir > 0 ? room.y + room.h : room.y - 1;
  return { x, y };
}

function elbowPath(x1, y1, x2, y2, horizFirst) {
  const path = [];
  if (horizFirst) {
    const step = x2 >= x1 ? 1 : -1;
    for (let x = x1; x !== x2; x += step) path.push([x, y1]);
    const stepY = y2 >= y1 ? 1 : -1;
    for (let y = y1; y !== y2; y += stepY) path.push([x2, y]);
  } else {
    const stepY = y2 >= y1 ? 1 : -1;
    for (let y = y1; y !== y2; y += stepY) path.push([x1, y]);
    const step = x2 >= x1 ? 1 : -1;
    for (let x = x1; x !== x2; x += step) path.push([x, y2]);
  }
  path.push([x2, y2]);
  return path;
}

function placeDoors(tiles, facing, w, h, rooms) {
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (tiles[i] !== MAP_TILE.FLOOR) continue;
      if (roomAt(rooms, x, y)) continue;
      const eastRoom = !!roomAt(rooms, x + 1, y);
      const westRoom = !!roomAt(rooms, x - 1, y);
      const northRoom = !!roomAt(rooms, x, y - 1);
      const southRoom = !!roomAt(rooms, x, y + 1);
      const eastOpen = passable(tiles[(y * w) + x + 1]) && !eastRoom;
      const westOpen = passable(tiles[(y * w) + x - 1]) && !westRoom;
      const northOpen = passable(tiles[((y - 1) * w) + x]) && !northRoom;
      const southOpen = passable(tiles[((y + 1) * w) + x]) && !southRoom;
      const northBlocked = !northOpen && !northRoom;
      const southBlocked = !southOpen && !southRoom;
      const eastBlocked = !eastOpen && !eastRoom;
      const westBlocked = !westOpen && !westRoom;
      const across = (eastRoom || eastOpen) && (westRoom || westOpen) && (eastRoom || westRoom) && northBlocked && southBlocked;
      const along = (northRoom || northOpen) && (southRoom || southOpen) && (northRoom || southRoom) && eastBlocked && westBlocked;
      if (across && !along) {
        tiles[i] = MAP_TILE.DOOR;
        facing[i] = 2;
      } else if (along && !across) {
        tiles[i] = MAP_TILE.DOOR;
        facing[i] = 1;
      }
    }
  }
  thinDoubleDoors(tiles, facing, w, h);
}

function thinDoubleDoors(tiles, facing, w, h) {
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (tiles[i] !== MAP_TILE.DOOR) continue;
      const ni = facing[i] === 2 ? i + 1 : i + w;
      if (tiles[ni] !== MAP_TILE.DOOR) continue;
      tiles[ni] = MAP_TILE.FLOOR;
      facing[ni] = 0;
    }
  }
}

function placeDungeonStairs(tiles, w, rooms) {
  const start = rooms[0];
  let far = rooms[rooms.length - 1];
  let best = -1;
  for (const room of rooms) {
    const d = roomDist(start, room);
    if (d > best) {
      best = d;
      far = room;
    }
  }
  const up = stairCell(tiles, w, start);
  const down = stairCell(tiles, w, far === start ? rooms[rooms.length - 1] : far);
  if (up >= 0) tiles[up] = MAP_TILE.STAIR_UP;
  if (down >= 0 && down !== up) tiles[down] = MAP_TILE.STAIR_DOWN;
}

function stairCell(tiles, w, room) {
  const spots = [];
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (tiles[y * w + x] === MAP_TILE.FLOOR) spots.push([x, y]);
    }
  }
  if (!spots.length) return -1;
  const cx = room.x + (room.w - 1) / 2;
  const cy = room.y + (room.h - 1) / 2;
  spots.sort((a, b) => ((a[0] - cx) ** 2 + (a[1] - cy) ** 2) - ((b[0] - cx) ** 2 + (b[1] - cy) ** 2));
  const [x, y] = spots[0];
  return y * w + x;
}

function placePillars(tiles, w, rooms, rng) {
  for (const room of rooms) {
    if (room.w >= 8 && room.h >= 8 && rng() < 0.72) {
      const pts = [
        [room.x + 1, room.y + 1],
        [room.x + room.w - 2, room.y + 1],
        [room.x + 1, room.y + room.h - 2],
        [room.x + room.w - 2, room.y + room.h - 2],
      ];
      for (const [x, y] of pts) {
        const i = y * w + x;
        if (tiles[i] === MAP_TILE.FLOOR) tiles[i] = MAP_TILE.PILLAR;
      }
    } else if (room.w >= 6 && room.h >= 6 && rng() < 0.6) {
      const x = room.x + Math.floor(room.w / 2);
      const y = room.y + Math.floor(room.h / 2);
      const i = y * w + x;
      if (tiles[i] === MAP_TILE.FLOOR) tiles[i] = MAP_TILE.PILLAR;
    }
  }
}

function placeWater(tiles, w, rooms, rng) {
  if (rng() > 0.42) return;
  const poolRooms = rooms.filter((room) => {
    if (room.w < 5 || room.h < 5) return false;
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        const tile = tiles[y * w + x];
        if (tile === MAP_TILE.STAIR_UP || tile === MAP_TILE.STAIR_DOWN) return false;
      }
    }
    return true;
  });
  if (!poolRooms.length) return;
  const room = poolRooms[irand(rng, 0, poolRooms.length - 1)];
  const inset = room.w >= 7 && room.h >= 7 ? 2 : 1;
  for (let y = room.y + inset; y < room.y + room.h - inset; y++) {
    for (let x = room.x + inset; x < room.x + room.w - inset; x++) {
      if (tiles[y * w + x] === MAP_TILE.FLOOR) tiles[y * w + x] = MAP_TILE.WATER;
    }
  }
}

function roundCave(tiles, w, h) {
  const next = tiles.slice();
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const near = countRock(tiles, w, h, x, y, 1);
      if (tiles[i] === MAP_TILE.FLOOR && near >= 6) next[i] = MAP_TILE.ROCK;
      else if (tiles[i] === MAP_TILE.ROCK && near <= 1) next[i] = MAP_TILE.FLOOR;
    }
  }
  tiles.set(next);
}

function clearDisk(tiles, w, h, cx, cy, radius) {
  const r2 = radius * radius + 0.2;
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) continue;
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) tiles[y * w + x] = MAP_TILE.FLOOR;
    }
  }
}

function countRock(tiles, w, h, x, y, radius) {
  let count = 0;
  for (let yy = y - radius; yy <= y + radius; yy++) {
    for (let xx = x - radius; xx <= x + radius; xx++) {
      if (xx === x && yy === y) continue;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h || tiles[yy * w + xx] === MAP_TILE.ROCK) count += 1;
    }
  }
  return count;
}

function sprinklePillars(tiles, w, h, rng) {
  const spots = [];
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      if (tiles[y * w + x] !== MAP_TILE.ROCK) continue;
      let open = 0;
      for (let yy = y - 1; yy <= y + 1; yy++) {
        for (let xx = x - 1; xx <= x + 1; xx++) {
          if (xx === x && yy === y) continue;
          if (tiles[yy * w + xx] === MAP_TILE.FLOOR) open += 1;
        }
      }
      if (open === 8) spots.push(y * w + x);
    }
  }
  for (let i = spots.length - 1; i > 0; i--) {
    const j = irand(rng, 0, i);
    const swap = spots[i];
    spots[i] = spots[j];
    spots[j] = swap;
  }
  spots.slice(0, 6).forEach((i) => {
    tiles[i] = MAP_TILE.PILLAR;
  });
  for (let n = 6; n < spots.length; n++) tiles[spots[n]] = MAP_TILE.FLOOR;
}

function distantEnds(tiles, w, h, rng) {
  const floors = [];
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] === MAP_TILE.FLOOR) floors.push(i);
  }
  if (!floors.length) return null;
  const origin = floors[irand(rng, 0, floors.length - 1)];
  const far = farthest(tiles, w, h, origin);
  const back = farthest(tiles, w, h, far);
  return { up: back, down: far };
}

function farthest(tiles, w, h, start) {
  const dist = new Int16Array(tiles.length);
  dist.fill(-1);
  const q = [start];
  dist[start] = 0;
  let last = start;
  for (let qi = 0; qi < q.length; qi++) {
    const cur = q[qi];
    last = cur;
    const x = cur % w;
    const y = (cur / w) | 0;
    for (const [nx, ny] of around4(x, y)) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (dist[ni] >= 0 || !passable(tiles[ni])) continue;
      dist[ni] = dist[cur] + 1;
      q.push(ni);
    }
  }
  return last;
}

function placeCavePool(tiles, w, h, rng) {
  if (rng() > 0.55) return;
  const spots = [];
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      if (tiles[y * w + x] !== MAP_TILE.FLOOR) continue;
      let open = 0;
      for (let yy = y - 1; yy <= y + 1; yy++) {
        for (let xx = x - 1; xx <= x + 1; xx++) {
          if (!passable(tiles[yy * w + xx])) open = -99;
          else open += 1;
        }
      }
      if (open >= 8) spots.push(y * w + x);
    }
  }
  if (!spots.length) return;
  const start = spots[irand(rng, 0, spots.length - 1)];
  const blob = [start];
  const seen = new Set([start]);
  const budget = irand(rng, 8, 18);
  while (blob.length < budget) {
    const cur = blob[irand(rng, 0, blob.length - 1)];
    const x = cur % w;
    const y = (cur / w) | 0;
    const options = around4(x, y).filter(([nx, ny]) => {
      const ni = ny * w + nx;
      return tiles[ni] === MAP_TILE.FLOOR && !seen.has(ni);
    });
    if (!options.length) break;
    const [nx, ny] = options[irand(rng, 0, options.length - 1)];
    const ni = ny * w + nx;
    seen.add(ni);
    blob.push(ni);
  }
  if (blob.length < 4) return;
  for (const i of blob) tiles[i] = MAP_TILE.WATER;
}

function splitBuilding(rect, rooms, rng, depth) {
  const minRoom = 4;
  const canW = rect.w >= minRoom * 2 + 1;
  const canH = rect.h >= minRoom * 2 + 1;
  const roomy = rect.w > 10 || rect.h > 8;
  if ((!canW && !canH) || depth > 7 || (depth > 0 && !roomy && rng() < 0.45)) {
    rooms.push({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, n: 0 });
    return;
  }
  const vertical = canW && (!canH || rect.w >= rect.h ? rng() < 0.72 : rng() < 0.28);
  if (vertical && canW) {
    const cut = irand(rng, rect.x + minRoom, rect.x + rect.w - minRoom - 1);
    splitBuilding({ x: rect.x, y: rect.y, w: cut - rect.x, h: rect.h }, rooms, rng, depth + 1);
    splitBuilding({ x: cut + 1, y: rect.y, w: rect.x + rect.w - cut - 1, h: rect.h }, rooms, rng, depth + 1);
    return;
  }
  if (canH) {
    const cut = irand(rng, rect.y + minRoom, rect.y + rect.h - minRoom - 1);
    splitBuilding({ x: rect.x, y: rect.y, w: rect.w, h: cut - rect.y }, rooms, rng, depth + 1);
    splitBuilding({ x: rect.x, y: cut + 1, w: rect.w, h: rect.y + rect.h - cut - 1 }, rooms, rng, depth + 1);
    return;
  }
  rooms.push({ x: rect.x, y: rect.y, w: rect.w, h: rect.h, n: 0 });
}

function punchBuildingDoors(tiles, w, rooms, rng) {
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const wall = sharedWall(rooms[i], rooms[j]);
      if (!wall) continue;
      if (wall.vertical) {
        const span = wall.y1 - wall.y0;
        const inset = span >= 3 ? 1 : 0;
        const y = wall.y0 + irand(rng, inset, span - 1 - inset);
        const iCell = y * w + wall.x;
        if (tiles[iCell] === MAP_TILE.ROCK) tiles[iCell] = MAP_TILE.FLOOR;
      } else {
        const span = wall.x1 - wall.x0;
        const inset = span >= 3 ? 1 : 0;
        const x = wall.x0 + irand(rng, inset, span - 1 - inset);
        const iCell = wall.y * w + x;
        if (tiles[iCell] === MAP_TILE.ROCK) tiles[iCell] = MAP_TILE.FLOOR;
      }
    }
  }
}

function sharedWall(a, b) {
  if (a.x + a.w + 1 === b.x || b.x + b.w + 1 === a.x) {
    const left = a.x < b.x ? a : b;
    const y0 = Math.max(a.y, b.y);
    const y1 = Math.min(a.y + a.h, b.y + b.h);
    if (y1 > y0) return { vertical: true, x: left.x + left.w, y0, y1 };
  }
  if (a.y + a.h + 1 === b.y || b.y + b.h + 1 === a.y) {
    const top = a.y < b.y ? a : b;
    const x0 = Math.max(a.x, b.x);
    const x1 = Math.min(a.x + a.w, b.x + b.w);
    if (x1 > x0) return { vertical: false, y: top.y + top.h, x0, x1 };
  }
  return null;
}

function punchEntrance(tiles, w, h, outer, rooms, rng) {
  const southEdge = outer.y + outer.h - 2;
  const touching = rooms.filter((room) => room.y + room.h - 1 === southEdge);
  const room = (touching.length ? touching : rooms)[touching.length ? irand(rng, 0, touching.length - 1) : 0];
  if (!room) return;
  const x = room.x + irand(rng, 0, room.w - 1);
  const y = outer.y + outer.h - 1;
  if (y <= 0 || y >= h - 1) return;
  tiles[y * w + x] = MAP_TILE.FLOOR;
}

function linkComponents(tiles, w, h) {
  for (let guard = 0; guard < 24; guard++) {
    const comps = components(tiles, w, h);
    if (comps.length <= 1) return;
    const target = new Uint8Array(tiles.length);
    for (const i of comps[1]) target[i] = 1;
    const prev = new Int32Array(tiles.length);
    prev.fill(-1);
    const seen = new Uint8Array(tiles.length);
    const queue = [];
    for (const i of comps[0]) {
      seen[i] = 1;
      prev[i] = -2;
      queue.push(i);
    }
    let hit = -1;
    for (let qi = 0; qi < queue.length && hit < 0; qi++) {
      const cur = queue[qi];
      const x = cur % w;
      const y = (cur / w) | 0;
      for (const [nx, ny] of around4(x, y)) {
        if (nx < 1 || ny < 1 || nx >= w - 1 || ny >= h - 1) continue;
        const ni = ny * w + nx;
        if (seen[ni]) continue;
        seen[ni] = 1;
        prev[ni] = cur;
        queue.push(ni);
        if (target[ni]) {
          hit = ni;
          break;
        }
      }
    }
    if (hit < 0) return;
    let cur = hit;
    while (cur >= 0 && prev[cur] !== -2) {
      if (tiles[cur] === MAP_TILE.ROCK) tiles[cur] = MAP_TILE.FLOOR;
      cur = prev[cur];
    }
  }
}

function components(tiles, w, h) {
  const seen = new Uint8Array(tiles.length);
  const comps = [];
  for (let i = 0; i < tiles.length; i++) {
    if (seen[i] || !passable(tiles[i])) continue;
    const cells = [];
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const cur = stack.pop();
      cells.push(cur);
      const x = cur % w;
      const y = (cur / w) | 0;
      for (const [nx, ny] of around4(x, y)) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (seen[ni] || !passable(tiles[ni])) continue;
        seen[ni] = 1;
        stack.push(ni);
      }
    }
    comps.push(cells);
  }
  return comps;
}

function stampRooms(w, h, rooms) {
  const roomOf = new Uint16Array(w * h);
  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) roomOf[y * w + x] = room.n;
    }
  }
  return roomOf;
}

function palette(kind) {
  const rock = [28, 25, 22, 255];
  const rockGrid = [68, 62, 56, 255];
  if (kind === 'cave') {
    return {
      rock,
      rockGrid,
      floor: [166, 162, 154, 255],
      floorGrid: [112, 108, 100, 255],
      room: [176, 172, 164, 255],
      roomGrid: [120, 116, 108, 255],
      yard: [166, 162, 154, 255],
      yardGrid: [112, 108, 100, 255],
      water: [58, 102, 114, 255],
      waterGrid: [34, 70, 80, 255],
    };
  }
  if (kind === 'building') {
    return {
      rock,
      rockGrid,
      floor: [198, 166, 122, 255],
      floorGrid: [146, 116, 80, 255],
      room: [206, 176, 132, 255],
      roomGrid: [154, 124, 86, 255],
      yard: [116, 122, 84, 255],
      yardGrid: [78, 84, 54, 255],
      water: [58, 102, 114, 255],
      waterGrid: [34, 70, 80, 255],
    };
  }
  return {
    rock,
    rockGrid,
    floor: [198, 190, 172, 255],
    floorGrid: [140, 132, 116, 255],
    room: [218, 208, 188, 255],
    roomGrid: [156, 146, 128, 255],
    yard: [198, 190, 172, 255],
    yardGrid: [140, 132, 116, 255],
    water: [62, 110, 122, 255],
    waterGrid: [36, 76, 86, 255],
  };
}

function tileColor(pal, tile, roomId, x, y) {
  let color = pal.floor;
  if (tile === MAP_TILE.WATER) color = pal.water;
  else if (tile === MAP_TILE.YARD) color = pal.yard;
  else if (roomId) color = pal.room;
  const shift = ((x * 13 + y * 29) % 5 === 0) ? -8 : 0;
  if (!shift) return color;
  return [color[0] + shift, color[1] + shift, color[2] + shift, 255];
}

function shadeWalls(data, pw, ph, tiles, gw, gh, cell, depth) {
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      if (tiles[y * gw + x] === MAP_TILE.ROCK) continue;
      const x0 = x * cell;
      const y0 = y * cell;
      if (y === 0 || tiles[(y - 1) * gw + x] === MAP_TILE.ROCK) darken(data, pw, ph, x0, y0, cell, depth);
      if (y === gh - 1 || tiles[(y + 1) * gw + x] === MAP_TILE.ROCK) darken(data, pw, ph, x0, y0 + cell - depth, cell, depth);
      if (x === 0 || tiles[y * gw + x - 1] === MAP_TILE.ROCK) darken(data, pw, ph, x0, y0, depth, cell);
      if (x === gw - 1 || tiles[y * gw + x + 1] === MAP_TILE.ROCK) darken(data, pw, ph, x0 + cell - depth, y0, depth, cell);
    }
  }
}

function darken(data, pw, ph, x, y, rw, rh) {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(pw, x + rw);
  const y1 = Math.min(ph, y + rh);
  for (let yy = y0; yy < y1; yy++) {
    let i = (yy * pw + x0) * 4;
    for (let xx = x0; xx < x1; xx++) {
      data[i] = Math.max(0, data[i] - 16);
      data[i + 1] = Math.max(0, data[i + 1] - 16);
      data[i + 2] = Math.max(0, data[i + 2] - 14);
      i += 4;
    }
  }
}

function drawGrid(data, pw, ph, tiles, gw, gh, cell, pal, grid) {
  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const tile = tiles[y * gw + x];
      const color = gridColor(pal, tile);
      const x0 = x * cell;
      const y0 = y * cell;
      fillRect(data, pw, ph, x0 + cell - grid, y0, grid, cell, color);
      fillRect(data, pw, ph, x0, y0 + cell - grid, cell, grid, color);
      if (x === 0) fillRect(data, pw, ph, x0, y0, grid, cell, color);
      if (y === 0) fillRect(data, pw, ph, x0, y0, cell, grid, color);
    }
  }
}

function gridColor(pal, tile) {
  if (tile === MAP_TILE.ROCK) return pal.rockGrid;
  if (tile === MAP_TILE.WATER) return pal.waterGrid;
  if (tile === MAP_TILE.YARD) return pal.yardGrid;
  if (tile === MAP_TILE.FLOOR || tile === MAP_TILE.DOOR || tile === MAP_TILE.STAIR_UP || tile === MAP_TILE.STAIR_DOWN || tile === MAP_TILE.PILLAR) {
    return pal.roomGrid;
  }
  return pal.floorGrid;
}

function drawDoor(data, pw, ph, gx, gy, cell, face) {
  const wood = [128, 82, 44, 255];
  const lite = [168, 118, 70, 255];
  const x0 = gx * cell;
  const y0 = gy * cell;
  if (face === 1) {
    const y = y0 + Math.floor(cell * 0.34);
    const h = Math.max(6, Math.floor(cell * 0.32));
    fillRect(data, pw, ph, x0 + 3, y, cell - 6, h, wood);
    fillRect(data, pw, ph, x0 + 3, y, cell - 6, 2, lite);
    fillRect(data, pw, ph, x0 + cell - 10, y + Math.floor(h / 2) - 1, 3, 3, lite);
  } else {
    const x = x0 + Math.floor(cell * 0.34);
    const rw = Math.max(6, Math.floor(cell * 0.32));
    fillRect(data, pw, ph, x, y0 + 3, rw, cell - 6, wood);
    fillRect(data, pw, ph, x, y0 + 3, 2, cell - 6, lite);
    fillRect(data, pw, ph, x + Math.floor(rw / 2) - 1, y0 + cell - 10, 3, 3, lite);
  }
}

function drawPillar(data, pw, ph, gx, gy, cell) {
  const stone = [64, 58, 52, 255];
  const rim = [118, 110, 100, 255];
  const cx = gx * cell + cell / 2;
  const cy = gy * cell + cell / 2;
  const radius = cell * 0.3;
  const x0 = Math.max(0, Math.floor(cx - radius - 1));
  const y0 = Math.max(0, Math.floor(cy - radius - 1));
  const x1 = Math.min(pw, Math.ceil(cx + radius + 1));
  const y1 = Math.min(ph, Math.ceil(cy + radius + 1));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= radius - 1.2) setPixel(data, pw, x, y, stone);
      else if (d <= radius) setPixel(data, pw, x, y, rim);
    }
  }
}

function drawStairs(data, pw, ph, gx, gy, cell, up) {
  const inset = Math.max(3, Math.floor(cell * 0.16));
  const x0 = gx * cell + inset;
  const y0 = gy * cell + inset;
  const rw = cell - inset * 2;
  const rh = cell - inset * 2;
  fillRect(data, pw, ph, x0, y0, rw, rh, [92, 78, 62, 255]);
  const bars = 4;
  for (let i = 0; i < bars; i++) {
    const shrink = up ? i : bars - 1 - i;
    const pad = 2 + shrink * Math.max(1, Math.floor(rw / 12));
    const y = y0 + 2 + Math.floor((i + 0.5) * ((rh - 4) / bars));
    fillRect(data, pw, ph, x0 + pad, y, Math.max(2, rw - pad * 2), Math.max(1, Math.floor(cell / 14)), [36, 30, 26, 255]);
  }
}

function drawRipple(data, pw, ph, gx, gy, cell) {
  const x0 = gx * cell + 6;
  const y = gy * cell + Math.floor(cell / 2);
  fillRect(data, pw, ph, x0, y, cell - 12, 1, [150, 196, 204, 255]);
}

function numberAnchor(layout, room) {
  const w = layout.width;
  const cx = room.x + Math.floor((room.w - 1) / 2);
  const cy = room.y + Math.floor((room.h - 1) / 2);
  const tile = layout.tiles[cy * w + cx];
  if (tile === MAP_TILE.FLOOR || tile === MAP_TILE.YARD) return { x: cx, y: cy };
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (layout.tiles[y * w + x] === MAP_TILE.FLOOR) return { x, y };
    }
  }
  return { x: cx, y: cy };
}

function drawText(data, pw, ph, text, cx, cy, scale, color) {
  const glyphW = 5 * scale;
  const gap = scale;
  const total = text.length * glyphW + (text.length - 1) * gap;
  let x = Math.round(cx - total / 2);
  const y = Math.round(cy - (7 * scale) / 2);
  for (const ch of text) {
    const rows = GLYPH[ch];
    if (!rows) continue;
    for (let gy = 0; gy < rows.length; gy++) {
      for (let gx = 0; gx < rows[gy].length; gx++) {
        if (rows[gy][gx] !== '1') continue;
        fillRect(data, pw, ph, x + gx * scale, y + gy * scale, scale, scale, color);
      }
    }
    x += glyphW + gap;
  }
}

function fillTiles(tiles, w, x, y, rw, rh, tile) {
  for (let yy = y; yy < y + rh; yy++) {
    for (let xx = x; xx < x + rw; xx++) tiles[yy * w + xx] = tile;
  }
}

function fillRect(data, pw, ph, x, y, rw, rh, color) {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(pw, x + rw);
  const y1 = Math.min(ph, y + rh);
  for (let yy = y0; yy < y1; yy++) {
    let i = (yy * pw + x0) * 4;
    for (let xx = x0; xx < x1; xx++) {
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      data[i + 3] = 255;
      i += 4;
    }
  }
}

function setPixel(data, pw, x, y, color) {
  const i = (y * pw + x) * 4;
  data[i] = color[0];
  data[i + 1] = color[1];
  data[i + 2] = color[2];
  data[i + 3] = 255;
}

function passable(tile) {
  return tile === MAP_TILE.FLOOR
    || tile === MAP_TILE.DOOR
    || tile === MAP_TILE.STAIR_UP
    || tile === MAP_TILE.STAIR_DOWN
    || tile === MAP_TILE.WATER
    || tile === MAP_TILE.YARD;
}

function roomAt(rooms, x, y) {
  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    if (x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h) return room;
  }
  return null;
}

function roomDist(a, b) {
  const dx = (a.x + a.w / 2) - (b.x + b.w / 2);
  const dy = (a.y + a.h / 2) - (b.y + b.h / 2);
  return Math.abs(dx) + Math.abs(dy);
}

function around4(x, y) {
  return [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
}

function key(x, y) {
  return `${x},${y}`;
}

function chooseCell(w, h) {
  const fit = Math.floor(860 / Math.max(w, h));
  return Math.max(14, Math.min(26, fit));
}

function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function irand(rng, min, max) {
  if (max <= min) return min;
  return min + Math.floor(rng() * (max - min + 1));
}
