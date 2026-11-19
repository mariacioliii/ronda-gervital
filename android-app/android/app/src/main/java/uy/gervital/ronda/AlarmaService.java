package uy.gervital.ronda;

import android.app.Notification;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/** Hace sonar la alarma en bucle (canal de alarmas: suena aunque el celular esté en silencio)
 *  hasta que alguien la apague, con un tope de 10 minutos. */
public class AlarmaService extends Service {
    static final String SONAR = "uy.gervital.ronda.SONAR";
    static final String PARAR = "uy.gervital.ronda.PARAR";
    static final int NOTIF = 4242;
    static final long TOPE_MS = 10 * 60 * 1000;
    static volatile boolean sonando = false;
    static volatile String tituloActual = "", textoActual = "";

    private MediaPlayer player;
    private Vibrator vibrator;
    private PowerManager.WakeLock wake;
    private int volumenAntes = -1;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override public IBinder onBind(Intent intent) { return null; }

    static void parar(Context ctx) {
        Intent s = new Intent(ctx, AlarmaService.class);
        s.setAction(PARAR);
        try { ctx.startService(s); } catch (Exception e) { ctx.stopService(new Intent(ctx, AlarmaService.class)); }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || PARAR.equals(intent.getAction())) {
            terminar();
            return START_NOT_STICKY;
        }
        Alarmas.crearCanal(this);
        tituloActual = intent.getStringExtra("title") != null ? intent.getStringExtra("title") : "Ronda de medicación";
        textoActual = intent.getStringExtra("body") != null ? intent.getStringExtra("body") : "";

        Intent pantalla = new Intent(this, AlarmaActivity.class);
        pantalla.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
        PendingIntent full = PendingIntent.getActivity(this, 1, pantalla, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Intent apagar = new Intent(this, AlarmaService.class).setAction(PARAR);
        PendingIntent pApagar = PendingIntent.getService(this, 2, apagar, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification n = new NotificationCompat.Builder(this, Alarmas.CANAL)
            .setSmallIcon(R.drawable.ic_stat_ronda)
            .setColor(0xFF86428F)
            .setContentTitle(tituloActual)
            .setContentText(textoActual)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(textoActual))
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setContentIntent(full)
            .setFullScreenIntent(full, true)
            .addAction(0, "Apagar", pApagar)
            .build();

        int tipo = Build.VERSION.SDK_INT >= 29 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0;
        ServiceCompat.startForeground(this, NOTIF, n, tipo);
        sonar();
        // Si la pantalla está apagada, intentamos abrir la alarma directo (además del full-screen intent)
        try { startActivity(pantalla); } catch (Exception e) { /* Android puede no dejar; queda la notificación */ }
        handler.removeCallbacksAndMessages(null);
        handler.postDelayed(this::terminar, TOPE_MS);
        return START_NOT_STICKY;
    }

    private void sonar() {
        pararSonido();
        sonando = true;
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        wake = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ronda:alarma");
        wake.acquire(TOPE_MS + 5000);

        AudioManager am = (AudioManager) getSystemService(AUDIO_SERVICE);
        try {
            int max = am.getStreamMaxVolume(AudioManager.STREAM_ALARM);
            volumenAntes = am.getStreamVolume(AudioManager.STREAM_ALARM);
            int objetivo = Math.max(volumenAntes, Math.round(max * 0.9f));
            am.setStreamVolume(AudioManager.STREAM_ALARM, objetivo, 0);
        } catch (Exception e) { volumenAntes = -1; }

        Uri tono = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.ronda_alarma);
        player = new MediaPlayer();
        try {
            player.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());
            player.setDataSource(this, tono);
            player.setLooping(true);
            player.prepare();
            player.start();
        } catch (Exception e) {
            try {
                player.reset();
                player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build());
                Uri sistema = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (sistema == null) sistema = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                player.setDataSource(this, sistema);
                player.setLooping(true);
                player.prepare();
                player.start();
            } catch (Exception e2) { /* sin sonido: queda la vibración y la pantalla */ }
        }

        vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
        long[] patron = {0, 700, 500, 700, 1200};
        try {
            if (vibrator != null && vibrator.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= 26) {
                    AudioAttributes aa = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build();
                    vibrator.vibrate(VibrationEffect.createWaveform(patron, 0), aa);
                } else {
                    vibrator.vibrate(patron, 0);
                }
            }
        } catch (Exception e) { /* sin vibración */ }
    }

    private void pararSonido() {
        if (player != null) { try { player.stop(); } catch (Exception e) {} player.release(); player = null; }
        if (vibrator != null) { try { vibrator.cancel(); } catch (Exception e) {} vibrator = null; }
        if (volumenAntes >= 0) {
            try { ((AudioManager) getSystemService(AUDIO_SERVICE)).setStreamVolume(AudioManager.STREAM_ALARM, volumenAntes, 0); } catch (Exception e) {}
            volumenAntes = -1;
        }
        if (wake != null && wake.isHeld()) wake.release();
        wake = null;
        sonando = false;
    }

    private void terminar() {
        handler.removeCallbacksAndMessages(null);
        pararSonido();
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        stopSelf();
        AlarmaActivity.cerrarSiAbierta();
    }

    @Override public void onDestroy() { pararSonido(); super.onDestroy(); }
}
