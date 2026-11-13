# GHOST Monitor · selector de modelos de ojo

Copia independiente del escritorio de `/ghost-monitor/`, tomada del commit `5c6554a`. Disponible en **https://ghost-comunicador.vercel.app/ghost-monitor-modelos/** dentro del mismo repositorio y despliegue Vercel. No modifica las versiones existentes ni Mobile.

## Uso

1. Abrir la nueva ruta en Chrome o Edge de escritorio.
2. Entrar a Settings con Ctrl+Alt+M (o el atajo del acompañante que ya esté configurado).
3. Abrir **Monitor STM32**, activar **Mostrar ojo de la señal en los monitores** y elegir **Modelo del ojo**.
4. Opciones: **Original, Kawaii, Caricatura, Ultra-realista, Cyberpunk y Foto real (humano)**. El cambio se aplica y guarda inmediatamente en esta versión, tanto en el monitor grande como en el compacto.
5. Activar modo demo o conectar el STM32 como en el escritorio anterior. Cerrar la conexión USB de la otra versión antes de intentar usar el mismo puerto aquí.

Los seis diseños SVG y las cuatro capas de imagen del modelo fotográfico proceden del archivo de pruebas proporcionado por el usuario. Solo se extrajeron esas representaciones estáticas; el JavaScript del archivo adjunto no se ejecutó ni se incorporó como lógica de aplicación. Las imágenes se guardan en `assets/eyes/` y no requieren servicios externos.

Se mantienen las tres etapas, síntesis de voz, barrido, vocabulario, teclado, edición, carga y respaldo, configuración, atajos, monitor, demo con ruido, umbrales y entrada STM32 del escritorio. El selector cambia únicamente el aspecto del ojo y su límite de recorrido horizontal según cada diseño. La mirada continúa siguiendo el ADC de la gráfica, sin seguimiento del mouse, movimiento vertical ni posiciones aleatorias. La foto conserva su capa de párpado para un parpadeo breve; se desactiva con movimiento reducido. El ojo no captura clics.

## Aislamiento

Todos los scripts, estilos y recursos visuales ejecutables son locales a este directorio. Los IDs de recortes, filtros, máscaras y degradados se prefijan por monitor para evitar interferencias entre el ojo grande y el compacto. El modelo Cyberpunk no cambia el fondo ni la configuración visual del resto de GHOST.

Las preferencias se guardan en `ghost_monitor_models_caa_v2` (comunicación) y `ghost_monitor_models_stm32_v1` (monitor y modelo). En la primera carga puede leer las preferencias anteriores del mismo navegador para conservar vocabulario y configuración, pero las modificaciones solo se escriben en estas claves nuevas. No hay sincronización automática posterior; se mantienen los respaldos JSON para traslado manual.

Los enlaces de documentación apuntan a información pública existente; no se importan scripts ni CSS de la versión anterior. No se alteró el firmware, el protocolo ADC, los umbrales, la detección de gestos ni los permisos USB.

## Verificación

Se probaron los seis modelos en Chromium: demo y muestras CDC simuladas por el decodificador existente; límites de recorrido de cada modelo; transformaciones horizontales; ausencia de IDs SVG duplicados; carga de las cuatro imágenes; selector, persistencia y aislamiento de preferencias; interruptor de visibilidad; sliders, ayuda y tamaños de ventana de 1366, 900 y 600 px. Se compararon todos los archivos preexistentes para comprobar que permanecen idénticos.

No se dispuso de STM32 físico. La prueba USB simula la API del navegador y valida el flujo del software, no constituye una verificación del dispositivo físico.
