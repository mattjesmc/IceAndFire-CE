package com.iafenvoy.iceandfire.registry;

import com.iafenvoy.iceandfire.IceAndFire;
import com.iafenvoy.iceandfire.data.component.ChainData;
import com.iafenvoy.iceandfire.data.component.MiscData;
import com.iafenvoy.iceandfire.util.attachment.IafEntityAttachment;
import net.fabricmc.fabric.api.attachment.v1.AttachmentRegistry;
import net.fabricmc.fabric.api.attachment.v1.AttachmentSyncPredicate;
import net.fabricmc.fabric.api.attachment.v1.AttachmentType;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.LivingEntity;

/**
 * Entity data attachments (Fabric data attachment API). Ticked from {@code LivingEntityMixin}.
 */
public final class IafAttachments {
    public static final AttachmentType<ChainData> CHAIN_DATA = AttachmentRegistry.<ChainData>builder()
            .initializer(ChainData::new)
            .persistent(ChainData.CODEC)
            .syncWith(ChainData.PACKET_CODEC, AttachmentSyncPredicate.all())
            .copyOnDeath()
            .buildAndRegister(IceAndFire.id("chain_data"));
    public static final AttachmentType<MiscData> MISC_DATA = AttachmentRegistry.<MiscData>builder()
            .initializer(MiscData::new)
            .persistent(MiscData.CODEC)
            .syncWith(MiscData.PACKET_CODEC, AttachmentSyncPredicate.all())
            .copyOnDeath()
            .buildAndRegister(IceAndFire.id("misc_data"));

    private IafAttachments() {
    }

    /**
     * Forces class initialization so the attachment types are registered early.
     */
    public static void init() {
    }

    /**
     * Formerly {@code EntityTickEvent.Post}; invoked at the end of {@code LivingEntity#tick} on both sides.
     */
    public static void onLivingTick(LivingEntity living) {
        tickAndSync(CHAIN_DATA, living);
        tickAndSync(MISC_DATA, living);
    }

    private static <T extends Entity, A extends IafEntityAttachment<T>> void tickAndSync(AttachmentType<A> type, T entity) {
        A attachment = entity.getAttachedOrCreate(type);
        attachment.tick(entity);
        if (attachment.isDirty()) entity.setAttached(type, attachment);
    }
}
