# ONBOARDING (RU): Sillyworld / SillyRPG

## 🚀 Прочитай это первым (5 минут)

1. **Запуск и orchestration приложения:**
   - `src/standalone.ts` → `startApp()`.
   - `src/app.ts` (`ApplicationSession`) — решает, какой экран отрисовать.
   - `src/core/app/AppController.ts` — жизненный цикл: init/new game/load/combat test.
2. **Ключевые пользовательские экраны:**
   - `src/ui/screens/mainMenu.ts` (главное меню),
   - `src/ui/screens/phoneMap/phoneCityMapScreen.ts` + `worldMapViewport.ts` (телефонная карта),
   - `src/ui/screens/sceneViewScreen.ts` (3D-сцена).
3. **3D runtime и переключение режимов:**
   - `src/ui/rendering/scene/sceneRuntime.ts` (exploration ↔ combat),
   - `src/ui/rendering/scene/districtExplorationRuntime.ts` (загрузка сцены + игрок + враг),
   - `src/ui/rendering/combat/combatRuntime.ts` (тактический бой).
4. **Игровой стейт и бизнес-логика:**
   - `src/world/worldStore.ts` (единый фасад действий/селекторов),
   - `src/world/worldState.ts` (создание GameState),
   - `src/world/time/*`, `src/world/map/*`, `src/world/combat/*`, `src/world/enemy/*`.
5. **Что читать для конкретных правок:** см. раздел **«Если нужно менять X — иди сюда»**.

---

## 1) Обзор проекта

### Что делает проект

**Sillyworld** — standalone браузерная RPG на Vite + TypeScript, где есть:
- меню запуска/продолжения,
- карта мира в виде телефонного UI,
- 3D-исследование района,
- автоматический переход в тактический combat,
- локальные сохранения world state,
- debug/test сценарий «Test Combat».

Основа доменной модели — `GameState` (`src/world/contracts.ts`), который содержит `world`, `player`, `maps`, `setting`, `items`, `characters`.

### Главный runtime-flow (сверху вниз)

1. Vite грузит `index.html`, который импортирует `src/standalone.ts`.
2. `standalone.ts` вызывает `startApp()` из `src/app.ts`.
3. `ApplicationSession.start()` показывает корень UI, затем `AppController.initialize()`.
4. После инициализации `ApplicationSession.render()` выбирает экран по `navigation.state.screen`:
   - `mainMenu`,
   - `map`,
   - `scene`,
   - `settings`.
5. На экране `scene` монтируется `SceneViewScreen`, который вызывает `mountSceneRuntime(...)`.
6. `SceneRuntime` поднимает exploration runtime; при определённых условиях переключает в combat runtime.

### Архитектура верхнего уровня

- **Orchestration/Application layer**: `src/app.ts`, `src/core/app/*`, `src/core/navigation/*`.
- **Domain/Business layer**: `src/world/*` (время, навигация, доступность локаций, бой, perception, inventory, persistence).
- **UI + Rendering layer**: `src/ui/*` (экраны, Babylon runtime, input контроллеры, debug overlays).
- **Platform adapters**: `src/platform/browser/*` (seed loader, local persistence, asset URL resolver).
- **Assets**: `assets/*`, ключи через `src/core/assets/assetCatalog.ts`.

---

## 2) Точки входа и порядок bootstrap

## Основные entry points

- **HTML entry:** `index.html`.
- **TS entry:** `src/standalone.ts`.
- **App root:** `src/app.ts`.

## Как приложение стартует

1. `bootstrapStandalone()` (`src/standalone.ts`) логирует старт и вызывает `startApp()`.
2. `startApp()` (`src/app.ts`) вызывает `session.start()`.
3. `ApplicationSession.start()`:
   - `showRoot()` (`src/ui/mount.ts`),
   - `await controller.initialize()`.
4. `AppController.initialize()` (`src/core/app/AppController.ts`) гарантирует загрузку seed через `loadSeedOnce()`.
5. `onStateChange` из `AppController` вызывает `session.render()`.

## Кто bootstrap'ит систему

- `AppController` создаётся как singleton-подобный инстанс в `src/app.ts` с deps:
  - `worldStore` (из `src/world/worldStore.ts`),
  - `mapLevel` (`MAP_LEVEL`),
  - `loadSeed()` (`src/platform/browser/seedLoader.ts`),
  - `createStandalonePersistence()` (`src/platform/browser/localPersistence.ts`),
  - callback рендера.

## Порядок инициализации (new game)

`MainMenu -> AppController.startNewGame()`:
1. `loadSeedOnce()`.
2. `worldStore.init(seed)` + `store.reset(seed)`.
3. Из state строится map navigation (`buildMapNavState(...)`).
4. `store.save(persistence.storage)`.
5. `requestRender()`.

---

## 3) Карта папок и модулей

### Корневые директории

- `src/` — рабочий код приложения.
- `tests/` — unit tests (Node test runner).
- `docs/` — архитектурные/технические заметки.
- `assets/` — glb/blend/png/svg ассеты.

### Внутри `src/`

- `src/core/`
  - `app/AppController.ts` — orchestration use-cases приложения.
  - `navigation/*` — навигационный state и переход из карты в сцену.
  - `debug/combatTestBootstrap.ts` — параметры debug-запуска боя.

- `src/world/` (**ядро домена**)
  - `worldStore.ts` — фасад ко всем действиям и селекторам.
  - `worldState.ts` — factory `createGameState`.
  - `contracts.ts` — доменные типы.
  - `time/*`, `map/*`, `player/*`, `inventory/*`, `relationship/*` — бизнес-правила.
  - `combat/*` — turn manager, grid, action resolver, combat mapping.
  - `enemy/*` — perception и patrol/ambient behavior.
  - `spatial/*`, `movement/*`, `input/*` — пространственные вычисления и input policy.

- `src/ui/`
  - `screens/*` — экранная система (main menu / map / scene).
  - `rendering/scene/*` — 3D exploration runtime.
  - `rendering/combat/*` — 3D combat runtime + input/overlays.
  - `rendering/player/*`, `rendering/enemy/*`, `rendering/shared/*` — загрузка/движение/нормализация сущностей.
  - `components/*` — UI-компоненты (topbar, atlas button).

- `src/platform/browser/`
  - `seedLoader.ts` — загрузка `world/seed_world.json` через `fetch`.
  - `localPersistence.ts` — localStorage с fallback на in-memory.
  - `assetResolver.ts` — построение URL ассетов.

- `src/shared/`
  - `types.ts` — общие контракты между слоями (AppController, navigation, scene launch options).

---

## 4) Проход по ключевым системам

## 4.1 Управление приложением и экранами

**Что делает:** держит глобальный UI flow и state переходов между `mainMenu/map/scene/settings`.

**Entry point:** `ApplicationSession.render()` (`src/app.ts`).

**Ключевые элементы:**
- `AppController` (`src/core/app/AppController.ts`) — use-cases:
  - `initialize`, `startNewGame`, `loadAndResumeGame`, `startCombatTest`, `back`.
- `NavigationController` (`src/core/navigation/NavigationController.ts`) — mutable nav state.
- `ScreenManager` (`src/ui/screens/screenSystem.ts`) — mount/unmount экранов.

**Кто вызывает:** кнопки меню + callback `onStateChange`.

**Данные in/out:**
- in: seed, storage, нажатия UI.
- out: изменение navigation state, рендер нужного экрана, save/load store.

---

## 4.2 Система world state / store

**Что делает:** единая точка доступа к доменной логике и сохранению.

**Entry point:** `WorldStore` (`src/world/worldStore.ts`).

**Ключевые функции:**
- mutation API: `movePlayerToNode`, `performRestAction`, `setRelationship`, inventory actions, time actions.
- query API: `getNodesForLevel`, `getLocationAvailability`, `getNpcsForLocation`, `getTimePhase` и т.д.
- persistence API: `serialize/save/load/hydrate`.

**Кто вызывает:** `AppController`, UI-экраны и потенциально runtime hooks.

**Особенность:** `WorldStore` делегирует чистым функциям в подпапках `world/*` и после успешной операции делает `apply(nextState)` + `notify()`.

---

## 4.3 Система времени и фаз дня

**Что делает:** переводит `Morning/Day/Evening/Night`, считает шаги времени и очередь phase transitions.

**Entry point:** `advanceTime`, `advanceTimeBySteps`, `advanceToTimePhase` (`src/world/time/timeActions.ts`).

**Ключевые функции и поток:**
- `movePlayerToNode` (навигация) и `performRestAction` (отдых) вызывают time actions.
- `advanceTime` инкрементит `clock.step`, при wrap увеличивает `dayNumber`, добавляет transition через `appendPhaseTransitions`.
- `consumeNextPhaseTransition` (`src/world/map/phaseTransitionActions.ts`) вынимает pending переход для interstitial экрана.

---

## 4.4 Навигация по карте и доступность локаций

**Что делает:** перемещает игрока между map nodes и блокирует недоступные места.

**Entry point:** `movePlayerToNode` (`src/world/map/navigationActions.ts`).

**Ключевые шаги:**
1. Проверка target node и level (`district/building/room`).
2. Для district/building — `getLocationAvailability(...)`.
3. Если ок — обновляет `player.currentNodeId`.
4. Начисляет time cost (`getTimeCostForAction`) и двигает фазу времени.

**Кто вызывает:** `WorldStore.movePlayerToNode`.

---

## 4.5 Загрузка ассетов и Babylon runtime

**Что делает:**
- грузит Babylon скрипты с CDN,
- создаёт `engine/scene/camera`,
- резолвит asset paths.

**Entry points:**
- `ensureBabylonRuntime`, `createBabylonUiRuntime`, `createBabylonWorldRuntime` (`src/ui/rendering/scene/babylonRuntime.ts`),
- `resolveAssetPath/resolveCatalogAssetPath` (`src/platform/browser/assetResolver.ts`).

**Кто вызывает:** map screen и scene runtime.

---

## 4.6 Exploration runtime (3D сцена района)

**Что делает:** монтирует сцену, спавнит игрока/врага, обрабатывает движение и perception.

**Entry point:** `createDistrictExplorationRuntime(...)` (`src/ui/rendering/scene/districtExplorationRuntime.ts`).

**Ключевые шаги:**
1. `loadWorldScene` загружает GLB, создаёт `sceneContainer`.
2. `loadPlayerCharacter` + `spawnPlayerCharacter`.
3. `loadEnemyCharacter`, placement + snap к grid.
4. Настройка enemy patrol (`createEnemyAmbientBehavior`) и perception параметров.
5. Возврат runtime-объекта (`playerEntity`, `enemyEntity`, roots, mapper, dispose).

**Кто вызывает:** `SceneRuntime.#setupExplorationRuntime()`.

---

## 4.7 Player movement input в exploration

**Что делает:** клик по земле → target cell → путь → движение по waypoints.

**Entry points:**
- `SceneGroundMovementInput` (`sceneGroundMovementInput.ts`) — считывает pointer/pick.
- `PlayerMovementController` (`playerMovementController.ts`) — выполняет движение каждый frame.
- `createExplorationControlsBinder` (`explorationControlsBinder.ts`) — связывает input + movement + animation.

**Поток данных:**
- Input кладёт cell в `movementTargetState`.
- Controller читает target, строит path через `resolveCellPath`, двигает rootNode.
- По завершению очищает target и path.

---

## 4.8 Enemy perception и автозапуск боя

**Что делает:** каждый frame обновляет enemy behavior, проверяет видимость игрока (FOV + distance + LOS), запускает combat.

**Entry point:** `createPerceptionObserverBinder(...)` (`perceptionObserverBinder.ts`).

**Ключевые функции:**
- `updateEnemyAmbientBehavior` — патруль/фейсинг врага.
- `evaluateEnemyPerceptionPipeline` (`src/world/enemy/enemyPerception.ts`).
- При `playerCellVisible === true` вызывает `onCombatTriggered`.

**Кто вызывает:** `SceneRuntime.#setupExplorationRuntime()`.

---

## 4.9 Combat runtime

**Что делает:** turn-based бой на сетке с AP/MP/HP, движением, basic attack и простым enemy AI.

**Entry point:** `createCombatRuntime(...)` (`src/ui/rendering/combat/combatRuntime.ts`).

**Ключевые модули:**
- `createCombatTurnManager` (`src/world/combat/TurnManager.ts`) — порядок ходов, фазы раунда.
- `createCombatGrid` (`src/world/combat/combatGrid.ts`) — bounds, blocked/occupied, pathfinding, reachable cells.
- `createCombatActionResolver` (`src/world/combat/ActionResolver.ts`) — валидация/применение атаки.
- UI input:
  - `attachCombatPlayerMovementController`,
  - `attachCombatAttackInputController`.
- Debug/UI overlays:
  - combat HUD,
  - movement range highlighter,
  - grid overlay.

**Кто вызывает:** `SceneRuntime.enterCombatMode()`.

**Когда вызывается:**
- autoStartCombat (debug),
- detection через perception observer.

---

## 4.10 Переключение режимов сцены

**Что делает:** state machine runtime mode `loading -> exploration <-> transitioning <-> combat`.

**Entry points:**
- `SceneModeController` (`sceneModeController.ts`),
- `SceneRuntime.enterExplorationMode/enterCombatMode/exitCombatMode`.

**Особенности:**
- При входе в combat exploration controls detach.
- При выходе из combat ставится cooldown 750ms, затем возвращается exploration.
- `EncounterCoordinator` гарантирует, что бой не стартует повторно поверх активного.

---

## 4.11 Persistence и миграции

**Что делает:** сериализация, localStorage save/load, миграции версий schema.

**Entry points:**
- `WorldPersistence` (`src/world/worldPersistence.ts`),
- `migrateGameState` (`src/world/worldMigrations.ts`),
- `BrowserPersistenceService` (`src/platform/browser/localPersistence.ts`).

**Поток:**
- `AppController.startNewGame/loadAndResumeGame/consumePendingPhaseTransition` вызывает `store.save/load`.
- Ключ сохранения: `sillyrpg.save.v4`.

---

## 5) Разбор основных feature flows (пошагово)

## Flow A: Старт приложения

1. `standalone.ts` ждёт DOMContentLoaded и вызывает `startApp()`.
2. `ApplicationSession.start()` показывает root и делает `controller.initialize()`.
3. `initialize()` загружает seed (без init store).
4. `requestRender()` рисует `MainMenuScreen`.

## Flow B: New Game

1. Кнопка `New Game` в `renderMainMenu`.
2. `AppController.startNewGame()`:
   - seed load,
   - `worldStore.init(seed)` + `reset(seed)`,
   - строит nav на карту (`buildMapNavState`),
   - сохраняет state.
3. `ApplicationSession.render()` показывает `MapScreen`.

## Flow C: Открытие региона на карте

1. В `MapScreen` монтируется Babylon GUI и `createWorldMapViewport`.
2. Клик по pin вызывает `onRegionOpen(regionId)`.
3. `AppController.sceneTransitionController.onMapPinClick(regionId)`.
4. `SceneTransitionController` вызывает `onEnterScene`.
5. `AppController` ставит `navigation.screen='scene'`, `contextId=regionId`.
6. Рендерится `SceneViewScreen`.

## Flow D: Монтирование 3D сцены и exploration

1. `SceneViewScreen.mount()` вызывает `mountSceneRuntime(canvas, options)`.
2. `SceneRuntime.mount()`:
   - `#setupExplorationRuntime()`,
   - attach movement controls,
   - attach camera,
   - attach perception observer,
   - входит в exploration mode.

## Flow E: Автовход в бой

1. Observer в `perceptionObserverBinder` каждый кадр считает perception.
2. Если враг «видит» игрока, вызывает `onCombatTriggered`.
3. `SceneRuntime.enterCombatMode(...)`:
   - detach exploration controls,
   - создаёт combat runtime,
   - mode=combat,
   - регистрирует combat в `EncounterCoordinator`.

## Flow F: Ход боя

1. `combatState.startCombat()` запускает turn manager и `startTurn()`.
2. Для игрока включается режим MOVE по умолчанию.
3. Move/Attack input изменяют state через:
   - `combatState.tryMoveActiveUnit/completeUnitMovement`,
   - `combatState.tryBasicAttack`.
4. После `endTurn` enemy AI делает атаки/перемещения до исчерпания AP/MP.
5. `evaluateAndFinalizeCombat` определяет victory/defeat.
6. `onCombatEnd` в `SceneRuntime` вызывает `exitCombatMode()` → возврат в exploration.

## Flow G: Debug/Test Combat из меню

1. Кнопка `Test Combat`.
2. `AppController.startCombatTest()`:
   - инициализирует store seed,
   - заполняет `sceneLaunchOptions` из `COMBAT_TEST_BOOTSTRAP` (`autoStartCombat`, spawn/facing, skip patrol),
   - сразу переводит navigation на `scene`.
3. `SceneRuntime.mount()` видит `autoStartCombat === true` и вызывает `enterCombatMode` сразу после setup exploration.

---

## 6) Справочник ответственности классов/функций

| Символ | Ответственность | Почему существует | Кто использует |
|---|---|---|---|
| `startApp` (`src/app.ts`) | Запускает application session | Единая точка старта app | `src/standalone.ts` |
| `ApplicationSession.render` | Выбирает и монтирует экран | Централизация UI routing | callback `onStateChange`, init/start flows |
| `AppController` | Use-cases приложения + связка store/nav/persistence | Отделить orchestration от UI | `ApplicationSession` |
| `NavigationController` | Хранение состояния экрана и nav stack | Нужен back/level navigation | `AppController`, `ApplicationSession` |
| `WorldStore` | Фасад доменной логики + notify/persistence | Чтобы UI работал с одним API | `AppController`, UI слои |
| `createGameState` | Нормализованная сборка state из seed | Единый формат состояния | `WorldStore`, migrations |
| `movePlayerToNode` | Перемещение + проверка доступности + time cost | Бизнес-правило travel | `WorldStore.movePlayerToNode` |
| `advanceTime/advanceToTimePhase` | Изменение фаз/часов + transition queue | Унификация времени для всех действий | navigation/rest actions |
| `createDistrictExplorationRuntime` | Поднятие exploration сцены | Изолировать heavy setup | `SceneRuntime` |
| `createExplorationControlsBinder` | Связка input+movement+animation | Один attach/detach пункт | `SceneRuntime` |
| `createPerceptionObserverBinder` | Loop perception и trigger combat | Инкапсулировать кадровую проверку | `SceneRuntime` |
| `SceneRuntime` | Оркестрация exploration/combat режимов | Центральный runtime state machine | `SceneViewScreen` |
| `createCombatRuntime` | Полная сборка боя | Изоляция тактического режима | `SceneRuntime.enterCombatMode` |
| `createCombatTurnManager` | Фазы боя и порядок ходов | Отделить turn logic | `combatRuntime` |
| `createCombatGrid` | Walkability, occupancy, pathfinding | Переиспользуемая grid логика | movement/combat systems |
| `createCombatActionResolver` | Валидация и применение basic attack + исход боя | Чистая бизнес-логика боя | `combatRuntime` |
| `BrowserSeedLoader` | Fetch seed JSON | Отвязать загрузку seed от app слоя | `AppController` deps |
| `BrowserPersistenceService` | Local storage + fallback | Работать в средах без localStorage | `AppController` / `WorldStore` |

---

## 7) Зависимости и отношения между модулями

## Orchestration слои

- `src/app.ts` зависит от:
  - `core/app/AppController`,
  - UI screens,
  - `worldStore`,
  - browser adapters.

- `AppController` зависит от:
  - world store module,
  - navigation controllers,
  - persistence,
  - seed loader.

## Business logic

- `src/world/*` максимально независим от UI/Babylon.
- `worldStore.ts` — composition root домена, связывает actions + selectors + persistence.
- `time/map/player/combat/enemy` подсистемы mostly pure и тестируются в `tests/*.test.mjs`.

## Adapters / Infrastructure / rendering glue

- `platform/browser/*` — окружение браузера.
- `ui/rendering/*` — Babylon-specific код: input observers, mesh positioning, debug overlays.
- `core/assets/assetCatalog.ts` + `platform/browser/assetResolver.ts` — bridge между доменными ключами и URL.

## Граница UI ↔ Domain

- UI слой не изменяет `GameState` напрямую; должен идти через `WorldStore` API.
- Runtime scene/combat использует собственный runtime state (позиции, turn state) и связан с доменом через shared contracts и helpers, а не прямой записью в world seed.

---

## 8) «Если нужно менять X — иди сюда»

- **Изменить запуск/экранный flow:**
  - `src/app.ts`,
  - `src/core/app/AppController.ts`,
  - `src/core/navigation/*`,
  - `src/ui/screens/screenSystem.ts`.

- **Изменить карту телефона/пины/drag behavior:**
  - `src/ui/screens/phoneMap/phoneCityMapScreen.ts`,
  - `src/ui/screens/phoneMap/worldMapViewport.ts`,
  - `src/ui/screens/phoneMap/worldMapRegions.ts`.

- **Изменить загрузку 3D сцены/персонажей:**
  - `src/ui/rendering/scene/worldSceneLoader.ts`,
  - `src/ui/rendering/scene/districtExplorationRuntime.ts`,
  - `src/ui/rendering/player/playerCharacterLoader.ts`,
  - `src/ui/rendering/enemy/enemyCharacterLoader.ts`.

- **Изменить движение игрока в exploration:**
  - `src/ui/rendering/scene/sceneGroundMovementInput.ts`,
  - `src/ui/rendering/player/playerMovementController.ts`,
  - `src/world/movement/gridMovement.ts`,
  - `src/world/spatial/worldGrid.ts`.

- **Изменить perception/агро врага:**
  - `src/world/enemy/enemyPerception.ts`,
  - `src/world/enemy/enemyAmbientBehavior.ts`,
  - `src/ui/rendering/scene/perceptionObserverBinder.ts`.

- **Изменить механику боя (ходы, атака, перемещение):**
  - `src/ui/rendering/combat/combatRuntime.ts`,
  - `src/world/combat/TurnManager.ts`,
  - `src/world/combat/ActionResolver.ts`,
  - `src/world/combat/combatGrid.ts`.

- **Изменить время/фазы/переходы времени:**
  - `src/world/time/timeActions.ts`,
  - `src/world/map/phaseTransitionActions.ts`,
  - interstitial UI: `src/ui/screens/phaseTransitionInterstitial.ts`.

- **Изменить save/load/migrations:**
  - `src/platform/browser/localPersistence.ts`,
  - `src/world/worldPersistence.ts`,
  - `src/world/worldMigrations.ts`.

- **Изменить seed и дефолтный мир:**
  - `src/world/seed_world.json`,
  - `src/world/worldState.ts`,
  - `src/world/map/setting.ts`,
  - `src/world/map/maps.ts`,
  - `src/world/player/player.ts`.

---

## 9) Тесты и debug-потоки

В репозитории есть фокусные unit tests (`tests/*.test.mjs`) по ключевым подсистемам:
- combat grid / turn manager / action resolver,
- movement controllers,
- perception и ambient behavior,
- world store/persistence,
- asset resolver/seed loader,
- input policies.

Debug runtime-слой:
- `src/ui/rendering/debug/*`:
  - combat HUD,
  - scene exploration shell,
  - enemy vision grid overlay,
  - scene runtime debug state emitter.

Отдельный debug bootstrap:
- `src/core/debug/combatTestBootstrap.ts` + `Main Menu -> Test Combat`.

---

## 10) Практическая стратегия чтения кода для нового разработчика

1. Пройти `src/standalone.ts` → `src/app.ts` → `src/core/app/AppController.ts`.
2. Затем `src/ui/screens/*` (как пользователь ходит по экранам).
3. Потом `src/ui/rendering/scene/sceneRuntime.ts` (главный runtime orchestration).
4. Затем `src/ui/rendering/combat/combatRuntime.ts` и `src/world/combat/*`.
5. После этого `src/world/worldStore.ts` + `src/world/time/*` + `src/world/map/*`.
6. В конце — `src/platform/browser/*` и `src/world/worldPersistence.ts`.

Если держать в голове эту ось:
**UI intent → AppController use-case → WorldStore/domain action → render/runtime reaction**,
ориентироваться в проекте становится очень быстро.
