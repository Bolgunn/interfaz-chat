# Chat base (users, channels, messages)

Copia del chat base del curso (`03_Comunicación/demo` de
[rmasad/microservicios](https://github.com/rmasad/microservicios)) con dos ajustes
que ya usábamos en el módulo de integrales:

- `insert_one({**doc})` en vez de `insert_one(doc)`: el original agrega `_id` (ObjectId)
  al diccionario que luego devuelve y publica, lo que rompe la respuesta y el evento.
- `messages` recibe `RABBITMQ_URL` para publicar `chat.message.created` en el exchange
  `chat`. El broker `rabbitmq` lo levanta el stack de `integrals`.

Este compose es el dueño de la red `microsvcs`, así que se levanta primero.
