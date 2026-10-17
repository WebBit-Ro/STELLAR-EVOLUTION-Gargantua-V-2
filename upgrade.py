from pathlib import Path
p=Path('/mnt/data/gargantua_work')
js=(p/'script.js').read_text()
html=(p/'index.html').read_text()
css=(p/'style.css').read_text()

# --- HTML: replace story cards + metadata ---
start=html.index('        <div class="copy"')
end=html.index('        <div class="center-title"', start)
new_cards='''        <div class="copy" aria-live="polite">
          <article class="copy__card" data-stage="0">
            <div class="kicker">ФАЗА 01 / ГАЗОПЫЛЕВОЕ ОБЛАКО</div>
            <h1>Материя<br>собирается.</h1>
            <p>Холодное межзвёздное облако медленно сжимается под действием гравитации. Плотность и вращение растут, а в центре зарождается будущее светило.</p>
            <div class="fact">Гравитационный коллапс · турбулентность · протозвёздный диск</div>
          </article>

          <article class="copy__card" data-stage="1">
            <div class="kicker">ФАЗА 02 / ПРОТОЗВЕЗДА</div>
            <h2>Ядро<br>нагревается.</h2>
            <p>Сжатое вещество образует горячую протозвезду. Вокруг неё закручивается диск, а лишний импульс уходит вдоль оси в узкие потоки.</p>
            <div class="fact">Аккреция · вращение · протозвёздные струи</div>
          </article>

          <article class="copy__card" data-stage="2">
            <div class="kicker">ФАЗА 03 / МАССИВНАЯ ЗВЕЗДА</div>
            <h2>Звезда<br>зажигается.</h2>
            <p>В центре запускается устойчивое термоядерное горение. Протозвезда становится горячей массивной звездой и удерживает себя давлением изнутри.</p>
            <div class="fact">Термоядерный синтез · гидростатическое равновесие · плазма</div>
          </article>

          <article class="copy__card" data-stage="3">
            <div class="kicker">ФАЗА 04 / КРАСНЫЙ СВЕРХГИГАНТ</div>
            <h2>Оболочка<br>раздувается.</h2>
            <p>Когда доступное топливо заканчивается, ядро сжимается, а внешние слои резко расширяются. Поверхность становится холоднее и краснее, а конвекция — масштабнее.</p>
            <div class="fact">Горение оболочек · конвекция · потеря массы</div>
          </article>

          <article class="copy__card" data-stage="4">
            <div class="kicker">ФАЗА 05 / КОЛЛАПС ЯДРА</div>
            <h2>Ядро<br>схлопывается.</h2>
            <p>В доли секунды сердцевина звезды перестраивается в сверхплотный остаток. Сжатие запускает нейтрино и формирует ударную волну.</p>
            <div class="fact">Коллапс ядра · нейтрино · ударный фронт</div>
          </article>

          <article class="copy__card" data-stage="5">
            <div class="kicker">ФАЗА 06 / СВЕРХНОВАЯ</div>
            <h2>Звезда<br>взрывается.</h2>
            <p>Ударная волна разрывает оболочки и выбрасывает их в пространство. На экране одновременно видны горячее ядро, несколько фронтов и клочья вещества.</p>
            <div class="fact">Shock breakout · ejecta · ударная волна · химические элементы</div>
          </article>

          <article class="copy__card" data-stage="6">
            <div class="kicker">ФАЗА 07 / КОМПАКТНЫЙ ОСТАТОК</div>
            <h2>Остаётся<br>ядро.</h2>
            <p>Часть вещества уходит наружу, а сверхплотный остаток на короткий момент проявляется как нейтронная звезда. При большей массе начинается дальнейший гравитационный коллапс.</p>
            <div class="fact">Нейтронная звезда · пульсар · переход к чёрной дыре</div>
          </article>

          <article class="copy__card" data-stage="7">
            <div class="kicker">ФИНАЛ / ЧЁРНАЯ ДЫРА И GARGANTUA</div>
            <h2>Свет<br>не возвращается.</h2>
            <p>Возникает горизонт событий. Оставшийся газ закручивается в горячий диск, свет изгибается вокруг тени, а по оси могут пробиваться релятивистские струи плазмы.</p>
            <div class="fact">Горизонт событий · фотонное кольцо · линзирование · джеты</div>
          </article>
        </div>

'''
html=html[:start]+new_cards+html[end:]
html=html.replace('Непрерывная визуализация эволюции массивной звезды от голубого сверхгиганта до чёрной дыры.', 'Интерактивная визуализация эволюции массивной звезды от газопылевого облака до чёрной дыры.')
# The actual description text is slightly different in source:
html=html.replace('Интерактивная визуализация эволюции массивной звезды от голубого сверхгиганта до чёрной дыры.', 'Интерактивная визуализация эволюции массивной звезды от газопылевого облака до чёрной дыры.')
(p/'index.html').write_text(html)

# --- CSS tweaks ---
css=css.replace('min-height: 650vh;', 'min-height: 1000vh;')
css=css.replace('.copy__card p.body {', '.copy__card p {')
css=css.replace('  max-width: 8ch;\n  font-size:', '  max-width: 9ch;\n  font-size:')
css += '''\n\n/* Cinematic evolution overlays */\n.evolution-tag {\n  position: fixed;\n  right: var(--pad);\n  top: 50%;\n  transform: translateY(-50%);\n  z-index: 11;\n  color: rgba(255,255,255,.18);\n  font: 8px/1 ui-monospace, SFMono-Regular, Menlo, monospace;\n  letter-spacing: .22em;\n  writing-mode: vertical-rl;\n  text-transform: uppercase;\n  pointer-events: none;\n}\n@media (max-width: 900px) { .evolution-tag { display:none; } }\n'''
(p/'style.css').write_text(css)

# --- JS shader uniform ---
js=js.replace('uniform float uCollapse;\n    uniform vec3 uCameraPosition;', 'uniform float uCollapse;\n    uniform float uEvolution;\n    uniform vec3 uCameraPosition;')
# Add warm palette and blend just after hotWhite declaration
needle='''      vec3 hotWhite =\n        vec3(\n          0.92,\n          0.99,\n          1.0\n        );\n\n\n      vec3 color ='''
repl='''      vec3 hotWhite =\n        vec3(\n          0.92,\n          0.99,\n          1.0\n        );\n\n      vec3 warmRed =\n        vec3(\n          0.95,\n          0.095,\n          0.018\n        );\n\n      vec3 warmOrange =\n        vec3(\n          1.0,\n          0.30,\n          0.035\n        );\n\n\n      vec3 color ='''
if needle not in js: raise SystemExit('shader needle not found')
js=js.replace(needle,repl)
needle2='''      color =\n        mix(\n          color,\n          hotWhite,\n          pow(\n            plasma,\n            2.25\n          )\n        );\n\n\n      /*\n        Limb brightening.'''
repl2='''      color =\n        mix(\n          color,\n          hotWhite,\n          pow(\n            plasma,\n            2.25\n          )\n        );\n\n      float redPhase =\n        smoothstep(\n          0.26,\n          0.58,\n          uEvolution\n        );\n\n      vec3 warmColor =\n        mix(\n          warmOrange,\n          warmRed,\n          0.64 + plasma * 0.22\n        );\n\n      color =\n        mix(\n          color,\n          warmColor,\n          redPhase * (0.78 + 0.22 * plasma)\n        );\n\n\n      /*\n        Limb brightening.'''
if needle2 not in js: raise SystemExit('color needle not found')
js=js.replace(needle2,repl2)

# Uniform in material
js=js.replace('''          uCollapse: {\n            value:\n              0\n          },\n\n          uCameraPosition:''', '''          uCollapse: {\n            value:\n              0\n          },\n\n          uEvolution: {\n            value:\n              0\n          },\n\n          uCameraPosition:''')

# Config additions
js=js.replace('''    supernovaRadius:\n      17.0,\n\n    bloomStrength:''', '''    supernovaRadius:\n      17.0,\n\n    molecularCloud:\n      mobile ? 1200 : 2400,\n\n    protoDust:\n      mobile ? 420 : 800,\n\n    protojets:\n      mobile ? 220 : 420,\n\n    bloomStrength:''')

# State additions
js=js.replace('''    progress:\n      0,\n\n    collapse:''', '''    progress:\n      0,\n\n    cloud:\n      0,\n\n    protostar:\n      0,\n\n    massiveStar:\n      0,\n\n    redSupergiant:\n      0,\n\n    compactRemnant:\n      0,\n\n    cloudPulse:\n      0,\n\n    collapse:''')

# variable declarations after star vars
js=js.replace('''  let supergiantShell;\n\n  let supernovaPoints;''', '''  let supergiantShell;\n\n  let molecularCloud;\n  let protostarGroup;\n  let protostarCore;\n  let protostarHalo;\n  let protostarDisk;\n  let protoJets;\n  let protoDust;\n  let redGiantShell;\n  let remnantStar;\n  let remnantPulseRings;\n  let evolutionDust;\n\n  let supernovaPoints;''')

# Call create evolution before supergiant
js=js.replace('''    createNebula();\n    createStarField();\n    createSupergiant();''', '''    createNebula();\n    createStarField();\n    createEarlyEvolution();\n    createSupergiant();''')

# Insert createEarlyEvolution before createSupergiant
marker='''  /*\n    ========================================================================\n    SUPERGIANT\n    ========================================================================\n  */\n\n  function createSupergiant()'''
func=r'''  /*
    ========================================================================
    EARLY EVOLUTION — MOLECULAR CLOUD → PROTOSTAR → COMPACT REMNANT
    ========================================================================
  */

  function createEarlyEvolution() {

    /* ------------------------------------------------------------
       Molecular cloud: layered particles with inward swirl.
       Kept deliberately soft so it matches the existing grainy style.
    ------------------------------------------------------------ */
    {
      const count = CONFIG.molecularCloud;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const data = new Array(count);

      for (let i = 0; i < count; i++) {
        const arm = i % 5;
        const r = Math.pow(Math.random(), 0.55) * (7.0 + Math.random() * 4.5);
        const theta = Math.random() * Math.PI * 2 + arm * (Math.PI * 2 / 5);
        const swirl = theta + r * 0.11;
        const y = (Math.random() - 0.5) * (2.0 + r * 0.22);
        const puff = 0.72 + Math.random() * 0.46;

        data[i] = { r, theta, y, phase: Math.random() * Math.PI * 2, puff };

        positions[i * 3] = Math.cos(swirl) * r * puff;
        positions[i * 3 + 1] = y * puff;
        positions[i * 3 + 2] = Math.sin(swirl) * r * puff;

        const c = Math.random();
        colors[i * 3] = 0.08 + c * 0.10;
        colors[i * 3 + 1] = 0.12 + c * 0.24;
        colors[i * 3 + 2] = 0.20 + c * 0.40;
      }

      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      g.userData.data = data;

      molecularCloud = new THREE.Points(
        g,
        new THREE.PointsMaterial({
          size: mobile ? 0.065 : 0.075,
          vertexColors: true,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );

      scene.add(molecularCloud);
    }

    /* ------------------------------------------------------------
       Protostar group.
    ------------------------------------------------------------ */
    protostarGroup = new THREE.Group();

    protostarCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.74, 48, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffb15c,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending
      })
    );

    protostarHalo = new THREE.Mesh(
      new THREE.SphereGeometry(1.10, 48, 48),
      new THREE.MeshBasicMaterial({
        color: 0xff7b2c,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );

    const diskGeo = new THREE.TorusGeometry(1.35, 0.085, 12, 160);
    protostarDisk = new THREE.Mesh(
      diskGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff9f46,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    protostarDisk.rotation.x = Math.PI * 0.48;

    protostarGroup.add(protostarHalo, protostarDisk, protostarCore);
    protostarGroup.scale.setScalar(0.001);
    scene.add(protostarGroup);

    /* Protostellar dust lanes */
    {
      const count = CONFIG.protoDust;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const data = new Array(count);

      for (let i = 0; i < count; i++) {
        const r = 1.15 + Math.pow(Math.random(), 0.65) * 3.3;
        const a = Math.random() * Math.PI * 2;
        const thickness = (Math.random() - 0.5) * (0.06 + r * 0.08);
        data[i] = { r, a, thickness, phase: Math.random() * Math.PI * 2 };
        positions[i * 3] = Math.cos(a) * r;
        positions[i * 3 + 1] = thickness;
        positions[i * 3 + 2] = Math.sin(a) * r;
        colors[i * 3] = 0.82 + Math.random() * 0.18;
        colors[i * 3 + 1] = 0.16 + Math.random() * 0.28;
        colors[i * 3 + 2] = 0.02 + Math.random() * 0.06;
      }

      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      g.userData.data = data;

      protoDust = new THREE.Points(
        g,
        new THREE.PointsMaterial({
          size: mobile ? 0.035 : 0.043,
          vertexColors: true,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      protoDust.rotation.x = Math.PI * 0.48;
      scene.add(protoDust);
    }

    /* Narrow bipolar outflows from the young star. */
    {
      const count = CONFIG.protojets;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const data = new Array(count);

      for (let i = 0; i < count; i++) {
        const side = i % 2 === 0 ? 1 : -1;
        const q = Math.random();
        const radius = Math.pow(Math.random(), 2.0) * 0.16;
        const angle = Math.random() * Math.PI * 2;
        data[i] = { side, q, radius, angle, phase: Math.random() * Math.PI * 2 };
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = side * (0.85 + q * 2.7);
        positions[i * 3 + 2] = Math.sin(angle) * radius;
        colors[i * 3] = 0.52;
        colors[i * 3 + 1] = 0.80;
        colors[i * 3 + 2] = 1.00;
      }

      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      g.userData.data = data;

      protoJets = new THREE.Points(
        g,
        new THREE.PointsMaterial({
          size: mobile ? 0.045 : 0.055,
          vertexColors: true,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      scene.add(protoJets);
    }

    /* A red/amber atmospheric shell used only during the giant stage. */
    redGiantShell = new THREE.Mesh(
      new THREE.SphereGeometry(2.95, 64, 64),
      new THREE.MeshBasicMaterial({
        color: 0xff4a16,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    redGiantShell.scale.set(1, 0.93, 1.0);
    scene.add(redGiantShell);

    /* Neutron-star interlude — visible briefly before the BH branch. */
    remnantStar = new THREE.Mesh(
      new THREE.SphereGeometry(0.23, 40, 40),
      new THREE.MeshBasicMaterial({
        color: 0xd7f6ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending
      })
    );
    scene.add(remnantStar);

    remnantPulseRings = new THREE.Group();
    const pulseColors = [0x87eaff, 0x9fb2ff, 0xd8fbff];
    pulseColors.forEach((color, i) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.55 + i * 0.18, 0.018, 8, 96),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      ring.rotation.x = Math.PI * 0.5;
      remnantPulseRings.add(ring);
    });
    scene.add(remnantPulseRings);
  }


  /*
    ========================================================================
    SUPERGIANT
    ========================================================================
  */

  function createSupergiant()'''
if marker not in js: raise SystemExit('supergiant marker not found')
js=js.replace(marker,func)

# Extend updateStory stage timing block
old='''    state.collapse =\n      smooth(\n        range(\n          state.progress,\n          0.16,\n          0.30\n        )\n      );\n\n\n    state.nova =\n      smoother(\n        range(\n          state.progress,\n          0.245,\n          0.53\n        )\n      );\n\n\n    state.disk =\n      smoother(\n        range(\n          state.progress,\n          0.46,\n          0.78\n        )\n      );\n\n\n    state.blackHole =\n      smoother(\n        range(\n          state.progress,\n          0.49,\n          0.82\n        )\n      );\n\n\n    state.jets =\n      smoother(\n        range(\n          state.progress,\n          0.75,\n          1.0\n        )\n      );'''
new='''    state.cloud =\n      smoother(\n        1 - range(\n          state.progress,\n          0.015,\n          0.17\n        )\n      );\n\n\n    state.protostar =\n      smoother(\n        range(\n          state.progress,\n          0.075,\n          0.25\n        )\n      ) *\n      (1 - smoother(range(state.progress, 0.19, 0.31)));\n\n\n    state.massiveStar =\n      smoother(\n        range(\n          state.progress,\n          0.17,\n          0.31\n        )\n      );\n\n\n    state.redSupergiant =\n      smoother(\n        range(\n          state.progress,\n          0.27,\n          0.47\n        )\n      ) *\n      (1 - smoother(range(state.progress, 0.42, 0.54)) * 0.72);\n\n\n    state.collapse =\n      smooth(\n        range(\n          state.progress,\n          0.39,\n          0.55\n        )\n      );\n\n\n    state.nova =\n      smoother(\n        range(\n          state.progress,\n          0.48,\n          0.70\n        )\n      );\n\n\n    state.compactRemnant =\n      smoother(range(state.progress, 0.64, 0.79)) *\n      (1 - smoother(range(state.progress, 0.73, 0.84)));\n\n\n    state.disk =\n      smoother(\n        range(\n          state.progress,\n          0.65,\n          0.90\n        )\n      );\n\n\n    state.blackHole =\n      smoother(\n        range(\n          state.progress,\n          0.70,\n          0.94\n        )\n      );\n\n\n    state.jets =\n      smoother(\n        range(\n          state.progress,\n          0.84,\n          1.0\n        )\n      );'''
if old not in js: raise SystemExit('state timing old not found')
js=js.replace(old,new)

# replace stage block
start=js.index('    const stage =\n      Math.min(', js.index('function updateStory'))
end=js.index('    }\n  }\n\n\n  /*\n    ========================================================================\n    UPDATE — SUPERGIANT', start)+5
stageblock='''    const stage =\n      Math.min(\n        7,\n        Math.floor(\n          state.progress *\n          8\n        )\n      );\n\n\n    if (\n      stage !==\n      currentTextStage\n    ) {\n\n      currentTextStage =\n        stage;\n\n\n      const labels = [\n        ["PHASE 01", "MOLECULAR CLOUD"],\n        ["PHASE 02", "PROTOSTAR"],\n        ["PHASE 03", "MASSIVE STAR"],\n        ["PHASE 04", "RED SUPERGIANT"],\n        ["PHASE 05", "CORE COLLAPSE"],\n        ["PHASE 06", "SUPERNOVA"],\n        ["PHASE 07", "COMPACT REMNANT"],\n        ["PHASE 08", "BLACK HOLE / GARGANTUA"]\n      ];\n\n      if (phaseLabel) phaseLabel.textContent = labels[stage][0];\n      if (phaseName) phaseName.textContent = labels[stage][1];\n\n      storyCards.forEach((card, index) => {\n        const active = index === stage;\n        gsap.to(card, {\n          autoAlpha: active ? 1 : 0,\n          duration: reducedMotion ? 0 : (active ? 0.45 : 0.30),\n          ease: "power2.out",\n          overwrite: true\n        });\n      });\n    }\n  }'''
js=js[:start]+stageblock+js[end:]

# Insert updateEarlyEvolution function before updateSupergiant
marker2='''  /*\n    ========================================================================\n    UPDATE — SUPERGIANT\n    ========================================================================\n  */\n\n  function updateSupergiant'''
updatefunc=r'''  /*
    ========================================================================
    UPDATE — EARLY EVOLUTION
    ========================================================================
  */

  function updateEarlyEvolution(time) {
    const cloud = state.cloud;
    const proto = state.protostar;
    const massive = state.massiveStar;
    const red = state.redSupergiant;
    const compact = state.compactRemnant;

    if (molecularCloud) {
      const pos = molecularCloud.geometry.getAttribute("position");
      const data = molecularCloud.geometry.userData.data;
      const collapse = 1 - cloud;

      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const gather = 1 - collapse * 0.76;
        const a = item.theta + time * (0.015 + collapse * 0.10) + collapse * item.r * 0.085;
        const spiral = 1 + Math.sin(time * 0.45 + item.phase + item.r) * 0.045;
        const r = item.r * gather * spiral;
        pos.array[i * 3] = Math.cos(a) * r * item.puff;
        pos.array[i * 3 + 1] = item.y * item.puff * (1 - collapse * 0.55);
        pos.array[i * 3 + 2] = Math.sin(a) * r * item.puff;
      }
      pos.needsUpdate = true;
      molecularCloud.material.opacity = cloud * 0.40 + proto * 0.08;
      molecularCloud.rotation.y = time * 0.012;
    }

    if (protostarGroup) {
      const breathe = 1 + Math.sin(time * 1.75) * 0.028;
      protostarGroup.scale.setScalar(Math.max(0.001, (0.38 + proto * 1.15) * breathe));
      protostarCore.material.opacity = proto * 0.86;
      protostarHalo.material.opacity = proto * 0.12;
      protostarDisk.material.opacity = proto * 0.54;
      protostarDisk.rotation.z = time * 0.18;
      protostarDisk.rotation.x = Math.PI * 0.48 + Math.sin(time * 0.4) * 0.02;
    }

    if (protoDust) {
      const pos = protoDust.geometry.getAttribute("position");
      const data = protoDust.geometry.userData.data;
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const a = item.a + time * (0.12 + 0.42 / Math.max(item.r, 1.2));
        pos.array[i * 3] = Math.cos(a) * item.r;
        pos.array[i * 3 + 1] = item.thickness + Math.sin(time * 2 + item.phase) * 0.012 * item.r;
        pos.array[i * 3 + 2] = Math.sin(a) * item.r;
      }
      pos.needsUpdate = true;
      protoDust.material.opacity = proto * 0.62;
    }

    if (protoJets) {
      const pos = protoJets.geometry.getAttribute("position");
      const data = protoJets.geometry.userData.data;
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const w = item.radius * (1 + item.q * 0.55);
        const a = item.angle + time * (0.9 + item.q * 0.8);
        pos.array[i * 3] = Math.cos(a) * w;
        pos.array[i * 3 + 1] = item.side * (0.85 + item.q * 2.7) * (0.35 + proto * 0.65);
        pos.array[i * 3 + 2] = Math.sin(a) * w;
      }
      pos.needsUpdate = true;
      protoJets.material.opacity = proto * 0.48;
    }

    if (redGiantShell) {
      const pulse = 1 + Math.sin(time * 0.95) * 0.035 + Math.sin(time * 2.1) * 0.014;
      const giantScale = 0.84 + red * 1.24;
      redGiantShell.scale.set(giantScale * pulse, giantScale * 0.93 * pulse, giantScale * pulse);
      redGiantShell.material.opacity = red * (0.075 + 0.025 * Math.sin(time * 0.8) ** 2);
    }

    if (supergiantMesh) {
      supergiantMesh.material.uniforms.uEvolution.value = red;
    }

    if (remnantStar) {
      const pulse = 1 + Math.sin(time * 8.5) * 0.06;
      remnantStar.scale.setScalar(Math.max(0.001, (0.18 + compact * 0.9) * pulse));
      remnantStar.material.opacity = compact * 0.88;
    }

    if (remnantPulseRings) {
      remnantPulseRings.rotation.y = time * 1.65;
      remnantPulseRings.children.forEach((ring, i) => {
        const wave = (time * (0.72 + i * 0.11) + i * 0.28) % 1;
        ring.scale.setScalar(0.6 + wave * 2.8);
        ring.material.opacity = compact * (1 - wave) * 0.16;
      });
    }

    if (evolutionDust) {
      evolutionDust.rotation.y = time * 0.006;
    }
  }


  /*
    ========================================================================
    UPDATE — SUPERGIANT
    ========================================================================
  */

  function updateSupergiant'''
if marker2 not in js: raise SystemExit('update marker not found')
js=js.replace(marker2,updatefunc)

# update supergiant to handle red giant size and opacity and evolution
oldscale='''    const scale =\n      (\n        1 -\n        collapse *\n        0.996\n      ) *\n      breathing;'''
newscale='''    const giantExpansion =\n      1 +\n      state.redSupergiant *\n      1.25;\n\n    const scale =\n      (\n        1 -\n        collapse *\n        0.996\n      ) *\n      giantExpansion *\n      breathing;'''
if oldscale not in js: raise SystemExit('scale old not found')
js=js.replace(oldscale,newscale)
js=js.replace('''    supergiantShell.material.opacity =\n      0.095 *\n      (\n        1 -\n        collapse\n      );''','''    supergiantShell.material.opacity =\n      0.095 *\n      (\n        1 - collapse\n      ) *\n      (1 - state.redSupergiant * 0.35);\n\n    supergiantMesh.material.uniforms.uEvolution.value =\n      state.redSupergiant;''')

# add updateEarlyEvolution into updateScene before supergiant
js=js.replace('''    updateSupergiant(\n      time\n    );''','''    updateEarlyEvolution(\n      time\n    );\n\n\n    updateSupergiant(\n      time\n    );''')

# Camera shift for early cloud and final
js=js.replace('''    const pushIn =\n      state.blackHole *\n      1.15;''','''    const pushIn =\n      state.blackHole *\n      1.15 -\n      state.cloud *\n      1.25;''')
js=js.replace('''    camera.position.x =\n      4.8 +\n      driftX +\n      orbit +''','''    const earlySpread =\n      state.cloud * 1.55 -\n      state.protostar * 0.55;\n\n    camera.position.x =\n      4.8 +\n      driftX +\n      earlySpread +\n      orbit +''')
js=js.replace('''    camera.position.y =\n      2.35 +\n      driftY;''','''    camera.position.y =\n      2.35 +\n      driftY +\n      state.cloud * 0.38;''')

# Update comments/timing comment
js=js.replace('''      0–25%   Blue supergiant + plasma surface + stellar envelope\n      25–50%  Core collapse + shock fronts + turbulent supernova ejecta\n      50–75%  Fallback gas + accretion flow + black-hole shadow\n      75–100% Kerr-like visual lensing + photon ring + relativistic jets''','''      0–17%   Molecular cloud → gravitational gathering\n      8–25%   Protostar + accretion disk + bipolar outflows\n      17–31%  Massive blue star\n      27–47%  Red supergiant expansion\n      39–55%  Core collapse\n      48–70%  Supernova + shock fronts + ejecta\n      64–79%  Compact remnant / neutron-star interlude\n      65–94%  Accretion + black-hole shadow + lensing\n      84–100% Relativistic jets + mature Gargantua''')

(p/'script.js').write_text(js)
