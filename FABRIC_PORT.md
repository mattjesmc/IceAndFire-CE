# Fabric 26.2 port notes

This fork ports Ice and Fire: Community Edition to **Fabric on Minecraft 26.2**. Upstream
(IAFEnvoy/IceAndFire-CE) is NeoForge-only since 1.21.1+ and does not plan Fabric builds, so this
lives as a separate fork on the `fabric-26.2` branch. Upstream master targets Minecraft 26.1.2, so
the port also carries the vanilla 26.1.2 → 26.2 changes.

## Toolchain

| Piece | Version |
|---|---|
| Minecraft | 26.2 (unobfuscated, Mojang names everywhere, no remapping) |
| Fabric Loader / API | 0.19.5 / 0.160.0+26.2 |
| Loom / Gradle / Java | 1.17.20 / 9.5.1 / 25 |

`./gradlew build` produces `build/libs/iceandfire-<version>.jar`; `./gradlew runClient` starts a dev
client with JEI and Mod Menu on the classpath.

## Bundled libraries

- **Uranus** (IAFEnvoy's animation/model library) has no Fabric build past 1.21.1. `uranus/` is a
  Fabric fork of Uranus 3.0-alpha.1 built as a Gradle subproject and bundled jar-in-jar.
- **Jupiter** (config library) builds a universal jar (Fabric + NeoForge) from IAFEnvoy/Jupiter,
  stonecutter target `26.2`. The jar lives in `libs/` and is bundled jar-in-jar (see `libs/README.md`).

## How loader-specific code is organised

Upstream's file layout is kept so `git merge upstream/master` stays feasible. Everything Fabric-specific
is under `com.iafenvoy.iceandfire.fabric`:

| Package / class | Replaces |
|---|---|
| `fabric.registry.DeferredRegister/DeferredHolder/DeferredItem/DeferredBlock` | NeoForge deferred registration. Entries are pushed into the vanilla registries in `IceAndFire.init()` in dependency order. Vanilla's `Holder` is sealed in 26.2, so use `holder()` where a `Holder` is needed. |
| `fabric.entity.PartEntity` + `MultipartEntity` + `LevelMixin`, `ServerLevelMixin`, `*EntityCallbacksMixin` | NeoForge multipart entities (`PartEntity`, `Entity#getParts`, level part tracking, `getEntityOrPart`). |
| `fabric.event.IafEventBus` | `NeoForge.EVENT_BUS` for the mod's own cancellable events. |
| `fabric.network.PacketDistributor`, `ClientPacketDistributor`, `IPayloadContext`, `ClientReceivers` | NeoForge networking helpers on top of Fabric networking. |
| `fabric.menu.IMenuTypeExtension`, `ExtendedBufMenuProvider` | Menus that receive a byte buffer on the client (`IMenuTypeExtension`, `writeClientSideData`). |
| `fabric.IafBiomeModifiers` | `data/iceandfire/neoforge/biome_modifier/*.json` (features, ores and mob spawns per biome tag). |
| `fabric.ServerLifecycleHooks`, `fabric.VanillaCompat` | Server access without a level; removed vanilla helpers. |
| `event.handler.ServerEvents` / `ClientEvents` | NeoForge event subscribers mapped onto Fabric API events; damage scaling, camera distance, player-render skipping and explosion block launching are mixins (`LivingEntityMixin`, `CameraMixin`, `LivingEntityRendererMixin`, `ServerExplosionMixin`). |
| `iceandfire.accesswidener` | The NeoForge access transformer, converted (entries whose targets no longer exist in 26.2 were dropped). |

Client-only registration (renderers, screens, key mappings, particles, built-in resource pack) happens
in `IceAndFireClient.init()`; `IafRenderers` is annotated client-only.

## Behavioural differences from upstream

- **Accessory mods**: Curios is NeoForge-only and Trinkets/Accessories have no 26.2 builds, so the
  Curios integration is excluded (the items still work from the inventory). EMI, Ponder, ProjectE and
  Ars Nouveau integrations are excluded like upstream.
- **Dragons and `isBaby()`**: vanilla made `AgeableMob#isBaby()` final and age-based; the dragons' stage-based
  check is now `DragonBaseEntity#isBabyDragon()`.
- **Recipe sync**: the dragon forge recipe cache uses Fabric's recipe synchronization instead of NeoForge's.
- **Farmer's Delight recipes** use `fabric:load_conditions` instead of `neoforge:conditions`.
- **Vanilla 26.2 data changes**: the dreadwood tree features gained the now-mandatory `below_trunk_provider`, and
  advancement entity predicates use the `minecraft:entity_type` sub-predicate instead of `type`.
- **Dragon variant fallback**: a dragon loaded without a valid `Variant` (e.g. `/summon` with NBT, which skips
  `finalizeSpawn`) falls back to the first colour of its type instead of crashing the client renderer.
- **Multipart entity ids** are reserved through `Level#getNextEntityId()` (the static counter on `Entity` is gone).
- **Entity data** is stored in the same flat layout as upstream (`ValueOutput#store(MapCodec, tag)`), so saves keep
  the same keys.
- The unregistered upstream `LevelRendererMixin` and the unused `ChainRenderer`, `CockatriceBeamRenderer` and
  `FrozenStateRenderer` helpers were removed.

## Live development

The sibling MMCP workbench (`mattjesmc/MMCP`) can attach to the dev client for hot-swapping and screenshots; apply its
`com.mattmc.mcmod` convention plugin after Loom in `build.gradle` and set `mcmod.port` in `gradle.properties`.
