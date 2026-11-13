# GHOST Mobile

Adaptación aislada del GHOST existente en el commit `21756cf`, dentro del mismo repositorio y proyecto Vercel. Conserva archivos y almacenamiento propios, dentro del mismo repositorio y despliegue. La actualización del monitor móvil añade observación USB y demo; por solicitud posterior, la demo de Desktop también utiliza una señal sintética más natural.

## Uso e instalación en Android

1. Abrir **https://ghost-comunicador.vercel.app/mobile/** en Google Chrome con internet la primera vez.
2. Tocar el engranaje superior. Elegir la etapa, la velocidad de barrido, la voz y el vocabulario como en GHOST Desktop. La comunicación queda pausada mientras Settings está abierto. Se conserva el regreso automático tras 30 segundos sin actividad.
3. En «Uso y apariencia», comprobar que aparece el aviso de archivos disponibles sin conexión. Seleccionar una voz española local. En el motor de texto a voz de Android, descargar los datos de voz en español; la ruta varía según fabricante y versión de Android. Probar «Escuchar voz» también en modo avión.
4. En el menú de Chrome, elegir **Añadir a pantalla de inicio → Instalar** o **Instalar aplicación**, según el dispositivo. También puede aparecer el botón «Instalar GHOST Mobile» en Settings cuando Chrome ofrece la instalación. No se fuerza un aviso emergente.
5. Volver a comunicar. Dejar GHOST visible y activo.

## Un solo pulsador

Un clic izquierdo estándar, o un toque sobre la superficie de comunicación, selecciona **la opción resaltada**, independientemente de dónde se encuentre el puntero. El clic derecho no ejecuta acciones. No hay doble clic, combinaciones ni acciones alternativas por mantener pulsado.

- **Etapa 1:** las mismas opciones Sí y No y su síntesis original; ahora se alternan por barrido para hacerlas accesibles con un solo pulsador.
- **Etapa 2:** mismas frases, Sí y No, personalización y orden. Seleccionar una frase reproduce automáticamente su pronunciación con esa misma pulsación, al soltar. No hay botón **Hablar** ni un segundo paso en esta etapa. No se añadieron categorías.
- **Etapa 3:** mismas categorías, palabras, favoritos y teclado; misma acumulación, espacios, borrado, limpieza y reproducción. **Hablar**, borrar y limpiar permanecen en una franja de controles que también recorre el barrido. Las páginas anterior/siguiente conservan la navegación existente sin exigir scroll.

El engranaje no forma parte de la lista de barrido. Se abre **tocándolo directamente con el dedo o un lápiz táctil**. Un clic HID de mouse sobre sus coordenadas sigue seleccionando la opción resaltada; así el puntero del pulsador no puede dejar al usuario en Settings por accidente. Con teclado se conservan Ctrl+Alt+M (o el atajo personalizado) y Ctrl+Alt+1/2/3.

### Duración y rebotes

Settings conserva la protección original contra clics repetidos y añade «Duración mínima del clic», entre 0 y 3000 ms. El valor inicial 0 reconoce inmediatamente la pulsación. Con un valor mayor se debe mantener la señal al menos ese tiempo; una pulsación más corta se ignora.

El barrido se detiene sobre la opción que estaba resaltada al comenzar la pulsación. Alcanzada la duración mínima, se ejecuta una única acción. Mantener la señal no repite acciones ni cambia su significado. Es necesario soltar para reanudar y volver a seleccionar. Se ignoran los eventos de mouse/click de compatibilidad que genera un mismo toque. Un cambio de pantalla, pérdida de foco o cancelación cancela una selección pendiente.

Un dispositivo que emita pulsos de botón muy breves deberá usarse con duración 0 o con un umbral compatible con esos pulsos. GHOST no puede alargar físicamente la señal emitida por el dispositivo.

## Datos y aislamiento

`ghost_mobile_v2` es la clave de almacenamiento local de esta copia. En la primera apertura puede leer una configuración Desktop `ghost_caa_v2` del mismo origen y copiarla en memoria; no escribe en esa clave. Las modificaciones siguientes se guardan solo en Mobile. En un teléfono nuevo se puede importar el mismo respaldo JSON de Desktop; no hay sincronización externa.

Se conserva el formato de respaldo v2 y la importación del vocabulario original, el editor de frases por perfil, palabras, pronunciaciones y carga por líneas. Los datos, vocabulario y categorías predeterminados se copiaron literalmente a `vocabulary.js`. El resto de funciones se derivó del script existente, cambiando únicamente entrada, barrido necesario para un pulsador, presentación móvil y preparación offline.

`ghost.css` es una copia local del estilo original; `mobile.css` contiene la adaptación. No hay dependencias de scripts o CSS mutables de Desktop. El service worker se limita a `/mobile/` y a sus recursos locales, incluido el monitor. No controla `/`, `/ghost-monitor/` ni la web de producto. Ningún recurso externo es necesario para comunicar; los enlaces informativos del acompañante necesitan internet.

Las actualizaciones esperan al cierre de todas las ventanas de GHOST Mobile y no recargan una sesión de comunicación en curso. Al modificar archivos para una nueva publicación se debe incrementar la versión de caché en `sw.js`; una instalación de la nueva caché debe completarse antes de activar la versión.

## USB, HID y STM32

Mobile incluye ahora un monitor de observación en **⚙️ → Monitor STM32**. El modo demo funciona sin hardware y el ojo se muestra u oculta mediante su casilla, que se guarda inmediatamente. El compacto comparte la altura disponible con la comunicación; las opciones siguen paginándose sin scroll. Los umbrales se ajustan desde Settings, donde también están habilitados los sliders del compacto. En comunicación los controles técnicos quedan deshabilitados para conservar el pulsador global.

### Conectar el STM32 por USB

1. Utilizar Chrome actualizado, HTTPS y un teléfono con USB host/OTG. Conectar mediante un adaptador OTG y cable de **datos**, con alimentación suficiente. Cerrar MATLAB y otras apps que usen el dispositivo.
2. Abrir el engranaje y la pestaña Monitor STM32. Elegir **Puerto serie nativo** si Chrome muestra el STM32. Chrome Android reciente dispone de USB mediante Web Serial; su presencia por sí sola no garantiza que una versión antigua soporte puertos USB (algunas solo admiten Bluetooth).
3. Si no aparece el puerto, elegir **USB compatible · CDC-ACM (WebUSB)**. Esta opción inspecciona los descriptores y acepta un único par de interfaces CDC-ACM de control y datos bulk. No supone VID/PID ni números de interfaz o endpoint fijos.
4. Pulsar Conectar STM32 y autorizar la selección del navegador y de Android. El puerto se configura a 115200, 8N1. WebUSB usa solamente las solicitudes estándar CDC SET_LINE_CODING y SET_CONTROL_LINE_STATE (DTR/RTS), sin programar firmware ni enviar comandos de adquisición.
5. Verificar las muestras y el ojo. Desconectar desde el botón antes de retirar el cable. No hay reconexión automática ni solicitud de permisos al cargar.

El monitor reconstruye las mismas muestras `alto × 100 + bajo`, en paquetes de 50 bytes y 25 muestras, aproximadamente 500 Hz. Los umbrales y la estabilidad se aplican a estados/contadores de observación. La demo está identificada como simulada y nunca selecciona frases. El monitor móvil **no convierte la señal ADC en selecciones**: se conserva la comunicación actual con un solo clic HID o toque; esta decisión mantiene separado el monitoreo de la entrada hasta definir esa integración.

Un STM32 **CDC** puede transmitir muestras al monitor sin ser un mouse **HID**. Un mouse HID puede seleccionar opciones sin transmitir las muestras CDC del monitor. No se confunden ambos protocolos y no se modifica firmware. WebHID no se utiliza. Para comunicar con un pulsador USB, Android debe reconocerlo como mouse y enviar su clic izquierdo estándar a la página.

El código de monitor, decodificador y ojo son copias locales de Desktop adaptadas a Mobile; no importan archivos mutables de `/ghost-monitor/`. Los ajustes técnicos se guardan en `ghost_mobile_monitor_stm32_v1`, separados de Desktop y del vocabulario Mobile. Si no hay APIs USB, se informa y se mantienen demo, ojo y comunicación. Las restricciones del teléfono, permisos, interfaces ocupadas o firmware no CDC pueden impedir el acceso; no se afirma compatibilidad universal.

### Señal demo más natural

Desktop y Mobile usan la misma fórmula, copiada en su propio `demo-signal.mjs`: reposo con deriva y ruido fino, mesetas altas y bajas con duración variable, transitorios y picos de 14–18 ms. Es una ilustración educativa, no una medición fisiológica validada. La gráfica y el ojo utilizan esas mismas muestras. No se altera ningún byte de los datos USB reales.

Las pruebas con APIs simuladas cubren Web Serial y el ciclo WebUSB completo (descriptores, configuración CDC, lectura fragmentada, errores y cancelación). Se verificó demo y ojo offline y las tres etapas con monitor visible en cinco tamaños de pantalla. **No se dispone de un teléfono, adaptador OTG ni STM32 físico en el entorno; esa combinación debe probarse en el dispositivo real.** No se afirma que la emulación pruebe hardware.

Fuentes: [Chrome 148, Web Serial en Android](https://developer.chrome.com/release-notes/148), [Web Serial y alternativa WebUSB](https://developer.chrome.com/docs/capabilities/serial/), [USB host Android](https://developer.android.com/develop/connectivity/usb/host).

## Voz y offline: límites de la comprobación

Se usa la misma Web Speech API, conservando voz seleccionada, velocidad, tono, volumen, pausa al hablar y limpieza opcional. Si no se elige una voz concreta, se prefiere una voz española marcada como local. La lista indica «local» o «puede requerir internet» sin eliminar opciones existentes. Android puede enumerar voces antes de terminar de cargar; se conserva `voiceschanged`. Los códigos de idioma con guion bajo se normalizan a BCP 47 al reproducir.

`localService` informa el tipo de servicio, pero no prueba que los datos estén instalados ni que el fabricante permita voz offline. Hay que escuchar el teléfono real en modo avión. La caché PWA solo conserva archivos de GHOST; no puede descargar ni garantizar los paquetes de voz de Android. Un gesto real del usuario puede ser necesario para habilitar audio. Mantener la pantalla encendida y la aplicación visible: Chrome/Android puede suspender tareas en segundo plano.

## Pruebas de la adaptación inicial

- Comparación Git: únicamente archivos nuevos en `mobile/`; todos los archivos preexistentes idénticos.
- Chromium con tamaños emulados 320×568, 360×640, 390×844, 412×915, 480×800 y 640×360: tres etapas sin desplazamiento horizontal ni vertical en comunicación; casillas dentro de la pantalla y altura mínima de 44 px en los casos probados.
- Pulsador y toque: una sola acción por pulsación, umbral mínimo, rechazo de pulsaciones cortas, bloqueo hasta soltar, rebotes y clic derecho sin acción. Un clic HID sobre el engranaje tampoco abre Settings; un toque directo sí.
- Recorrido por categorías, palabras, teclado, espacios, hablar, borrar, limpiar y paginar; configuración de etapa; pausa al configurar y regreso por inactividad; perfiles y alto contraste; exportación y persistencia; ausencia de errores de JavaScript durante la prueba.
- Navegador sin red tras la primera carga: recarga de la aplicación, barrido, acceso a Settings y despacho de voz mediante un sintetizador simulado. Service worker exclusivo de `/mobile/` y Desktop sin controlador.
- La voz se simuló para comprobar texto, idioma, parámetros y fin de reproducción. **No se probó audio físico en Android, modo avión real, instalación real desde Chrome Android, rendimiento en un teléfono económico ni USB/OTG físico.** La emulación no sustituye esas pruebas.

Fuentes: [Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events), [voz local](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService), [USB host en Android](https://developer.android.com/develop/connectivity/usb/host), [dispositivos HID y mouse del sistema](https://developer.chrome.com/docs/capabilities/hid).

## Corrección de voz: actualización de caché v2

En un primer toque de pantalla, Chrome todavía no otorga activación de usuario durante `pointerdown`; la otorga en `pointerup`. Mobile estaba llamando al sintetizador durante `pointerdown` (o desde el temporizador del umbral), lo que podía bloquear la voz aunque otras webs funcionaran.

Las selecciones mantienen la misma duración mínima, pero una acción de voz queda pendiente hasta soltar **esa misma pulsación** y se inicia sincrónicamente en su `pointerup`. No requiere otro toque. Cancelar la pulsación o cambiar de pantalla descarta la voz pendiente. Se actualiza la lista de voces al hablar, se conserva una referencia a la locución hasta terminar y no se envía una cancelación al motor si no hay reproducción pendiente. Los errores de voz indican ahora el motivo que devuelve el navegador.

Se reprodujo en Chromium con toque emulado: antes, la primera llamada tenía `userActivation.isActive=false` y `hasBeenActive=false`; después ambas son `true`. Se comprobaron pulsaciones inmediatas y de 200 ms, cancelación sin reproducción, recorrido completo de las tres etapas y actualización del worker v1 a v2 conservando configuración. Estas pruebas no verifican el audio físico de un teléfono Android.

Para recibir el arreglo en una instalación existente: abrir la ruta Mobile con internet, esperar unos segundos para descargar la actualización, cerrar **todas** las pestañas de esa ruta y la ventana instalada de GHOST Mobile, y volver a abrir. El worker nuevo se activa al cerrar la versión anterior. Se conservan configuración y vocabulario.

## Frases útiles: caché v3

La etapa 2 reproduce automáticamente la frase seleccionada (incluidos Sí y No), sin botón Hablar. Conserva el barrido, el orden y la pronunciación personalizada. El inicio de voz sigue ligado a soltar esa misma pulsación para mantener la activación de Chrome Android. La etapa 3 mantiene Hablar para reproducir el mensaje compuesto.

## Actualización del monitor: caché v4

El service worker conserva también los módulos de monitor, transportes USB, demo y ojo. Para actualizar una instalación existente, abrir con internet, esperar unos segundos, cerrar todas las pestañas y la ventana instalada de Mobile y volver a abrir. Configuración y vocabulario se conservan. El monitor no afecta el inicio de voz al soltar ni la pronunciación automática de las frases útiles.

## Modelos de ojo y nueva distribución: caché v5

En **⚙️ → Monitor STM32 → Modelo del ojo** se puede elegir Original, Kawaii, Caricatura, Ultra-realista, Cyberpunk o Foto real. El interruptor de visibilidad sigue siendo independiente. La selección se aplica y guarda inmediatamente en Mobile; no cambia el modelo ni los ajustes del escritorio.

El ojo ocupa una columna más ancha a la derecha de la gráfica y los dos sliders compactos quedan debajo. La comunicación conserva sus páginas y no requiere scroll. Los archivos de modelos y las capas fotográficas son copias locales en Mobile y están incluidos en la caché offline. No se cambian el procesamiento USB/ADC, la selección de un solo clic, la voz ni el vocabulario.

Para recibir esta actualización, abrir Mobile con internet, esperar unos segundos, cerrar todas las ventanas/pestañas de Mobile y volver a abrir. Se conservan las preferencias existentes; el primer modelo es Original si no había uno guardado.
