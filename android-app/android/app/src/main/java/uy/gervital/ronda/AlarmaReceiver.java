package uy.gervital.ronda;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import androidx.core.content.ContextCompat;

/** Llega la hora de la ronda: arranca el servicio que hace sonar la alarma. */
public class AlarmaReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        Intent s = new Intent(ctx, AlarmaService.class);
        s.setAction(AlarmaService.SONAR);
        s.putExtras(intent);
        ContextCompat.startForegroundService(ctx, s);
    }
}
