package uy.gervital.ronda;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RondaAlarmaPlugin.class);
        super.onCreate(savedInstanceState);
        Alarmas.crearCanal(this);
    }
}
