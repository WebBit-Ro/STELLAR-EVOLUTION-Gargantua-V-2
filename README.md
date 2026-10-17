# 🌌 GARGANTUA — Stellar Evolution / Ultra Smooth Edition

---

## 🌐 Choose Language / Выберите язык / Оберіть мову
* [🇬🇧 English](#-english)
* [🇺🇦 Українська](#-українська)
* [🇷🇺 Русский](#-русский)

---

## 🇬🇧 English

> **GARGANTUA — Stellar Evolution** is an interactive, deeply optimized cinematic web experience that visualizes the full lifetime of a cosmic giant across 8 detailed evolutionary phases: from a cold molecular cloud to a mature supermassive black hole.

This portfolio pet-project focuses on advanced creative coding, advanced math shaders, and fluid scroll kinematics. Unlike static websites, it introduces frame-rate independent physics smoothing to handle rough trackpad/mouse inputs gracefully.

### ✨ Extended Evolutionary Journey (8 Phases)
1. **Phase 01: Molecular Cloud** — Interstellar matter begins gathering under gravity. Soft, grainy gas filaments slowly contract.
2. **Phase 02: Protostar** — The dense core ignites. Accretion flows spin up, erupting into narrow bipolar plasma outflows.
3. **Phase 03: Massive Star** — Nuclear fusion stabilizes the core, forming a hot, brilliant blue-giant star.
4. **Phase 04: Red Supergiant** — Fuel depletes, causing the outer convective atmosphere to heavily expand and cool down into an amber haze.
5. **Phase 05: Core Collapse** — In a fraction of a second, the iron core implodes, blasting neutrino fields into space.
6. **Phase 06: Supernova** — The physical shock breakouts, tearing the envelope apart and scattering high-velocity macroscopic debris knots.
7. **Phase 07: Compact Remnant** — A brief, intense interlude showing a ultra-dense neutron-star core emitting rhythmic light pulse-waves.
8. **Phase 08: Black Hole / Gargantua** — The singularity is established. Features a fully active image-space gravitational lensing ring, Doppler boosting asymmetry, and deep relativistic jets.

### 🛠️ Tech Stack
* **Three.js** — Volumetric rendering orchestration, dynamic buffer geometries, point-cloud management.
* **GLSL (Shaders)** — Custom vertex and fragment shaders processing complex light deflection curves, gravitational redshift, and Fractional Brownian Motion (FBM) plasma noise on the GPU.
* **GSAP + ScrollTrigger** — Time-mapped animation sequencer managing overlapping dissolve zones.
* **Vanilla JS / CSS3** — High-performance HUD typography overlay layout.

### 🚀 Advanced Optimization & Kinematics
* **Frame-Rate Independent Inertia:** Scroll inputs update a `targetProgress` state, which the active engine smoothly chases using exponential decay filters (`1 - Math.exp(-11.5 * delta)`). This completely eliminates scrolling stutter.
* **Overlapping Cinematic Dissolves:** Hard phase switches were replaced with custom mathematical weighting envelopes. Adjacent star phases smoothly coexist and blend like a film cross-fade.
* **Dynamic GPU Quality Profiling:** The loop constantly monitors frame time (`delta`). If rendering drops below 30 FPS, it dynamically clamps volumetric post-processing workload (`UnrealBloomPass`) to protect performance.
* **Zero Allocation Render Tree:** Zero object generation inside loops (`THREE.Color` or vectors are cached), keeping the memory footprint flat and eliminating Garbage Collector spikes.

### 💻 Local Setup
1. Clone the repo:
   ```bash
   git clone https://github.com
   ```
2. Run via any local web server (e.g., Live Server extension in VS Code) to allow the browser to resolve external CDN modules properly.

[🔼 Back to Top](#gargantua--stellar-evolution--ultra-smooth-edition)

---

## 🇺🇦 Українська

> **GARGANTUA — Stellar Evolution** — це інтерактивний, глибоко оптимізований кінематографічний веб-інтерфейс, який візуалізує повний життєвий шлях космічного гіганта через 8 деталізованих еволюційних фаз: від холодної газопилової хмари до зрілої надмасивної чорної діри.

Цей демонстраційний пет-проєкт створений з акцентом на advanced creative coding, складну шейдерну математику та плавну кінематику скролінгу. На відміну від першої версії, тут реалізовано незалежне від частоти кадрів згладжування, що нівелює різкі ривки миші або трекпада.

### ✨ Розширена еволюційна подорож (8 Фаз)
1. **Фаза 01: Газопилова хмара** — Міжзоряна матерія починає збиратися під дією гравітації, формуючи м'які зернисті філаменти.
2. **Фаза 02: Протозірка** — Щільне ядро нагрівається. Аккреційні потоки прискорюють обертання та викидають вузькі біполярні потоки плазми.
3. **Фаза 03: Масивна зірка** — Термоядерний синтез стабілізує серцевину, народжуючи гаряче і яскраве блакитне світило.
4. **Фаза 04: Червоний надгігант** — Паливо вичерпується, змушуючи зовнішню конвективну оболонку масштабно розширюватися, охолоджуючись до янтарного серпанку.
5. **Фаза 05: Колапс ядра** — За частку секунди залізне серце зірки схлопується, випускаючи потужні нейтринні поля.
6. **Фаза 06: Наднова** — Хвиля прориває оболонку, розриваючи її на шматки та розкидаючи високошвидкісні макроскопічні вузли ежекти.
7. **Фаза 07: Компактний остаток** — Короткий інтенсивний інтерлюд, що демонструє надщільну нейтронну зірку, яка випромінює ритмічні пульсуючі хвилі світла.
8. **Фаза 08: Чорна діра / Gargantua** — Сінгулярність остаточно сформована. Візуалізується кастомне гравітаційне лінзування світла, асиметрія ефекту Допплера та релятивістські джети.

### 🛠️ Технологічний стек
* **Three.js** — керування 3D-сценою, динамічна буферна геометрія, оптимізація point-cloud масивів.
* **GLSL (Шейдери)** — унікальні шейдери для розрахунку викривлення променів світла, гравітаційного червоного зсуву та процедурного плазмового шуму FBM безпосередньо на GPU.
* **GSAP + ScrollTrigger** — точна синхронізація скролу з часовою шкалою та зонами м'якого згасання (dissolve).
* **Vanilla JS / CSS3** — полегшена високопродуктивна типографіка HUD-інтерфейсу.

### 🚀 Інженерні рішення та кінематика
* **Незалежна інерція скролінгу:** Рух колеса миші оновлює значення `targetProgress`, яке рушій плавно наздоганяє за допомогою фільтра експоненціального згасання (`1 - Math.exp(-11.5 * delta)`). Це гарантує кінематографічну плавність.
* **Безшовні крос-фейди (Cross-fades):** Жорсткі перемикачі етапів замінені математичними ваговими функціями. Сусідні оболонки зірки плавно співіснують в процесі трансформації, як при монтажному напливі в кіно.
* **Динамічний профайлінг продуктивності:** Система відстежує час кадру (`delta`). Якщо FPS падає, код автоматично знижує інтенсивність обчислень об'ємного світіння (`UnrealBloomPass`), захищаючи плавність інтерфейсу.
* **Нульове виділення пам'яті (Zero Allocation):** Жодних генерацій об'єктів (`THREE.Color` або векторів) всередині циклів анімації. Це виключає затримки та мікро-фризи від збирача сміття (Garbage Collector).

### 💻 Локальний запуск
1. Склонуйте репозиторій:
   ```bash
   git clone https://github.com
   ```
2. Запустіть проєкт через локальний HTTP-сервер (наприклад, Live Server у VS Code) для коректного імпорту скриптів із CDN мереж.

[🔼 Нагору](#gargantua--stellar-evolution--ultra-smooth-edition)

---

## 🇷🇺 Русский

> **GARGANTUA — Stellar Evolution** — это интерактивный, глубоко оптимизированный кинематографический веб-интерфейс, визуализирующий полный жизненный цикл космического гиганта через 8 детализированных эволюционных фаз: от холодного газопылевого облака до зрелой сверхмассивной чёрной дыры.

Данный демонстрационный пет-проект создан с упором на advanced creative coding, сложную шейдерную математику и плавную кинематику скроллинга. В отличие от первой версии, здесь внедрено независимое от частоты кадров сглаживание, нивелирующее резкие рывки мыши или трекпада.

### ✨ Расширенное эволюционное путешествие (8 Фаз)
1. **Фаза 01: Газопылевое облако** — Межзвёздная материя начинает собираться под действием гравитации, формируя мягкие зернистые филаменты.
2. **Фаза 02: Протозвезда** — Плотное ядро нагревается. Аккреционные потоки ускоряют вращение и выбрасывают узкие биполярные потоки плазмы вдоль оси.
3. **Фаза 03: Массивная звезда** — Термоядерный синтез стабилизирует сердцевину, рождая горячее и яркое голубое светило.
4. **Фаза 04: Красный сверхгигант** — Топливо истощается, заставляя внешнюю конвективную оболочку масштабно расширяться, остывая до янтарной дымки.
5. **Фаза 05: Коллапс ядра** — За долю секунды железное сердце звезды схлопывается, испуская мощные нейтринные поля.
6. **Фаза 06: Сверхновая** — Волна прорывает оболочку, разрывая её на части и разбрасывая высокоскоростные макроскопические узлы вещества (эжекты).
7. **Фаза 07: Компактный остаток** — Короткий интенсивный интерлюд, демонстрирующий сверхплотную нейтронную звезду, излучающую ритмичные пульсирующие волны света.
8. **Фаза 08: Чёрная дыра / Gargantua** — Сингулярность окончательно сформирована. Визуализируется кастомное гравитационное линзирование света, асимметрия эффекта Допплера и релятивистские джеты.

### 🛠️ Технологический стек
* **Three.js** — управление 3D-сценой, динамическая буферная геометрия, оптимизация point-cloud массивов.
* **GLSL (Шейдеры)** — уникальные шейдеры для расчета искривления лучей света, гравитационного красного смещения и процедурного плазменного шума FBM напрямую на GPU.
* **GSAP + ScrollTrigger** — точная синхронизация скролла со шкалой времени и зонами мягкого затухания (dissolve).
* **Vanilla JS / CSS3** — облегченная высокопроизводительная типографика HUD-интерфейса.

### 🚀 Инженерные решения и кинематика
* **Независимая инерция скроллинга:** Движение колеса мыши обновляет значение `targetProgress`, которое движок плавно догоняет с помощью фильтра экспоненциального затухания (`1 - Math.exp(-11.5 * delta)`). Это гарантирует кинематографическую плавность.
