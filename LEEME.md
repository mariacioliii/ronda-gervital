# Ronda · registro de medicación de Gervital

Ronda es la app con la que el equipo de Gervital da y registra la medicación del centro de día.
Cuando llega cada ronda, suena una alarma. Cada persona del equipo entra con su PIN, marca "Se la di" en cada medicamento, y queda guardado quién lo dio y a qué hora.

## Qué hace

- **Hoy:** la ronda que toca ahora, con las personas y su medicación. Muestra las tomas que quedaron de rondas anteriores, quién es la responsable del día y quién no vino.
- **Alarmas por ronda:** las rondas salen solas de los horarios que se cargan en cada persona. Una alarma suena al llegar la ronda y otra más insistente si quedan tomas atrasadas.
- **Semana:** quién toma medicación cada día y a qué hora.
- **Personas:** una ficha breve de cada persona (alergias, qué tener en cuenta, contacto de referencia y medicación). Se pueden editar, agregar y dar de baja.
- **Historial:** cada toma con su estado, quién la dio, la hora real y las correcciones. Se puede filtrar y descargar en CSV, que se abre en Excel.
- **Equipo:** quién puede ingresar, la responsable habitual y quién administra la app.
- **Datos:** se pueden importar desde la planilla actual (CSV), hacer copias de seguridad y restaurarlas.

## Dónde se guardan los datos

Todo queda guardado **en el dispositivo** donde se usa la app (en el almacenamiento del navegador) y no se borra al cerrarla. La app funciona sin internet.

Los datos **no se comparten solos** entre dispositivos. Para pasarlos de uno a otro, o para no perderlos:
Más opciones → Hacer copia de seguridad, y en el otro dispositivo, Más opciones → Restaurar una copia.

Recomendación: usar un solo dispositivo principal (la PC o la tablet del centro) y hacer una copia por semana.

## Cómo usarla

### Opción 1: abrirla en la PC sin instalar nada
Abrí el archivo `ronda-gervital.html` con Chrome o Edge (doble clic). Funciona sin internet y guarda los datos en esa PC. Usá siempre el mismo archivo y en la misma ubicación: si lo movés, el navegador lo toma como otra app y no ve los datos.

### Opción 2: instalarla como app en celular y PC
Para instalarla hay que publicar la carpeta `app` en una dirección web segura (https). Algunas opciones gratuitas:

- **Netlify Drop** (app.netlify.com/drop): arrastrás la carpeta `app` y te da una dirección.
- **GitHub Pages:** subís la carpeta a un repositorio y activás Pages.

Después abrís esa dirección y la instalás:
- **Android (Chrome):** menú ⋮ → "Instalar app".
- **iPhone (Safari):** botón Compartir → "Agregar a inicio".
- **PC (Chrome o Edge):** ícono de instalar a la derecha de la barra de direcciones.

Queda con su ícono, se abre a pantalla completa y funciona sin internet.

## Alarmas: lo que hay que saber

- La alarma suena **mientras la app está abierta**. Dejala abierta en la PC o tablet del centro, con el volumen alto.
- El navegador solo permite sonido después de tocar la pantalla. Al ingresar con el PIN ya queda activado.
- En Más opciones → Alarmas y tiempos se pueden activar los avisos del sistema, que aparecen aunque estés en otra ventana.
- Los tiempos se pueden ajustar: a los 30 minutos la toma se marca como atrasada y a las 2 horas queda "sin registrar". Conviene validarlos con enfermería.

## Primer uso

1. Quien administra la app pone su nombre y un PIN.
2. Elige si empieza con datos de ejemplo, desde la planilla o sin datos.
3. En Equipo suma a cada persona con un PIN inicial. La primera vez que entra, la app le pide que elija su propio PIN.
4. En Personas carga a cada persona con los días que viene y su medicación con horarios.

Para borrar los datos de ejemplo: Más opciones → Alarmas y tiempos → Borrar todos los datos.

## Planilla para importar

Un CSV con una fila por medicamento y estas columnas, en cualquier orden:

| Nombre | Medicamento | Dosis | Horario | Días | Indicación |
|---|---|---|---|---|---|
| Elena Rodríguez | Losartán | 50 mg | 9:00 | lun mié vie | Con el desayuno |
| Elena Rodríguez | Metformina | 850 mg | 9:00 y 13:00 | lun mié vie | Con comida |

Desde Excel o Google Sheets: Archivo → Descargar / Guardar como → CSV. En la pantalla de importar también hay una planilla modelo.

## Archivos

- `index.html`, `css/`, `js/`, `fonts/`, `icons/`, `img/`, `manifest.webmanifest`, `sw.js`: la app instalable.
- `ronda-gervital.html`: la misma app en un solo archivo, para abrir directo en la PC.

Código: HTML, CSS y JavaScript sin dependencias externas. Los datos se guardan en IndexedDB. Tipografías Lexend y Comfortaa (licencia SIL Open Font), incluidas.

## Lo que queda para la versión con servidor

- Que los datos se compartan solos entre celular y PC.
- Que las alarmas lleguen al celular aunque la app esté cerrada (notificaciones push).
- Respaldo automático en la nube.
