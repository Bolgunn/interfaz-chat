# Interfaz del chat de microservicios (Unidad 6)

Interfaz web y **API Gateway GraphQL** para el chat del curso INF326. Integra en una sola
aplicación:

| Servicio | Equipo | Repositorio | Qué aporta a la interfaz |
| --- | --- | --- | --- |
| `users`, `channels`, `messages` | Base del curso | [`base/`](base/) | Usuarios, canales y mensajes |
| `integrals` | Nuestro equipo | [Misulas/modulo-integrales](https://github.com/Misulas/modulo-integrales) | Calculadora de integrales y bot `/integralcalc` |
| `threads` | Otro equipo | [IsaiasACF/Thread-Service](https://github.com/IsaiasACF/Thread-Service) | Respuestas en hilo a un mensaje |
| `polls` | Otro equipo | [TomasCano-Usm/INF326-Microservicio-Polls](https://github.com/TomasCano-Usm/INF326-Microservicio-Polls) | Encuestas con votos y cierre |

Enunciado: [rmasad/microservicios · 06_Interfaz](https://github.com/rmasad/microservicios/tree/main/06_Interfaz).

## Arquitectura

```
Navegador ──/graphql──► interface (nginx, :3000) ──► gateway (FastAPI + Ariadne, :5000)
                                                        │  REST (httpx) por la red `microsvcs`
        ┌──────────┬──────────┬───────────┬─────────────┼──────────┐
      users    channels    messages    integrals     threads     polls
                              │  chat.message.created      ▲
                              └──────── RabbitMQ ──────────┘ (integralbot responde en el canal)
```

- **Solo el gateway conoce los contratos REST.** La interfaz habla únicamente GraphQL con el
  mismo origen (`/graphql`), que nginx reenvía al gateway; no hay CORS ni URLs de servicios en
  el navegador.
- **Agregación:** una consulta `messages` devuelve cada mensaje con su autor (`users`), su
  encuesta si es un anuncio de Polls (`polls`) y la cantidad de respuestas (`threads`). Las
  lecturas repetidas dentro de una consulta se deduplican (el autor de 30 mensajes se pide 1 vez).
- **Degradación parcial:** si `users`, `threads` o `polls` fallan, esos campos vuelven `null` y
  el chat sigue funcionando; la interfaz lo indica en cada mensaje y en el panel *Servicios*.
  Un *circuit breaker* de 5 s evita esperar el timeout de un servicio caído en cada consulta.
- **Errores:** los errores de un servicio llegan como errores GraphQL con
  `extensions.service` y `extensions.status`, y la interfaz muestra el mensaje del servicio
  (p. ej. *"El usuario ya votó en esta encuesta."* de Polls).

### Integración sin modificar los repos de otros equipos

`scripts/up.sh` clona cada servicio en `services/` en el commit fijado en
[`integration/services.txt`](integration/services.txt) y lo levanta con su propio compose más un
override de [`integration/overrides/`](integration/overrides/):

- **Puertos:** `integrals`, `threads` y `polls` publican la API en el 8004 y RabbitMQ en el
  15672. Se reasignan: threads → 8005 / 15673, polls → 8006 / 15674, y Postgres de polls no se
  publica.
- **Red:** el compose de Polls no se une a `microsvcs`; el override agrega su API con el alias
  `polls` y habilita `MESSAGES_ENABLED` para que anuncie las encuestas en el canal.
- **Nombres repetidos:** el broker de Polls también se llama `rabbitmq`, igual que el de
  integrals en `microsvcs`; su API usa el alias `polls-rabbitmq` de su red propia para no
  conectarse al broker equivocado.

El chat base está copiado en [`base/`](base/) con dos correcciones explicadas en su README
(sin ellas `messages` no publica `chat.message.created` y el bot de integrales no responde).

## Ejecutar

Requisitos: Docker con Compose ≥ 2.24 (usa `!override`), Git y Bash (Git Bash en Windows) o
PowerShell.

```bash
./scripts/up.sh
```

En PowerShell: `.\scripts\up.ps1`. Para detener: `./scripts/down.sh` (agrega `-v` para borrar
los datos).

| Componente | URL |
| --- | --- |
| **Interfaz** | http://localhost:3000 |
| API Gateway (GraphQL) | http://localhost:5000/graphql |
| users · channels · messages | :8001 · :8002 · :8003 (`/docs`) |
| integrals · threads · polls | :8004 · :8005 · :8006 (`/docs`) |

Para trabajar en la interfaz con recarga en caliente (con el resto del sistema arriba):

```bash
cd interface/app && npm ci && npm run dev    # http://localhost:3000, reenvía /graphql al :5000
```

## Despliegue en el clúster del curso

Versión desplegada: **http://chat-integrales.134.199.176.3.nip.io**

El gateway y la interfaz corren en el namespace del grupo (`grupo-catch-up`) y usan los
servicios ya desplegados por cada equipo, por DNS interno:

| Servicio | Dirección en el clúster |
| --- | --- |
| users · channels · messages | `http://{users,channels,messages}.servicios-base.svc.cluster.local:8000` |
| integrals | `http://integrals.grupo-catch-up.svc.cluster.local` |
| threads | `http://thread-api.grupo-threads.svc.cluster.local:8000` |
| polls | `http://polls.grupo-encuestas.svc.cluster.local:8004` |

- Cada push a `main` corre las pruebas y publica las imágenes en GHCR
  (`ghcr.io/bolgunn/interfaz-chat-{gateway,interface}`, tags `v1` y SHA) con
  [`.github/workflows/images.yml`](.github/workflows/images.yml).
- Los manifiestos están en [`k8s/`](k8s/): Deployment + Service de cada componente e Ingress
  Traefik. Los contenedores corren sin root (política `restricted`) y caben en la cuota del
  namespace.
- Requiere un kubeconfig con acceso a `grupo-catch-up` (en `~/.kube/config`, **nunca** dentro
  del repo).

```bash
kubectl apply -k k8s/
kubectl rollout restart deploy/gateway deploy/interface -n grupo-catch-up   # tras publicar una imagen nueva
```

**Limitación conocida en el clúster:** el `messages` de `servicios-base` no tiene
`RABBITMQ_URL`, así que no publica `chat.message.created` y `integralbot` no responde a
`/integralcalc` escrito en el chat. La calculadora (REST) funciona igual; en local (compose)
el flujo por chat sí funciona porque el chat base de `base/` publica los eventos.

## Funcionalidades

- **Identidad:** crear un usuario o entrar con un ID existente; el navegador recuerda los
  usuarios usados para cambiar entre ellos (útil para votar como varias personas).
- **Canales y mensajes:** listar y crear canales, enviar mensajes, actualización cada 2,5 s.
- **Integrales:** botón *Integral* en el chat (`/integralcalc …` con vista previa LaTeX); la
  respuesta de `integralbot` se dibuja con KaTeX. Página *Calculadora de integrales* con vista
  previa, ejemplos, resultado simbólico y numérico, e historial paginado y filtrable.
- **Hilos:** responder a cualquier mensaje en un panel lateral; el mensaje muestra cuántas
  respuestas tiene.
- **Encuestas:** crear (2–10 alternativas, duración), votar con barras de resultado en vivo,
  cuenta regresiva, cierre por el autor y pestaña *Encuestas* con todas las del canal.
- **Estado de servicios:** panel con la salud de cada microservicio, consultado al gateway.
- Tema claro/oscuro y diseño adaptable a móvil.

## API GraphQL

Esquema completo en [`gateway/app/schema/schema.graphql`](gateway/app/schema/schema.graphql).

| Query | Mutation |
| --- | --- |
| `services`, `user`, `channels`, `channel`, `messages` | `createUser`, `createChannel`, `sendMessage` |
| `replies` | `createReply` |
| `integrals`, `integral` | `calculateIntegral` |
| `poll`, `polls(channelId)` | `createPoll`, `votePoll`, `closePoll` |

Polls no tiene endpoint para listar encuestas: `polls(channelId)` y `Message.poll` leen el
`Poll ID` de los anuncios que Polls publica en el canal.

## Pruebas

```bash
cd gateway
python -m venv .venv && . .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python -m pytest
```

Las pruebas usan servicios simulados (`httpx.MockTransport`): agregación, deduplicación,
degradación con servicios caídos, circuit breaker, traducción de errores y mutaciones.

## Estructura

```
base/          chat base del curso (dueño de la red microsvcs)
gateway/       API Gateway GraphQL (FastAPI + Ariadne + httpx)
interface/     interfaz React + Vite + Chakra UI + Apollo Client, servida por nginx
integration/   commits fijados y overrides de compose de los servicios externos
scripts/       up / down de todo el sistema
docs/          guion del video
```
