# Review guide for the Fabric 26.2 port

What to look at, in the order that finds problems fastest. Design notes are in `FABRIC_PORT.md`.

## 1. Read the diff

```
git diff upstream/master --stat
git diff upstream/master -- src/main/java/com/iafenvoy/iceandfire/fabric   # all new loader code
git diff upstream/master -- src/main/java/com/iafenvoy/iceandfire/mixin    # new/changed mixins
git diff upstream/master -- src/main/java/com/iafenvoy/iceandfire/event    # NeoForge events -> Fabric
```

Hand-written files worth a careful read (everything else is mechanical import/rename changes):

| File | Why |
|---|---|
| `fabric/registry/DeferredHolder.java`, `DeferredRegister.java` | Registration order and `holder()` semantics |
| `fabric/entity/PartEntity.java`, `mixin/LevelMixin.java`, `mixin/ServerLevelMixin.java`, `mixin/*EntityCallbacksMixin.java`, `entity/MultipartPartEntity.java` | Multipart hitboxes and id reservation |
| `event/handler/ServerEvents.java`, `ClientEvents.java`, `mixin/LivingEntityMixin.java`, `mixin/client/CameraMixin.java`, `mixin/client/LivingEntityRendererMixin.java`, `mixin/ServerExplosionMixin.java` | Event mapping |
| `fabric/menu/*`, `entity/DragonBaseEntity.java` (menu provider), `item/BestiaryItem.java` | Menus with extra data |
| `fabric/IafBiomeModifiers.java` | Replaces the 18 biome modifier JSONs |
| `uranus/.../client/render/armor/FabricArmorRendererBridge.java`, `IArmorRendererBase.java` | Armor rendering |
| `recipe/DragonForgeRecipeSync.java`, `DragonForgeRecipeCache.java` | Recipe sync |
| `src/main/resources/iceandfire.accesswidener` | Converted access transformer |

## 2. Run it

```
./gradlew build --no-daemon          # jar in build/libs, bundles Uranus + Jupiter
./gradlew :runClient --no-daemon     # dev client with JEI, Jade, Mod Menu, Farmer's Delight Refabricated
./gradlew :runServer --no-daemon     # dedicated server, run-server/ (EULA already accepted)
```

Only the root tasks launch games; Uranus's run tasks are disabled. Close the other dev game first: the machine ran out of
memory with two games plus two Gradle daemons up.

The MMCP bridge is on **port 25651**. After `./gradlew toolkitInit -Pclients=all` the `.mcp.json` registration exists;
in game `/mmcp mcp` prints the address. Useful tools for this review: `screenshot_annotated`, `render`/`studio`
(armor on a body), `query_class`, `get_log`, `hotswap_class` for method-body fixes without a restart.

## 3. In-game checklist (untested so far)

Creative world, then:

- [ ] **Registries**: creative tabs (4) populated; `/summon iceandfire:fire_dragon` works; Bestiary item present.
- [ ] **Multipart hitboxes**: summon a fire dragon and grow it (`/iaf`-less: use a dragon meal or wait); hit its **tail/neck**
      with a sword, right-click a **body part** with a dragon horn/staff. F3+B should draw green boxes per part
      (`EntityHitboxDebugRendererMixin`). Repeat for hydra, sea serpent, cyclops, death worm.
- [ ] **Riding**: tame a dragon, ride it, F7 cycles camera distance (`CameraMixin`), the rider is hidden in first person and
      drawn by the dragon in third person (`LivingEntityRendererMixin`), R/G/X keys work (key mappings + control payload).
- [ ] **Menus**: open the dragon, hippogryph and hippocampus inventories (shift + right click), the dragon forge, and the
      bestiary. These carry extra data through `ExtendedBufMenuProvider`.
- [ ] **Armor**: wear a full dragon scale set and a dragonsteel set; check on an armor stand and via `studio`
      (`FabricArmorRendererBridge`). Copper/silver/deathworm/troll armor too.
- [ ] **Dragon forge recipes**: build a forge, check JEI shows the three forge tabs and the forge smelts
      (`DragonForgeRecipeSync` via Fabric recipe sync).
- [ ] **Lightning**: lightning dragon breath and dragonsteel lightning weapons draw bolts (`LevelRenderEvents.COLLECT_SUBMITS`).
- [ ] **Explosions / griefing**: dragon fire launches blocks (`ServerExplosionMixin`); griefing config respected.
- [ ] **Worldgen**: new world, locate silver/sapphire ore, fire/frost/lightning lilies, dragon roosts, cyclops caves,
      hippogryphs/amphitheres/trolls spawning (`IafBiomeModifiers`, structures).
- [ ] **Damage**: troll armor reduces projectile damage, dragon armor reduces dragon breath, full lightning dragonsteel
      negates lightning (`LivingEntityMixin#actuallyHurt`).
- [ ] **Chains**: chain a mob to a fence, remove it by right click, chain drops on death (attachments).
- [ ] **Siren**: siren charm applies the shader (`SirenShaderRenderHelper`), earplugs block it.
- [ ] **Stone statues**: gorgon petrifies a mob, statue renders, pickaxe cracks it (`AttackEntityCallback`).
- [ ] **Compat**: Jade tooltips on dragons and parts; Mod Menu opens the Jupiter config screen; Farmer's Delight recipes
      appear only with the mod present.
- [ ] **Save/load**: dragons keep stage, inventory and ownership across a relog (flat NBT layout preserved).
- [ ] **Dedicated server**: join from the client, spawn a dragon, hit a part, open its menu.

## 4. checkAssets findings (upstream leftovers, not port regressions)

`./gradlew checkAssets` reports 205 dangling references; almost all are false positives (loot-table names parsed as item
ids, unused lang keys, `c:` tags that Fabric API defines). Three look real and predate the port:

- `assets/iceandfire/models/block/dread_stone_double_slab.json` references `minecraft:block/upper_slab`, which vanilla no longer ships.
- `assets/iceandfire/models/item/copper_block.json` and `copper_ore.json` reference block models the mod does not have.
- `assets/iceandfire/models/item/pixie_jar_5.json` references texture `iceandfire:item/jar_5`, which does not exist.

## 5. Known, accepted differences

See "Behavioural differences from upstream" in `FABRIC_PORT.md` (no accessory slots, `isBabyDragon()`, Fabric recipe
sync, Fabric load conditions).
