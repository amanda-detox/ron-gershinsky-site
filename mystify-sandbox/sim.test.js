/* Node checks for the Mystify sandbox combat loop. Run: node sim.test.js */
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var assert = require("assert");

var dir = __dirname;
var sandbox = { console: console, Math: Math, Date: Date };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "sim.js"), "utf8"), sandbox, { filename: "sim.js" });
var Sim = sandbox.MystifySim;
assert.ok(Sim, "sim exports MystifySim");

function emptyInput() { return { moveX: 0, moveY: 0, pressed: [0, 0, 0, 0], held: [0, 0, 0, 0] }; }
function press(i) {
  var p = [0, 0, 0, 0];
  p[i] = 1;
  return { moveX: 0, moveY: 0, pressed: p, held: p };
}

assert.strictEqual(Sim.CLASSES.length, 5);
assert.strictEqual(Sim.MAPS.length, 6);
assert.strictEqual([].map.call(Sim.CLASSES, function (c) { return c.id; }).join(","), "sorcerer,elemental,air,guardian,summoner");
assert.strictEqual([].map.call(Sim.MAPS, function (m) { return m.id; }).join(","), "dungeon,island,forest,arena,area51,atlantis");
Sim.CLASSES.forEach(function (c) {
  assert.strictEqual(c.skills.length, 4);
  c.skills.forEach(function (id) { assert.ok(Sim.SKILL_CD[id] > 0, id); });
});

Sim.MAPS.forEach(function (m) {
  ["clear", "waves"].forEach(function (mode) {
    Sim.CLASSES.forEach(function (c) {
      var s = Sim.createMatch({ classId: c.id, mode: mode, mapId: m.id, seed: 3 });
      assert.ok(!Sim.blocked(s, s.player.x, s.player.y, s.player.r), m.id + " spawn blocked");
      assert.ok(s.enemies.length >= 3, m.id + " " + mode);
      s.enemies.forEach(function (e) {
        assert.ok(!Sim.blocked(s, e.x, e.y, e.r * 0.5), "enemy in wall " + m.id);
      });
    });
  });
});

var clear = Sim.createMatch({ classId: "sorcerer", mode: "clear", mapId: "dungeon", seed: 4 });
var n0 = clear.enemies.length;
clear.enemies.forEach(function (e) { e.hp = 0; });
Sim.tick(clear, 0.05, emptyInput());
assert.strictEqual(clear.phase, "win");
assert.ok(clear.fell >= n0);

var lose = Sim.createMatch({ classId: "air", mode: "clear", mapId: "island", seed: 5 });
lose.player.hp = 0;
Sim.tick(lose, 0.05, emptyInput());
assert.strictEqual(lose.phase, "lose");

var waves = Sim.createMatch({ classId: "guardian", mode: "waves", mapId: "forest", seed: 6 });
assert.strictEqual(waves.wave, 1);
assert.ok(waves.enemies.every(function (e) { return !e.boss && !e.elite; }));
waves.enemies.forEach(function (e) { e.hp = 0; });
Sim.tick(waves, 0.05, emptyInput());
assert.strictEqual(waves.phase, "wavewait");
assert.strictEqual(waves.wave, 2);
Sim.tick(waves, 2, emptyInput());
assert.strictEqual(waves.phase, "play");
assert.strictEqual(waves.wave, 2);
assert.ok(waves.enemies.some(function (e) { return e.elite; }), "stronger wave has an elite");
waves.enemies.forEach(function (e) { e.hp = 0; });
Sim.tick(waves, 0.05, emptyInput());
assert.strictEqual(waves.wave, 3);
assert.strictEqual(waves.phase, "wavewait");
Sim.tick(waves, 2, emptyInput());
assert.ok(waves.enemies.some(function (e) { return e.boss; }));
waves.enemies.forEach(function (e) { e.hp = 0; });
Sim.tick(waves, 0.05, emptyInput());
assert.strictEqual(waves.phase, "win");

var bolt = Sim.createMatch({ classId: "sorcerer", mode: "clear", mapId: "arena", seed: 8 });
Sim.tick(bolt, 0.05, press(0));
assert.ok(bolt.shots.some(function (s) { return s.kind === "bolt"; }));

var zap = Sim.createMatch({ classId: "elemental", mode: "clear", mapId: "arena", seed: 9 });
var blob = zap.enemies.filter(function (e) { return e.kind === "blob"; })[0];
zap.player.x = blob.x + 0.2;
zap.player.y = blob.y;
var hp = blob.hp;
Sim.tick(zap, 0.05, press(0));
assert.ok(blob.hp < hp, "lightning hurts");
assert.ok(zap.bolts.length > 0);

var flame = Sim.createMatch({ classId: "elemental", mode: "clear", mapId: "dungeon", seed: 10 });
Sim.tick(flame, 0.05, press(3));
assert.ok(flame.player.channel > 0, "fire channel");
Sim.tick(flame, 0.16, emptyInput());
assert.ok(flame.zones.some(function (z) { return z.kind === "fire"; }), "fire wall");

var pet = Sim.createMatch({ classId: "summoner", mode: "clear", mapId: "atlantis", seed: 11 });
Sim.tick(pet, 0.05, press(1));
assert.ok(pet.allies.some(function (a) { return a.kind === "small"; }));

var hide = Sim.createMatch({ classId: "guardian", mode: "clear", mapId: "forest", seed: 12 });
Sim.tick(hide, 0.05, press(3));
assert.ok(hide.player.camouflage > 1);
var foe = hide.enemies[0];
hide.player.x = foe.x;
hide.player.y = foe.y;
hide.player.iframe = 0;
foe.touch = 0;
var php = hide.player.hp;
Sim.tick(hide, 0.08, emptyInput());
assert.strictEqual(hide.player.hp, php, "camouflage avoids contact");

var mist = Sim.createMatch({ classId: "guardian", mode: "clear", mapId: "forest", seed: 13 });
mist.player.hp = 40;
Sim.tick(mist, 0.05, press(1));
assert.ok(mist.player.hp > 40, "mist heals");

var air = Sim.createMatch({ classId: "air", mode: "clear", mapId: "island", seed: 14 });
Sim.tick(air, 0.05, press(3));
assert.ok(air.zones.some(function (z) { return z.kind === "spin"; }));

var later = Sim.createMatch({ classId: "nope", mode: "nope", mapId: "nope", seed: 1 });
assert.strictEqual(later.classId, "sorcerer");
assert.strictEqual(later.mode, "clear");
assert.strictEqual(later.mapId, "dungeon");

var files = ["index.html", "game.js", "sim.js", "sw.js", "manifest.json"];
files.forEach(function (f) {
  var text = fs.readFileSync(path.join(dir, f), "utf8");
  assert.ok(!/לחתוך|לחתוך|לשסף|לדקור/.test(text), f + " violent wording");
  assert.ok(!/Healify|היליפיי/.test(text), f + " wrong company");
  assert.ok(!/rg-mystify-/.test(text), f + " live cache/key prefix");
});
var html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
assert.ok(/<title>\s*Mystify\s*<\/title>/.test(html));
assert.ok(html.indexOf("מיסטיפיי") !== -1);
var game = fs.readFileSync(path.join(dir, "game.js"), "utf8");
assert.ok(game.indexOf("rg-sbx-mystify-") !== -1);
var sw = fs.readFileSync(path.join(dir, "sw.js"), "utf8");
assert.ok(/rg-sbx-mystify-v/.test(sw));
assert.ok(sw.indexOf("rg-mystify-") === -1);

console.log("mystify sandbox sim tests ok");
