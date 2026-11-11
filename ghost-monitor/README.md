# GHOST Monitor · segunda versión con STM32

Disponible en `/ghost-monitor/` dentro del mismo proyecto Vercel de GHOST. No requiere backend, MATLAB, bibliotecas de gráficos ni otro despliegue/proyecto. Los archivos existentes en la raíz se conservan sin modificaciones.

## Uso

1. Abre `https://ghost-comunicador.vercel.app/ghost-monitor/` directamente en **Chrome o Edge de escritorio**. Usa HTTPS (o localhost para desarrollo); no abras el HTML como `file://` ni dentro de un iframe ajeno.
2. Conecta el STM32F103C8T mediante USB. Debe enumerarse como puerto serie USB CDC del sistema operativo. Cierra MATLAB y cualquier otra aplicación que tenga abierto ese mismo puerto.
3. Pulsa **Ctrl + Alt + M**, abre la pestaña **Monitor STM32** y pulsa **Conectar STM32**. Selecciona su puerto y concede el permiso del navegador. No se inventa un VID/PID ni se restringe el selector a un identificador no proporcionado.
4. Comprueba el ADC, los estados y las franjas en modo de observación. Ajusta los umbrales y la estabilidad y pulsa **Aplicar umbrales**.
5. Activa **Usar la señal STM32 para comunicar en GHOST** cuando quieras utilizarla como entrada. Regresa mediante **Volver a comunicar** o Ctrl + Alt + M. El modo de configuración sigue regresando automáticamente después de 30 segundos de inactividad; recibir muestras no prolonga ese tiempo.
6. Primero mantén la señal en reposo. Una señal alta/baja estable activará el equivalente al clic izquierdo/derecho **dentro de GHOST**. No se generan clics de Windows ni eventos DOM sintéticos.
7. Para desconectar, vuelve a Monitor STM32 y pulsa **Desconectar**. La lectura se cancela, se libera el lector y se cierra el puerto.

Se conservan las tres etapas, perfiles adulto/infantil, editores, importaciones y respaldos, el teclado de letras grandes, las pantallas sin scroll y sus páginas de opciones. Ctrl + Alt + 1/2/3 cambia de etapa. El monitor compacto se integra debajo de la comunicación, sin cubrir las opciones; se puede ocultar desde su formulario. Los controles técnicos se operan en configuración, donde el cursor es visible. En comunicación, los clics del mouse siguen teniendo su función global dentro de la página.

## Protocolo implementado

- Puerto a **115200 baudios, 8 bits, sin paridad, 1 bit de parada, sin control de flujo**. La tasa USB CDC real la determina también el firmware.
- Paquetes binarios de **50 bytes**, con **25 muestras**. No se interpreta texto ASCII, delimitadores de líneas ni muestras binarias de 16 bits.
- Orden asumido según la descripción: **byte alto seguido de byte bajo**.
- `ADC = alto * 100 + bajo`, tratando ambos bytes como enteros sin signo y validando que el resultado esté entre 0 y 4095. No se impone una restricción adicional al byte bajo que no esté especificada por el firmware.
- Las lecturas de Web Serial son un flujo: pueden partir un paquete, una muestra o contener varios paquetes. El decodificador acumula exactamente 50 bytes y valida las 25 muestras antes de entregarlas. Mantiene el fragmento restante entre lecturas.
- No se escriben comandos en el puerto, no se activa DTR/RTS explícitamente y no se cambia el firmware. Si el firmware requiere una orden de arranque o una señal de control no descrita, habrá que incorporarla después de confirmar ese requisito.

**Limitación de sincronización:** USB CDC no conserva límites de mensajes en Web Serial y el protocolo indicado no contiene cabecera, longitud, número de secuencia ni checksum. El receptor supone que el primer byte recibido es el byte alto. Un desplazamiento de un byte puede producir datos inválidos o incluso muestras plausibles; no es posible detectar y corregir todos esos casos con este protocolo. Ante un paquete inválido se detienen las acciones y se requiere reconectar. Para recuperar la alineación se debe iniciar la transmisión desde un límite de muestra/paquete conocido, según cómo arranque el firmware. No se realiza una resincronización heurística que pudiera inventar señales. Si no se puede garantizar el comienzo alineado, el siguiente paso sería acordar una cabecera/checksum en el firmware; este cambio queda fuera de esta versión.

## Estados y generación de acciones

Valores iniciales:

| Señal | Estado | Acción en etapa 1 | Acción en etapas 2/3 |
| --- | --- | --- | --- |
| ADC < 1500 | Derecho | No | Pronunciar frase/mensaje |
| 1500 ≤ ADC ≤ 2500 | Reposo | Ninguna | Ninguna |
| ADC > 2500 | Izquierdo | Sí | Seleccionar opción del barrido |

Los umbrales son enteros configurables entre 0 y 4095 y deben cumplir inferior < superior. Los límites exactos pertenecen al reposo. Los ajustes se validan de forma conjunta antes de aplicarlos y se conservan en este navegador.

La estabilidad predeterminada es de **30 ms**, configurable de 0 a 500 ms. Se cuenta en muestras suponiendo 500 Hz (2 ms por muestra), porque las muestras de un mismo paquete llegan agrupadas. Debe haber reposo estable para armar una activación, y después un estado alto/bajo estable para dispararla. Mantener un estado no repite acciones; cambiar directamente de alto a bajo tampoco dispara otro clic sin pasar por reposo estable. Los contadores de gestos detectados funcionan también durante la calibración; el contador de acciones aplicadas indica cuáles llegaron a GHOST.

La conexión empieza **siempre en observación**, incluso tras recargar o reconectar. La integración se pausa en configuración, mientras GHOST habla y si la ventana pierde el foco o está oculta. Al volver se requiere reposo estable de nuevo. Una interrupción de datos superior a 1 s o una lectura excesivamente acumulada reinicia el armado; no se reproducen gestos pendientes. Los paquetes inválidos desactivan la integración hasta reconectar. No se intenta reconectar automáticamente ni solicitar permiso sin una acción del usuario.

## Gráfica y almacenamiento

La gráfica usa Canvas y un búfer circular de 2500 muestras: una ventana nominal de 5 segundos a 500 Hz. El tiempo horizontal y el filtro de estabilidad usan esa frecuencia aproximada; no hay marcas de tiempo del STM32 en el protocolo. Se dibuja con una frecuencia limitada, separada de la adquisición, y se conservan los mínimos/máximos por píxel para visualizar picos. Los datos permanecen en memoria local y no se suben a Vercel ni se persisten como historial. Una señal detenida se identifica como «Sin datos recientes», no como reposo.

Esta versión usa `ghost_monitor_caa_v2` para los ajustes de comunicación y `ghost_monitor_stm32_v1` para los umbrales/visualización. En el primer uso copia los ajustes de GHOST actual, si existen en ese mismo navegador, pero nunca escribe sus claves `ghost_caa_v2` ni `ghost_caa_v1`. A partir de entonces los ajustes son independientes. Los respaldos de vocabulario de GHOST siguen siendo compatibles; los umbrales USB se guardan por separado. Las autorizaciones de Web Serial son gestionadas por el navegador para este origen HTTPS.

## Archivos y despliegue

- `index.html`: copia aislada de GHOST del commit `87806053ca76a134b7946c377eaa9c57aaac3bca`, con un puente interno de entrada y una pestaña técnica.
- `monitor.mjs`: Web Serial, conexión/desconexión, gráfico e integración.
- `protocol.mjs`: decodificador de paquetes y detector de activaciones, sin dependencia del navegador.
- `monitor.css`: estilos del panel y monitor compacto.
- `tests/protocol.test.mjs`: pruebas del protocolo con Node.

El proyecto existente `ghost-comunicador` sirve estos archivos estáticos en `/ghost-monitor/`. No necesita cambiar rutas, reescribir la raíz ni modificar `vercel.json`. La URL raíz y `ghost-original.html` deben conservar sus hashes anteriores al añadir este directorio.

## Verificación

Ejecuta desde la raíz del repositorio:

```sh
node --test ghost-monitor/tests/protocol.test.mjs
python -m http.server 4174
```

Las pruebas del protocolo cubren todos los valores ADC de 0 a 4095, fragmentación en bytes impares, concatenación de paquetes, paquetes incompletos y corruptos, umbrales inclusivos, validación, estabilidad y supresión de repeticiones.

Se prueba también en Chromium con un puerto Web Serial simulado y paquetes binarios: autorización solicitada por botón, apertura a 115200, gráficas/contadores, controles reales de las tres etapas, pausa en configuración, ajustes independientes, cierre del lector, error de apertura/lectura, cancelación del selector, desconexión física simulada, reconexión y vuelta automática a comunicación. Estas pruebas no sustituyen una prueba con el STM32 físico, su driver, el orden real de los bytes y el arranque de su transmisión; ese equipo no está conectado al entorno de desarrollo.

## Referencias oficiales consultadas

- [Chrome Developers: lectura y escritura con Web Serial](https://developer.chrome.com/docs/capabilities/serial): permiso mediante gesto del usuario, puerto, opciones de apertura, flujo de lectura y liberación del lector antes de cerrar.
- [MDN: Web Serial API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API): contexto seguro, USB CDC y disponibilidad de navegador.

## Modo demo sin hardware

En **Ctrl + Alt + M → Monitor STM32**, pulsa **Activar modo demo** y luego **Volver a comunicar** para revisar el monitor compacto. La señal artificial recorre los tres estados usando los umbrales actuales y actualiza ADC, franjas y contadores simulados. La interfaz indica **DEMO · sin USB real**. El compacto se muestra durante la demo aunque normalmente lo hayas ocultado.

La demo no solicita puertos ni produce acciones de comunicación; los clics habituales del mouse siguen funcionando. El control de integración USB queda deshabilitado. Demo y adquisición USB son excluyentes: detén la demo antes de conectar y desconecta el STM32 antes de iniciar una demo. Para salir, vuelve a configuración y pulsa **Detener demo**. Se restaura la visualización y los contadores anteriores; las muestras simuladas no se mezclan con la sesión real. El modo demo no queda activado al recargar. Los cambios de umbrales que apliques sí se guardan como de costumbre.

## Sliders de umbrales en vivo

Los umbrales inferior y superior tienen sliders en la configuración y en el monitor compacto. Mover cualquiera aplica y guarda inmediatamente el umbral: se sincronizan los valores numéricos, los otros sliders, las franjas y la clasificación de la señal. No requiere pulsar un botón. Los sliders no permiten que los límites se crucen. Cada cambio reinicia el detector y exige volver a reposo estable.

Para mover los sliders del compacto, entra con **Ctrl + Alt + M**: el compacto permanece visible al pie de la configuración y el cursor vuelve a estar disponible. Al regresar a comunicación, los sliders muestran los valores activos y quedan bloqueados para que los dos clics sigan siendo entradas de comunicación en cualquier posición. El retorno automático por inactividad se conserva. Funciona tanto con USB real como en modo demo; ajustar umbrales en demo también guarda los valores para el uso posterior.
