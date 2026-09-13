# AGENTS.md

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

---

# Estado del proyecto (guardado 2026-09-13)

## Qué es
App móvil colaborativa del hogar en Expo (SDK 57, React Native 0.86.3, React 19.2.3, TypeScript strict). Código en la carpeta `app-movil`.

## Repositorio
- GitHub: `https://github.com/evaps1003/app-hogar` (PRIVADO, rama `main`).
- Commit base: `39bd2c9` "feat: app de tareas del hogar".
- No usar `gh` (no instalado); para push se autentica con token PAT clásico (usuario `evaps1003`) o credenciales Basic. El token usado en el setup quedó expuesto y debe revocarse en GitHub → Developer settings.

## Comandos
- Windows PowerShell: usar `npm.cmd` / `npx.cmd` (npm.ps1 está bloqueado).
- Typecheck: `npx.cmd tsc --noEmit`
- Metro en `0.0.0.0:8081`. Smoke test del bundle: `curl.exe "http://localhost:8081/index.bundle?platform=android"` → HTTP 200 (las cadenas nuevas se comprueban con `.Contains()` sobre el JS descargado).

## Arquitectura
- Navegación: bottom-tabs flotante (Hoy, Tareas, Calendario, Compras, Ajustes) en `src/navigation/RootNavigator.tsx`.
- Estado: `src/data/HouseholdContext.tsx` (miembros + rol + miembro activo) y `src/data/TaskContext.tsx` (tareas). AsyncStorage: `hogar.household.v1`, `hogar.tasks.v2` (sin bump; `schedule`/`rotacion` opcionales).
- Seed: Laura (leader, primary), Papá (coadmin, accent), Hermano (supervised, highlight); tarea rotativa "Limpiar la cocina".
- Tema pastel: `src/theme/` (palettes, tokens, useTheme). Tokens: radius (`sm 12, md 16, lg 24, xl 32, pill 999`), shadows (`card/soft/floating`), colores por miembro (`primary/highlight/accent` + `*Soft`/`*Strong`).

## Modelo de datos (`src/data/types.ts`)
- `Member { id, name, color, householdRole }`; roles: `leader`, `coadmin`, `supervised`.
- `DayOfWeek = 0|1|2|3|4|5|6` (0=Domingo).
- `TaskSchedule = { type:'scheduled', days, time, repeatWeekly, weekKey? } | { type:'flexible', weekKey }`.
- `RotatingTurn { esRotativa, miembrosTurno, indiceTurnoActual, frecuenciaRotacion, fechaInicioCiclo, proximaRotacion }` (campos en español por petición del usuario; resto del código en inglés).
- Utilidades de semana en `src/data/schedule.ts`: `DAY_LABELS/SHORT/LONG`, `WEEKDAY_ORDER=[1..6,0]`, `getCurrentWeekKey()` (`YYYY-Www`), `formatSchedule`.

## Reglas de negocio
- Supervisado no crea tareas (FAB oculto en Tareas y Hoy + guard en `addTask`); `canCheckTask` solo si es libre o `assigneeId === activeMember.id`.
- Roles editables solo por Líder/Co-admin (`MemberRoleSheet`); Supervisado ve la lista de solo lectura.
- Hoy es vista personal: `dueOn(day)` filtra `assigneeId === activeMember.id`; tareas sin `schedule` solo el día de hoy; flexibles nunca en el bloque de día. Bolsa común global.
- Puntuales (`scheduled` sin `repeatWeekly`) llevan `weekKey` y expiran al cambiar de semana (`isTaskVisible`).
- Ciclos: `applyCycleMaintenance` (al cargar) rota turnos si `now >= proximaRotacion` (catch-up máx 52) y reabre `repeatWeekly` completadas hace ≥7 días. Test manual: "Avanzar turnos" en Ajustes.
- Recurecia formulario: pills `[Semanal 7][Quincenal 15][Mensual 30]` + "Cada [X] días" para rotativas; días `L M X J V S D` + hora + repetir semana para fijas.

## Estructura
- `src/screens/`: HoyScreen (tira de días `DayStrip` + 3 tarjetas con estados vacíos ✨), TareasScreen (segmented `[Reparto|Vista Semanal]`, reparto por miembro colapsable + Bolsa), CalendarioScreen (independiente para eventos/avisos), ComprasScreen, AjustesScreen (roles + debug "Avanzar turnos").
- `src/components/`: DayStrip (chips Lun-Dom), WeeklyView (7 columnas horiz.), TaskPill (pastillas pastel con inicial), TaskRow, NewTaskForm (acepta `initialDay`), SectionCard, Screen, BottomSheet, MemberBadge/Avatar, etc.
- `src/icons`/expo: `Ionicons` desde `@expo/vector-icons`.