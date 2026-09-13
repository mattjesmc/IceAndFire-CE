package com.iafenvoy.uranus;

import com.iafenvoy.uranus.network.NetworkHandler;
import com.iafenvoy.uranus.util.Timeout;
import com.mojang.logging.LogUtils;
import org.slf4j.Logger;

public final class Uranus {
    public static final String MOD_ID = "uranus";
    public static final Logger LOGGER = LogUtils.getLogger();

    private Uranus() {
    }

    /**
     * Common (both sides) initialization, invoked from the loader entrypoint.
     */
    public static void init() {
        NetworkHandler.registerPayloads();
        Timeout.init();
    }
}
