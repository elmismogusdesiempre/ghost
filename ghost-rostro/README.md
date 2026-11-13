# GHOST Rostro — inclinación lateral de cabeza

URL: https://ghost-comunicador.vercel.app/ghost-rostro/

Esta carpeta incorpora una copia independiente de la interfaz de `ghost-monitor-modelos` y sustituye su entrada STM32 por una webcam y estimación local de orientación facial. No modifica los archivos de las versiones anteriores. No utiliza USB, ADC, firmware ni MATLAB. Es una prueba de control por inclinación lateral de cabeza (oreja hacia hombro); no mide la mirada ni el movimiento aislado del ojo.

## Uso

1. Abrir en Chrome o Edge de escritorio sobre HTTPS (o localhost durante desarrollo).
2. Ctrl + Alt + M abre la configuración. Ir a **Monitor facial**, pulsar **Activar cámara** y autorizar la webcam. No se solicita micrófono ni se enciende automáticamente.
3. Mirar al centro en una posición cómoda y pulsar **Calibrar centro**; permanecer estable aproximadamente 1,5 segundos. El centro se recalibra en cada sesión de cámara. Comprobar los sentidos en configuración; **Invertir sentidos** permite corregirlos.
4. Pulsar **Iniciar comunicación →** (o salir de configuración con Ctrl + Alt + M). El indicador de dirección en configuración es una prueba y no ejecuta acciones. Inclinación hacia el hombro izquierdo: seleccionar la opción del barrido. Inclinación hacia el hombro derecho: pronunciar la selección o el mensaje compuesto. Volver a la franja central antes de cada acción.
5. **Mostrar monitor y video** controla exclusivamente la presentación. Al desactivarlo, el video desaparece y la detección continúa mientras la página esté abierta, visible y activa. **Detener cámara** apaga la captura y el detector. Cambiar de pestaña, minimizar o bloquear el equipo pausa acciones; no se garantiza ejecución en segundo plano del sistema operativo.

La etapa Sí/No de esta versión también barre sus dos respuestas: izquierda selecciona la resaltada y derecha la pronuncia. En frases útiles se selecciona una frase; en construcción se acumulan palabras/letras antes de hablar. Los atajos Ctrl + Alt + 1/2/3 cambian de etapa; Ctrl + Alt + U permite ajustar los sliders con cursor visible y acciones pausadas; Ctrl + F1 muestra ayuda. La configuración vuelve automáticamente a comunicación tras 30 segundos sin interacción.

## Detección

`face-worker.mjs` ejecuta MediaPipe Face Landmarker (CPU/WebAssembly) en un trabajador de JavaScript. Se procesa como máximo aproximadamente un fotograma cada 83 ms, reducido a 512 píxeles de ancho, con una sola inferencia en curso. El rendimiento depende del equipo. La captura y la síntesis de voz mantienen las APIs del navegador.

Se estima yaw, pitch y roll desde la matriz facial 4×4. La calibración toma la mediana de una ventana estable y requiere un solo rostro suficientemente visible. La señal de control usa exclusivamente **roll** (inclinación oreja-hombro) en grados relativos al centro calibrado; yaw (girar la cara) no selecciona ni habla. Se aplica suavizado temporal de unos 100 ms. La imagen visible está en espejo; la inversión del control es independiente.

Valores iniciales: inclinación de 12°, zona central ±4°, permanencia de la inclinación 350 ms y retorno al centro 400 ms. `face-gesture.mjs` aplica estabilidad en varios fotogramas y emite una sola acción por inclinación; sostener la cabeza inclinada no repite clics. Una histéresis de hasta 2° evita que pequeñas oscilaciones junto al umbral reinicien la confirmación de la inclinación. El umbral de entrada sigue siendo el configurado. El centro es una franja real de **−neutral a +neutral** (por defecto −4° a +4°), no una línea. Solo dentro de esa franja se acumula el tiempo para rearmar; fuera de ella no se considera reposo. La gráfica rellena la franja y dibuja sus dos límites sin línea de cero. El semiancho se ajusta en configuración y en el slider compacto. No se aplica histéresis fuera de los límites de reposo. Una franja de estado, visible también con el monitor oculto, explica si falta calibrar, mantener el centro, sostener la inclinación o salir de configuración. Una inclinación directa de izquierda a derecha sin volver al centro no dispara una segunda acción. La pérdida del rostro, más de un rostro, poses excesivas, datos viejos o cambios al modo de configuración desarman las acciones. No se generan clics globales de Windows: se llama al puente interno de esta copia de GHOST.

La cámara fuente permanece reproduciéndose fuera de la pantalla y las vistas usan canvas; ocultar las vistas no detiene la fuente. No se graban imágenes ni se envían video, poses o calibración a servidores. Los recursos de MediaPipe/modelo se sirven desde este mismo despliegue, sin CDN externo durante el uso. La voz depende de los servicios y voces disponibles en el sistema/navegador, como en GHOST existente. La configuración de esta versión se guarda bajo claves propias de localStorage; puede leer las preferencias anteriores al primer uso sin escribir sobre ellas.

La gráfica representa grados de inclinación lateral, no la señal eléctrica del STM32. El ojo ilustrado reproduce esa inclinación. No hay señal ADC demo en esta versión: la entrada es la webcam real.

## Componentes de terceros

- MediaPipe Tasks Vision **1.2.3**, paquete oficial npm; JS y WASM sin modificar en `vendor/`.
- Face Landmarker float16, versión 1, modelo oficial de Google en `assets/face_landmarker.task`.
- Fuentes, procedencia y licencia Apache-2.0 en `vendor/NOTICE.txt` y `vendor/LICENSE-APACHE-2.0.txt`. Estos avisos no cambian la licencia del código original de GHOST ni atribuyen el hardware a su autor.

## Verificación y límites

Se comprobó el modelo/WASM real con una imagen pública de prueba de Google y con un flujo de webcam simulado en Chromium: detección, calibración, continuidad al ocultar monitor, liberación de cámara y ausencia de errores JavaScript. También se comprobó roll con el modelo real usando una imagen de prueba rotada ±20°. Pruebas separadas con poses controladas verifican selección, solicitud de voz, retorno al centro, ausencia de repetición y pausa en configuración/múltiples rostros. En esas pruebas de eventos la síntesis se sustituye por una captura de la solicitud; no se valida audio audible.

No se ha probado una webcam física ni movimientos de una persona en esta implementación. Hay que validar iluminación, ángulos, latencia, sentidos, voz y comodidad en el equipo del usuario. La precisión no equivale a un sistema médico ni garantiza funcionamiento con cualquier rango de movilidad. No requiere build: se despliega como archivos estáticos dentro del mismo proyecto Vercel.
