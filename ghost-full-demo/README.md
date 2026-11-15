# GHOST Full Demo — presentación automática independiente

URL: https://ghost-comunicador.vercel.app/ghost-full-demo/

Copia completa del monitor de escritorio con servo y modo espejo (`ghost-monitor-servo`), con sus imágenes, opciones, protocolos, guía y programa de referencia Arduino. Todos los archivos anteriores permanecen intactos. Se publica como un directorio nuevo dentro del repositorio y proyecto Vercel existentes; no requiere otro servidor ni un servicio de voz de pago.

## Preparar y presentar

1. Abrir esta URL en Chrome/Edge de escritorio sobre HTTPS. Si el Arduino sigue abierto en otra versión/pestaña de GHOST o en Arduino IDE, desconectarlo allí antes de seleccionarlo en esta copia.
2. Ctrl + Alt + M → Monitor STM32 → **Conectar servo**. Seleccionar el UNO a 115200 baudios y esperar el mensaje de conexión (se esperan 2 segundos por su reinicio). Ajustar **Modo espejo** al montaje físico. El programa L/C/R y el cableado del servo son los mismos; ver `guia-servo.html` y `arduino/ghost_servo/ghost_servo.ino`.
3. No conectar el STM32 para la autopresentación: Full Demo genera su propia señal. Si está conectado, el inicio se rechaza sin cerrarlo ni cambiar su adquisición. El Arduino sí puede permanecer conectado. También se puede presentar solo en pantalla sin Arduino, sin afirmar que hay movimiento físico.
4. Con la ventana de GHOST activa, pulsar **Ctrl + Alt + F**. Se cierra configuración y comienza una única presentación automática. Mantener la pestaña visible, el audio habilitado y el equipo activo. No es necesario pulsar frases ni cambiar etapas manualmente.
5. **Ctrl + Alt + F** de nuevo o **Esc** detiene. Ctrl + Alt + M detiene y abre configuración; los atajos de etapas/ayuda también detienen antes de actuar. Cambiar de ventana/pestaña detiene la presentación para no seguir enviando acciones sin supervisión visual. Se intenta enviar reposo C, pero no se corta alimentación ni se desconecta automáticamente el Arduino.
6. Al terminar se intenta mantener el servo en C, se pausa la señal de presentación y se restauran las preferencias y el vocabulario previos en memoria. La demo aleatoria ordinaria no vuelve a ponerse en marcha automáticamente; se puede activar con su botón. Ctrl + Alt + F repite desde el principio sin volver a conectar el servo.

El inicio mediante atajo debe hacerse **dentro de la nueva URL**; no es un atajo global de Windows/Linux ni se añadió a las versiones antiguas. La duración depende del barrido, paginación y voces, aproximadamente unos minutos. No hay grabación ni voz pregrabada.

## Guion y dos voces

El presentador dice una breve introducción: «GHOST ayuda a personas con movilidad reducida a comunicarse mediante movimientos mínimos». Después introduce cada etapa con una sola frase.

- **Etapa 1:** «En la primera etapa, la persona solamente dice sí o no». La voz de GHOST responde **Sí, No, Sí, No**. Se respeta el comportamiento básico original: izquierda = sí, derecha = no; sin barrido.
- **Etapa 2:** «En la segunda etapa, la persona se comunica con frases de uso frecuente que se pueden personalizar». El barrido selecciona y pronuncia **Necesito ayuda médica**, **Quiero agua**, **Quiero hablar con mi familia** y **Gracias**. Izquierda selecciona; derecha habla.
- **Etapa 3:** «En la tercera etapa, la persona combina palabras de distintas categorías para construir sus propios mensajes». Se recorren las categorías y las palabras reales para formar **Quiero hablar familia**, **Necesito beber agua**, **Hoy necesito descansar**. El primer ejemplo omite intencionalmente «con mi» como mensaje telegráfico comprensible; no es un fallo del detector. No se insertan los mensajes completos en el formulario: cada palabra entra mediante una selección izquierda y el mensaje final se pronuncia con derecha. Se usan Acciones, Personas, Necesidades y Tiempo, y la opción real de volver a categorías.

Se eligen dos voces distintas de `speechSynthesis.getVoices()`, priorizando español y la voz de comunicación configurada si está disponible en español. Si solo hay una voz apropiada (o se usa la voz predeterminada), se distinguen mediante **pitch 0,8 para narración y 1,3 para GHOST**, además de una leve diferencia de velocidad. La disponibilidad y el efecto de pitch dependen del sistema y motor de voz. Si no se oyen distintos, instalar/seleccionar otra voz española del sistema. Los roles y el texto hablado también se muestran en una franja superior. El volumen respeta la configuración de GHOST.

No se reproducen dos voces a la vez: se espera el final real de cada locución (`onend`), no un tiempo supuesto por longitud. Un error de síntesis o una voz que no responde detiene y deja el mensaje visible.

## Sincronización: una señal para todos

Solo durante Full Demo se sustituye la demo aleatoria por paquetes sintéticos de 25 muestras a ~500 Hz, con ruido fino acotado a tres niveles seguros dentro de las bandas vigentes: izquierdo, reposo y derecho. Los umbrales y estabilidad configurados no se recalculan ni se reemplazan. Los extremos inferior=0 o superior=4095 no dejan espacio para una banda de activación y se rechazan antes de iniciar.

Estos paquetes recorren **el mismo detector y puente de acciones**, no clics globales ni selecciones directas de botones. El controlador espera la confirmación del detector antes de continuar. El barrido recorre secuencialmente los objetivos visibles y usa los controles reales de paginación cuando hacen falta. Entre acciones se envía reposo estable; sostener un estado no repite clics.

La gráfica muestra esos paquetes. El ojo de software representa la **dirección lógica de la acción** durante la presentación: izquierdo mira a la izquierda, derecho a la derecha y reposo al centro (en la demo ordinaria conserva la representación de amplitud de la versión base). El servo recibe el mismo estado interpretado por el monitor, respetando modo normal/espejo. Antes de la voz de GHOST se espera a que termine la escritura serial y se dejan unos 220 ms para el movimiento; la posición de activación se sostiene mientras habla y después vuelve a reposo. La narración transcurre en reposo.

No existe feedback de posición del SG90: se sincronizan la señal, acción de software y comando enviado, pero no se puede confirmar que el motor alcanzó físicamente el ángulo. Alimentación, carga, velocidad y USB requieren prueba real. Si se empezó con Arduino conectado y se pierde o falla su enlace, la presentación se detiene; no finge una sincronización física. Al salir se intenta C incluso con espejo, sin cerrar un puerto que el presentador quiera reutilizar.

La demo ordinaria sigue sin activar la comunicación. La excepción Full Demo es explícita y solo existe en esta copia. El STM32/firmware no se modifican. Las preferencias se separan de las versiones anteriores (`ghost_full_demo_*`) y pueden leerse como valores iniciales sin sobrescribir los originales. Durante el guion el vocabulario adulto predeterminado se utiliza de forma temporal y se restaura después.

## Pruebas y límites

Se ejecutó una presentación completa en Chromium con voces y USB sustituidos por simuladores: cuatro narraciones, once respuestas de GHOST, selecciones reales por etapas/categorías, comandos L/R en cada respuesta y C al final, restauración de preferencias y ausencia de errores JavaScript. En esa prueba se acortaron únicamente las esperas del guion para acelerar la verificación; la versión publicada mantiene tiempos legibles (550 ms por objetivo, activación mínima 650 ms y reposo mínimo 600 ms, ampliados si la estabilidad configurada lo requiere).

Otra prueba completa a 800×600 verificó una sola voz con dos pitches, espejo, la dirección del ojo y el ADC al hablar, paginación, parar y reiniciar con Esc, entrar a configuración durante el guion, fallos de síntesis y rechazo del inicio con STM32 conectado. No se ha escuchado audio real ni conectado un SG90 físico desde este entorno. Hay que validar las dos voces, el movimiento, el sentido espejo y la alimentación en el equipo de la exposición. El permiso USB sigue siendo manual y las restricciones de Web Serial en Linux/Flatpak/Firefox son las mismas de la versión base.
