package uy.gervital.ronda;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Después de reiniciar el celular (o actualizar la app) vuelve a programar las alarmas. */
public class ArranqueReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        Alarmas.crearCanal(ctx);
        Alarmas.reprogramar(ctx);
    }
}
