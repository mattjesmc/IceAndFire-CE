# Bundled library jars

Jars in this folder are picked up by the `flatDir` repository in `build.gradle`.

- `jupiter-<version>.jar` — built from https://github.com/IAFEnvoy/Jupiter (stonecutter target `26.2`,
  task `:26.2:build`). The upstream project produces a universal jar that carries both
  `fabric.mod.json` and `META-INF/neoforge.mods.toml`; the same jar runs on Fabric.
