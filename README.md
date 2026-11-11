# GHOST · Tu voz, a tu ritmo

Comunicador de asistencia en español, sin backend ni dependencias. Abre `index.html` en un navegador de escritorio con síntesis de voz, o sirve la carpeta como sitio estático.

## Etapas

1. **Sí / No:** solo dos opciones, sin barrido. Clic izquierdo pronuncia Sí; clic derecho pronuncia No, desde cualquier posición dentro de la página.
2. **Frases útiles:** barrido automático de una lista plana, sin categorías. Sí y No siempre están al principio. Izquierdo selecciona la frase resaltada; derecho la pronuncia.
3. **Construir mensajes:** barrido de categorías y palabras, favoritos y teclado con letras, tildes, números y puntuación. Izquierdo entra en una categoría o añade la opción resaltada. Derecho pronuncia todo el mensaje. Volver, borrar y limpiar son opciones del barrido; hablar no lo es.

El cursor se oculta durante la comunicación. La ventana debe estar activa: una página web no captura clics enviados a otras aplicaciones. El barrido se pausa cuando la ventana pierde el foco y durante la voz. No se usan dobles clics ni pulsaciones largas para cambiar de modo.

## Configuración para acompañantes

**Ctrl + Alt + M** entra y sale de configuración. Allí reaparece el cursor, se detiene la voz y el barrido, y los clics funcionan normalmente. El atajo se puede cambiar a Ctrl + Alt + G o Ctrl + Alt + Y si el sistema utiliza el predeterminado.

- Elegir etapa y perfil visual adulto o infantil de forma independiente.
- Configurar voz, volumen, velocidad, tono, contraste, texto, columnas y tamaño.
- Ajustar tiempo por opción, pausa tras seleccionar y protección contra clics repetidos.
- Añadir, editar, eliminar y reordenar frases. Cada perfil conserva su lista.
- Editar palabras, pronunciación, emojis, categorías y favoritos.
- Cargar texto por líneas en frases útiles o en vocabulario avanzado.
- Importar vocabulario JSON de la versión anterior (lista de objetos con `text`, `emoji`, `category`, `speech`, `favorite`). Se añade al vocabulario avanzado.
- Exportar e importar respaldos completos con ambos perfiles y todos los ajustes.

Los cambios se guardan en `localStorage` (`ghost_caa_v2`) y pertenecen al navegador y origen actuales. Cambiar de URL, equipo, navegador o borrar los datos del navegador requiere importar un respaldo. La migración automática lee `ghost_caa_v1` en el mismo origen y conserva las palabras personalizadas, favoritos y ajustes compatibles sin modificar los datos originales. En un origen nuevo, exporta el vocabulario desde la versión anterior e impórtalo aquí.

La voz depende del navegador y del sistema operativo. Los mensajes permanecen visibles si la reproducción falla. Conviene probar la voz elegida y la velocidad del barrido con la persona que va a utilizarlo. El respaldo incluye vocabulario personal: guárdalo donde prefieras.

## Versión original

`ghost-original.html` es una copia byte por byte del `index.html` original del commit `a5500825fa170b2d033d0162eacf2233d3fa506c`. Mantiene sus propias funciones y almacenamiento v1.

## Verificación

Se comprobó en Chromium: clics globales en posiciones ajenas a los botones, Sí/No, selección y pronunciación de frases, barrido automático, pausa en configuración, perfiles, construcción de mensajes, teclado, persistencia, importación JSON válida e inválida, migración v1 y diseño en escritorio y pantalla estrecha. La prueba de despacho de voz utilizó un sustituto de `speechSynthesis.speak`; la voz y el hardware físicos requieren una prueba en el dispositivo de uso.

## Regreso automático y pantalla completa sin desplazamiento

La configuración regresa al modo de comunicación después de 30 segundos sin usar el teclado, pulsar un control, editar o desplazar la configuración. Un contador muestra el tiempo restante. Mover el puntero no reinicia el contador. Los cambios del campo activo se guardan antes de salir. Al volver de una pestaña suspendida se comprueba el tiempo transcurrido.

Las tres etapas ocupan el ancho y alto disponibles sin scroll. Las casillas se adaptan al tamaño y orientación de la ventana. Si hay demasiadas opciones para mantenerlas legibles, se dividen en páginas; «Página anterior» y «Página siguiente» se eligen mediante el mismo barrido y clic izquierdo. No se necesita apuntar ni desplazar. El mensaje largo conserva todo su contenido para la voz y muestra automáticamente su parte más reciente.

## Atajos de etapa

- Ctrl + Alt + 1: Sí / No.
- Ctrl + Alt + 2: Frases útiles.
- Ctrl + Alt + 3: Construir mensajes.

Funcionan con los números superiores y el teclado numérico, desde comunicación o configuración. En configuración guardan el campo activo y regresan directamente a comunicación. La etapa elegida queda guardada, se detiene cualquier voz en curso y el barrido comienza desde el inicio. Se conserva el mensaje construido para poder retomarlo al regresar a la etapa 3.

Las letras, números y signos del teclado de comunicación ocupan casi toda la tecla, con márgenes y tamaño adaptable al ancho y alto disponibles. Las teclas de acciones mantienen sus etiquetas normales.
