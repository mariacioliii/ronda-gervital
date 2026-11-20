# Ronda para Android (alarma real)

Es la misma app simple (`../simple`) metida adentro de una app de Android con Capacitor,
más una alarma nativa que suena como un despertador:

- Suena fuerte y en bucle (canal de alarmas, así suena aunque el celular esté en silencio o vibración).
- Aparece a pantalla completa aunque el celular esté bloqueado.
- Funciona con la app cerrada y vuelve a programarse si se reinicia el celular.
- Se apaga sola a los 10 minutos si nadie la toca.

## Cómo se arma

GitHub la compila sola (`.github/workflows/android.yml`) cada vez que cambia `simple/` o `android-app/`,
y la publica en: https://github.com/mariacioliii/ronda-gervital/releases/download/android-latest/ronda-gervital.apk

Piezas:
- `scripts/preparar-web.mjs`: copia `simple/` a `www/` y le suma `web-extra/nativo.js`.
- `web-extra/nativo.js`: calcula las rondas con tomas pendientes de los próximos 7 días y se las pasa a Android.
- `android/app/src/main/java/uy/gervital/ronda/`: la alarma nativa (AlarmManager + servicio que suena + pantalla de alarma).

La firma (`android/app/ronda.keystore`) es solo para pruebas. Solo datos de ejemplo, nunca medicación real.
