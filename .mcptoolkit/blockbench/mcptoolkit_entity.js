// MCP Toolkit: Entity — Blockbench plugin. ENTITY_AUTHORING_DESIGN.md §6 (phase 2).
//
// THE LOOP THIS CLOSES (§2), of which every arrow but the last two already existed:
//
//     author geometry + texture in Blockbench
//         -> ONE headless push (bbmodel -> interchange JSON + PNG -> mcptoolkitPush -> live pack)
//         -> stage_entity spawns a preview entity wearing it in the running game
//         -> the author (human, or agent via screenshot) judges the GAME'S OWN rendering
//         -> `verify` runs the mechanical checks plugin-side (overlap, coplanarity, UV)
//         -> promotion writes the same file into a consumer mod's resources
//
// WHAT THIS FILE IS NOT, and the rule behind it (§1, importing menagerie ROADMAP §45.2 rule 4,
// "one generator implementation, ever"): it CONVERTS FILE FORMATS. It never interprets geometry
// into meshes, never renders a preview of its own, and never decides what a model means. The one
// interpreter is `client/PreviewModels.java` in the game. What the author judges is the bake.
//
// It does compute two things from geometry, both sanctioned by §6.1/§6.2 and neither an
// interpretation: the model's BOUNDS (stage_entity needs a hitbox, and the server never parses
// geometry) and the VERIFY table (checks, not meaning).
//
// ---------------------------------------------------------------------------------------------
// THE CONVERSION, WHICH IS THE WHOLE JOB, AND WHERE ITS NUMBERS COME FROM
//
// The interchange format is VANILLA MODEL SPACE (§4.1): pivots and cube origins in entity-model
// pixels with y DOWN (a part posed at y=24 sits at the feet), part rotations in RADIANS, cube
// origins relative to their own part's pivot and pivots relative to their PARENT's pivot — because
// that is what `PartPose.offsetAndRotation` and `CubeListBuilder.addBox` take, and the loader does
// no arithmetic at all. So every trap lives here, once.
//
// The arbiter for the arithmetic is BLOCKBENCH'S OWN `modded_entity` CODEC, read out of the app
// (Blockbench 5.1.x, `Codecs.modded_entity.compile`, template "1.17"), because that codec's output
// is the thing modders paste into a mod and see come out right. Its rules, verbatim in effect:
//
//     bone pivot:  c = group.origin; if (group.parent is a Group) c -= parent.origin
//                  c[0] *= -1;  c[1] *= -1;  if (no parent) c[1] += 24
//     bone euler:  (rx, ry, rz) = (-deg2rad(r[0]), -deg2rad(r[1]), +deg2rad(r[2]))
//     cube box:    x = group.origin[0] - cube.to[0]
//                  y = group.origin[1] - cube.to[1]
//                  z = cube.from[2] - group.origin[2]
//                  (dx, dy, dz) = cube.to - cube.from     // always positive
//
// TWO THINGS ABOUT THAT ARE WORTH STATING BECAUSE THEY ARE EXACTLY THE SILENT KIND:
//
//  1. X IS NEGATED, NOT ONLY Y. The design points at menagerie's `CensusTool.bbmodel()` as the
//     trap checklist, and that function flips only y (`y' = 24 - y`, negating x and z rotation).
//     Both cannot be right, and the disagreement is not a bug in either: CensusTool exports to the
//     `free` format for eyeballing, while this exports to VANILLA, which vanilla itself renders
//     through `LivingEntityRenderer`'s `scale(-1, -1, 1)`. Two negations, not one. Following
//     CensusTool here would mirror every model left-for-right — invisible on the symmetric subjects
//     this workspace happens to be full of, and only visible on the first asymmetric one. The
//     codec wins; CensusTool stays the checklist for the ×16 scale trap and the y flip, which are
//     the two it documents best.
//
//  2. THE EULER ORDER NEEDS NO CONVERSION, and the reason is worth writing down because the
//     obvious reading says it does. Vanilla composes `Quaternionf.rotationZYX(zRot, yRot, xRot)`
//     (ModelPart.java:169) and Blockbench composes a THREE.Euler whose order is `Format.euler_order`
//     — which defaults to **ZYX** (`new Property(ModelFormat, 'enum', 'euler_order', {default: 'ZYX'})`).
//     Same order on both sides. And the flip (negate x, negate y) is diag(-1,-1,1) = a 180° turn
//     about Z, which is a PROPER rotation, so conjugating by it maps Rz(c)Ry(b)Rx(a) to
//     Rz(c)Ry(-b)Rx(-a) — order preserved, term by term. Hence "negate x and y, keep z" is exact
//     for three-axis rotations too, not just for the single-axis case everything here happens to
//     use. `mcptoolkit_entity.test.mjs` proves it by walking both spaces independently.
//
// Rotated CUBES are handled the way the codec handles them: vanilla has no per-cube rotation, so
// each rotated cube is lifted into a synthetic ROTATION SUBGROUP (`<cube>_r1`) sharing its pivot
// and angle, exactly as Blockbench does — same grouping rule, same insertion order.
//
// ---------------------------------------------------------------------------------------------
// SETUP
//
//   File > Plugins > Load Plugin from File   (this file, and mcptoolkit_sync.js beside it)
//   Tools > MCP Toolkit: Entity              (the panel)
//
// Set a `sourceRoot` for the project before promoting; there is no built-in path any more (§6.3).
//
// HEADLESS API, for an agent driving this through the Blockbench MCP bridge's risky_eval. It never
// rejects — a rejected Promise returned through risky_eval is an unhandled rejection inside the MCP
// plugin's HTTP server and wedges it until Blockbench restarts (mcptoolkit_sync.js learnt that the
// expensive way) — and the last result is also left in `mcptoolkitEntityLast`:
//
//     mcptoolkitEntity({action: 'status',  bridge: GAME})
//     mcptoolkitEntity({action: 'convert', model: 'spider', project: PROJECT})
//     mcptoolkitEntity({action: 'convert', file: 'C:/.../spider.bbmodel'})
//     mcptoolkitEntity({action: 'push',    model: 'spider', project: PROJECT, bridge: GAME})
//     mcptoolkitEntity({action: 'push',    model: 'spider', target: 'source', namespace: 'rocketeer'})
//     mcptoolkitEntity({action: 'verify',  project: PROJECT})           the check battery
//     mcptoolkitEntity({action: 'stage',   model: 'spider', bridge: GAME})
//     mcptoolkitEntity({action: 'push',    model: 'spider', project: PROJECT, bridge: GAME, session: SESSION})
//         `session` (SESSION in risky_eval, bridge plugin 0.11.0) makes the stage slot per session:
//         tag 'preview-<id>' unless `tag` is given, so two sessions on one game keep their own body
//     mcptoolkitEntity({action: 'clear',   bridge: GAME})               despawn the previews
//     mcptoolkitEntity({action: 'settings', set: {sourceRoot: '...', bridges: {...}}})
//
// PROJECT AND GAME ARE WHAT `risky_eval` PUTS IN SCOPE (mcptoolkit_bridge.js), and both are
// deliberate (TODO.md 1.9). `project` takes the OBJECT, never a name: a name is resolved without
// the bridge's ownership check, which made this plugin one of the two routes into a project the
// session binding could not protect; omitted, the active project is used. `bridge` is REQUIRED for
// anything that touches the game and has NO default - this file used to carry a bare
// 'http://127.0.0.1:25599/cmd', and since per-project bridge ports (RELEASE_1.md B0) that port
// names the toolkit's own dev game, so from a consumer repo every stage went to the wrong game:
// refused if nothing was there, and accepted silently if the toolkit's own was up. Set one per
// project instead of passing it every time:
//     mcptoolkitEntity({action:'settings', set:{bridges:{'spider':'http://127.0.0.1:25642'}}})
//
// `push` sends nothing through the transcript: the bytes go Blockbench -> bridge directly, and what
// comes back is a summary plus the CLIENT's verdict on the geometry (`parse: "ok"`, or `"error"`
// with the reason), so a broken export never has to be guessed at from a screenshot.
(function () {
    'use strict';

    var STORE_KEY = 'mcptoolkit_entity.settings';
    var ROOT_ID = 'mte-root';

    /** Vanilla model space puts the feet at y = 24 (ModelPart.java:290-322). The whole flip. */
    var GROUND_PX = 24;
    /** Pixels per block, for turning model-space bounds into a hitbox in blocks. */
    var PX_PER_BLOCK = 16;
    /** Interchange format this plugin writes: 2 adds `animations` (§9). */
    var FORMAT = 2;

    var DEFAULTS = {
        // Where the live push lands. Staging REQUIRES this to be 'mcptoolkit' — PreviewModels reads
        // assets/mcptoolkit/preview/ and nowhere else — so a promotion to a consumer's namespace is
        // a `target:'source'` job and the plugin says so rather than staging something invisible.
        namespace: 'mcptoolkit',
        // Resources root for target 'source'/'both'. Deliberately EMPTY: §6.3 retires the hardcoded
        // default that mcptoolkit_sync.js shipped with. A promotion with nowhere to go is refused
        // with the name of the setting to fill in, which is a better failure than writing a file
        // into whichever checkout happened to be typed into a plugin two years ago.
        sourceRoot: '',
        // Per Blockbench project name, and the one that actually gets used. `sourceRoot` is the
        // fallback for projects with no entry.
        sourceRoots: {},
        // The anti-z-fight trick is to sink a cube ~1px into its neighbour. That is DELIBERATE, so
        // it is a named tolerance here rather than a blanket skip (§6.2): a 1px overlap is reported
        // as `sunk` and does not fail; 1.001px is an `overlap` and does.
        sinkPx: 1.0,
        // How close two parallel faces must be to count as sharing a plane. Authors work in whole
        // and half pixels; this is loose enough for float noise and tight enough to mean something.
        coplanarEps: 0.0005,
        // WHICH GAME the live push and every stage_entity call go to (TODO.md 1.9). Deliberately
        // EMPTY, on exactly the argument sourceRoot above makes: this file carried a bare
        // 'http://127.0.0.1:25599/cmd', and since per-project bridge ports (RELEASE_1.md B0) that
        // port NAMES the toolkit's own dev game - so from a consumer repo's Blockbench every
        // stage_entity went to the wrong game, refused if nothing was there and accepted silently
        // if the toolkit's own was up. Inside risky_eval pass the session's own: {bridge: GAME}.
        bridge: '',
        // Per Blockbench project name, like sourceRoots, and for the better reason: the bridge port
        // is a PROJECT CONSTANT that names the project.
        bridges: {},
        // Default stage slot. Re-pushing the same tag replaces the previous body.
        tag: 'preview'
    };

    var TARGETS = ['live', 'source', 'both'];
    /** The per-project maps a settings patch MERGES into rather than replaces (section 13). */
    var MAPS = ['sourceRoots', 'bridges'];

    var settings = {};
    var lastReport = null;      // the last verify report, so the panel can re-print it
    var action = null;
    var dialog = null;

    // ------------------------------------------------------------------ node, and the bridge

    // Plugins don't reliably see module-scope require; risky_eval's global one works. Same trick and
    // same comment as the two plugins next door. The idioms stay duplicated per file on purpose
    // (§6): a require()-shared library across Blockbench plugin load contexts is its own project.
    function req(name) {
        var r = (typeof require === 'function') ? require : globalThis.require;
        if (typeof r !== 'function') {
            throw new Error('node require unavailable in this Blockbench context — this plugin is'
                + ' desktop-only because it reads and writes model files');
        }
        return r(name);
    }

    function fs() { return req('fs'); }

    function call(bridge, tool, args) {
        return fetch(bridge, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool: tool, args: args })
        }).then(function (res) { return res.json(); }).then(function (json) {
            if (!json.ok) throw new Error(json.error || 'bridge error');
            return json.result;
        });
    }

    // ------------------------------------------------------------------ settings

    function loadSettings() {
        settings = Object.assign({}, DEFAULTS, { sourceRoots: {} });
        try {
            var raw = localStorage.getItem(STORE_KEY);
            if (raw) Object.assign(settings, JSON.parse(raw));
        } catch (e) { /* a private window, cleared storage, a browser that throws — defaults are fine */ }
        if (!settings.sourceRoots || typeof settings.sourceRoots !== 'object') settings.sourceRoots = {};
        if (!settings.bridges || typeof settings.bridges !== 'object') settings.bridges = {};
        return settings;
    }

    function saveSettings(patch) {
        patch = patch || {};
        // The headless `{action:'settings', set:{bridges:{spider:...}}}` used to REPLACE the whole
        // map, dropping every other project's entry, where the panel had always merged (13).
        Object.keys(patch).forEach(function (k) {
            if (MAPS.indexOf(k) >= 0 && patch[k] && typeof patch[k] === 'object') settings[k] = Object.assign({}, settings[k] || {}, patch[k]);
            else settings[k] = patch[k];
        });
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(settings));
        } catch (e) { /* nothing to do about it, and losing a setting is not worth failing a push over */ }
        return settings;
    }

    /**
     * The resources root a promotion writes into, PER PROJECT (§6.3). Refuses rather than guessing:
     * `writeToSource` will happily create a whole `assets/` tree wherever it is pointed, and a
     * wrong-but-plausible default is how a file ends up in a checkout nobody is looking at.
     */
    function sourceRootFor(projectName) {
        var root = (projectName && settings.sourceRoots[projectName]) || settings.sourceRoot;
        if (!root) {
            throw new Error('no sourceRoot for '
                + (projectName ? 'project "' + projectName + '"' : 'this project')
                + ' — set one first: mcptoolkitEntity({action:"settings", set:{sourceRoots:{"'
                + (projectName || '<project>') + '":"C:/path/to/mod/src/main/resources"}}})');
        }
        return root;
    }

    /**
     * WHICH GAME a live push or a stage lands in, per project (TODO.md 1.9). Refuses rather than
     * guessing, and the reason is sharper than sourceRoot's: a wrong path writes a file nobody
     * looks at, a wrong PORT is accepted by somebody else's running game without a word.
     */
    function bridgeFor(opts, projectName) {
        if (opts && opts.bridge === null) {
            // AN EXPLICIT NULL IS REFUSED (BLOCKBENCH_ISOLATION_DESIGN.md section 13): GAME is null
            // when the shim never told this window which game the session drives, and an agent
            // passes it dutifully. Until 0.4.0 that fell through to the stored URL - whichever game
            // somebody typed in last - which is the resolution the null rule exists to prevent. An
            // ABSENT key still means the store.
            throw new Error('bridge is null: GAME is null because this session never told Blockbench which game it drives'
                + ' — pass the game bridge URL (`ping` says it: http://127.0.0.1:<port>), or set it once:'
                + ' mcptoolkitEntity({action:"settings", set:{bridges:{"' + (projectName || '<project>')
                + '":"http://127.0.0.1:25640"}}}) and omit the key');
        }
        var url = (opts && opts.bridge)
            || (projectName && settings.bridges[projectName])
            || settings.bridge;
        if (!url) {
            throw new Error('no bridge for '
                + (projectName ? 'project "' + projectName + '"' : 'this call')
                + ' — inside risky_eval pass the one this session drives:'
                + ' mcptoolkitEntity({action:"push", project: PROJECT, bridge: GAME}), or set it'
                + ' once: mcptoolkitEntity({action:"settings", set:{bridges:{"'
                + (projectName || '<project>') + '":"http://127.0.0.1:25640"}}}).'
                + ' There is deliberately no default: the bridge port NAMES the project, so a'
                + ' plausible one reaches the wrong game silently');
        }
        return String(url).replace(/\/+$/, '').replace(/\/cmd$/, '') + '/cmd';
    }

    // ------------------------------------------------------------------ getting a document

    /**
     * WHICH PROJECT, and the one thing this will not do: resolve a name (TODO.md 1.9). The bridge
     * plugin checks ownership (`held_by`) before it hands `PROJECT` to an eval; a name resolved here
     * skips that check, which made this plugin one of the two routes into a project the session
     * binding could not protect. Selecting is not the problem and never was - Blockbench forces it
     * on anyone touching a non-active project, and the bridge selects too (`ensureSelected`,
     * mcptoolkit_bridge.js) - so what is refused is the NAME.
     */
    function projectOf(opts) {
        var p = opts && opts.project;
        if (p === null) {
            // PROJECT is null inside risky_eval when no project is open in the window; the active
            // tab is not an answer to a caller that was told there is none (section 13).
            throw new Error('project is null: PROJECT is null because no project is open in this window'
                + ' — open one first (project op:new / op:open) and pass PROJECT; omit the key only to mean the active tab');
        }
        if (p === undefined) {
            if (typeof Project === 'undefined' || !Project) throw new Error('no project is open');
            return Project;
        }
        if (typeof p === 'string') {
            throw new Error('project must be the project OBJECT, not the name "' + p + '" — inside'
                + ' risky_eval that is PROJECT: mcptoolkitEntity({action:"push", project: PROJECT,'
                + ' bridge: GAME}). A name is resolved without the bridge\'s ownership check, so it'
                + ' can reach a project another session holds');
        }
        if (!p || typeof p !== 'object' || !p.uuid) throw new Error('project is not a Blockbench project');
        return p;
    }

    /** Blockbench works on the active tab, so a project that is not it has to become it. */
    function ensureSelected(project) {
        if (typeof Project === 'undefined' || Project !== project) {
            if (typeof project.select !== 'function') throw new Error('cannot select project "' + project.name + '"');
            project.select();
        }
        return project;
    }

    /**
     * The `.bbmodel` document for a project. Everything downstream of here is a pure function of
     * this object, which is what lets the harness next door drive the real code path over real
     * saved files with no Blockbench at all.
     */
    function currentDoc(project) {
        if (project) ensureSelected(project);
        if (typeof Project === 'undefined' || !Project) throw new Error('no project is open');
        if (typeof Codecs === 'undefined' || !Codecs.project) {
            throw new Error('no project codec in this Blockbench build');
        }
        // `{raw:true}` hands back the plain object instead of a JSON string; `bitmaps:false` keeps
        // the base64 texture sources out of it, which we do not read and would rather not copy.
        return Codecs.project.compile({ raw: true, bitmaps: false });
    }

    function readDocFile(path) {
        var text = fs().readFileSync(path, 'utf8');
        if (text.slice(0, 4) === '<lz>') {
            throw new Error(path + ' is a COMPRESSED Blockbench backup, not a .bbmodel — open it in'
                + ' Blockbench and save it, or point at the saved project file');
        }
        return JSON.parse(text);
    }

    function docFor(opts) {
        if (opts.doc) return opts.doc;
        if (opts.file) return readDocFile(opts.file);
        return currentDoc(projectOf(opts));
    }

    /** The project name a per-project setting is keyed by, or null when there is no project. */
    function projectNameFor(opts) {
        try { return projectOf(opts).name || null; } catch (e) { return null; }
    }

    // ------------------------------------------------------------------ reading the outliner

    function vec3(v, fallback) {
        if (!Array.isArray(v) || v.length < 3) return fallback.slice();
        return [Number(v[0]) || 0, Number(v[1]) || 0, Number(v[2]) || 0];
    }

    function allZero(v) { return v[0] === 0 && v[1] === 0 && v[2] === 0; }

    /**
     * The `.bbmodel` outliner, flattened into the bone list the exporter walks — in the same order
     * and with the same synthetic bones Blockbench's own codec produces.
     *
     * Two synthetic kinds, both cribbed rather than invented:
     *
     *  - `bb_main`, the CATCH BONE: vanilla has no cube that is not in a part, so cubes sitting at
     *    the outliner root are collected into one bone at the origin. Appended LAST, as the codec
     *    does — several of this workspace's own entity sources (the narwhal, the ghast) are entirely
     *    root cubes and would otherwise export as an empty model.
     *  - `<cube>_r1`, the ROTATION SUBGROUP: vanilla cubes cannot rotate, so a rotated cube is
     *    lifted into a bone carrying its pivot and angle. Cubes are merged into one subgroup when
     *    they can share it, by the codec's own rule: identical angles, and identical pivots on
     *    every axis that is NOT being rotated about (a pivot may slide freely along a single
     *    rotation axis without changing anything, and only along it).
     */
    function flatten(doc) {
        var elements = {};
        (doc.elements || []).forEach(function (e) { if (e && e.uuid) elements[e.uuid] = e; });
        var groupProps = {};
        (doc.groups || []).forEach(function (g) { if (g && g.uuid) groupProps[g.uuid] = g; });

        var bones = [];
        var warnings = [];
        var rootCubes = [];

        function cubeOf(uuid) {
            var e = elements[uuid];
            if (!e) {
                warnings.push('outliner references element ' + uuid + ' that is not in `elements`');
                return null;
            }
            if (e.export === false) return null;
            if (e.type && e.type !== 'cube') {
                warnings.push('skipped "' + (e.name || e.uuid) + '": a `' + e.type
                    + '` is not a cube, and vanilla entity models are cubes only');
                return null;
            }
            if (e.box_uv === false) {
                throw new Error('"' + (e.name || e.uuid) + '" uses PER-FACE UV. Format 1 is box UV'
                    + ' only (§4.1) — switch the cube to box UV, or wait for format 2');
            }
            var from = vec3(e.from, [0, 0, 0]);
            var to = vec3(e.to, [0, 0, 0]);
            // Blockbench keeps from <= to itself, so this only ever fires on a hand-edited or
            // machine-written file — where it matters, because vanilla's addBox takes a SIZE and a
            // negative one builds an inside-out box that renders as nothing from the outside.
            for (var ax = 0; ax < 3; ax++) {
                if (to[ax] < from[ax]) {
                    throw new Error('"' + (e.name || e.uuid) + '" has to.' + 'xyz'[ax] + ' before'
                        + ' from.' + 'xyz'[ax] + ' — that is a negative size, and vanilla builds it'
                        + ' inside out rather than refusing it');
                }
            }
            return {
                name: e.name || 'cube',
                from: from,
                to: to,
                origin: vec3(e.origin, [0, 0, 0]),
                rotation: vec3(e.rotation, [0, 0, 0]),
                uv: [Math.round(Number((e.uv_offset || [0, 0])[0]) || 0),
                     Math.round(Number((e.uv_offset || [0, 0])[1]) || 0)],
                inflate: Number(e.inflate) || 0,
                mirror: e.mirror_uv === true
            };
        }

        // Depth-first, pre-order: a parent is always emitted before its children, which is exactly
        // what the loader's "parents come first in `parts`" rule needs (PreviewModels.bake).
        function walk(nodes, parent) {
            (nodes || []).forEach(function (node) {
                if (typeof node === 'string') {
                    var cube = cubeOf(node);
                    if (!cube) return;
                    if (parent) parent.cubes.push(cube);
                    else rootCubes.push(cube);
                    return;
                }
                if (!node || !node.uuid) return;
                // Newer Blockbench keeps group properties in `doc.groups` and leaves the outliner
                // as uuid+children; older files inline them. Take whichever is there.
                var props = Object.assign({}, groupProps[node.uuid] || {}, node);
                if (props.export === false) return;
                var bone = {
                    name: props.name || 'group',
                    uuid: node.uuid,
                    parent: parent,
                    origin: vec3(props.origin, [0, 0, 0]),
                    rotation: vec3(props.rotation, [0, 0, 0]),
                    cubes: [],
                    synthetic: false
                };
                bones.push(bone);
                walk(node.children, bone);
            });
        }
        walk(doc.outliner, null);

        if (rootCubes.length) {
            var catcher = {
                name: 'bb_main', parent: null, origin: [0, 0, 0], rotation: [0, 0, 0],
                cubes: rootCubes, synthetic: true
            };
            bones.push(catcher);   // last, as the codec does
        }

        // Rotation subgroups, inserted immediately after the bone they belong to so the flat list
        // stays parents-first. Reverse iteration and the merge rule are the codec's; matching them
        // means a model exported both ways has the same bones with the same names.
        bones.slice().forEach(function (bone) {
            var made = [];
            var at = bones.indexOf(bone);
            var kept = [];
            bone.cubes.slice().reverse().forEach(function (cube) {
                if (allZero(cube.rotation)) { kept.push(cube); return; }
                var axes = cube.rotation.filter(function (r) { return r !== 0; }).length;
                var host = made.find(function (sub) {
                    if (sub.rotation[0] !== cube.rotation[0] || sub.rotation[1] !== cube.rotation[1]
                        || sub.rotation[2] !== cube.rotation[2]) return false;
                    if (axes > 1) {
                        return sub.origin[0] === cube.origin[0] && sub.origin[1] === cube.origin[1]
                            && sub.origin[2] === cube.origin[2];
                    }
                    for (var i = 0; i < 3; i++) {
                        if (sub.rotation[i] === 0 && sub.origin[i] !== cube.origin[i]) return false;
                    }
                    return true;
                });
                if (!host) {
                    host = {
                        name: cube.name + '_r1', parent: bone, origin: cube.origin.slice(),
                        rotation: cube.rotation.slice(), cubes: [], synthetic: true
                    };
                    made.push(host);
                    at++;
                    bones.splice(at, 0, host);
                }
                host.cubes.push(cube);
            });
            if (made.length) bone.cubes = kept.reverse();
        });

        return { bones: bones, warnings: warnings };
    }

    // ------------------------------------------------------------------ the flip

    function deg2rad(d) { return d * Math.PI / 180.0; }

    /**
     * Six decimals, and -0 normalised to 0. Both are about BYTE STABILITY: the harness asserts that
     * one document converts to one string, and a stray `-0` or a 1e-17 tail from a trig call is
     * exactly the kind of difference that makes a re-export look like an edit.
     */
    function num(v) {
        var r = Math.round(v * 1e6) / 1e6;
        return r === 0 ? 0 : r;
    }

    function num3(v) { return [num(v[0]), num(v[1]), num(v[2])]; }

    function sanitizeId(name) {
        return String(name || '').toLowerCase().replace(/\.\w+$/, '')
            .replace(/[^a-z0-9._/-]+/g, '_').replace(/^_+|_+$/g, '') || 'model';
    }

    /**
     * `.bbmodel` document -> interchange model object. THE conversion (see the header). Every number
     * that comes out of here is one Blockbench's own `modded_entity` codec would have written.
     */
    function convertDoc(doc, opts) {
        var flat = flatten(doc);
        var warnings = flat.warnings.slice();
        var seen = {};
        var parts = [];
        var cubeCount = 0;

        flat.bones.forEach(function (bone) {
            if (seen[bone.name]) {
                throw new Error('two parts named "' + bone.name + '" — the loader refuses those'
                    + ' (a part is addressed by name), so rename one in the outliner');
            }
            seen[bone.name] = true;

            var pivot = bone.origin.slice();
            if (bone.parent) {
                pivot[0] -= bone.parent.origin[0];
                pivot[1] -= bone.parent.origin[1];
                pivot[2] -= bone.parent.origin[2];
            }
            pivot[0] *= -1;
            pivot[1] *= -1;
            if (!bone.parent) pivot[1] += GROUND_PX;

            var part = {
                name: bone.name,
                parent: bone.parent ? bone.parent.name : null,
                pivot: num3(pivot),
                rotation: num3([-deg2rad(bone.rotation[0]), -deg2rad(bone.rotation[1]),
                                deg2rad(bone.rotation[2])]),
                cubes: bone.cubes.map(function (cube) {
                    cubeCount++;
                    var out = {
                        origin: num3([bone.origin[0] - cube.to[0],
                                      bone.origin[1] - cube.to[1],
                                      cube.from[2] - bone.origin[2]]),
                        size: num3([cube.to[0] - cube.from[0],
                                    cube.to[1] - cube.from[1],
                                    cube.to[2] - cube.from[2]]),
                        uv: cube.uv
                    };
                    if (cube.inflate) out.inflate = num(cube.inflate);
                    if (cube.mirror) out.mirror = true;
                    out.name = cube.name;
                    return out;
                })
            };
            parts.push(part);
        });

        if (!parts.length) {
            throw new Error('nothing to export — the project has no exportable cubes');
        }

        var format = doc.meta && doc.meta.model_format;
        if (format && format !== 'modded_entity') {
            // Not fatal — the arithmetic is the same either way — but a `java_block` project is
            // authored inside a 0..16 block, not standing on the ground line, so its export lands
            // somewhere plausible and wrong. Eight of this workspace's own sources are that.
            warnings.push('this is a "' + format + '" project, not "modded_entity": its coordinates'
                + ' are not authored against the entity ground line, so the preview will stand'
                + ' somewhere the author did not draw it');
        }

        var resolution = doc.resolution || {};
        var texture = {
            width: Math.round(Number(resolution.width) || 64),
            height: Math.round(Number(resolution.height) || 64)
        };
        var chosen = chooseTexture(doc, opts, warnings);
        var modelId = sanitizeId(opts.model || doc.name || (doc.model_identifier) || 'model');
        var namespace = opts.namespace || settings.namespace || DEFAULTS.namespace;
        if (chosen) {
            texture.asset = namespace + ':textures/preview/' + modelId + '/' + chosen.id + '.png';
        }

        // Animations name their bones, so they can only be converted once the parts exist and are
        // named. `groupNames` maps the outliner uuid an animator holds onto the name the
        // geometry exporter actually emitted -- the two must agree or the game refuses the bake.
        var groupNames = {};
        flat.bones.forEach(function (bone) {
            if (bone.uuid) groupNames[bone.uuid] = bone.name;
        });
        var animated = convertAnimations(doc, parts.map(function (p) { return p.name; }),
            groupNames, warnings);
        var clipNames = Object.keys(animated.clips);

        var model = { format: FORMAT, texture: texture, parts: parts };
        // §9.5 the other way round: a model with no clips writes no `animations` key, so what this
        // emits for every subject that existed before phase 4 is byte-for-byte what it emitted
        // then, but for the format number -- which the loader accepts at either value.
        if (clipNames.length) model.animations = animated.clips;
        return {
            model: model,
            modelId: modelId,
            namespace: namespace,
            texture: chosen,
            parts: parts.length,
            cubes: cubeCount,
            clips: clipNames,
            keyframes: animated.keyframes,
            warnings: warnings
        };
    }

    /**
     * The one texture an interchange model names. The format has a single `texture` key — that IS
     * the format — so a multi-texture project is answered with a choice and a warning naming what
     * was left behind, rather than with an invented convention for carrying several.
     */
    function chooseTexture(doc, opts, warnings) {
        var textures = (doc.textures || []).filter(function (t) { return t && t.name; });
        if (!textures.length) {
            warnings.push('the project has no texture — the preview will render in vanilla\'s'
                + ' missing-texture checkerboard, which is what the loader falls back to');
            return null;
        }
        var pick = textures[0];
        if (opts.texture) {
            pick = textures.find(function (t) {
                return t.name === opts.texture || t.name.replace(/\.png$/, '') === opts.texture;
            });
            if (!pick) {
                throw new Error('no texture named "' + opts.texture + '" in the project (have: '
                    + textures.map(function (t) { return t.name; }).join(', ') + ')');
            }
        }
        if (textures.length > 1) {
            warnings.push('the project has ' + textures.length + ' textures and format 1 names one:'
                + ' using "' + pick.name + '", leaving '
                + textures.filter(function (t) { return t !== pick; })
                    .map(function (t) { return t.name; }).join(', '));
        }
        return { name: pick.name, id: sanitizeId(pick.name) };
    }

    // ------------------------------------------------------------------ animation (§9)
    //
    // THE SECOND HALF OF THE CONVERSION, AND IT IS THE SAME FLIP AS THE FIRST.
    //
    // The arbiter is the same one §7.1 found for geometry: Blockbench's own `modded_entity` codec,
    // read out of `app.asar`. Its `AnimationCodec('modded_entity').compileFile` pre-negates before
    // handing values to vanilla's `KeyframeAnimations` helpers:
    //
    //     position:  x *= -1              rotation:  x *= -1; y *= -1        scale:  unchanged
    //
    // Compose that with vanilla's own `posVec(x,y,z) = (x,-y,z)`, `degreeVec` (deg->rad, no sign
    // change) and `scaleVec(s) = s-1`, and the authored-to-vanilla rule falls out:
    //
    //     position  (x, y, z) px    ->  (-x, -y,  z) px
    //     rotation  (rx,ry,rz) deg  ->  (-rx,-ry, rz) rad
    //     scale     (sx,sy,sz)      ->  (sx-1, sy-1, sz-1)
    //
    // So position is THE SAME TWO-NEGATION FLIP as a part pivot, and rotation is the same rule as a
    // part's rest rotation. One coordinate convention across the whole format. The trap the design
    // flagged is real and is why this is written down: vanilla's `posVec` does half the flip and
    // Blockbench's exporter does the other half, so anything written from `KeyframeAnimations.java`
    // alone implements exactly half and mirrors every animation's x translation -- invisible on a
    // symmetric subject, which is most of this workspace.
    //
    // WHERE THE CONVERSION LIVES, which the design left open and §4.1 had already answered.
    // §9.1 proposed storing keyframes AS AUTHORED and letting the loader convert. This does not:
    // it emits the numbers `ModelPart::offsetPos/offsetRotation/offsetScale` finally receive, for
    // exactly the reason §4.1 gives for geometry -- "every trap lives here, once", and the loader
    // does no arithmetic at all. Storing authored values would have put HALF a flip (the half that
    // is not `KeyframeAnimations`') into the Java loader, where the harness next door cannot walk
    // it. One conversion, on the side that has an arbiter.
    //
    // PRE/POST RATHER THAN TWIN KEYFRAMES, which is the other thing §9.1 left open -- and the
    // arbiter settles it against the design's own lean. Blockbench's codec fakes a discontinuity
    // with a second keyframe at `t + 0.001`, and §1 ("converts file formats, never interprets")
    // reads at first like an argument for copying that. It is the opposite:
    //
    //   * Blockbench's document HAS the two-value concept natively -- `kf.data_points[1]`. Vanilla
    //     HAS it natively too -- `Keyframe(t, preTarget, postTarget, interp)`. Mapping dp[0]->pre
    //     and dp[1]->post is a field-for-field copy.
    //   * The twin keyframe is the codec working around ITS OWN TEMPLATE: the `mojang` text
    //     template only has `new Keyframe(%(time), vec, %(interpolation))`, the three-arg form. It
    //     cannot say `preTarget`. We are not writing Java text, so we do not inherit the limit.
    //   * Copying twins would INVENT the number 0.001, which appears nowhere in the document, and
    //     lose which keyframes were authored. That is the interpretation, not the tidy version.
    //   * And the semantics line up exactly. Blockbench's own interpolator reads
    //     `before.calc(axis, 1)` -> `other.calc(axis, 0)` (Keyframe.getLerp), i.e. leave on data
    //     point 1, arrive on data point 0. Vanilla's LINEAR reads `keyframes[prev].postTarget()`
    //     -> `keyframes[next].preTarget()`. Same rule, different spelling.
    //
    // STEP, which vanilla does not have, is exact under pre/post and only approximate under twins.
    // Blockbench holds a step keyframe's value until the next one (`before.interpolation == step`
    // -> `result = before`, checked BEFORE the catmullrom branch, so a step beats a smooth
    // neighbour). Writing the held value into the NEXT keyframe's `pre` and forcing that segment
    // LINEAR reproduces it exactly: vanilla lerps prev.post -> next.pre, both the held value, so
    // the segment is flat and the jump lands at the next keyframe. The codec's `next.t - 0.001`
    // twin instead ramps across the last millisecond. The one residue is a single instant: at
    // exactly the next keyframe's timestamp vanilla still reads `pre`, so it shows the held value
    // there rather than the new one. That is one point of a continuous function, against a whole
    // interval of ramp -- and it is recorded rather than hidden.
    //
    // TWO PLACES BLOCKBENCH'S PREVIEW AND THE GAME GENUINELY DISAGREE, both warned about rather
    // than silently "fixed", because the whole point of the loop is that the GAME is the judge:
    //
    //   1. Blockbench smooths a segment when EITHER end is catmullrom
    //      (`before.interpolation === catmullrom || after.interpolation === catmullrom`).
    //      Vanilla asks only the segment's LATER keyframe (`nextFrame.interpolation()`,
    //      KeyframeAnimation.Entry.apply). So a catmullrom->linear segment is smooth in the
    //      timeline and straight in the game. Blockbench's own codec has this mismatch too.
    //   2. On a looping clip Blockbench WRAPS the catmullrom control points around the seam
    //      (`before_plus = sorted.at(-2)`); vanilla CLAMPS them (`Math.max(0, prev-1)`). So the
    //      loop seam is smoother in the timeline than in the game.

    /** Blockbench interpolations this converts. `bezier` has no vanilla form and is refused. */
    var INTERPOLATIONS = { linear: 'linear', catmullrom: 'catmullrom', step: 'step' };
    /** Channels, in the order they are emitted -- vanilla's AnimationChannel.Targets. */
    var CHANNELS = ['rotation', 'position', 'scale'];

    /**
     * A keyframe data point value. These are STRINGS in the `.bbmodel` because Blockbench evaluates
     * them as Molang, and vanilla's keyframes are plain floats with no runtime expression support
     * at all -- so an expression is refused by name rather than coerced to NaN and rendered as a
     * part that silently vanishes.
     */
    function kfNumber(raw, where) {
        if (raw === undefined || raw === null || raw === '') return 0;
        if (typeof raw === 'number') return isFinite(raw) ? raw : 0;
        var s = String(raw).trim();
        if (s === '') return 0;
        var n = Number(s);
        if (!isFinite(n)) {
            throw new Error(where + ' is "' + s + '", which is a Molang EXPRESSION. Vanilla'
                + ' keyframes are plain numbers with no expression support, so this cannot be'
                + ' converted -- replace it with a literal value in the timeline');
        }
        return n;
    }

    function dataPoint(kf, index, where) {
        var dp = (kf.data_points || [])[index] || {};
        return [kfNumber(dp.x, where + ' x'), kfNumber(dp.y, where + ' y'),
                kfNumber(dp.z, where + ' z')];
    }

    /** Authored Blockbench units -> the numbers `ModelPart::offset*` receives. See the header. */
    function toVanillaChannel(channel, v) {
        if (channel === 'position') return num3([-v[0], -v[1], v[2]]);
        if (channel === 'rotation') return num3([-deg2rad(v[0]), -deg2rad(v[1]), deg2rad(v[2])]);
        return num3([v[0] - 1, v[1] - 1, v[2] - 1]);
    }

    function sameVec(a, b) { return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]; }

    /**
     * `.bbmodel` animations -> the interchange's `animations` object. Bones are resolved through
     * the animator's group UUID rather than its name, so a clip that animates a group which is not
     * being exported is caught HERE, by name, instead of as an unknown-bone throw out of
     * `AnimationDefinition.bake` in the game.
     */
    function convertAnimations(doc, boneNames, groupNames, warnings) {
        var clips = {};
        var count = 0;
        (doc.animations || []).forEach(function (anim) {
            if (!anim || !anim.name) return;
            var clipName = sanitizeId(anim.name);
            if (clips[clipName]) {
                throw new Error('two animations named "' + clipName + '" -- clips are addressed by'
                    + ' name, so rename one in the timeline');
            }
            var bones = {};
            var animators = anim.animators || {};
            Object.keys(animators).forEach(function (uuid) {
                var animator = animators[uuid];
                if (!animator || animator.type !== 'bone') return;
                var keyframes = (animator.keyframes || []).filter(function (k) { return k; });
                if (!keyframes.length) return;
                // The bone this animates, as the GEOMETRY exporter named it. `groupNames` is keyed
                // by outliner uuid, which is what an animator holds; falling back to the animator's
                // own name matches the codec for a document whose two halves have drifted.
                var bone = groupNames[uuid] || animator.name;
                if (!bone || boneNames.indexOf(bone) < 0) {
                    warnings.push('clip "' + clipName + '" animates "' + (animator.name || uuid)
                        + '", which is not an exported part -- the game refuses to bake a clip that'
                        + ' names a bone the model does not have, so this animator is dropped');
                    return;
                }
                var channels = [];
                CHANNELS.forEach(function (channel) {
                    var frames = keyframes.filter(function (k) { return k.channel === channel; })
                        .slice()
                        .sort(function (a, b) { return (Number(a.time) || 0) - (Number(b.time) || 0); });
                    if (!frames.length) return;
                    var where = 'clip "' + clipName + '" bone "' + bone + '" ' + channel;
                    var out = frames.map(function (kf, i) {
                        var interp = String(kf.interpolation || 'linear');
                        if (!INTERPOLATIONS[interp]) {
                            throw new Error(where + ' keyframe at ' + (Number(kf.time) || 0)
                                + ' uses "' + interp + '" interpolation. Vanilla has LINEAR and'
                                + ' CATMULLROM only (step is expressed exactly, bezier cannot be)'
                                + ' -- switch it to linear, smooth or step in the timeline');
                        }
                        var at = where + ' keyframe ' + i;
                        var pre = toVanillaChannel(channel, dataPoint(kf, 0, at + ' pre'));
                        var post = (kf.data_points || []).length > 1
                            ? toVanillaChannel(channel, dataPoint(kf, 1, at + ' post'))
                            : pre;
                        return { t: num(Number(kf.time) || 0), pre: pre, post: post,
                                 interp: interp, authored: interp };
                    });
                    // STEP: hold the value across the segment by writing it into the NEXT
                    // keyframe's `pre` and forcing that segment linear. Exactly what Blockbench
                    // does, and exactly what vanilla's LINEAR (prev.post -> next.pre) reproduces.
                    for (var i = 0; i < out.length; i++) {
                        if (out[i].interp !== 'step') continue;
                        if (i + 1 < out.length) {
                            out[i + 1].pre = out[i].post.slice();
                            out[i + 1].interp = 'linear';
                        }
                        out[i].interp = 'linear';
                    }
                    // Where the timeline and the game genuinely disagree (header, note 1).
                    for (var j = 1; j < out.length; j++) {
                        if (out[j - 1].authored === 'catmullrom' && out[j].interp !== 'catmullrom'
                            && out[j - 1].authored !== 'step') {
                            warnings.push(where + ': the segment ' + out[j - 1].t + '->' + out[j].t
                                + ' is SMOOTH in the timeline and STRAIGHT in the game, because'
                                + ' Blockbench smooths a segment when either end is catmullrom and'
                                + ' vanilla asks only the later keyframe. Make the keyframe at '
                                + out[j].t + ' smooth as well if the curve is what you want');
                        }
                    }
                    channels.push({
                        target: channel,
                        keyframes: out.map(function (k) {
                            var emitted = { t: k.t };
                            if (!sameVec(k.pre, k.post)) emitted.pre = k.pre;
                            emitted.post = k.post;
                            emitted.interp = k.interp;
                            return emitted;
                        })
                    });
                    count += out.length;
                });
                if (channels.length) bones[bone] = channels;
            });
            if (!Object.keys(bones).length) {
                warnings.push('clip "' + clipName + '" animates no exported bone, so it is not'
                    + ' written -- an empty clip bakes fine and does nothing, which is worse');
                return;
            }
            var looping = anim.loop === 'loop';
            if (anim.loop === 'once') {
                warnings.push('clip "' + clipName + '" is set to "once"; vanilla has looping and'
                    + ' non-looping only, and a non-looping clip HOLDS its last pose rather than'
                    + ' resetting -- that is what the preview will do');
            }
            if (looping) {
                var smooth = Object.keys(bones).some(function (b) {
                    return bones[b].some(function (c) {
                        return c.keyframes.some(function (k) { return k.interp === 'catmullrom'; });
                    });
                });
                if (smooth) {
                    warnings.push('clip "' + clipName + '" loops and uses smooth keyframes: the'
                        + ' seam is smoother in the timeline than in the game, because Blockbench'
                        + ' wraps the catmullrom control points around the loop and vanilla clamps'
                        + ' them at the ends');
                }
            }
            clips[clipName] = { length: num(Number(anim.length) || 0), loop: looping, bones: bones };
        });
        return { clips: clips, keyframes: count };
    }

    // ------------------------------------------------------------------ sampling a clip (§9.3)
    //
    // VANILLA'S INTERPOLATION, NOT BLOCKBENCH'S, AND THAT IS THE WHOLE POINT.
    //
    // §9.3 proposed posing these samples with Blockbench's own timeline evaluator, so that "no
    // second catmullrom exists". Reading both evaluators inverts the argument. The pose that
    // matters is the one THE GAME renders -- that is what an author judges, and what a collision
    // at a mid-clip pose would actually be a collision in. Measured against that, Blockbench's
    // evaluator IS the second implementation, and a demonstrably divergent one: it smooths a
    // segment when either end is catmullrom (vanilla asks only the later keyframe) and it wraps
    // catmullrom control points around a loop seam (vanilla clamps). Sampling through it would
    // check poses the game never takes.
    //
    // It would also be un-harnessable. `mcptoolkit_entity.test.mjs` exists because the exporter is
    // a PURE FUNCTION OF A DOCUMENT, testable with no Blockbench at all -- the discipline §7.3
    // went out of its way to protect with a travelling fixture. An arm that needs a live Blockbench
    // is an arm the harness cannot cover, and §7.2 already caught one of those pretending to be
    // covered (`pixelsOf()` had never run, because the harness injects the pixels it fetches).
    //
    // So this is vanilla's `KeyframeAnimation.Entry.apply` and `AnimationChannel.Interpolations`,
    // transcribed -- and the harness next door arbitrates it with a SECOND, independent transcript
    // rather than with a golden file, exactly as section 2 arbitrates the geometry flip.

    /** `Mth.catmullrom` (Mth.java:582). */
    function catmullrom(alpha, p0, p1, p2, p3) {
        return 0.5 * (2.0 * p1 + (p2 - p0) * alpha
            + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * alpha * alpha
            + (3.0 * p1 - p0 - 3.0 * p2 + p3) * alpha * alpha * alpha);
    }

    /**
     * One channel's value at `t`, by `KeyframeAnimation.Entry.apply`: find the last keyframe at or
     * before `t`, take the NEXT keyframe's interpolation for the segment, and read LINEAR from
     * `prev.post -> next.pre` but CATMULLROM from four `post`s with the ends CLAMPED.
     */
    function sampleChannel(keyframes, t) {
        var prev = 0;
        for (var i = 0; i < keyframes.length; i++) {
            if (keyframes[i].t <= t) prev = i;
        }
        if (t < keyframes[0].t) prev = 0;
        var next = Math.min(keyframes.length - 1, prev + 1);
        var a = keyframes[prev], b = keyframes[next];
        var alpha = next !== prev
            ? Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t)))
            : 0;
        var post = function (k) { return k.post; };
        var pre = function (k) { return k.pre || k.post; };
        if (b.interp === 'catmullrom') {
            var p0 = post(keyframes[Math.max(0, prev - 1)]);
            var p1 = post(a);
            var p2 = post(b);
            var p3 = post(keyframes[Math.min(keyframes.length - 1, next + 1)]);
            return [0, 1, 2].map(function (k) {
                return catmullrom(alpha, p0[k], p1[k], p2[k], p3[k]);
            });
        }
        var from = post(a), to = pre(b);
        return [0, 1, 2].map(function (k) { return from[k] + (to[k] - from[k]) * alpha; });
    }

    /** `KeyframeAnimation.getElapsedSeconds`: a looping clip wraps, a finished one holds. */
    function clipSeconds(clip, t) {
        if (!clip.loop || !(clip.length > 0)) return t;
        var wrapped = t % clip.length;
        return wrapped < 0 ? wrapped + clip.length : wrapped;
    }

    /** The pose a clip puts the model in at `t`: bone name -> the three `offset*` vectors. */
    function poseAt(clip, t) {
        var seconds = clipSeconds(clip, t);
        var pose = {};
        Object.keys(clip.bones || {}).forEach(function (bone) {
            var entry = { position: null, rotation: null, scale: null };
            (clip.bones[bone] || []).forEach(function (channel) {
                if (!channel.keyframes || !channel.keyframes.length) return;
                entry[channel.target] = sampleChannel(channel.keyframes, seconds);
            });
            pose[bone] = entry;
        });
        return pose;
    }

    /**
     * The times a clip is checked at: every authored keyframe timestamp, plus the MIDPOINT of every
     * adjacent pair. The standing rule from the corridor work is that intermediate keyframes are
     * untested geometry, and a keyframe-only sample would miss exactly the overlap a swing passes
     * through -- the arc between two clean poses is where a limb enters a torso.
     */
    function sampleTimes(clip) {
        var times = {};
        Object.keys(clip.bones || {}).forEach(function (bone) {
            (clip.bones[bone] || []).forEach(function (channel) {
                (channel.keyframes || []).forEach(function (k) { times[num(k.t)] = true; });
            });
        });
        var sorted = Object.keys(times).map(Number).sort(function (a, b) { return a - b; });
        var out = [];
        sorted.forEach(function (t, i) {
            out.push(t);
            if (i + 1 < sorted.length) out.push(num((t + sorted[i + 1]) / 2));
        });
        return out;
    }

    // ------------------------------------------------------------------ where the game will put it

    /**
     * Forward kinematics THROUGH THE INTERCHANGE, in vanilla model space, by vanilla's own rules:
     * `translate(x/16, y/16, z/16)` then `rotationZYX(zRot, yRot, xRot)` (ModelPart.java:167-169),
     * with cube corners at `origin .. origin + size` inflated by `inflate` (ModelPart.Cube's ctor).
     *
     * The subject of every check below is therefore the geometry THE GAME WILL READ, not the
     * geometry Blockbench happens to be showing — CensusTool's §24 rule, arriving somewhere new.
     */
    function worldBoxes(model, pose) {
        var byName = {};
        var boxes = [];
        (model.parts || []).forEach(function (part) {
            var parent = part.parent ? byName[part.parent] : null;
            var base = parent ? parent
                : { o: [0, 0, 0], m: IDENTITY, s: [1, 1, 1], approx: false };
            // An animated pose reaches the walker as vanilla applies it: offsetPos/offsetRotation
            // ADD to the part's authored pose and offsetScale ADDS to a scale whose default is 1
            // (ModelPart.java:190-207). So a rest pose is this same walk with every offset zero,
            // which is why the format-1 battery below is unchanged by any of this.
            var off = (pose && pose[part.name]) || null;
            var dp = (off && off.position) || ZERO3;
            var dr = (off && off.rotation) || ZERO3;
            var ds = (off && off.scale) || ZERO3;
            var pivot = [part.pivot[0] + dp[0], part.pivot[1] + dp[1], part.pivot[2] + dp[2]];
            var rot = [part.rotation[0] + dr[0], part.rotation[1] + dr[1], part.rotation[2] + dr[2]];
            var own = [1 + ds[0], 1 + ds[1], 1 + ds[2]];
            var r = rotationZYX(rot[2], rot[1], rot[0]);
            // A part's own scale is applied INSIDE its own frame, after its own rotation, so it
            // only multiplies half-extents and stays an oriented box. An ANCESTOR's non-uniform
            // scale reaching a part that is rotated relative to it is a shear, and a sheared box is
            // not an oriented box at all -- so that is flagged rather than approximated silently.
            var sheared = base.approx
                || (!uniform(base.s) && (rot[0] !== 0 || rot[1] !== 0 || rot[2] !== 0));
            var frame = {
                o: addv(base.o, applyM(base.m, mulv(pivot, base.s))),
                m: mulM(base.m, r),
                s: mulv(base.s, own),
                approx: sheared
            };
            byName[part.name] = frame;
            (part.cubes || []).forEach(function (cube, index) {
                var grow = cube.inflate || 0;
                var min = [cube.origin[0] - grow, cube.origin[1] - grow, cube.origin[2] - grow];
                var max = [cube.origin[0] + cube.size[0] + grow,
                           cube.origin[1] + cube.size[1] + grow,
                           cube.origin[2] + cube.size[2] + grow];
                var localCentre = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
                boxes.push({
                    part: part.name,
                    name: cube.name || (part.name + '#' + index),
                    label: part.name + (cube.name && cube.name !== part.name ? '/' + cube.name : ''),
                    centre: addv(frame.o, applyM(frame.m, mulv(localCentre, frame.s))),
                    axes: [col(frame.m, 0), col(frame.m, 1), col(frame.m, 2)],
                    half: [Math.abs((max[0] - min[0]) / 2 * frame.s[0]),
                           Math.abs((max[1] - min[1]) / 2 * frame.s[1]),
                           Math.abs((max[2] - min[2]) / 2 * frame.s[2])],
                    size: cube.size.slice(),
                    uv: cube.uv || [0, 0],
                    mirror: !!cube.mirror,
                    approx: frame.approx
                });
            });
        });
        return boxes;
    }

    var ZERO3 = [0, 0, 0];
    function mulv(a, b) { return [a[0] * b[0], a[1] * b[1], a[2] * b[2]]; }
    function uniform(s) { return s[0] === s[1] && s[1] === s[2]; }

    // -- the smallest possible 3x3 matrix kit; row-major, m[row][col] ---------------------------

    var IDENTITY = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

    function rotationZYX(z, y, x) {
        var cz = Math.cos(z), sz = Math.sin(z);
        var cy = Math.cos(y), sy = Math.sin(y);
        var cx = Math.cos(x), sx = Math.sin(x);
        // Rz * Ry * Rx, which is what Quaternionf.rotationZYX(zRot, yRot, xRot) builds.
        return [
            [cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx],
            [sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx],
            [-sy,     cy * sx,                cy * cx]
        ];
    }

    function mulM(a, b) {
        var out = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                out[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
            }
        }
        return out;
    }

    function applyM(m, v) {
        return [
            m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
            m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
            m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]
        ];
    }

    function col(m, j) { return [m[0][j], m[1][j], m[2][j]]; }
    function addv(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
    function subv(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
    function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
    function cross(a, b) {
        return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    }
    function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
    function length(a) { return Math.sqrt(dot(a, a)); }

    // ------------------------------------------------------------------ bounds -> hitbox

    /**
     * The hitbox `stage_entity` is handed. The server never parses geometry (§4.3), so this is the
     * only place the two can agree — and a preview standing outside its own hitbox is the exact
     * mistake the narwhal made once already.
     */
    function boundsOf(boxes) {
        var minY = Infinity, maxY = -Infinity, reach = 0;
        boxes.forEach(function (box) {
            for (var sx = -1; sx <= 1; sx += 2) {
                for (var sy = -1; sy <= 1; sy += 2) {
                    for (var sz = -1; sz <= 1; sz += 2) {
                        var p = addv(box.centre, addv(scale(box.axes[0], sx * box.half[0]),
                            addv(scale(box.axes[1], sy * box.half[1]),
                                 scale(box.axes[2], sz * box.half[2]))));
                        if (p[1] < minY) minY = p[1];
                        if (p[1] > maxY) maxY = p[1];
                        reach = Math.max(reach, Math.abs(p[0]), Math.abs(p[2]));
                    }
                }
            }
        });
        // y is DOWN from a 24px ceiling, so the top of the model is the SMALLEST y and the feet are
        // the largest. A model authored below the ground line (maxY > 24) is still measured from the
        // ground, because that is where the entity stands.
        var height = (GROUND_PX - minY) / PX_PER_BLOCK;
        var width = (2 * reach) / PX_PER_BLOCK;
        var clamped = [];
        if (height > 64) { height = 64; clamped.push('height'); }
        if (width > 64) { width = 64; clamped.push('width'); }
        return {
            size: [Math.max(0.05, Math.round(width * 1000) / 1000),
                   Math.max(0.05, Math.round(height * 1000) / 1000)],
            top: num(minY),
            bottom: num(maxY),
            below_ground: maxY > GROUND_PX + 1e-6,
            clamped: clamped
        };
    }

    // ------------------------------------------------------------------ the check battery (§6.2)

    /**
     * Separating-axis test over two oriented boxes: the 3+3 face normals and the 9 edge crosses.
     * Returns the PENETRATION DEPTH when they intersect and the largest separating gap when they do
     * not — the number the worst-first table sorts on.
     *
     * Run over ALL unordered pairs, never only the reported one: the corridor spider's fang overlap
     * survived a whole fix round because the test only ever looked at the pair someone complained
     * about, and the visible symptom is never the size of the defect.
     */
    function sat(a, b) {
        var d = subv(b.centre, a.centre);
        var axes = [];
        var i, j;
        for (i = 0; i < 3; i++) axes.push(a.axes[i]);
        for (i = 0; i < 3; i++) axes.push(b.axes[i]);
        for (i = 0; i < 3; i++) {
            for (j = 0; j < 3; j++) axes.push(cross(a.axes[i], b.axes[j]));
        }
        // ONE running number, not two. The axis of greatest separation is also the axis of least
        // overlap, so the penetration depth is just `-maxSep` — and deriving it that way is what
        // keeps the boundary case honest. Tracking a separate `depth` and only updating it on
        // strictly-negative separations reports a pair that touches EXACTLY as deeply
        // interpenetrating (the touching axis contributes 0, is skipped, and some other axis's
        // overlap becomes the answer), which is the most common contact in a boxy model and the
        // one this check exists to be right about.
        var maxSep = -Infinity;
        for (i = 0; i < axes.length; i++) {
            var len = length(axes[i]);
            if (len < 1.0e-6) continue;      // parallel edges: the cross degenerates, and the face
            var L = scale(axes[i], 1 / len); // normals already cover what it would have tested
            var ra = Math.abs(dot(a.axes[0], L)) * a.half[0]
                + Math.abs(dot(a.axes[1], L)) * a.half[1]
                + Math.abs(dot(a.axes[2], L)) * a.half[2];
            var rb = Math.abs(dot(b.axes[0], L)) * b.half[0]
                + Math.abs(dot(b.axes[1], L)) * b.half[1]
                + Math.abs(dot(b.axes[2], L)) * b.half[2];
            var separation = Math.abs(dot(d, L)) - (ra + rb);
            if (separation > maxSep) maxSep = separation;
        }
        if (maxSep > 1.0e-9) return { hit: false, gap: maxSep, depth: 0 };
        return { hit: true, gap: 0, depth: Math.max(0, -maxSep) };
    }

    /** The six faces of an oriented box, as a plane plus a quad, in world space. */
    function faces(box) {
        var out = [];
        for (var i = 0; i < 3; i++) {
            var j = (i + 1) % 3, k = (i + 2) % 3;
            for (var s = -1; s <= 1; s += 2) {
                var n = scale(box.axes[i], s);
                var c = addv(box.centre, scale(box.axes[i], s * box.half[i]));
                out.push({
                    normal: n,
                    centre: c,
                    u: box.axes[j], hu: box.half[j],
                    v: box.axes[k], hv: box.half[k],
                    axis: 'xyz'[i],
                    side: s > 0 ? '+' : '-'
                });
            }
        }
        return out;
    }

    /**
     * The shared-face-plane detector, and it is a SEPARATE instrument from the SAT for the reason
     * the corridor work found the hard way: two boxes whose faces sit in one plane score gap 0.000
     * and read as perfectly clean, while in the game they z-fight.
     *
     * It is rotation-aware without knowing what a rotation IS — it compares the actual world-space
     * face planes, so the trap it was written for falls out for free: a yaw leaves every y-normal
     * at (0, ±1, 0), so two differently-yawed parts still share their top and bottom planes, and
     * this finds them. (That is the spider's grippers: yawed 15°, y-faces never moved, sharing
     * planes with both the sternum and the head. Pitching them −10° is what cleared it.)
     */
    function coplanar(a, b, eps) {
        var best = null;
        var fa = faces(a), fb = faces(b);
        for (var i = 0; i < fa.length; i++) {
            for (var j = 0; j < fb.length; j++) {
                var A = fa[i], B = fb[j];
                if (Math.abs(dot(A.normal, B.normal)) < 1 - 1.0e-6) continue;
                var offset = Math.abs(dot(subv(B.centre, A.centre), A.normal));
                if (offset > eps) continue;
                var area = sharedArea(A, B);
                if (area <= 1.0e-6) continue;
                if (!best || area > best.area) {
                    best = {
                        area: area,
                        offset: offset,
                        faceA: A.side + A.axis,
                        faceB: B.side + B.axis,
                        opposed: dot(A.normal, B.normal) < 0
                    };
                }
            }
        }
        return best;
    }

    /**
     * Area the two coplanar faces actually share, by clipping one quad against the other. BOTH
     * quads are projected into face A's in-plane basis — they are in one plane, so one basis is the
     * whole point, and a second one would be a second answer to the same question.
     */
    function sharedArea(A, B) {
        function project(p) {
            var rel = subv(p, A.centre);
            return [dot(rel, A.u), dot(rel, A.v)];
        }
        function quad(face) {
            return ccw([
                addv(face.centre, addv(scale(face.u, face.hu), scale(face.v, face.hv))),
                addv(face.centre, addv(scale(face.u, -face.hu), scale(face.v, face.hv))),
                addv(face.centre, addv(scale(face.u, -face.hu), scale(face.v, -face.hv))),
                addv(face.centre, addv(scale(face.u, face.hu), scale(face.v, -face.hv)))
            ].map(project));
        }
        return polyArea(clip(quad(B), quad(A)));
    }

    function signedArea(poly) {
        var s = 0;
        for (var i = 0; i < poly.length; i++) {
            var a = poly[i], b = poly[(i + 1) % poly.length];
            s += a[0] * b[1] - b[0] * a[1];
        }
        return s / 2;
    }

    function ccw(poly) { return signedArea(poly) < 0 ? poly.slice().reverse() : poly; }
    function polyArea(poly) { return poly.length < 3 ? 0 : Math.abs(signedArea(poly)); }

    /** Sutherland-Hodgman: both polygons are convex and counter-clockwise, so this is exact. */
    function clip(subject, window) {
        var out = subject;
        for (var i = 0; i < window.length && out.length; i++) {
            var a = window[i], b = window[(i + 1) % window.length];
            var input = out;
            out = [];
            for (var k = 0; k < input.length; k++) {
                var p = input[k], q = input[(k + 1) % input.length];
                var sp = side(a, b, p), sq = side(a, b, q);
                if (sp >= -1.0e-9) out.push(p);
                if ((sp > 1.0e-9 && sq < -1.0e-9) || (sp < -1.0e-9 && sq > 1.0e-9)) {
                    out.push(intersect(a, b, p, q));
                }
            }
        }
        return out;
    }

    function side(a, b, p) {
        return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    }

    function intersect(a, b, p, q) {
        var r = [b[0] - a[0], b[1] - a[1]];
        var s = [q[0] - p[0], q[1] - p[1]];
        var den = r[0] * s[1] - r[1] * s[0];
        if (Math.abs(den) < 1.0e-12) return p.slice();
        var t = ((p[0] - a[0]) * s[1] - (p[1] - a[1]) * s[0]) / den;
        return [a[0] + r[0] * t, a[1] + r[1] * t];
    }

    // -- UV -------------------------------------------------------------------------------------

    /**
     * The UV audit (§6.2), which exists because auto-UV gives EVERY cube `uv_offset = [0, 0]` — so
     * they all overlap, painting one paints all, and nothing about that is visible in a screenshot.
     *
     * Box UV lays a cube of (w, h, d) out as a rectangle `2*(d+w)` wide and `d+h` tall
     * (ModelPart.Cube's ctor: u runs d, w, d, w and v runs d, h). Three findings come off that:
     *
     *  - `collision` — two footprints partly overlap. Always wrong.
     *  - `shared`    — two footprints are IDENTICAL. Usually deliberate (a mirrored pair), so it is
     *                  reported and not failed.
     *  - `offsheet`  — a footprint runs past the sheet. A face packed off-canvas renders as
     *                  whatever is at the clamped edge, and a screenshot cannot show you that.
     *
     * And the arithmetic check that PROVES the paint landed: the opaque pixel count must equal the
     * summed face area `2*(w*h + d*h + w*d)` over distinct footprints. The narwhal's 1956 == 1956
     * is the reason this is in the shipped battery rather than in a session scratch file.
     */
    /**
     * The six face rectangles of a box-UV cube, in sheet pixels. Same layout the footprint above
     * assumes (u runs d, w, d, w; v runs d, h): up and down on the top strip, then east, north,
     * west, south across the bottom one. A zero-sized dimension yields zero-area faces, which are
     * skipped by every caller — a flat quad has no "top".
     */
    function faceRects(box) {
        var u = box.uv[0], v = box.uv[1];
        var w = box.size[0], h = box.size[1], d = box.size[2];
        return [
            { face: 'up',    x: u + d,         y: v,     w: w, h: d },
            { face: 'down',  x: u + d + w,     y: v,     w: w, h: d },
            { face: 'east',  x: u,             y: v + d, w: d, h: h },
            { face: 'north', x: u + d,         y: v + d, w: w, h: h },
            { face: 'west',  x: u + d + w,     y: v + d, w: d, h: h },
            { face: 'south', x: u + 2 * d + w, y: v + d, w: w, h: h }
        ].filter(function (f) { return f.w > 0 && f.h > 0; });
    }

    /**
     * @param previousFaces  {label -> complete:boolean} from the last report, for the finding the
     *        whole-sheet arithmetic cannot make: a face that was fully painted and then GREW on a
     *        resize (ArmorPieces' helmet shell: the check said ok because its test only fired on a
     *        wholly empty face). Paint moves with the face; the new rows do not exist yet.
     */
    function uvAudit(boxes, texture, pixels, previousFaces) {
        var rects = boxes.map(function (box) {
            var w = box.size[0], h = box.size[1], d = box.size[2];
            return {
                label: box.label,
                x: box.uv[0], y: box.uv[1],
                w: 2 * (d + w), h: d + h,
                area: 2 * (w * h + d * h + w * d)
            };
        });
        var findings = [];
        var i, j;
        for (i = 0; i < rects.length; i++) {
            var r = rects[i];
            if (r.x + r.w > texture.width || r.y + r.h > texture.height
                || r.x < 0 || r.y < 0) {
                findings.push({
                    kind: 'offsheet', a: r.label, b: '',
                    detail: '[' + r.x + ',' + r.y + '] +' + r.w + 'x' + r.h
                        + ' runs off a ' + texture.width + 'x' + texture.height + ' sheet'
                });
            }
        }
        for (i = 0; i < rects.length; i++) {
            for (j = i + 1; j < rects.length; j++) {
                var a = rects[i], b = rects[j];
                var ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
                var oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
                if (ox <= 0 || oy <= 0) continue;
                var identical = a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
                findings.push({
                    kind: identical ? 'shared' : 'collision',
                    a: a.label, b: b.label,
                    detail: identical
                        ? 'both at [' + a.x + ',' + a.y + '] — deliberate only if they are a mirror pair'
                        : (ox * oy) + 'px of footprint shared'
                });
            }
        }

        // Distinct footprints only: a deliberately shared UV must not be counted twice against the
        // pixels, or the arithmetic check reads red for a model that is entirely correct.
        var distinct = {};
        var painted = 0;
        rects.forEach(function (r) {
            var key = r.x + ':' + r.y + ':' + r.w + ':' + r.h;
            if (distinct[key]) return;
            distinct[key] = true;
            painted += r.area;
        });

        var paint = { painted: painted, opaque: null, ok: null };
        if (pixels && pixels.data) {
            var opaque = 0;
            for (i = 3; i < pixels.data.length; i += 4) {
                if (pixels.data[i] > 0) opaque++;
            }
            paint.opaque = opaque;
            paint.ok = opaque === painted;
        }

        // PER-FACE coverage and stray paint (LOOP_KIT_DESIGN.md §3, §5.4). The whole-sheet count
        // above proves the paint LANDED SOMEWHERE; these say where it did not: a face with no
        // paint behind it renders as a hole, a half-painted face as a torn one, and paint outside
        // every face is work that will never be seen. All three are invisible in the 3D view and
        // trivial arithmetic on the sheet, which is exactly the class of check that belongs here
        // rather than in a screenshot.
        var faces = [];
        if (pixels && pixels.data) {
            var covered = new Uint8Array(pixels.width * pixels.height);
            boxes.forEach(function (box) {
                faceRects(box).forEach(function (f) {
                    var n = 0, inside = 0;
                    for (var yy = f.y; yy < f.y + f.h; yy++) {
                        for (var xx = f.x; xx < f.x + f.w; xx++) {
                            if (xx < 0 || yy < 0 || xx >= pixels.width || yy >= pixels.height) continue;
                            inside++;
                            covered[yy * pixels.width + xx] = 1;
                            if (pixels.data[(yy * pixels.width + xx) * 4 + 3] > 0) n++;
                        }
                    }
                    faces.push({ label: box.label + '.' + f.face, x: f.x, y: f.y, w: f.w, h: f.h,
                        area: inside, painted: n, complete: inside > 0 && n === inside });
                });
            });
            var stray = 0;
            for (var p = 0; p < covered.length; p++) {
                if (!covered[p] && pixels.data[p * 4 + 3] > 0) stray++;
            }
            paint.stray = stray;
            if (stray > 0) {
                findings.push({ kind: 'stray', a: '', b: '',
                    detail: stray + ' opaque px outside every face - paint nothing samples' });
            }
            faces.forEach(function (f) {
                if (f.area === 0) return;
                if (f.painted === 0) {
                    findings.push({ kind: 'unpainted', a: f.label, b: '',
                        detail: '0/' + f.area + ' px at [' + f.x + ',' + f.y + '] ' + f.w + 'x' + f.h
                            + ' - renders as a hole' });
                } else if (!f.complete) {
                    var wasComplete = previousFaces && previousFaces[f.label] === true;
                    findings.push({ kind: wasComplete ? 'regrown' : 'partial', a: f.label, b: '',
                        detail: f.painted + '/' + f.area + ' px at [' + f.x + ',' + f.y + '] ' + f.w + 'x' + f.h
                            + (wasComplete ? ' - was complete and GREW; the new rows are unpainted'
                                : ' - painted in part') });
                }
            });
        }
        return { findings: findings, paint: paint, faces: faces };
    }

    /** The texture pixels, when Blockbench is there to be asked. Null in a harness, and that is fine. */
    function pixelsOf(textureName) {
        if (typeof Texture === 'undefined' || !Texture.all) return null;
        var t = Texture.all.find(function (x) {
            return x.name === textureName || x.name.replace(/\.png$/, '') === textureName;
        });
        if (!t || !t.canvas) return null;
        try {
            var ctx = t.canvas.getContext('2d');
            var data = ctx.getImageData(0, 0, t.canvas.width, t.canvas.height);
            return { width: data.width, height: data.height, data: data.data };
        } catch (e) {
            return null;
        }
    }

    /**
     * Every ordered pair of boxes, classified. Split out of {@link verifyModel} when the animated
     * arm arrived, because an animated pose needs the same classification over a different set of
     * boxes -- and the rest pose must keep getting EXACTLY this one, unchanged.
     */
    function pairTable(boxes, sinkPx, eps) {
        var pairs = [];
        for (var i = 0; i < boxes.length; i++) {
            for (var j = i + 1; j < boxes.length; j++) {
                var a = boxes[i], b = boxes[j];
                var hit = sat(a, b);
                // The plane detector runs on EVERY pair, not only on the ones SAT calls clean, and
                // that is load-bearing: two boxes stacked face-to-face are not separated (SAT
                // reports depth 0.000, which reads as clean) and not overlapping either — they are
                // the commonest z-fight there is. Deciding whether to look for a shared plane from
                // SAT's verdict is how that pair goes unreported.
                var plane = coplanar(a, b, eps);
                var kind;
                if (hit.hit && hit.depth > sinkPx) kind = 'overlap';
                else if (plane) kind = 'coplanar';
                else if (hit.hit && hit.depth > 0) kind = 'sunk';
                else kind = 'clear';
                pairs.push({
                    a: a.label, b: b.label,
                    same_part: a.part === b.part,
                    kind: kind,
                    depth: num(hit.depth),
                    gap: num(hit.hit ? 0 : hit.gap),
                    plane: plane ? {
                        area: num(plane.area), faces: plane.faceA + '/' + plane.faceB,
                        offset: num(plane.offset)
                    } : null
                });
            }
        }
        // Worst first, and the FULL table on every run: fixing one coplanarity routinely creates
        // another, so a table trimmed to "what changed" trains a reader to trust a green they have
        // not actually been shown.
        var rank = { overlap: 0, coplanar: 1, sunk: 2, clear: 3 };
        pairs.sort(function (x, y) {
            if (rank[x.kind] !== rank[y.kind]) return rank[x.kind] - rank[y.kind];
            if (x.kind === 'overlap' || x.kind === 'sunk') return y.depth - x.depth;
            if (x.kind === 'coplanar') return y.plane.area - x.plane.area;
            return x.gap - y.gap;
        });
        return pairs;
    }

    /**
     * The check §9.3 exists for: an authored clip is a set of poses nobody has ever looked at, and
     * an arm that clears a torso at both ends of a swing can pass straight through it in between.
     *
     * WHAT IT REPORTS, AND WHAT IT DELIBERATELY DOES NOT. Only OVERLAP. Coplanarity and sink are
     * rest-pose findings: two faces that share a plane for one frame of an arc are not a z-fight
     * worth an author's attention, and a pair that shares one for the whole clip already shows up
     * in the rest table. Reporting them per sample would bury the one finding that matters under a
     * table nobody reads — the §6.2 rule about not training a reader to skim, applied to time.
     *
     * And an overlap that is ALREADY an overlap at rest is marked, not re-counted: it is the same
     * defect seen again, and counting it once per sample would make one bad cube look like twelve.
     */
    function animatedFindings(model, restPairs, sinkPx) {
        var clips = model.animations || {};
        var names = Object.keys(clips);
        var restOverlaps = {};
        restPairs.forEach(function (p) {
            if (p.kind === 'overlap') restOverlaps[p.a + '|' + p.b] = num(p.depth);
        });
        var findings = [];
        var samples = 0;
        var approx = {};
        var covered = [];
        names.forEach(function (name) {
            var clip = clips[name];
            var times = sampleTimes(clip);
            times.forEach(function (t) {
                samples++;
                covered.push(name + '@' + t);
                var boxes = worldBoxes(model, poseAt(clip, t));
                boxes.forEach(function (b) { if (b.approx) approx[b.part] = true; });
                for (var i = 0; i < boxes.length; i++) {
                    for (var j = i + 1; j < boxes.length; j++) {
                        var a = boxes[i], b = boxes[j];
                        if (a.part === b.part) continue;   // rigid together; the rest table has it
                        var hit = sat(a, b);
                        if (!hit.hit || hit.depth <= sinkPx) continue;
                        var key = a.label + '|' + b.label;
                        findings.push({
                            clip: name, t: t, a: a.label, b: b.label,
                            depth: num(hit.depth),
                            fresh: !(key in restOverlaps)
                        });
                    }
                }
            });
        });
        // Worst first, but only the deepest sample of each pair per clip: a swing that passes
        // through a torso overlaps at every sample around the crossing, and twelve rows describing
        // one collision is the same "full table nobody reads" failure in a different dimension.
        var worst = {};
        findings.forEach(function (f) {
            var key = f.clip + '|' + f.a + '|' + f.b;
            if (!worst[key] || f.depth > worst[key].depth) worst[key] = f;
        });
        var deduped = Object.keys(worst).map(function (k) { return worst[k]; });
        deduped.sort(function (x, y) { return y.depth - x.depth; });
        return {
            clips: names,
            samples: samples,
            poses: covered,
            findings: deduped,
            fresh: deduped.filter(function (f) { return f.fresh; }).length,
            approx: Object.keys(approx)
        };
    }

    // -- the report -----------------------------------------------------------------------------

    /** The {label -> complete} map a previous report (verify's or check's shape) carried, or null. */
    function previousFacesOf(previous) {
        if (!previous || typeof previous !== 'object') return null;
        var list = Array.isArray(previous.faces) ? previous.faces
            : (previous.report && Array.isArray(previous.report.faces)) ? previous.report.faces : null;
        if (!list) return null;
        var map = {};
        list.forEach(function (f) { if (f && f.label) map[f.label] = f.complete === true; });
        return map;
    }

    function verifyModel(converted, pixels, sinkPx, eps, previous) {
        var boxes = worldBoxes(converted.model);
        var pairs = pairTable(boxes, sinkPx, eps);
        var animated = animatedFindings(converted.model, pairs, sinkPx);

        var uv = uvAudit(boxes, converted.model.texture, pixels, previousFacesOf(previous));
        var counts = { overlap: 0, coplanar: 0, sunk: 0, clear: 0 };
        pairs.forEach(function (p) { counts[p.kind]++; });
        // `shared` and `partial` are NOTES: a mirrored pair is usually deliberate, and a face
        // painted in part is a face mid-work. Everything else in the UV list is a finding.
        var failures = counts.overlap
            + counts.coplanar
            + uv.findings.filter(function (f) { return f.kind !== 'shared' && f.kind !== 'partial'; }).length
            + (uv.paint.ok === false ? 1 : 0)
            + animated.fresh;

        return {
            ok: failures === 0,
            model: converted.modelId,
            boxes: boxes.length,
            pairs: pairs.length,
            counts: counts,
            failures: failures,
            sinkPx: sinkPx,
            table: pairs,
            uv: uv.findings,
            paint: uv.paint,
            // Per face: label, rect, area, painted, complete. Carried so the NEXT report can tell
            // a face that grew from one that was never finished (see uvAudit's previousFaces).
            faces: uv.faces,
            bounds: boundsOf(boxes),
            warnings: converted.warnings,
            animated: animated,
            // What was actually covered, said out loud rather than implied: a pose-based test only
            // covers the poses it lists, and a model with no clips still has exactly one.
            poses: ['rest'].concat(animated.poses)
        };
    }

    function pad(s, n) {
        s = String(s);
        return s.length >= n ? s : s + new Array(n - s.length + 1).join(' ');
    }

    /**
     * The compact block and counts for the loop-kit contract: every finding as a `!` line, every
     * note as a `-` line, nothing else. Worst first, and short: this rides EVERY editing reply for
     * the rest of the session, so a line it does not need is a line paid on every later turn.
     */
    function checkContract(report) {
        var problems = [];
        var notes = [];
        report.table.forEach(function (row) {
            if (row.kind === 'overlap') {
                problems.push('overlap ' + row.a + ' | ' + row.b + ' ' + row.depth.toFixed(2) + 'px');
            } else if (row.kind === 'coplanar') {
                problems.push('coplanar ' + row.a + ' | ' + row.b + ' ' + row.plane.faces + ' '
                    + row.plane.area.toFixed(1) + 'px2 (z-fights in game)');
            }
        });
        report.uv.forEach(function (f) {
            var line = f.kind + ' ' + f.a + (f.b ? ' | ' + f.b : '') + (f.detail ? ' ' + f.detail : '');
            if (f.kind === 'shared' || f.kind === 'partial') notes.push(line); else problems.push(line.trim());
        });
        if (report.paint.ok === false) {
            problems.push('paint ' + report.paint.opaque + ' opaque px vs ' + report.paint.painted
                + ' px of face area');
        } else if (report.paint.opaque === null) {
            notes.push('no texture pixels to check paint against');
        }
        (report.animated.findings || []).forEach(function (f) {
            if (f.fresh) {
                problems.push('animated ' + f.clip + ' @' + f.t + ' ' + f.a + ' | ' + f.b + ' '
                    + f.depth.toFixed(2) + 'px');
            }
        });
        (report.warnings || []).forEach(function (w) { notes.push(w); });
        var head = 'verify ' + report.model + ': ' + report.boxes + ' cubes, ' + report.pairs
            + ' pairs, poses ' + report.poses.join('/') + ' - '
            + (problems.length ? problems.length + ' problem(s) need a decision' : 'ok: nothing needs a decision');
        var lines = [head];
        problems.forEach(function (p) { lines.push('  ! ' + p); });
        notes.forEach(function (n) { lines.push('  - ' + n); });
        return {
            ok: problems.length === 0,
            text: lines.join('\n'),
            problems: problems.length,
            notes: notes.length,
            full: report.text,
            model: report.model,
            faces: report.faces,
            failures: report.failures
        };
    }

    function reportText(report) {
        var lines = [];
        var a = report.animated;
        lines.push('verify ' + report.model + ' — ' + report.boxes + ' cubes, ' + report.pairs
            + ' pairs, ' + (a.clips.length
                ? a.clips.length + ' clip(s) over ' + a.samples + ' sampled poses'
                : 'rest pose only'));
        lines.push('  ' + report.counts.overlap + ' overlap, ' + report.counts.coplanar
            + ' coplanar, ' + report.counts.sunk + ' sunk (<=' + report.sinkPx + 'px), '
            + report.counts.clear + ' clear');
        lines.push('');
        lines.push('  ' + pad('PAIR', 46) + pad('KIND', 10) + pad('DEPTH', 9) + pad('GAP', 9) + 'PLANE');
        report.table.forEach(function (row) {
            lines.push('  ' + pad(row.a + ' | ' + row.b, 46) + pad(row.kind, 10)
                + pad(row.depth.toFixed(3), 9) + pad(row.gap.toFixed(3), 9)
                + (row.plane ? row.plane.faces + ' ' + row.plane.area.toFixed(2) + 'px2' : ''));
        });
        lines.push('');
        if (report.uv.length) {
            lines.push('  UV:');
            report.uv.forEach(function (f) {
                lines.push('    ' + pad(f.kind, 11) + f.a + (f.b ? ' | ' + f.b : '') + '  ' + f.detail);
            });
        } else {
            lines.push('  UV: no footprint collisions');
        }
        if (report.paint.opaque === null) {
            lines.push('  paint: ' + report.paint.painted + 'px of face area; no texture pixels'
                + ' available to compare against');
        } else {
            lines.push('  paint: ' + report.paint.opaque + ' opaque px vs ' + report.paint.painted
                + ' px of face area — ' + (report.paint.ok ? 'every face landed'
                    : 'MISMATCH, so a face is unpainted or double-mapped'));
            var fs = report.faces || [];
            var full = fs.filter(function (f) { return f.complete; }).length;
            var empty = fs.filter(function (f) { return f.area > 0 && f.painted === 0; });
            var part = fs.filter(function (f) { return f.painted > 0 && !f.complete; });
            lines.push('  faces: ' + full + '/' + fs.length + ' painted in full, ' + part.length
                + ' in part, ' + empty.length + ' unpainted; ' + (report.paint.stray || 0)
                + ' opaque px outside every face');
            if (empty.length) {
                lines.push('    ! unpainted: ' + empty.map(function (f) { return f.label; }).join(', '));
            }
            report.uv.filter(function (f) { return f.kind === 'regrown'; }).forEach(function (f) {
                lines.push('    ! regrown: ' + f.a + ' ' + f.detail);
            });
            if (part.length) {
                lines.push('    - in part: ' + part.map(function (f) {
                    return f.label + ' ' + f.painted + '/' + f.area;
                }).join(', '));
            }
        }
        if (a.clips.length) {
            lines.push('  animated (' + a.clips.join(', ') + ') — keyframes AND their midpoints,'
                + ' overlap only; coplanarity is a rest-pose finding:');
            if (!a.findings.length) {
                lines.push('    no pair overlaps at any sampled pose');
            } else {
                a.findings.forEach(function (f) {
                    lines.push('    ' + pad(f.clip + ' @' + f.t, 18)
                        + pad(f.a + ' | ' + f.b, 40) + f.depth.toFixed(3) + 'px'
                        + (f.fresh ? '  ONLY WHEN ANIMATED' : '  (also overlaps at rest)'));
                });
            }
            if (a.approx.length) {
                lines.push('    ! a non-uniform scale above a rotated part SHEARS it, and a'
                    + ' sheared box is not an oriented box: ' + a.approx.join(', ')
                    + ' are measured as boxes, so their depths are approximate');
            }
        }
        lines.push('  bounds: hitbox ' + report.bounds.size[0] + ' x ' + report.bounds.size[1]
            + ' blocks' + (report.bounds.below_ground ? '  (geometry hangs BELOW the ground line)' : ''));
        report.warnings.forEach(function (w) { lines.push('  ! ' + w); });
        lines.push(report.ok ? '  ALL CLEAR' : '  ' + report.failures + ' FINDING(S)');
        return lines.join('\n');
    }

    // ------------------------------------------------------------------ push / promote / stage

    function pushPaths(converted) {
        return 'assets/' + converted.namespace + '/preview/' + converted.modelId + '.json';
    }

    function doPush(opts) {
        // Everything that can be known before a byte moves is settled first — the geometry, the
        // destination, the texture's name — so a push that is going to fail fails before it has
        // written half a model into a live pack. Same no-half-apply rule PreviewTools follows on
        // the other side of the bridge.
        var converted = convertDoc(docFor(opts), opts);
        var target = opts.target || 'live';
        // Three values; an unknown one used to push nothing and answer ok (section 13).
        if (TARGETS.indexOf(target) < 0) {
            throw new Error('target must be one of ' + TARGETS.join(' | ') + ', not ' + JSON.stringify(opts.target));
        }
        // A texture whose Blockbench name differs from its sanitized asset name would land beside
        // what the JSON references. Renaming is not this plugin's business, so it is refused with
        // the fix rather than pushed into a mismatch that renders as missingno.
        if (converted.texture && converted.texture.name.replace(/\.png$/, '') !== converted.texture.id) {
            throw new Error('texture "' + converted.texture.name + '" is not a legal asset name —'
                + ' rename it to "' + converted.texture.id + '" in Blockbench (lower case, and'
                + ' a-z 0-9 . _ - only)');
        }
        var live = target === 'live' || target === 'both';
        var name = projectNameFor(opts);
        // Both destinations settled before a byte moves - where on disk, and WHICH GAME - with the
        // transport between them, because a live push needs the transport before it needs a port.
        var root = null;
        if (target === 'source' || target === 'both') root = opts.sourceRoot || sourceRootFor(name);
        if (typeof globalThis.mcptoolkitPush !== 'function') {
            throw new Error('mcptoolkit_sync.js is not loaded — this plugin drives its'
                + ' mcptoolkitPush() rather than re-implementing the transport');
        }
        var bridge = live ? bridgeFor(opts, name) : null;
        var pushOpts = {
            bridge: bridge,
            namespace: converted.namespace,
            folder: 'textures/preview/' + converted.modelId,
            only: converted.texture ? [converted.texture.name] : [],
            target: target,
            extras: [{ path: pushPaths(converted), text: JSON.stringify(converted.model, null, 2) }]
        };
        if (opts.project) pushOpts.project = opts.project;
        if (root) pushOpts.sourceRoot = root;

        var boxes = worldBoxes(converted.model);
        var bounds = boundsOf(boxes);
        var summary = {
            ok: true,
            model: converted.modelId,
            namespace: converted.namespace,
            target: target,
            parts: converted.parts,
            cubes: converted.cubes,
            clips: converted.clips,
            size: bounds.size,
            geometry: pushPaths(converted),
            texture: converted.texture
                ? 'assets/' + converted.namespace + '/' + pushOpts.folder + '/'
                    + converted.texture.name.replace(/\.png$/, '') + '.png'
                : null,
            warnings: converted.warnings.slice()
        };

        return globalThis.mcptoolkitPush(pushOpts).then(function (push) {
            if (!push.ok) return { ok: false, error: push.error, model: summary.model };
            summary.pushed = push.pushed;
            var wantStage = opts.stage !== false && (target === 'live' || target === 'both');
            if (!wantStage) return summary;
            if (converted.namespace !== 'mcptoolkit') {
                summary.warnings.push('not staged: the preview loader reads'
                    + ' assets/mcptoolkit/preview/ only, and this went to "'
                    + converted.namespace + '" — that is a promotion, not a preview');
                return summary;
            }
            // A push whose whole point is a clip should not stage a statue. One clip and no
            // choice made is not ambiguous, so it plays; several clips IS ambiguous, so it names
            // them and stages the rest pose rather than picking for the author.
            var stageOpts = opts;
            if (!opts.clip && converted.clips.length === 1) {
                stageOpts = Object.assign({}, opts, { clip: converted.clips[0] });
                summary.playing = converted.clips[0];
            } else if (!opts.clip && converted.clips.length > 1) {
                summary.warnings.push('staged in the REST POSE: this model has '
                    + converted.clips.length + ' clips (' + converted.clips.join(', ')
                    + ') and none was named — pass `clip` to play one');
            }
            return stageIt(bridge, converted.modelId, bounds.size, stageOpts).then(function (staged) {
                summary.stage = staged;
                summary.parse = staged.parse;
                if (staged.parse_error) summary.parse_error = staged.parse_error;
                return summary;
            }, function (e) {
                // A stage that fails after a push that LANDED answers ok:false WITH what landed
                // (section 13): the model and texture are in the live pack whether or not a body
                // wears them, and a reply that hid that sent authors pushing again.
                return Object.assign({}, summary, { ok: false, error: 'pushed but not staged: ' + String(e && e.message || e),
                    staged: false });
            });
        });
    }

    /**
     * The stage slot. `session` is what `risky_eval` hands over as SESSION (bridge plugin 0.11.0):
     * with one, and no explicit tag, the slot is per session, so two sessions pushing a preview
     * into one game stop overwriting each other's entity (section 13). Without one the shipped
     * default stands, as it did.
     */
    function tagFor(opts) {
        if (opts && opts.tag) return opts.tag;
        var base = settings.tag || DEFAULTS.tag;
        if (opts && opts.session) return base + '-' + String(opts.session).replace(/[^A-Za-z0-9_.-]+/g, '_');
        return base;
    }

    function stageIt(bridge, modelId, size, opts) {
        var args = { op: 'stage', model: modelId, size: size, tag: tagFor(opts) };
        if (opts.pos) args.pos = opts.pos;
        if (opts.dimension) args.dimension = opts.dimension;
        if (typeof opts.yaw === 'number') args.yaw = opts.yaw;
        if (typeof opts.spin === 'boolean') args.spin = opts.spin;
        if (typeof opts.scale === 'number') args.scale = opts.scale;
        if (opts.replace === false) args.replace = false;
        if (opts.clip) args.clip = opts.clip;
        if (typeof opts.clip_time === 'number') args.clip_time = opts.clip_time;
        return call(bridge, 'stage_entity', args);
    }

    // ------------------------------------------------------------------ headless API

    function headless(opts) {
        try {
            opts = opts || {};
            loadSettings();
            if (opts.set) saveSettings(opts.set);
            var act = opts.action || 'status';

            switch (act) {
                case 'settings':
                    return done({ ok: true, settings: settings });
                case 'status': {
                    var status = {
                        ok: true,
                        settings: settings,
                        sync_plugin: typeof globalThis.mcptoolkitPush === 'function',
                        project: (typeof Project !== 'undefined' && Project) ? Project.name : null,
                        format: (typeof Format !== 'undefined' && Format) ? Format.id : null
                    };
                    // No bridge is a REASON the game is unreachable, reported like any other rather
                    // than thrown: status is the call an author makes to find out what is missing.
                    var statusBridge;
                    try { statusBridge = bridgeFor(opts, status.project); }
                    catch (e) {
                        status.game = false;
                        status.bridge = null;
                        status.game_error = String(e.message || e);
                        return done(status);
                    }
                    status.bridge = statusBridge;
                    return call(statusBridge, 'stage_entity', { op: 'list' }).then(function (list) {
                        status.game = true;
                        status.staged = list.count;
                        return done(status);
                    }).catch(function (e) {
                        status.game = false;
                        status.game_error = String(e.message || e);
                        return done(status);
                    });
                }
                case 'convert': {
                    var converted = convertDoc(docFor(opts), opts);
                    var bounds = boundsOf(worldBoxes(converted.model));
                    return done({
                        ok: true,
                        model: converted.modelId,
                        namespace: converted.namespace,
                        parts: converted.parts,
                        cubes: converted.cubes,
                        clips: converted.clips,
                        keyframes: converted.keyframes,
                        size: bounds.size,
                        path: pushPaths(converted),
                        json: JSON.stringify(converted.model, null, 2),
                        warnings: converted.warnings
                    });
                }
                case 'verify': {
                    var subject = convertDoc(docFor(opts), opts);
                    var pixels = opts.pixels
                        || (subject.texture ? pixelsOf(subject.texture.name) : null);
                    var report = verifyModel(subject, pixels,
                        typeof opts.sink === 'number' ? opts.sink : settings.sinkPx,
                        typeof opts.eps === 'number' ? opts.eps : settings.coplanarEps,
                        opts.previous || null);
                    report.text = reportText(report);
                    lastReport = report;
                    return done(report);
                }
                case 'check': {
                    // The loop-kit CHECKER CONTRACT over the verify battery (LOOP_KIT_DESIGN.md
                    // §5.2): { text, problems, notes, full } — the compact block that rides an
                    // editing call's reply, the count a save gate reads, and the long form. A loop
                    // file's `"eval": "mcptoolkitEntity({action:'check', previous: __previous})"`
                    // is the whole hook; `previous` is what makes `regrown` a diff and not a memory.
                    var cSubject = convertDoc(docFor(opts), opts);
                    var cPixels = opts.pixels
                        || (cSubject.texture ? pixelsOf(cSubject.texture.name) : null);
                    var cReport = verifyModel(cSubject, cPixels,
                        typeof opts.sink === 'number' ? opts.sink : settings.sinkPx,
                        typeof opts.eps === 'number' ? opts.eps : settings.coplanarEps,
                        opts.previous || null);
                    cReport.text = reportText(cReport);
                    lastReport = cReport;
                    return done(checkContract(cReport));
                }
                case 'push':
                    return doPush(opts).then(done).catch(function (e) {
                        return done({ ok: false, error: String(e.message || e) });
                    });
                case 'promote':
                    return doPush(Object.assign({}, opts, { target: 'source' })).then(done)
                        .catch(function (e) {
                            return done({ ok: false, error: String(e.message || e) });
                        });
                case 'stage': {
                    if (!opts.model) return done({ ok: false, error: 'stage needs a `model` id' });
                    return stageIt(bridgeFor(opts, projectNameFor(opts)), sanitizeId(opts.model), opts.size || [1, 1], opts)
                        .then(function (r) { return done(Object.assign({ ok: true }, r)); })
                        .catch(function (e) { return done({ ok: false, error: String(e.message || e) }); });
                }
                case 'clear':
                    // With a session and no tag, clear THIS session's slot, not everybody's.
                    return call(bridgeFor(opts, projectNameFor(opts)), 'stage_entity', (opts.tag || opts.session) ? { op: 'clear', tag: tagFor(opts) } : { op: 'clear' })
                        .then(function (r) { return done(Object.assign({ ok: true }, r)); })
                        .catch(function (e) { return done({ ok: false, error: String(e.message || e) }); });
                case 'list':
                    return call(bridgeFor(opts, projectNameFor(opts)), 'stage_entity', { op: 'list' })
                        .then(function (r) { return done(Object.assign({ ok: true }, r)); })
                        .catch(function (e) { return done({ ok: false, error: String(e.message || e) }); });
                default:
                    return done({ ok: false, error: 'unknown action "' + act + '"' });
            }
        } catch (e) {
            return done({ ok: false, error: String(e.message || e) });
        }
    }

    /**
     * Every path out of `headless` goes through here, and it never rejects — a rejected Promise
     * returned through risky_eval is an unhandled rejection inside the MCP plugin's HTTP server and
     * wedges it until Blockbench restarts. Both plugins next door make the same decision; it is
     * kept deliberately rather than copied.
     */
    function done(result) {
        globalThis.mcptoolkitEntityLast = result;
        return Promise.resolve(result);
    }

    // ------------------------------------------------------------------ the panel

    function ensureCss() {
        if (document.getElementById('mte-css')) return;
        var css = document.createElement('style');
        css.id = 'mte-css';
        css.textContent = '#' + ROOT_ID + ' { font-size: 13px; }'
            + '#' + ROOT_ID + ' label { display:inline-block; width: 120px; opacity: .8; }'
            + '#' + ROOT_ID + ' input { width: 420px; margin: 2px 0; }'
            + '#' + ROOT_ID + ' .mte-row { margin: 4px 0; }'
            + '#' + ROOT_ID + ' .mte-buttons { margin: 10px 0; }'
            + '#' + ROOT_ID + ' button { margin-right: 8px; }'
            + '#' + ROOT_ID + ' pre { max-height: 380px; overflow: auto; background: var(--color-back);'
            + ' padding: 8px; font-size: 11px; line-height: 1.35; white-space: pre; }';
        document.head.appendChild(css);
    }

    function render() {
        var root = document.getElementById(ROOT_ID);
        if (!root) return;
        root.textContent = '';
        var projectName = (typeof Project !== 'undefined' && Project) ? Project.name : '';
        var state = {
            model: sanitizeId(projectName),
            namespace: settings.namespace,
            sourceRoot: (projectName && settings.sourceRoots[projectName]) || settings.sourceRoot || '',
            // The escape hatch this panel never had (TODO.md 1.9): the game's port, per project,
            // remembered like the source root beside it. A person at the keyboard has no `GAME`.
            bridge: (projectName && settings.bridges[projectName]) || settings.bridge || ''
        };

        function field(label, key, hint) {
            var row = document.createElement('div');
            row.className = 'mte-row';
            var l = document.createElement('label');
            l.textContent = label;
            var input = document.createElement('input');
            input.value = state[key];
            input.title = hint || '';
            input.addEventListener('input', function () { state[key] = input.value; });
            row.appendChild(l);
            row.appendChild(input);
            root.appendChild(row);
        }

        var head = document.createElement('div');
        head.className = 'mte-row';
        head.textContent = projectName
            ? 'Project: ' + projectName
            : 'No project open — open the model you want to push.';
        root.appendChild(head);

        field('Model id', 'model', 'assets/<namespace>/preview/<id>.json');
        field('Namespace', 'namespace', 'staging needs "mcptoolkit"; anything else is a promotion');
        field('Source root', 'sourceRoot', 'this project\'s src/main/resources, for Promote');
        // The field the panel MODELLED and never rendered (section 13): a person at the keyboard
        // has no GAME to hand over, and was being told to pass one inside risky_eval, which they
        // cannot do. Saved per project on the next Push, like the source root beside it.
        field('Game bridge', 'bridge', 'http://127.0.0.1:<port> of the game this project drives (`ping` in the agent session says which); remembered per project');

        var out = document.createElement('pre');
        out.textContent = lastReport ? lastReport.text : 'No verify run yet.';

        function run(opts, describe) {
            out.textContent = describe + '…';
            saveSettings({
                namespace: state.namespace,
                sourceRoots: Object.assign({}, settings.sourceRoots,
                    projectName && state.sourceRoot
                        ? (function () { var m = {}; m[projectName] = state.sourceRoot; return m; })()
                        : {}),
                bridges: Object.assign({}, settings.bridges,
                    projectName && state.bridge
                        ? (function () { var m = {}; m[projectName] = state.bridge; return m; })()
                        : {})
            });
            headless(Object.assign({ model: state.model, namespace: state.namespace,
                sourceRoot: state.sourceRoot || undefined,
                bridge: state.bridge || undefined,
                // The panel is a person clicking in THIS window, so the active project is the one
                // they mean - and it goes down as an object, so nothing below resolves a name.
                project: (typeof Project !== 'undefined' && Project) ? Project : undefined },
                opts)).then(function (r) {
                out.textContent = r.text || JSON.stringify(r, null, 2);
                if (r.ok === false) {
                    Blockbench.showQuickMessage(describe + ' failed', 2000);
                } else if (r.parse === 'error') {
                    Blockbench.showQuickMessage('Pushed, but the client could not parse it', 3000);
                } else {
                    Blockbench.showQuickMessage(describe + ' ok', 1500);
                }
            });
        }

        var buttons = document.createElement('div');
        buttons.className = 'mte-buttons';
        [
            ['Push & Stage', function () { run({ action: 'push' }, 'Push'); }],
            ['Verify', function () { run({ action: 'verify' }, 'Verify'); }],
            ['Promote to source', function () { run({ action: 'promote' }, 'Promote'); }],
            ['Clear stages', function () { run({ action: 'clear' }, 'Clear'); }]
        ].forEach(function (pair) {
            var b = document.createElement('button');
            b.textContent = pair[0];
            b.addEventListener('click', pair[1]);
            buttons.appendChild(b);
        });
        root.appendChild(buttons);

        var note = document.createElement('div');
        note.className = 'mte-row';
        note.style.opacity = '.75';
        note.textContent = 'Verify covers the rest pose in full, and every clip at each keyframe'
            + ' and the midpoints between them — where a swing passes through a torso (design'
            + ' §9.3). Sampled poses are checked for OVERLAP; coplanarity stays a rest check.';
        root.appendChild(note);
        root.appendChild(out);
    }

    function openPanel() {
        loadSettings();
        if (dialog) {
            try { dialog.close(); } catch (e) { /* already gone */ }
        }
        ensureCss();
        dialog = new Dialog({
            id: 'mcptoolkit_entity',
            title: 'MCP Toolkit: Entity \u2014 ENTITY_AUTHORING_DESIGN.md \u00a76',
            width: 820,
            lines: ['<div id="' + ROOT_ID + '"></div>'],
            buttons: ['Close'],
            singleButton: true
        });
        dialog.show();
        // The dialog's DOM exists only after show(); everything is built as real nodes rather than
        // as an HTML string, so nothing depends on how Blockbench parses `lines`.
        setTimeout(render, 0);
    }

    Plugin.register('mcptoolkit_entity', {
        title: 'MCP Toolkit: Entity',
        author: 'mattmc',
        description: 'Author entity geometry in Blockbench and judge it in the running game: one'
            + ' push converts the project to the toolkit\'s interchange format, syncs it with its'
            + ' texture, and stages a preview entity wearing it. Also runs the geometry check'
            + ' battery (overlap, coplanarity, UV, and every clip at its keyframes'
            + ' and the midpoints between them) and promotes into a mod\'s resources.'
            + ' Headless API: mcptoolkitEntity(opts).',
        icon: 'view_in_ar',
        version: '0.4.0',
        variant: 'desktop',
        onload: function () {
            globalThis.mcptoolkitEntity = headless;
            action = new Action('mcptoolkit_entity_panel', {
                name: 'MCP Toolkit Entity',
                icon: 'view_in_ar',
                description: 'Push entity geometry to the running game and verify it'
                    + ' (ENTITY_AUTHORING_DESIGN.md \u00a76)',
                click: function () { openPanel(); }
            });
            MenuBar.addAction(action, 'tools');
        },
        onunload: function () {
            delete globalThis.mcptoolkitEntity;
            delete globalThis.mcptoolkitEntityLast;
            if (dialog) { try { dialog.close(); } catch (e) { /* already gone */ } }
            var css = document.getElementById('mte-css');
            if (css) css.remove();
            if (action) action.delete();
        }
    });
})();
