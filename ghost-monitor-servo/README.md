# GHOST Monitor Servo — versión experimental independiente

**URL:** https://ghost-comunicador.vercel.app/ghost-monitor-servo/

Copia del monitor de escritorio `ghost-monitor-modelos`, con una salida opcional hacia un **segundo puerto USB** para Arduino UNO y servo SG90. Los archivos anteriores, GHOST Mobile y GHOST Rostro no se modifican. La interfaz y las tres etapas conservan su lógica. Las preferencias de esta copia se guardan con claves propias: puede leer las anteriores al primer uso, sin sobrescribirlas.

## Montaje y programa Arduino

1. Cargar en el UNO un receptor de bytes **L/C/R a 115200 baudios**. Si no dispone de uno, se incluye `arduino/ghost_servo/ghost_servo.ino` como referencia (biblioteca Servo de Arduino, pin de señal D9, posición inicial 90°). No sustituir ni modificar el firmware del STM32.
2. Servo SG90: señal al **D9** del UNO, positivo a una fuente regulada **5 V** adecuada para el servo, y negativo a GND de la fuente. Unir ese GND con **GND del Arduino**. Verificar los colores/pines del servo concreto. La alimentación del servo es independiente; no conectar su positivo a 3,3 V. El Arduino puede alimentarse por su USB. No conectar la fuente externa del servo al pin 5 V del UNO mientras está por USB.
3. Conectar por USB tanto STM32 como UNO al computador. Cerrar MATLAB si ocupa el STM32 y el monitor serial/plotter del IDE Arduino si ocupa el UNO. Compilar/cargar desde el IDE antes de abrir el puerto en la web.

El programa de referencia recibe caracteres individuales, ignora otros bytes y no requiere saltos de línea:

| Estado reconocido del monitor | Byte | Ángulo solicitado |
| --- | --- | --- |
| Izquierdo / clic izquierdo | `L` | 45° |
| Reposo | `C` | 90° |
| Derecho / clic derecho | `R` | 135° |

## Iniciar y detener

- Chrome o Edge de escritorio, HTTPS, permiso Web Serial. Ctrl + Alt + M abre configuración; elegir **Monitor STM32**.
- Detener demo para usar señal real, **Conectar STM32**, y seleccionar su puerto CDC.
- En el panel **Servo SG90 · Arduino UNO**, pulsar **Conectar servo** y seleccionar manualmente el puerto del UNO en el diálogo del navegador. No se fija COM ni `/dev/ttyACM0`. El navegador/OS debe disponer de un controlador compatible para la placa o conversor USB.
- La web espera **2 segundos** por el reinicio habitual del UNO, después envía el estado vigente reconocido por el monitor y comienza a seguir sus cambios. Si todavía no hay un estado válido, espera; no inventa uno. Comprobar el mensaje de conexión y el último byte enviado; esto no es confirmación mecánica de posición.
- **Desconectar servo** cancela las transiciones pendientes, intenta enviar `C`, libera la escritura y cierra solo ese puerto. El STM32 continúa conectado. No se corta la alimentación del motor: puede permanecer sosteniendo 90°. Desconectar físicamente su alimentación es distinto de cerrar el puerto.
- El servo funciona en observación y configuración, sin necesidad de habilitar «Usar la señal STM32 para comunicar en GHOST». Ese checkbox sigue controlando exclusivamente las acciones de comunicación de GHOST.
- Con **modo demo** activo, el servo conectado sigue los estados simulados. La demo sigue sin generar clics dentro de GHOST. No hay conexión automática al Arduino al abrir la página ni al restaurar preferencias.

## Qué estado se reutiliza

`monitor.mjs` calcula una única vez `recognizedState` en la actualización de su interfaz (~15 Hz), con el mismo `stateOf` que ya mostraba la etiqueta del monitor. Ese mismo resultado se entrega a `ServoLink.observe`; el controlador del servo **no recibe ADC**, no conoce umbrales y no ejecuta otro reconocimiento. La frecuencia de envío sigue los cambios visibles del monitor, no cada una de las 500 muestras/s. Transiciones más breves que una actualización visual pueden no verse ni transmitirse al servo.

Se conserva el significado previo: ADC alto = izquierdo; ADC bajo = derecho; ambos umbrales exactos pertenecen a reposo. El ojo ilustrado representa amplitud y no define los nombres izquierda/derecha del servo.

`protocol.mjs`, los detectores de estabilidad/clic, decodificación, muestras, umbrales y su edición son los originales. La salida del servo no usa el detector de clic: debe reproducir también reposo y las transiciones de estado que muestra el monitor, incluso cuando GHOST está en configuración o solo observando. No añade filtros ni reclasifica la señal.

## Fallos y aislamiento

- Solo se envía un byte por transición observada; sostener un estado no repite comandos. La conexión inicial y el intento de centrado al desconectar son envíos explícitos adicionales.
- Sin muestras recientes (>1 s), sin conexión STM32 (fuera de demo), o tras un paquete inválido, se suspende el envío. Esos casos **no se convierten en C**: el monitor no los interpreta como reposo. El SG90 puede conservar la última posición. Un pico que el monitor aún clasifique como izquierdo/derecho conserva esa clasificación; no se inventa un estado de ruido ni un filtro.
- Una cola serial ordena transiciones sin bloquear el hilo de GHOST. Las escrituras tienen límite de espera; si falla una escritura, el Arduino se desconecta o la cola se atasca, se detiene únicamente el enlace del servo y se informa en su panel. No se cierra el puerto STM32 ni se modifica el barrido o la voz.
- El registro de puertos impide seleccionar para un dispositivo el puerto abierto/reservado por el otro, incluso durante conexión. No se cierra el puerto rechazado. Los permisos del navegador/OS también impiden compartir un puerto entre páginas/programas.
- Desconexión física abrupta: no se garantiza enviar `C`. No existe confirmación de recepción/posición en este protocolo. Hay que pulsar conectar para reanudar; no hay reconexión automática.
- Al abandonar la página se intenta cerrar/centrar, pero los navegadores no garantizan completar operaciones asíncronas durante cierre o bloqueo. Para terminar de forma normal, usar **Desconectar servo** antes de cerrar la pestaña.

## Verificación

Pruebas ejecutadas con puertos Web Serial simulados en Node y Chromium: secuencia exacta L/C/R y ausencia de repetición, envío del estado actual al terminar el arranque, rechazo de puerto compartido, doble conexión, cancelación del selector, desconexión durante apertura/arranque, pérdida USB, errores y tiempo agotado de escritura, paquete inválido sin falso C y centrado antes del cierre normal. En navegador se comprobó que el lector STM32, selección y solicitud de síntesis de voz siguen funcionando al fallar el servo; la síntesis se capturó con un sustituto de prueba, no audio audible.

**Pendiente con hardware físico:** compilación/carga del sketch en Arduino IDE (no hay toolchain Arduino en este entorno), controlador USB del UNO, reset real, alimentación, posición/sentido mecánicos del SG90, simultaneidad con el STM32 real, desconexiones físicas y voz audible. No se han conectado placas ni un servo a este entorno. Ajustar la espera de arranque solo si las pruebas del UNO real lo requieren.

La guía pública `guia-servo.html` contiene estas instrucciones de conexión. No se añadió la función a Mobile ni a las versiones anteriores.
