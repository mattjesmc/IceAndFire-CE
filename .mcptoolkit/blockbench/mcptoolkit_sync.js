// MCP Toolkit: Push to Game — Blockbench plugin.
//
// Adds File > Push to Game: pushes the current project's textures (and optionally the compiled
// model JSON) into a running mcp-toolkit dev client via the bridge's push_asset tool, then
// hot-reloads resources so the change shows in-game in seconds.
//
// Also exposes the same push headlessly as `mcptoolkitPush(opts)` so an MCP agent (risky_eval)
// can sync without shipping asset bytes through its transcript:
//
//   mcptoolkitPush({project: PROJECT, bridge: GAME, namespace:'mymod', folder:'textures/block'})
//
// `PROJECT` and `GAME` are what `risky_eval` puts in scope (mcptoolkit_bridge.js). Pass BOTH: a
// project object cannot resolve to somebody else's tab, and a bridge URL cannot resolve to somebody
// else's game. Neither has a default here, and that is the point — see the two paragraphs below.
// AND AN EXPLICIT NULL IS REFUSED, NOT FALLEN THROUGH (BLOCKBENCH_ISOLATION_DESIGN.md section 13):
// `GAME` is null when the shim never told this window which game the session drives, and
// `PROJECT` is null when no project is open, and an agent passes them dutifully. Until 0.5.0
// `{bridge: null}` fell through to the stored URL and `{project: null}` to the active tab - the
// two resolutions the refuse-on-null rule of 0.140.0 existed to prevent - because the rule held
// for an ABSENT key only. An absent key still means "use the store / the active tab".
//
// Options (all optional except as noted):
//   bridge      the game bridge, e.g. 'http://127.0.0.1:25640' (a trailing /cmd is fine). REQUIRED
//               for target 'live'/'both'. NO built-in default: since per-project bridge ports
//               (RELEASE_1.md B0) the port NAMES the project — 25640 villagejobs, 25641 menagerie,
//               25642 rocketeer, 25643 nijntje, 25599 the toolkit's own — so the literal this file
//               used to carry sent a consumer repo's assets into whatever was on 25599, refused if
//               nothing was there and accepted SILENTLY if the toolkit's own dev game was up. Same
//               argument as `sourceRoot` below: a wrong-but-plausible default is how a file lands
//               somewhere nobody is looking, so a push with nowhere to go is refused by name.
//               Set one once instead of passing it: mcptoolkitPushSettings({bridge: '...'}) or
//               per project: mcptoolkitPushSettings({bridges: {'my_model': '...'}}).
//   project     the ModelProject OBJECT to push (`PROJECT` inside risky_eval) — selected first.
//               A project NAME is refused: resolving a name reaches a project without passing the
//               bridge's ownership check (`held_by`), which is the one route the session binding
//               cannot protect. Omitted, the active project is used and named in the summary.
//   namespace   asset namespace (the mod id under assets/). REQUIRED, like `bridge`, and for the
//               same reason: the literal 'villagejobs' this file shipped with was one mod's name,
//               so every other mod's push landed under it silently. Set once instead of passing:
//               mcptoolkitPushSettings({namespace: 'mymod'}) or per project
//               mcptoolkitPushSettings({namespaces: {'my_model': 'mymod'}}); the dialog remembers.
//   folder      texture folder under assets/<ns>/     (default 'textures/block')
//   only        array of texture names to push, '.png' optional (default: all textures)
//   model       also push the compiled model JSON     (default false)
//   modelPath   model folder under assets/<ns>/       (default 'models/block')
//   modelName   model file name, no extension         (default: project name)
//   extras      [{path, text}] extra text assets, path pack-relative
//               e.g. {path:'assets/villagejobs/blockstates/foo.json', text:'{...}'}
//   target      'live' (push to running game, default) | 'source' (write into the mod's
//               src/main/resources via fs — no game needed) | 'both'
//   sourceRoot  resources root for target 'source'/'both'. NO built-in default: set one per
//               project (keyed by Project.name) or a global fallback, and they persist:
//                 mcptoolkitPushSettings({sourceRoots: {'my_model': 'C:/mod/src/main/resources'}})
//                 mcptoolkitPushSettings({sourceRoot: 'C:/mod/src/main/resources'})
//               A push with nowhere to go is refused by name rather than writing an assets/ tree
//               into whichever checkout happened to be typed into a plugin (ENTITY_AUTHORING §6.3).
//
// Returns a Promise resolving to a compact summary {ok, pushed, target, paths} — never bytes.
// It NEVER rejects: failures resolve as {ok:false, error} (a rejected Promise returned through
// risky_eval becomes an unhandled rejection that wedges the MCP plugin's HTTP server until
// Blockbench restarts). The last summary is also stored in `mcptoolkitLastPush`, so callers
// that cannot await the Promise can fire the push and read the result in a follow-up eval.
//
// Load once via File > Plugins > Load Plugin from File. Requires the game client to be running
// with the mcp-toolkit mod, on the port `bridge` names, unless target is 'source'.
(function () {
    'use strict';

    var STORE_KEY = 'mcptoolkit_sync.settings';
    var DEFAULTS = {
        folder: 'textures/block',
        modelPath: 'models/block',
        target: 'live'
    };
    var TARGETS = ['live', 'source', 'both'];
    // Where `target:'source'` writes, per Blockbench project and with a global fallback. Stored
    // rather than hardcoded (ENTITY_AUTHORING_DESIGN.md §6.3): the literal that used to live here
    // was one machine's checkout, and `writeToSource` will create an assets/ tree wherever it is
    // pointed — so a wrong-but-plausible default is how a file lands somewhere nobody is looking.
    // ...and `bridge`/`bridges` are the same idea one dimension over (TODO.md 1.9): which GAME.
    // Deliberately EMPTY, for exactly the reason above - the hardcoded 25599 that used to sit here
    // was a plausible default that sent a consumer repo's assets into the toolkit's own dev game.
    var stored = { sourceRoot: '', sourceRoots: {}, bridge: '', bridges: {}, namespace: '', namespaces: {} };
    var MAPS = ['sourceRoots', 'bridges', 'namespaces'];
    var action;

    function loadStored() {
        try {
            var raw = localStorage.getItem(STORE_KEY);
            if (raw) Object.assign(stored, JSON.parse(raw));
        } catch (e) { /* cleared storage, or a context that throws — empty is a safe answer */ }
        MAPS.forEach(function (k) { if (!stored[k] || typeof stored[k] !== 'object') stored[k] = {}; });
        return stored;
    }

    /**
     * A patch MERGES the per-project maps rather than replacing them (section 13): a headless
     * `mcptoolkitPushSettings({bridges: {spider: ...}})` used to drop every other project's entry,
     * where the dialog had always merged. One rule for both callers.
     */
    function saveStored(patch) {
        loadStored();
        patch = patch || {};
        Object.keys(patch).forEach(function (k) {
            if (MAPS.indexOf(k) >= 0 && patch[k] && typeof patch[k] === 'object') stored[k] = Object.assign({}, stored[k], patch[k]);
            else stored[k] = patch[k];
        });
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(stored));
        } catch (e) { /* losing a setting is not worth failing a push over */ }
        return stored;
    }

    function sourceRootFor(projectName) {
        loadStored();
        var root = (projectName && stored.sourceRoots[projectName]) || stored.sourceRoot;
        if (!root) {
            throw new Error('no sourceRoot for '
                + (projectName ? 'project "' + projectName + '"' : 'this project')
                + ' — pass one, or set it once: mcptoolkitPushSettings({sourceRoots: {"'
                + (projectName || '<project>') + '": "C:/path/to/mod/src/main/resources"}})');
        }
        return root;
    }

    /**
     * WHICH PROJECT, and the one thing this function will not do: resolve a name. The bridge plugin
     * checks ownership (`held_by`) before it hands `PROJECT` to an eval; a name resolved here skips
     * that check entirely, which made this plugin the one route into a project the session binding
     * could not protect. Selecting is fine and unavoidable - Blockbench forces it on anyone touching
     * a non-active project, and the bridge selects too (ensureSelected) - so what is refused is the
     * NAME, not the switch.
     */
    function projectOf(opts) {
        var p = opts.project;
        if (p === null) {
            // PROJECT is null inside risky_eval when no project is open in the window. Falling
            // through to the active tab here would be resolving a project the caller was told
            // does not exist (section 13).
            throw new Error('project is null: PROJECT is null because no project is open in this window'
                + ' — open one first (project op:new / op:open) and pass PROJECT; omit the key only to mean the active tab');
        }
        if (p === undefined) {
            if (typeof Project === 'undefined' || !Project) throw new Error('no project is open');
            return Project;
        }
        if (typeof p === 'string') {
            throw new Error('project must be the project OBJECT, not the name "' + p + '" — inside'
                + ' risky_eval that is PROJECT: mcptoolkitPush({project: PROJECT, bridge: GAME}).'
                + ' A name is resolved without the bridge\'s ownership check, so it can reach a'
                + ' project another session holds');
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
     * WHICH GAME. No default, and no fallback to a port that merely looks right: since per-project
     * bridge ports the port names the project, so the wrong one is either a refusal or - worse -
     * somebody else's game accepting these assets without a word.
     */
    function bridgeFor(opts, projectName) {
        loadStored();
        if (opts.bridge === null) {
            // GAME is null when the shim never told this window which game the session drives (a
            // plugin driven by hand, or a session block without `game`). The stored URL is not an
            // answer to that: it is whichever game somebody typed in last (section 13).
            throw new Error('bridge is null: GAME is null because this session never told Blockbench which game it drives'
                + ' — pass the game bridge URL (`ping` says it: http://127.0.0.1:<port>), or set it once:'
                + ' mcptoolkitPushSettings({bridges: {"' + (projectName || '<project>') + '": "http://127.0.0.1:25640"}}) and omit the key');
        }
        var url = opts.bridge
            || (projectName && stored.bridges[projectName])
            || stored.bridge;
        if (!url) {
            throw new Error('no bridge for '
                + (projectName ? 'project "' + projectName + '"' : 'this push')
                + ' — inside risky_eval pass the one this session drives:'
                + ' mcptoolkitPush({project: PROJECT, bridge: GAME}), or set it once:'
                + ' mcptoolkitPushSettings({bridges: {"' + (projectName || '<project>')
                + '": "http://127.0.0.1:25640"}}). There is deliberately no default: the bridge port'
                + ' NAMES the project, so a plausible one pushes into the wrong game silently');
        }
        return String(url).replace(/\/+$/, '').replace(/\/cmd$/, '') + '/cmd';
    }

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

    function utf8ToBase64(text) {
        return btoa(unescape(encodeURIComponent(text)));
    }

    function stripPng(name) {
        return name.replace(/\.png$/, '');
    }

    /**
     * The textures and codec of THIS project rather than of whatever tab is active. Blockbench
     * keeps both on the project object; the globals `Texture.all` and `Format` are views of the
     * active one, and reading them is how a push aimed at one project could collect another's
     * pixels. `project` is always the selected one by the time this runs, so the globals are the
     * fallback for a Blockbench old enough not to carry them on the object.
     */
    function texturesOf(project) {
        return (project && Array.isArray(project.textures)) ? project.textures
            : (typeof Texture !== 'undefined' ? Texture.all : []);
    }
    function codecOf(project) {
        var format = (project && project.format) || (typeof Format !== 'undefined' ? Format : null);
        return format ? format.codec : null;
    }

    function collectPushes(project, opts) {
        var pushes = [];
        var only = opts.only ? opts.only.map(stripPng) : null;
        texturesOf(project).forEach(function (t) {
            var name = stripPng(t.name);
            if (only && only.indexOf(name) === -1) return;
            pushes.push({
                path: 'assets/' + opts.namespace + '/' + opts.folder + '/' + name + '.png',
                base64: t.canvas.toDataURL('image/png').split(',')[1]
            });
        });
        if (only) {
            var found = pushes.map(function (p) { return p.path.split('/').pop().replace('.png', ''); });
            var missing = only.filter(function (n) { return found.indexOf(n) === -1; });
            if (missing.length) throw new Error('textures not found in project: ' + missing.join(', '));
        }
        if (opts.model) {
            var codec = codecOf(project);
            if (!codec || !codec.compile) throw new Error('this project\'s format has no compilable codec');
            var modelName = opts.modelName || ((project && project.name) || 'model').replace(/\.\w+$/, '');
            pushes.push({
                path: 'assets/' + opts.namespace + '/' + opts.modelPath + '/' + modelName + '.json',
                base64: utf8ToBase64(codec.compile())
            });
        }
        (opts.extras || []).forEach(function (e) {
            if (!e.path || typeof e.text !== 'string') throw new Error('extras entries need {path, text}');
            pushes.push({ path: e.path, base64: utf8ToBase64(e.text) });
        });
        return pushes;
    }

    function writeToSource(pushes, sourceRoot) {
        // Plugins don't reliably see module-scope require; risky_eval's global one works.
        var req = (typeof require === 'function') ? require : globalThis.require;
        if (typeof req !== 'function') throw new Error('node require unavailable in this Blockbench context');
        var fs = req('fs');
        var pathMod = req('path');
        pushes.forEach(function (p) {
            var abs = pathMod.join(sourceRoot, p.path);
            fs.mkdirSync(pathMod.dirname(abs), { recursive: true });
            var bytes;
            if (typeof Buffer !== 'undefined') {
                bytes = Buffer.from(p.base64, 'base64');
            } else {
                var bin = atob(p.base64);
                bytes = new Uint8Array(bin.length);
                for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            }
            fs.writeFileSync(abs, bytes);
        });
    }

    function doPush(opts) {
        try {
            opts = Object.assign({}, DEFAULTS, opts || {});
            // `target` has three values, and an unknown one used to push NOTHING and answer
            // `ok:true, pushed:N` (section 13): 'game' was neither live nor source.
            if (TARGETS.indexOf(opts.target) < 0) {
                throw new Error('target must be one of ' + TARGETS.join(' | ') + ', not ' + JSON.stringify(opts.target));
            }
            var project = ensureSelected(projectOf(opts));
            loadStored();
            if (!opts.namespace) opts.namespace = (project.name && stored.namespaces[project.name]) || stored.namespace || '';
            if (!opts.namespace || typeof opts.namespace !== 'string') {
                throw new Error('no namespace for ' + (project.name ? 'project "' + project.name + '"' : 'this push')
                    + ' — pass the mod id whose assets/<namespace>/ these are, or set it once:'
                    + ' mcptoolkitPushSettings({namespaces: {"' + (project.name || '<project>') + '": "mymod"}}).'
                    + ' There is deliberately no default: the one this plugin shipped with was one mod\'s name');
            }
            var live = opts.target === 'live' || opts.target === 'both';
            // Resolved BEFORE a byte moves, both of them: a push that has nowhere to go must fail
            // before it has written half a model into a live pack or a source tree.
            var bridge = live ? bridgeFor(opts, project.name) : null;
            var pushes = collectPushes(project, opts);
            var summary = {
                ok: true,
                pushed: pushes.length,
                target: opts.target,
                project: project.name || null,
                bridge: bridge,
                paths: pushes.map(function (p) { return p.path; })
            };
            var chain = Promise.resolve();
            if (opts.target === 'source' || opts.target === 'both') {
                writeToSource(pushes, opts.sourceRoot || sourceRootFor(project.name));
            }
            if (live) {
                pushes.forEach(function (p) {
                    chain = chain.then(function () {
                        return call(bridge, 'push_asset', { path: p.path, base64: p.base64, reload: false });
                    });
                });
                chain = chain.then(function () { return call(bridge, 'reload_resources', {}); });
            }
            return chain.then(function () {
                globalThis.mcptoolkitLastPush = summary;
                return summary;
            }).catch(function (e) {
                // Never reject: a rejected Promise returned through risky_eval is an unhandled
                // rejection in the MCP plugin's server and wedges it until Blockbench restarts.
                var fail = { ok: false, error: String(e) };
                globalThis.mcptoolkitLastPush = fail;
                return fail;
            });
        } catch (e) {
            var fail = { ok: false, error: String(e) };
            globalThis.mcptoolkitLastPush = fail;
            return Promise.resolve(fail);
        }
    }

    function pushDialog() {
        loadStored();
        var here = (typeof Project !== 'undefined' && Project) ? Project : null;
        new Dialog({
            id: 'mcptoolkit_push',
            title: 'Push to Game',
            form: {
                // The escape hatch this plugin never had. Pre-filled from the store (per project
                // first) and REMEMBERED on confirm, so the port a person types once is the port
                // this project keeps - the menu path has no `GAME` to be handed.
                bridge: { label: 'Game bridge', type: 'text',
                    value: (here && stored.bridges[here.name]) || stored.bridge || '' },
                namespace: { label: 'Namespace', type: 'text',
                    value: (here && stored.namespaces[here.name]) || stored.namespace || '' },
                folder: { label: 'Texture folder', type: 'text', value: DEFAULTS.folder },
                model: { label: 'Also push model JSON', type: 'checkbox', value: false },
                modelPath: { label: 'Model folder', type: 'text', value: DEFAULTS.modelPath }
            },
            onConfirm: function (form) {
                if (here && here.name && (form.bridge || form.namespace)) {
                    var patch = {};
                    if (form.bridge) { patch.bridges = {}; patch.bridges[here.name] = form.bridge; }
                    if (form.namespace) { patch.namespaces = {}; patch.namespaces[here.name] = form.namespace; }
                    saveStored(patch);
                }
                // The human clicked in THIS window, so the active project is the one they mean -
                // and it is passed as an object, so nothing downstream resolves a name.
                doPush(Object.assign({}, form, { project: here })).then(function (s) {
                    if (s.ok) {
                        Blockbench.showQuickMessage('Pushed ' + s.pushed + ' asset(s) to game', 2000);
                    } else {
                        Blockbench.showMessageBox({ title: 'Push to Game failed', message: s.error });
                    }
                });
            }
        }).show();
    }

    Plugin.register('mcptoolkit_sync', {
        title: 'MCP Toolkit: Push to Game',
        author: 'mattmc',
        description: 'Push the current project textures (and optionally model JSON) into a running mcp-toolkit dev client with instant resource reload. Headless API: mcptoolkitPush(opts).',
        icon: 'sync',
        version: '0.5.0',
        variant: 'desktop',
        onload: function () {
            globalThis.mcptoolkitPush = doPush;
            globalThis.mcptoolkitPushSettings = function (patch) {
                return patch ? saveStored(patch) : loadStored();
            };
            action = new Action('mcptoolkit_push_to_game', {
                name: 'Push to Game',
                icon: 'sync',
                description: 'Push textures/model to the running game via the MCP toolkit bridge',
                click: function () { pushDialog(); }
            });
            MenuBar.addAction(action, 'file.6');
        },
        onunload: function () {
            delete globalThis.mcptoolkitPush;
            delete globalThis.mcptoolkitPushSettings;
            delete globalThis.mcptoolkitLastPush;
            if (action) action.delete();
        }
    });
})();
