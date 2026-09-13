# Agent session charter

The MCP Toolkit's session charter for this repository, written once by `gradlew toolkitInit`;
yours to edit. Its site of record is `docs/guides/SESSION_CHARTER.md` in the toolkit.

## The paragraph the server serves

> This MCP server is a bridge into a RUNNING Minecraft game. Nothing here is a mock: an act changes
> the live world, and `hotswap_class`, `push_data` and `push_asset` change the running game. Call
> `ping` first; it says whether a game and a world are present and which tool profile this session
> has. Every reply carries `mechanism`: `observe` is a read you can believe, `embodied` and
> `privileged` are acts you confirm with a read afterwards, `local` never touched the game. A read
> with `coverage.state` other than `complete` is partial and says why. `run_command` answers
> `ok:true` for a command that parsed, not one that did what you meant. A tool the profile hides
> refuses with `profile_hidden` and names the `tool_surface` call that widens it.

## Opening a session

1. `ping`. Read three fields: `serverRunning` (a world is loaded; server-context tools work),
   `clientPresent` (a client is attached; screens, screenshots, the camera work), `instanceId`
   (if it changes mid-session the game restarted: re-orient before acting). The `profile` block
   names what this session sees and what it costs per turn.
2. If the game is not up: `launch_game` cycles the project's own dev game and waits for the
   bridge. It runs `tools/rebuild.ps1`, which stops the running game first. Never run
   `gradlew build` or `gradlew jar` yourself while a dev game is running: the game holds the jar.
3. Read `LIVE_MODDING.md`'s decision table once. It maps what you changed to how it reaches the
   game: a method body hotswaps, a structural change rebuilds, assets and data push live,
   worldgen needs a world restart and `preview_worldgen` tells you whether it landed.

## Believing what comes back

- `mechanism: observe` is the only kind of reply that is evidence. After any act, read.
- `coverage` on a world read is the read's honesty: `read` versus `unloaded` and `unvisited`, and
  `chunks.ungenerated` means nothing has ever existed there, not that the read failed. Do not
  `forceload` for a plain read; reads page existing chunks in themselves.
- A `push_data` reply carries `validation` from the game's own codec; `dry_run:true` validates
  and writes nothing. `reload_data` and `reload_resources` return the WARN-or-worse lines logged
  during that reload as `problems`, and `get_log` reads them back later.
- `ping.last_crash` means the previous game died. `get_log {crash: "latest"}` says why, each frame
  attributed to the mod whose jar loaded it; a boot that never reached `ping` left its reason in
  `launch_game`'s log instead.
- `run_command` is the last resort, not the first. It cannot return a block id, and it answers
  `ok:true` for a command that parsed. Use `get_blocks_at` with `expect` to verify a placement,
  `query_registry` to ask whether something loaded, `roll_loot` to ask what a table drops.
- Coordinates are for reading, not arithmetic. Distance, fit, clearance and reachability come
  from the `check_*` predicates or from code you run, never from mental arithmetic over lists.

## The profile you are in

The default is `modding`: the developer surface without the embodied body. `tool_surface` widens
or narrows the list for this session and reports what it costs; every manifest entry is re-sent
on every turn, so a narrower profile is a cheaper session. A refusal of the form `profile_hidden`
is not an error to work around: it is the one-call widening, spelled out.

## Asking a human

`review_post` queues a question a person answers at the game's `/review` screen; `review_status`
reads the answer. Use it for what only a pair of eyes can settle (does this look right?), not for
what a read can (is this block there?).

## Not this

- No raw HTTP to the bridge from a shell. A raw call carries no session identity; the MCP tools
  are the session.
- No world edit without a preview when the edit is large: `place_shapes` and `set_blocks` take
  `dry_run`, and every edit returns an `undo_id`.
- No second dev game on the same port. The port names the project (`ping` reports it); a second
  project gets its own.
