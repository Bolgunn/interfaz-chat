# Guion del video de demostración (~6 min)

Preparación: `./scripts/down.sh -v` y luego `./scripts/up.sh` para partir con datos limpios.
Abrir http://localhost:3000 en una ventana normal y otra en incógnito (dos usuarios).

1. **Arquitectura (45 s).** Mostrar el diagrama del README: interfaz → gateway GraphQL →
   6 microservicios en la red `microsvcs`. Mencionar que los servicios de otros equipos se
   usan sin modificar su código (commits fijados + overrides de puertos y red).
   `docker ps` para mostrar los contenedores de los 4 stacks.
2. **Identidad (30 s).** Ventana 1: crear usuario `ana`. Ventana 2 (incógnito): crear `beto`.
   Mostrar el panel *Servicios* con todo en verde.
3. **Canales y mensajes (45 s).** Ana crea el canal `general` y escribe. Beto lo ve aparecer
   en la barra lateral y responde; los mensajes llegan solos.
4. **Integrales en el chat (45 s).** Beto pulsa *Integral*, escribe `\int_0^1 x^2 \, dx`
   (se ve la vista previa) y envía. `integralbot` responde con la fórmula renderizada.
   Probar una que falle, p. ej. `/integralcalc x^2` → respuesta de error del bot.
5. **Calculadora (45 s).** Página *Calculadora de integrales*: elegir un ejemplo, calcular,
   mostrar resultado simbólico y numérico. En el historial aparecen los cálculos del chat
   (origen *Chat*) y de la calculadora (*REST*); filtrar por *Fallidos*.
6. **Hilos (45 s).** Ana abre *Responder* en un mensaje de Beto y contesta en el hilo. Beto ve
   "1 respuesta" y abre el hilo.
7. **Encuestas (1 min).** Ana crea una encuesta (3 alternativas, 2 minutos). Aparece en el
   canal; Ana y Beto votan y las barras se actualizan en ambas ventanas. Beto intenta votar
   otra vez → aviso "Ya votaste" (409 de Polls). Beto no ve el botón de cierre; Ana la cierra
   y Polls publica el mensaje con los resultados finales. Mostrar la pestaña *Encuestas*.
8. **Resiliencia (45 s).** `docker stop thread-service-threads-1 polls-polls-api-1`.
   El panel *Servicios* marca Hilos y Encuestas en rojo; el chat y las integrales siguen
   funcionando, los anuncios de encuestas se ven como texto con un aviso. `docker start …`
   y todo vuelve sin recargar la página.
9. **GraphQL (30 s).** Mostrar una consulta en http://localhost:5000/graphql (explorador de
   Ariadne): `messages(channelId)` trae autor, encuesta y número de respuestas en una sola
   petición.
