package uy.gervital.ronda;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;

/** Guarda la lista de alarmas y la programa en el sistema (AlarmManager.setAlarmClock). */
public final class Alarmas {
    static final String CANAL = "ronda-alarma";
    static final String PREFS = "ronda-alarmas";
    private Alarmas() {}

    static void crearCanal(Context ctx) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CANAL) != null) return;
        NotificationChannel ch = new NotificationChannel(CANAL, "Alarma de la ronda", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Suena en cada ronda de medicación");
        ch.setSound(null, null); // el sonido lo pone el servicio, en el canal de alarmas
        ch.enableVibration(false);
        ch.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(ch);
    }

    /** Reemplaza todas las alarmas por la lista nueva. */
    static void guardarYProgramar(Context ctx, JSONArray lista) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        cancelarTodas(ctx, p.getInt("cantidad", 0));
        p.edit().putString("lista", lista.toString()).putInt("cantidad", lista.length()).apply();
        programar(ctx, lista);
    }

    /** Vuelve a programar lo guardado (después de reiniciar el celular o actualizar la app). */
    static void reprogramar(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        try { programar(ctx, new JSONArray(p.getString("lista", "[]"))); } catch (Exception e) { /* nada guardado */ }
    }

    static boolean puedeExactas(Context ctx) {
        if (Build.VERSION.SDK_INT < 31) return true;
        return ctx.getSystemService(AlarmManager.class).canScheduleExactAlarms();
    }

    private static void programar(Context ctx, JSONArray lista) {
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        long ahora = System.currentTimeMillis();
        for (int i = 0; i < lista.length(); i++) {
            JSONObject a = lista.optJSONObject(i);
            if (a == null) continue;
            long cuando = a.optLong("at", 0);
            if (cuando <= ahora) continue;
            PendingIntent pi = disparo(ctx, i, a, PendingIntent.FLAG_UPDATE_CURRENT);
            Intent abrir = new Intent(ctx, MainActivity.class);
            PendingIntent ver = PendingIntent.getActivity(ctx, 0, abrir, PendingIntent.FLAG_IMMUTABLE);
            try {
                if (puedeExactas(ctx)) {
                    am.setAlarmClock(new AlarmManager.AlarmClockInfo(cuando, ver), pi);
                } else if (Build.VERSION.SDK_INT >= 23) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, cuando, pi);
                } else {
                    am.set(AlarmManager.RTC_WAKEUP, cuando, pi);
                }
            } catch (SecurityException e) {
                am.set(AlarmManager.RTC_WAKEUP, cuando, pi);
            }
        }
    }

    private static void cancelarTodas(Context ctx, int cantidad) {
        AlarmManager am = ctx.getSystemService(AlarmManager.class);
        for (int i = 0; i < Math.max(cantidad, 60); i++) {
            PendingIntent pi = disparo(ctx, i, null, PendingIntent.FLAG_NO_CREATE);
            if (pi != null) { am.cancel(pi); pi.cancel(); }
        }
    }

    private static PendingIntent disparo(Context ctx, int i, JSONObject a, int flag) {
        Intent it = new Intent(ctx, AlarmaReceiver.class);
        it.setAction("uy.gervital.ronda.ALARMA");
        it.setData(Uri.parse("ronda://alarma/" + i));
        if (a != null) {
            it.putExtra("title", a.optString("title", "Ronda de medicación"));
            it.putExtra("body", a.optString("body", ""));
            it.putExtra("hora", a.optString("hora", ""));
        }
        return PendingIntent.getBroadcast(ctx, 1000 + i, it, flag | PendingIntent.FLAG_IMMUTABLE);
    }
}
