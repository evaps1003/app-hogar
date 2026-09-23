# AGENTS.md

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

---

# Estado del proyecto (guardado 2026-09-17)

## Qué es
App colaborativa del hogar en Expo (SDK 57, React Native 0.86.3, React 19.2.3, TypeScript strict). Código en la carpeta `app-movil`. También se exporta a web (PWA) para GitHub Pages.

## Repositorio
- GitHub: `https://github.com/evaps1003/app-hogar` (PÚBLICO, rama `main`). GitHub Pages activado desde la rama `gh-pages`; URL en vivo: `https://evaps1003.github.io/app-hogar/`.
- No usar `gh` (no instalado); el push autentica sin prompt (credenciales en Windows Credential Manager): `$env:GIT_TERMINAL_PROMPT='0'; git push origin main`.

## Comandos
- Windows PowerShell: usar `npm.cmd` / `npx.cmd` (npm.ps1 está bloqueado). El `.npmrc` global fija `allow-scripts=opencode-ai`; si `expo install` falla con `EALLOWSCRIPTS`, instalar a mano con `npm.cmd install <pkg> --save`.
- Typecheck: `npx.cmd tsc --noEmit`
- Metro en `0.0.0.0:8081`. Smoke test del bundle: `curl.exe "http://localhost:8081/index.bundle?platform=android"` → HTTP 200 (las cadenas nuevas se comprueban con `.Contains()` sobre el JS descargado; Metro escapa los acentos: `é`→`\xE9`, `¿`→`\xBF`, emojis→`\u2728`/sustitutos).
- Web/PWA: `npm run build:web` (`expo export -p web` → `dist/`), `npm run deploy` (`gh-pages --nojekyll -d dist`). CI: `.github/workflows/deploy-pages.yml` publica en la rama `gh-pages`.

## Arquitectura
- Navegación: bottom-tabs flotante (Hoy, Tareas, Compras, Ajustes) en `src/navigation/RootNavigator.tsx`.
- Estado (AsyncStorage): `hogar.household.v1` (`HouseholdContext`: miembros + rol + miembro activo + `homeId` + avisos), `hogar.tasks.v2` (`TaskContext`), `hogar.shopping.v1` (`ComprasContext`), `hogar.devTools.v1`, `hogar.sync.v1` (meta de sincronización), `my_device_member_id` (identidad por dispositivo).
- `AppShell` (en `App.tsx`) bloquea la app hasta cargar y muestra `WelcomeScreen` en dos modos hasta fijar `my_device_member_id`: **crear** (sin hogar guardado ni enlace de invitación → "Crear mi hogar": nombre, "¿Cómo te llamas?" + color pastel, `[Comenzar]`, crea hogar nuevo y el primer miembro es Líder) o **unirse** (llegó por enlace de invitación o el hogar ya existe → "¿Quién eres?" con lista de miembros + alta). **No hay seed**: instalaciones nuevas no crean miembros/tareas de prueba (Laura/Papá/Hermano ya no existen; los usos que ya tengan datos en `hogar.*` se conservan).
- Invitación: `buildInviteUrl({ homeId, householdName, members })` empaqueta el estado del hogar en `?invite=<base64/json>`; al unirse, `readJoinContext()` lo decodifica y adopta ese hogar (nombre + miembros) aunque el dispositivo esté vacío. `?join_home=<id>` se mantiene como compatibilidad.
- Tema pastel: `src/theme/` (palettes, tokens, useTheme). Tokens: radius (`sm 12, md 16, lg 24, xl 32, pill 999`), colores por miembro (`primary/highlight/accent` + `*Soft`/`*Strong`).

## Modelo de datos (`src/data/types.ts`)
- `Member { id, name, color, householdRole }`; roles: `leader`, `coadmin`, `supervised`.
- `HouseData { members, activeMemberId, homeId?, categories?, householdName?, notices? }` (nuevos campos opcionales; no se bumpea la clave).
- `HouseNotice { id, text, createdBy, createdAt, duration, hours?, expiresAt }`; duraciones `hours|today|week|never` (utilidades en `src/data/notices.ts`).
- `TaskSchedule` (scheduled/flexible/once) y `RotatingTurn` (campos en español por petición; resto en inglés). Semana en `src/data/schedule.ts` (`DAY_LABELS`, `getCurrentWeekKey()`).
- Compras: `ShoppingList`, `ShoppingItem { ..., rotation? }`, `ShoppingRotation { memberIds, currentIndex }`, `GroceryExpense`, categorías, `settledByList`.

## Herramientas ocultas (dev)
- `DevToolsContext`: se activa con `?debug=true` o `?test=true` en la URL, o con **5 toques** sobre el título "Ajustes" o el pie `v1.0.0`.
- `DevToolsPanel` en Ajustes: Simulador de Usuario Activo (chips) y `[ ⏭️ Avanzar turnos ]` = `advanceAllTurns()` (TaskContext) + `advanceShoppingRotation()` (ComprasContext).

## Web / PWA / GitHub Pages
- `app.json`: `web.output: 'single'`, `bundler: 'metro'`, `experiments.baseUrl: '/app-hogar'` (subdirectorio de GH Pages). Dependencias web: `react-dom`, `react-native-web`, `expo-clipboard`.
- `public/index.html` (plantilla personalizada vía `npx expo customize`): rutas relativas `./manifest.json`, `./icon-192.png`, registro de `./sw.js`; con placeholders `%WEB_TITLE%`, `%LANG_ISO_CODE%`.
- `public/manifest.json`, `public/sw.js` (cache-first con fallback offline), `icon-192/512.png` (= `assets/icon.png`). Todo se copia automáticamente a `dist/` al exportar.
- Urls de parámetros/invitación: `src/data/webLink.ts` (`getUrlParam`, `buildInviteUrl`); identidad de dispositivo: `src/data/device.ts` (`my_device_member_id`, AsyncStorage + localStorage en web).

## Reglas de negocio
- Identidad por dispositivo: `assignDeviceMember` fija `my_device_member_id` y `activeMemberId`; reasignable desde Ajustes (chip "Eres tú" solo visual). `createHousehold` crea hogar + primer miembro (rol Líder) + identidad del dispositivo en un solo paso. Las tareas en instalaciones nuevas arrancan vacías (sin miembros de prueba).
- Supervisado no crea tareas (FAB oculto + guard en `addTask`); `canCheckTask` solo si es libre o `assigneeId === activeMember.id`. Roles editables solo por Líder/Co-admin (`MemberRoleSheet`).
- Hoy es vista personal: `dueOn(day)` filtra `assigneeId === activeMember.id`; bolsa común global; avisos vigentes del Tablón en pastillas amarillas (`highlightSoft`, `📌 Aviso:`).
- Tablón del hogar en Ajustes: `addNotice/updateNotice/deleteNotice`, purge de caducados cada 30 s; solo el Líder gestiona miembros y renombra el hogar.
- Ciclos de turnos: `applyCycleMaintenance` rota al cargar si `now >= proximaRotacion`; test manual "Avanzar turnos" (panel dev).

## Sincronización entre dispositivos (Supabase)
- Objetivo: compartir hogar/tareas/compras/avisos entre móviles. Rellenar `src/data/syncConfig.ts` (`SUPABASE_URL` + `SUPABASE_ANON_KEY`); con ambos vacíos la sync queda deshabilitada y la app sigue 100% local (no hacer fetch ni push).
- Cliente REST propio en `src/data/supabase.ts` con `fetch` (NO instalar `@supabase/supabase-js`: su `realtime-js`/`ws` hace fallar el bundle de Metro con `UnableToResolveError: stream`). `SUPABASE_URL` debe ser la URL REST completa de Supabase: `https://<ref>.supabase.co/rest/v1`.
- Tabla: `homes(home_id text primary key, data jsonb not null)` + RLS abierto a anon (SELECT/INSERT/UPDATE/DELETE con `using (true)`).
- `SyncContext.tsx` (`SyncProvider` dentro de `ComprasProvider`, antes de `DevToolsProvider`): poll 4 s, push en debounce 700 ms, last-writer-wins por `updatedAt` (meta local `hogar.sync.v1`), guard `applyingRef` contra bucles de eco; al aplicar el estado remoto se conserva `my_device_member_id` como `activeMemberId` si el miembro existe. Primer sync de un hogar: si ya existe fila en la nube se prefiere el remoto (meta `updatedAt: 0`) para que el invitado no pise los datos reales del anfitrión; si no existe fila, se siembra con el estado local (`Date.now()`).
- Los tres contextos exponen snapshot/replace: `houseSnapshot`/`replaceHouseState` (`HouseholdContext`), `tasksSnapshot`/`replaceTasksState` (`TaskContext`), `shoppingSnapshot`/`replaceShoppingState` (`ComprasContext`). La carga de Compras ya NO depende de `members` (evita pisar datos sincizados con un reload).
- Indicador en el pie de Ajustes: "☁️ Datos sincronizados con el hogar" / "☁️ Sincronización sin configurar".

## Estructura
- `src/screens/`: HoyScreen (tira de días + tarjetas ✨), TareasScreen (Reparto + Bolsa), ComprasScreen (listas, donut, gastos), AjustesScreen (apariencia, Tablón, miembros/roles, invitación, panel dev oculto + pie de versión). `src/components/WelcomeScreen` ("¿Quién eres?").
- `src/components/`: DayStrip, TaskPill, TaskRow, NewTaskForm, SectionCard, Screen, BottomSheet, MemberAvatar, MemberRoleSheet, NoticeSheet, devToolsPanel, WelcomeScreen, etc. Iconos: `Ionicons` desde `@expo/vector-icons`; donut con `react-native-svg`.