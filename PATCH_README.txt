BANDA DE LA CALA · v0.52 · PATCH DESDE v0.51
============================================

Este PATCH debe copiarse sobre una instalación v0.51 conservando la estructura de carpetas.

CAMBIOS PRINCIPALES
-------------------
- QUINA NOTA ÉS? sustituido por la integración del HTML v15 definitivo.
- Ciclo diario 03:00→03:00 Europe/Madrid.
- MINIJOCS público para invitados.
- Solo los USERS registrados guardan puntos y resultados.
- Parrilla MINIJUEGOS 2×2 con marcador por card.
- Icono + título + descripción de QUINA NOTA ÉS? editables desde EDITOR.
- Puntos eliminados de la sección USUARI.
- USERS del EDITOR mantienen las tiras compactas y PENDENT DE CONFIGURAR.

SUPABASE — PASO OBLIGATORIO
---------------------------
Ejecutar UNA VEZ:

  SUPABASE_UPDATE_v0.52.sql

en Supabase > SQL Editor.

Consulta SUPABASE_v0.52_PASOS.txt.

No hay que tocar Auth, SMTP, roles ni la Edge Function create-band-user.

AUDIO DEL MINIJUEGO
-------------------
El juego espera estos archivos en:

  assets/AUDIO/QNE_intro.mp3
  assets/AUDIO/QNE_BGmusic.mp3
  assets/AUDIO/QNE_correcte.mp3
  assets/AUDIO/QNE_error.mp3

Si ya están en GitHub en esa ruta, no hay que cambiar nada más.
