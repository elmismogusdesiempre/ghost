# GHOST Mobile

Adaptación aislada del GHOST existente en el commit `21756cf`, dentro del mismo repositorio y proyecto Vercel. No modifica Desktop, su almacenamiento, la versión original archivada, el monitor académico ni la web de producto.

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

`ghost.css` es una copia local del estilo original; `mobile.css` contiene la adaptación. No hay dependencias de scripts o CSS mutables de Desktop. El service worker se limita a `/mobile/` y a sus diez archivos públicos. No controla `/`, `/ghost-monitor/` ni la web de producto. Ningún recurso externo es necesario para comunicar; los enlaces informativos del acompañante necesitan internet.

Las actualizaciones esperan al cierre de todas las ventanas de GHOST Mobile y no recargan una sesión de comunicación en curso. Al modificar archivos para una nueva publicación se debe incrementar la versión de caché en `sw.js`; una instalación de la nueva caché debe completarse antes de activar la versión.

## USB, HID y STM32

No se incluye monitor, Web Serial, WebHID, WebUSB, lectura ADC, gráficas ni controles académicos. La vía de entrada es el sistema de eventos estándar de Chrome: Android debe reconocer el dispositivo como mouse USB HID y entregar su botón izquierdo a la página. No se usa WebHID para leer reportes de un mouse; es una entrada del sistema operativo.

El teléfono debe admitir USB host/OTG, el adaptador debe ser de datos y el periférico debe recibir alimentación suficiente. Algunos teléfonos requieren habilitar OTG o no permiten cargar mientras se utiliza el adaptador.

**Un STM32 que solo se identifica como USB CDC/puerto serie no equivale a un mouse HID.** La versión anterior del laboratorio usaba CDC; no se presupone que ese mismo firmware genere clics en Android. Se necesita un dispositivo que ya entregue clic izquierdo HID o una interfaz compatible existente. No se cambió firmware ni se añadió una conversión serie→mouse.

No había teléfono, adaptador OTG ni STM32 conectados al entorno de trabajo. La compatibilidad física debe verificarse conectando primero un mouse USB normal al teléfono, abriendo la ruta Mobile y comprobando que un clic selecciona el resaltado. Repetir luego con el dispositivo de apoyo; si Android no lo reconoce como mouse, el problema está fuera del alcance de esta adaptación web.

## Voz y offline: límites de la comprobación

Se usa la misma Web Speech API, conservando voz seleccionada, velocidad, tono, volumen, pausa al hablar y limpieza opcional. Si no se elige una voz concreta, se prefiere una voz española marcada como local. La lista indica «local» o «puede requerir internet» sin eliminar opciones existentes. Android puede enumerar voces antes de terminar de cargar; se conserva `voiceschanged`. Los códigos de idioma con guion bajo se normalizan a BCP 47 al reproducir.

`localService` informa el tipo de servicio, pero no prueba que los datos estén instalados ni que el fabricante permita voz offline. Hay que escuchar el teléfono real en modo avión. La caché PWA solo conserva archivos de GHOST; no puede descargar ni garantizar los paquetes de voz de Android. Un gesto real del usuario puede ser necesario para habilitar audio. Mantener la pantalla encendida y la aplicación visible: Chrome/Android puede suspender tareas en segundo plano.

## Pruebas de esta publicación

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
