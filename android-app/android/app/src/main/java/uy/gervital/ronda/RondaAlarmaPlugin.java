package uy.gervital.ronda;

import android.Manifest;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

/** Puente entre la app web y la alarma nativa. */
@CapacitorPlugin(
    name = "RondaAlarma",
    permissions = { @Permission(alias = "notificaciones", strings = { Manifest.permission.POST_NOTIFICATIONS }) }
)
public class RondaAlarmaPlugin extends Plugin {

    @PluginMethod
    public void schedule(PluginCall call) {
        JSArray lista = call.getArray("alarms", new JSArray());
        Alarmas.guardarYProgramar(getContext(), lista);
        JSObject r = new JSObject();
        r.put("programadas", lista.length());
        r.put("exactas", Alarmas.puedeExactas(getContext()));
        call.resolve(r);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (AlarmaService.sonando) AlarmaService.parar(getContext());
        call.resolve();
    }

    @PluginMethod
    public void estado(PluginCall call) {
        JSObject r = new JSObject();
        r.put("notificaciones", notifOk());
        r.put("exactas", Alarmas.puedeExactas(getContext()));
        r.put("pantallaCompleta", pantallaOk());
        r.put("sonando", AlarmaService.sonando);
        call.resolve(r);
    }

    /** Pide, de a uno, los permisos que falten para que la alarma suene con la app cerrada. */
    @PluginMethod
    public void permisos(PluginCall call) {
        if (!notifOk() && Build.VERSION.SDK_INT >= 33) {
            requestPermissionForAlias("notificaciones", call, "despuesDeNotif");
            return;
        }
        abrirAjusteQueFalte();
        call.resolve();
    }

    @com.getcapacitor.annotation.PermissionCallback
    private void despuesDeNotif(PluginCall call) {
        abrirAjusteQueFalte();
        call.resolve();
    }

    private void abrirAjusteQueFalte() {
        try {
            if (!Alarmas.puedeExactas(getContext()) && Build.VERSION.SDK_INT >= 31) {
                Intent i = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(i);
            } else if (!pantallaOk() && Build.VERSION.SDK_INT >= 34) {
                Intent i = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(i);
            }
        } catch (Exception e) { /* ajuste no disponible en este celular */ }
    }

    private boolean notifOk() {
        if (Build.VERSION.SDK_INT < 33) return true;
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean pantallaOk() {
        if (Build.VERSION.SDK_INT < 34) return true;
        NotificationManager nm = getContext().getSystemService(NotificationManager.class);
        return nm.canUseFullScreenIntent();
    }
}
