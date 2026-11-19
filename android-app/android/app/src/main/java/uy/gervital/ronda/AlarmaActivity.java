package uy.gervital.ronda;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.lang.ref.WeakReference;

/** Pantalla completa de la alarma: aparece aunque el celular esté bloqueado. */
public class AlarmaActivity extends Activity {
    private static WeakReference<AlarmaActivity> abierta = new WeakReference<>(null);

    static void cerrarSiAbierta() {
        AlarmaActivity a = abierta.get();
        if (a != null) a.runOnUiThread(a::finish);
    }

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        abierta = new WeakReference<>(this);
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = getSystemService(KeyguardManager.class);
            if (km != null) km.requestDismissKeyguard(this, null);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        armar();
        if (!AlarmaService.sonando) finish();
    }

    private int dp(int v) { return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics()); }

    private void armar() {
        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setGravity(Gravity.CENTER);
        col.setBackgroundColor(Color.parseColor("#86428F"));
        col.setPadding(dp(28), dp(48), dp(28), dp(48));

        TextView k = new TextView(this);
        k.setText("RONDA DE MEDICACIÓN");
        k.setTextColor(Color.parseColor("#F3E3F5"));
        k.setTextSize(16);
        k.setLetterSpacing(0.12f);
        k.setGravity(Gravity.CENTER);

        TextView t = new TextView(this);
        t.setText(AlarmaService.tituloActual);
        t.setTextColor(Color.WHITE);
        t.setTextSize(40);
        t.setTypeface(Typeface.DEFAULT_BOLD);
        t.setGravity(Gravity.CENTER);
        t.setPadding(0, dp(18), 0, dp(14));

        TextView c = new TextView(this);
        c.setText(AlarmaService.textoActual);
        c.setTextColor(Color.WHITE);
        c.setTextSize(22);
        c.setGravity(Gravity.CENTER);
        c.setPadding(0, 0, 0, dp(48));

        Button ver = boton("Ver la ronda", Color.WHITE, Color.parseColor("#4A1F52"));
        ver.setOnClickListener(v -> {
            AlarmaService.parar(this);
            Intent it = new Intent(this, MainActivity.class);
            it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(it);
            finish();
        });
        Button apagar = boton("Apagar alarma", Color.TRANSPARENT, Color.WHITE);
        apagar.setOnClickListener(v -> { AlarmaService.parar(this); finish(); });

        col.addView(k);
        col.addView(t);
        col.addView(c);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(68));
        lp.bottomMargin = dp(14);
        col.addView(ver, lp);
        col.addView(apagar, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(68)));
        setContentView(col);
    }

    private Button boton(String texto, int fondo, int letra) {
        Button b = new Button(this);
        b.setText(texto);
        b.setAllCaps(false);
        b.setTextSize(22);
        b.setTextColor(letra);
        GradientDrawable g = new GradientDrawable();
        g.setColor(fondo);
        g.setCornerRadius(dp(34));
        if (fondo == Color.TRANSPARENT) g.setStroke(dp(2), Color.WHITE);
        b.setBackground(g);
        return b;
    }

    @Override
    public void onBackPressed() { /* no se cierra con "atrás": hay que apagarla */ }

    @Override
    protected void onDestroy() {
        if (abierta.get() == this) abierta = new WeakReference<>(null);
        super.onDestroy();
    }
}
