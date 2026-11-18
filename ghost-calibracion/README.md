# GHOST Calibración — copia experimental independiente

URL: https://ghost-comunicador.vercel.app/ghost-calibracion/

Copia de la versión Full Demo, con ajustes fáciles, ajustes técnicos, voces, etapas, espejo y SuperSpeed. Los archivos de Full Demo y todas las versiones previas permanecen intactos. Se añaden dos pruebas: interpretación personalizada de pequeñas variaciones ADC y recorrido sutil del servo (±15° alrededor de 90°). No se modifica el firmware, protocolo ni adquisición del STM32.

## Calibrar y guardar con Set

1. Abrir en Chrome o Edge de escritorio, HTTPS. Ctrl + Alt + M (o ⚙ Ajustes fáciles) → conectar STM32. Para capturar es obligatorio recibir datos reales; no se aceptan capturas de la demo ni de Full Demo. La conexión del ojo es opcional para calibrar.
2. Pulsar **Calibración personal → Calibrar a la persona**. También está al principio del monitor en ajustes técnicos (Ctrl + Alt + T → Monitor STM32).
3. Pulsar Nueva persona, escribir un nombre y capturar **reposo**, **izquierda** y **derecha**. Cada captura dura tres segundos; se omiten los primeros 400 ms para permitir acomodarse. En reposo, adoptar la posición cómoda con pequeñas fluctuaciones naturales. Para cada lado, mantener el pequeño movimiento de activación durante la captura.
4. Pulsar **Set · guardar y aplicar**. Solo entonces se crea/aplica la nueva calibración. Se guardan hasta 20 perfiles, seleccionables por persona. Para actualizar uno, seleccionar el perfil, conservar su nombre, repetir las tres capturas y pulsar Set.
5. Activar «Usar la señal STM32 para comunicar en GHOST», salir de los ajustes y volver a reposo estable antes de activar. Se conservan las tres etapas y el significado de izquierda/derecha.
6. Desmarcar **Usar calibración guardada** para **No calibrar: ADC bruto del STM32**. Es el modo inicial por defecto. Al desmarcarlo se guarda esa elección y las lecturas se entregan sin transformar a los umbrales originales. El perfil no se borra y puede reactivarse después.

Los perfiles y la selección se guardan en **este navegador y este origen**, bajo una clave exclusiva de esta copia. No se escriben en STM32/Arduino ni se suben a servidores. Borrar los datos del navegador pierde esta memoria. Se almacenan resúmenes de la señal y el nombre, no las series completas. Los cambios no sobrescriben las preferencias de Full Demo; esta copia puede leerlas como valores iniciales.

Durante una captura se pausan las acciones y se solicita centro al servo. Desconexión, muestras inválidas o interrupción de la señal cancelan la captura. No se guarda una captura incompleta ni se sustituyen perfiles hasta Set. Nueva persona desactiva la calibración y vuelve al ADC bruto mientras se prepara el nuevo perfil; los perfiles ya guardados se conservan.

## Qué cambia en la señal

Se conserva siempre el **ADC bruto** y se presenta por separado del **ADC interpretado**. Al activar el perfil, solo la señal real del STM32 se transforma antes del detector existente:

- Se toma la mediana de reposo y una franja que cubre sus fluctuaciones (percentiles 2–98 más margen).
- Se comprueba que los dos movimientos quedan en lados opuestos del reposo y separados de su ruido. Se admite que el sentido eléctrico esté invertido.
- Una transformación continua por tramos mantiene ese descanso dentro de la banda de reposo del monitor y amplía las variaciones de cada lado según lo que se capturó para esa persona.
- El ADC interpretado alimenta la gráfica, los estados del servo y los detectores originales de clics. Con perfil activo, el ojo en pantalla muestra la dirección lógica calibrada; sin perfil conserva la representación de amplitud original. No se añade otro detector de acciones. Se conservan la estabilidad temporal, una acción por activación y la necesidad de volver a reposo.

Así, por ejemplo, reposo cerca de 2000 y movimientos de solo unas decenas de cuentas pueden aprovecharse aunque nunca alcancen por sí solos 1500/2500. La calibración no mide ángulos reales, no es ganancia electrónica ni puede separar una señal del ruido si son indistinguibles. Set rechaza movimientos que se mezclan con el reposo o que no permiten diferenciar ambos sentidos. Hay que validar comodidad y fiabilidad con la persona real.

**Demo y Full Demo se conservan y no pasan por el perfil personal**: sus datos son simulados y ya tienen niveles propios. El modo calibrado se aplica exclusivamente a la señal real. Las preferencias técnicas y umbrales siguen disponibles.

## Recorrido reducido del servo, sin cambiar Full Demo

La nueva web usa comandos **minúsculos** para su recorrido sutil:

| Comando | Posición solicitada del servo |
| --- | --- |
| `l` | 75° |
| `c` | 90° |
| `r` | 105° |

Es obligatorio cargar **el programa Arduino de esta carpeta**: `arduino/ghost_servo/ghost_servo.ino`. El programa antiguo no entiende `l/c/r`; cambiar de web por sí solo no cambia los ángulos de la placa. Usar Arduino IDE, seleccionar UNO y su puerto, cargar, cerrar Monitor Serial/Plotter y conectar desde la web. Señal del SG90 en D9, alimentación 5 V adecuada y GND común, como en la versión anterior. La alimentación del servo debe ser independiente y no conectar su positivo externo al pin 5 V del UNO mientras está por USB.

El nuevo programa también entiende **los comandos originales L/C/R** y mantiene sus posiciones **45°/90°/135°**, para que Full Demo siga funcionando exactamente igual con la misma placa. Solo esta copia envía las minúsculas y obtiene ±15°. El modo espejo intercambia l/r y conserva centro. La desconexión normal sigue intentando enviar C (90°, compatible con ambos modos).

No es seguimiento proporcional continuo ni medición de los grados del ojo de la persona. Los ±15° corresponden al eje del servo; el movimiento del mecanismo depende del montaje. Esta primera prueba reduce los tres estados fijos. El puerto del Arduino permanece separado del STM32 y no se conecta automáticamente.

## Pruebas y límites

Se ejecutaron pruebas de la transformación con variaciones pequeñas, reposo con ruido, sentidos eléctricos invertidos y rechazo por solapamiento; Set, persistencia y desactivación a ADC bruto; las tres capturas de tres segundos con flujo USB simulado; selección Sí/No y comandos l/r al usar el perfil; ausencia de acciones al volver a bruto con las mismas variaciones; recarga, selección de persona y aislamiento de preferencias.

El programa Arduino se verificó con un compilador C++ de escritorio y sustitutos de las APIs Servo/Serial: L/C/R conserva 45/90/135 y l/c/r usa 75/90/105. Eso **no sustituye compilar/cargar con Arduino IDE ni probar una placa física**. USB y síntesis se simularon en las pruebas del navegador. Se requieren pruebas reales de los sensores, falsos positivos, iluminación, alimentación y desplazamiento del SG90 antes de usar esta calibración con una persona. No se han conectado placas físicas a este entorno.
