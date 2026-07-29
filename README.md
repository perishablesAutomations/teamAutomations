# Panel de tareas — Customer Solutions

Panel web que muestra las tareas del equipo (sincronizadas desde Microsoft Planner), organizadas por depósito, con objetivo del mes destacado, banco de frases del equipo y notificaciones del navegador.

🔗 **Panel en vivo:** https://perishablesautomations.github.io/teamAutomations/tareas.html

---

## Cómo funciona (arquitectura)

```
Power Automate (Planner, todos los días 8:30am)
   → resuelve depósito (bucket), etiqueta (categoría de color), prioridad, descripción
   → POST a n8n

n8n (https://n8n-production-fbb1.up.railway.app)
   ├─ Flujo "Task planner"    → clasifica tareas y comitea tareas.json a este repo
   ├─ Flujo "Frases equipo"   → Data Table + webhooks (guardar / traer al azar / listar)
   └─ Flujo "Objetivo del mes"→ Data Table + webhooks (guardar / traer actual)

GitHub Pages (este repo)
   └─ tareas.html: lee tareas.json (estático) + llama en vivo a los webhooks de n8n
      para objetivo, frases y notificaciones
```

### Clasificación de tareas

Cada tarea llega con un campo `deposito`, resuelto en Power Automate a partir del **bucket** de Planner:

| Bucket en Planner contiene... | deposito |
|---|---|
| "diaria" | `diaria` |
| "semanal" | `semanal` |
| "mensual" | `mensual` |
| "backlog" | `backlog` |
| (cualquier otro / sin bucket) | `sin_deposito` |

La **prioridad** (escala de Planner 1–10) se muestra como badge en cada tarjeta y sirve como referencia para decidir, en los dailys, qué tareas de la semana se deben "subir" a diarias (ese movimiento se hace manualmente en Planner, cambiando el bucket de la tarea).

Las **etiquetas** vienen de las categorías de color de Planner, renombradas en el plan (`category1`, `category2`, etc. → nombre visible).

---

## Webhooks de n8n usados por el panel

| Acción | Método | URL |
|---|---|---|
| Objetivo actual | GET | `.../webhook/objetivo-actual` |
| Guardar objetivo | POST | `.../webhook/objetivo` |
| Listar frases | GET | `.../webhook/frases-listar` |
| Frase al azar | GET | `.../webhook/frase-random` |
| Guardar frase | POST | `.../webhook/frases` |

Todos responden con header `Access-Control-Allow-Origin: *` para que el navegador pueda llamarlos directo desde GitHub Pages.

---

## Notificaciones — cómo funcionan

- Son notificaciones **del navegador** (Notification API), **no** push reales: solo llegan si la pestaña de `tareas.html` está abierta.
- Al cargar la página (con permiso concedido), se notifica cada tarea de **Diarias** que no se haya notificado ya ese día, acompañada de una frase al azar del banco del equipo.
- Además, se programan **2 notificaciones sueltas** por día, en horarios aleatorios entre 9am y 6pm, solo con una frase motivacional.
- El registro de "ya notificado hoy" vive en `localStorage` del navegador de cada persona — se reinicia solo al cambiar de día.

### Si a alguien no le llegan las notificaciones

Revisar en este orden:

1. **Permiso del sitio en el navegador:** ícono de candado/info junto a la URL → Notificaciones → debe decir "Permitir".
2. **Notificaciones de Windows para el navegador:** Configuración de Windows → Sistema → Notificaciones → buscar el navegador (Edge/Chrome) → debe estar activado, incluyendo "mostrar banners", no solo el centro de notificaciones.
3. **Asistente de enfoque / No molestar (Windows) o Focus (Mac):** si está activo, puede silenciar los avisos aunque el navegador los "envíe" — desactivarlo o revisar sus reglas.
4. **Prueba directa en consola** (F12 → Console, con la pestaña del panel abierta):
   ```javascript
   new Notification('Prueba', { body: 'Si ves esto, funciona' });
   ```
   Si esto no muestra nada, el problema es del sistema operativo, no del panel.
5. **Registro atascado:** si ya se probó varias veces en el mismo día y parece que "dejó de notificar", limpiar con:
   ```javascript
   localStorage.removeItem('notif_enviadas');
   location.reload();
   ```

---

## Mantenimiento

- **Agregar más etiquetas de color:** si el equipo nombra más categorías en Planner (más allá de `category1`–`category3`), hay que ampliar la expresión de la variable `Etiqueta` en el flujo de Power Automate para incluirlas.
- **Cambiar el horario de sincronización:** ajustar el trigger `Recurrence` en Power Automate (actualmente 8:30am todos los días).
- **Notificaciones que lleguen con la pestaña cerrada:** requeriría migrar a Web Push real (Service Worker + claves VAPID + que n8n envíe el push), no implementado en esta versión por simplicidad.
