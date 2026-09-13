package com.iafenvoy.iceandfire.registry;

import com.iafenvoy.iceandfire.IceAndFire;
import com.iafenvoy.iceandfire.data.DragonColor;
import com.iafenvoy.iceandfire.data.SeaSerpentType;
import com.iafenvoy.iceandfire.data.TrollType;
import com.iafenvoy.iceandfire.particle.*;
import com.iafenvoy.iceandfire.render.block.*;
import com.iafenvoy.iceandfire.render.entity.*;
import com.iafenvoy.iceandfire.render.item.*;
import com.iafenvoy.iceandfire.render.item.armor.BasicArmorRenderer;
import com.iafenvoy.iceandfire.render.item.armor.ScaleArmorRenderer;
import com.iafenvoy.iceandfire.render.model.animator.FireDragonTabulaModelAnimator;
import com.iafenvoy.iceandfire.render.model.animator.IceDragonTabulaModelAnimator;
import com.iafenvoy.iceandfire.render.model.animator.LightningTabulaDragonAnimator;
import com.iafenvoy.iceandfire.render.model.armor.*;
import com.iafenvoy.uranus.client.model.util.TabulaModelHandlerHelper;
import com.iafenvoy.uranus.client.render.DynamicItemRenderer;
import com.iafenvoy.uranus.client.render.armor.IArmorRendererBase;
import com.iafenvoy.uranus.util.function.MemorizeSupplier;
import net.minecraft.client.renderer.blockentity.ChestRenderer;
import net.minecraft.client.renderer.entity.ThrownItemRenderer;
import net.minecraft.resources.Identifier;
import net.fabricmc.api.EnvType;
import net.fabricmc.api.Environment;
import net.fabricmc.fabric.api.client.particle.v1.ParticleProviderRegistry;
import net.fabricmc.fabric.api.client.rendering.v1.BlockEntityRendererRegistry;
import net.fabricmc.fabric.api.client.rendering.v1.EntityRendererRegistry;

@Environment(EnvType.CLIENT)
public final class IafRenderers {
    // Uranus prefixes every Tabula model lookup with models/tabula/.
    public static final Identifier FIRE_DRAGON = Identifier.fromNamespaceAndPath(IceAndFire.MOD_ID, "firedragon/firedragon_ground");
    public static final Identifier ICE_DRAGON = Identifier.fromNamespaceAndPath(IceAndFire.MOD_ID, "icedragon/icedragon_ground");
    public static final Identifier LIGHTNING_DRAGON = Identifier.fromNamespaceAndPath(IceAndFire.MOD_ID, "lightningdragon/lightningdragon_ground");
    public static final Identifier SEA_SERPENT = Identifier.fromNamespaceAndPath(IceAndFire.MOD_ID, "seaserpent/seaserpent_base");

    public static void registerEntityRenderers() {
        EntityRendererRegistry.register(IafEntities.FIRE_DRAGON.get(), x -> new DragonBaseEntityRenderer<>(x, () -> TabulaModelHandlerHelper.getModel(FIRE_DRAGON, new MemorizeSupplier<>(FireDragonTabulaModelAnimator::new))));
        EntityRendererRegistry.register(IafEntities.ICE_DRAGON.get(), manager -> new DragonBaseEntityRenderer<>(manager, () -> TabulaModelHandlerHelper.getModel(ICE_DRAGON, new MemorizeSupplier<>(IceDragonTabulaModelAnimator::new))));
        EntityRendererRegistry.register(IafEntities.LIGHTNING_DRAGON.get(), manager -> new LightningDragonEntityRenderer(manager, () -> TabulaModelHandlerHelper.getModel(LIGHTNING_DRAGON, new MemorizeSupplier<>(LightningTabulaDragonAnimator::new))));
        EntityRendererRegistry.register(IafEntities.DRAGON_EGG.get(), DragonEggEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.DRAGON_ARROW.get(), DragonArrowEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.DRAGON_SKULL.get(), DragonSkullEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.FIRE_DRAGON_CHARGE.get(), manager -> new DragonChargeEntityRenderer(manager, true));
        EntityRendererRegistry.register(IafEntities.ICE_DRAGON_CHARGE.get(), manager -> new DragonChargeEntityRenderer(manager, false));
        EntityRendererRegistry.register(IafEntities.LIGHTNING_DRAGON_CHARGE.get(), LightningDragonChargeEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.HIPPOGRYPH_EGG.get(), ThrownItemRenderer::new);
        EntityRendererRegistry.register(IafEntities.HIPPOGRYPH.get(), HippogryphEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.STONE_STATUE.get(), StoneStatueEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.GORGON.get(), GorgonEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.PIXIE.get(), PixieEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.CYCLOPS.get(), CyclopsEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.SIREN.get(), SirenEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.HIPPOCAMPUS.get(), HippocampusEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.DEATH_WORM.get(), DeathWormEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.DEATH_WORM_EGG.get(), ThrownItemRenderer::new);
        EntityRendererRegistry.register(IafEntities.COCKATRICE.get(), CockatriceEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.COCKATRICE_EGG.get(), ThrownItemRenderer::new);
        EntityRendererRegistry.register(IafEntities.STYMPHALIAN_BIRD.get(), StymphalianBirdEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.STYMPHALIAN_FEATHER.get(), StymphalianFeatherEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.STYMPHALIAN_ARROW.get(), StymphalianArrowEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.TROLL.get(), TrollEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.AMPHITHERE.get(), AmphithereEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.AMPHITHERE_ARROW.get(), AmphithereArrowEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.SEA_SERPENT.get(), SeaSerpentEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.SEA_SERPENT_BUBBLES.get(), NothingEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.SEA_SERPENT_ARROW.get(), SeaSerpentArrowEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.CHAIN_TIE.get(), ChainTieEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.PIXIE_CHARGE.get(), NothingEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.TIDE_TRIDENT.get(), TideTridentEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.MOB_SKULL.get(), MobSkullEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.DREAD_SCUTTLER.get(), DreadScuttlerEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.DREAD_GHOUL.get(), DreadGhoulEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.DREAD_BEAST.get(), DreadBeastEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.DREAD_SCUTTLER.get(), DreadScuttlerEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.DREAD_THRALL.get(), DreadThrallEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.DREAD_LICH.get(), DreadLichEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.DREAD_LICH_SKULL.get(), DreadLichSkullEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.DREAD_KNIGHT.get(), DreadKnightEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.DREAD_HORSE.get(), DreadHorseEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.HYDRA.get(), HydraEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.HYDRA_BREATH.get(), NothingEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.HYDRA_ARROW.get(), HydraArrowEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.GHOST.get(), GhostEntityRenderer::new);
        EntityRendererRegistry.register(IafEntities.GHOST_SWORD.get(), GhostSwordEntityRenderer::new);
    }

    public static void registerBlockEntityRenderers() {
        BlockEntityRendererRegistry.register(IafBlockEntities.PODIUM.get(), PodiumBlockEntityRenderer::new);
        BlockEntityRendererRegistry.register(IafBlockEntities.IAF_LECTERN.get(), LecternBlockEntityRenderer::new);
        BlockEntityRendererRegistry.register(IafBlockEntities.EGG_IN_ICE.get(), EggInIceBlockEntityRenderer::new);
        BlockEntityRendererRegistry.register(IafBlockEntities.PIXIE_HOUSE.get(), PixieHouseBlockEntityRenderer::new);
        BlockEntityRendererRegistry.register(IafBlockEntities.PIXIE_JAR.get(), JarBlockEntityRenderer::new);
        BlockEntityRendererRegistry.register(IafBlockEntities.DREAD_SPAWNER.get(), DreadSpawnerBlockEntityRenderer::new);
        BlockEntityRendererRegistry.register(IafBlockEntities.GHOST_CHEST.get(), ChestRenderer::new);
    }

    public static void registerParticleRenderers() {
        ParticleProviderRegistry.getInstance().register(IafParticles.BLOOD.get(), BloodParticle::factory);
        ParticleProviderRegistry.getInstance().register(IafParticles.DRAGON_FLAME.get(), DragonFlameParticle::factory);
        ParticleProviderRegistry.getInstance().register(IafParticles.DRAGON_FROST.get(), DragonFrostParticle::factory);
        ParticleProviderRegistry.getInstance().register(IafParticles.DREAD_TORCH.get(), DreadTorchParticle::factory);
        ParticleProviderRegistry.getInstance().register(IafParticles.GHOST_APPEARANCE.get(), GhostAppearanceParticle.factory());
        ParticleProviderRegistry.getInstance().register(IafParticles.HYDRA_BREATH.get(), HydraBreathParticle::factory);
        ParticleProviderRegistry.getInstance().register(IafParticles.PIXIE_DUST.get(), PixieDustParticle::factory);
        ParticleProviderRegistry.getInstance().register(IafParticles.SERPENT_BUBBLE.get(), SerpentBubbleParticle::factory);
        ParticleProviderRegistry.getInstance().register(IafParticles.SIREN_MUSIC.get(), SirenMusicParticle::factory);
    }

    public static void registerArmorRenderers() {
        IArmorRendererBase.register(new BasicArmorRenderer(inner -> CopperArmorModel.createMesh(ArmorMeshParts.deformation(inner), 0.0F)), IafItems.COPPER_HELMET.get(), IafItems.COPPER_CHESTPLATE.get(), IafItems.COPPER_LEGGINGS.get(), IafItems.COPPER_BOOTS.get());
        IArmorRendererBase.register(new BasicArmorRenderer(inner -> DeathWormArmorModel.createMesh(ArmorMeshParts.deformation(inner), 0.0F)), IafItems.DEATHWORM_WHITE_HELMET.get(), IafItems.DEATHWORM_WHITE_CHESTPLATE.get(), IafItems.DEATHWORM_WHITE_LEGGINGS.get(), IafItems.DEATHWORM_WHITE_BOOTS.get());
        IArmorRendererBase.register(new BasicArmorRenderer(inner -> DeathWormArmorModel.createMesh(ArmorMeshParts.deformation(inner), 0.0F)), IafItems.DEATHWORM_YELLOW_HELMET.get(), IafItems.DEATHWORM_YELLOW_CHESTPLATE.get(), IafItems.DEATHWORM_YELLOW_LEGGINGS.get(), IafItems.DEATHWORM_YELLOW_BOOTS.get());
        IArmorRendererBase.register(new BasicArmorRenderer(inner -> DeathWormArmorModel.createMesh(ArmorMeshParts.deformation(inner), 0.0F)), IafItems.DEATHWORM_RED_HELMET.get(), IafItems.DEATHWORM_RED_CHESTPLATE.get(), IafItems.DEATHWORM_RED_LEGGINGS.get(), IafItems.DEATHWORM_RED_BOOTS.get());
        IArmorRendererBase.register(new BasicArmorRenderer(inner -> DragonSteelFireArmorModel.createMesh(ArmorMeshParts.deformation(inner), 0.0F, inner)), IafItems.DRAGONSTEEL_FIRE_HELMET.get(), IafItems.DRAGONSTEEL_FIRE_CHESTPLATE.get(), IafItems.DRAGONSTEEL_FIRE_LEGGINGS.get(), IafItems.DRAGONSTEEL_FIRE_BOOTS.get());
        IArmorRendererBase.register(new BasicArmorRenderer(inner -> DragonSteelIceArmorModel.createMesh(ArmorMeshParts.deformation(inner), 0.0F, inner)), IafItems.DRAGONSTEEL_ICE_HELMET.get(), IafItems.DRAGONSTEEL_ICE_CHESTPLATE.get(), IafItems.DRAGONSTEEL_ICE_LEGGINGS.get(), IafItems.DRAGONSTEEL_ICE_BOOTS.get());
        IArmorRendererBase.register(new BasicArmorRenderer(inner -> DragonSteelLightningArmorModel.createMesh(ArmorMeshParts.deformation(inner), 0.0F, inner)), IafItems.DRAGONSTEEL_LIGHTNING_HELMET.get(), IafItems.DRAGONSTEEL_LIGHTNING_CHESTPLATE.get(), IafItems.DRAGONSTEEL_LIGHTNING_LEGGINGS.get(), IafItems.DRAGONSTEEL_LIGHTNING_BOOTS.get());
        IArmorRendererBase.register(new BasicArmorRenderer(inner -> SilverArmorModel.createMesh(ArmorMeshParts.deformation(inner), 0.0F)), IafItems.SILVER_HELMET.get(), IafItems.SILVER_CHESTPLATE.get(), IafItems.SILVER_LEGGINGS.get(), IafItems.SILVER_BOOTS.get());
        for (DragonColor armor : IafRegistries.DRAGON_COLOR)
            IArmorRendererBase.register(new ScaleArmorRenderer(), armor.helmet.get(), armor.chestplate.get(), armor.leggings.get(), armor.boots.get());
        for (SeaSerpentType seaSerpent : IafRegistries.SEA_SERPENT_TYPE)
            IArmorRendererBase.register(new BasicArmorRenderer(inner -> SeaSerpentArmorModel.createMesh(ArmorMeshParts.deformation(inner), 0.0F)), seaSerpent.helmet.get(), seaSerpent.chestplate.get(), seaSerpent.leggings.get(), seaSerpent.boots.get());
        for (TrollType troll : IafRegistries.TROLL_TYPE)
            IArmorRendererBase.register(new BasicArmorRenderer(inner -> TrollArmorModel.createMesh(ArmorMeshParts.deformation(inner), 0.0F)), troll.helmet.get(), troll.chestplate.get(), troll.leggings.get(), troll.boots.get());
    }

    public static void registerItemRenderers() {
        DynamicItemRenderer.RENDERERS.put(IafItems.DEATHWORM_GAUNTLET_RED.get(), new DeathwormGauntletRenderer());
        DynamicItemRenderer.RENDERERS.put(IafItems.DEATHWORM_GAUNTLET_YELLOW.get(), new DeathwormGauntletRenderer());
        DynamicItemRenderer.RENDERERS.put(IafItems.DEATHWORM_GAUNTLET_WHITE.get(), new DeathwormGauntletRenderer());
        DynamicItemRenderer.RENDERERS.put(IafItems.GORGON_HEAD.get(), new GorgonHeadRenderer());
        DynamicItemRenderer.RENDERERS.put(IafItems.TIDE_TRIDENT.get(), new TideTridentItemRenderer());
        DynamicItemRenderer.RENDERERS.put(IafBlocks.PIXIE_HOUSE_BIRCH.get().asItem(), new MiscItemRenderer());
        DynamicItemRenderer.RENDERERS.put(IafBlocks.PIXIE_HOUSE_OAK.get().asItem(), new MiscItemRenderer());
        DynamicItemRenderer.RENDERERS.put(IafBlocks.PIXIE_HOUSE_DARK_OAK.get().asItem(), new MiscItemRenderer());
        DynamicItemRenderer.RENDERERS.put(IafBlocks.PIXIE_HOUSE_SPRUCE.get().asItem(), new MiscItemRenderer());
        DynamicItemRenderer.RENDERERS.put(IafBlocks.PIXIE_HOUSE_MUSHROOM_RED.get().asItem(), new MiscItemRenderer());
        DynamicItemRenderer.RENDERERS.put(IafBlocks.PIXIE_HOUSE_MUSHROOM_BROWN.get().asItem(), new MiscItemRenderer());
        for (TrollType.BuiltinWeapon weapon : TrollType.BuiltinWeapon.values())
            DynamicItemRenderer.RENDERERS.put(weapon.getItem(), new TrollWeaponRenderer());
    }


    public static void registerModelPredicates() {
        // Item predicates were replaced by data-driven item model properties in 26.1.2.
        // The corresponding item model JSONs are migrated separately; this hook remains for compatibility with the client bootstrap.
    }
}
