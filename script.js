(() => {
  "use strict";

  /*
    ========================================================================
    STELLAR EVOLUTION — CINEMATIC / OPTIMIZED EDITION
    ========================================================================

    Visual sequence:
      0–17%   Molecular cloud → gravitational gathering
      7–23%   Protostar + accretion disk + bipolar outflows
      23–31%  Massive blue star
      27–47%  Red supergiant expansion
      39–55%  Core collapse
      48–70%  Supernova + shock fronts + ejecta
      64–79%  Compact remnant / neutron-star interlude
      65–94%  Accretion + black-hole shadow + lensing
      84–100% Relativistic jets + mature Gargantua

    The black-hole image is deliberately designed around the visual clues
    described in NASA / Caltech / Kip Thorne material:
      - the disk is intrinsically thin and equatorial
      - the BACK side of the disk is lensed over and under the shadow
      - the approaching side is Doppler boosted
      - a bright photon ring surrounds the shadow

    This is not a full GR geodesic solver. A full Interstellar-style renderer
    used curved-spacetime ray propagation. Here we use a much cheaper
    analytical lensing model that preserves the recognizable geometry while
    keeping the page responsive.

    PERFORMANCE:
      - static particle buffers are allocated once
      - no THREE.Color() allocations inside render loops
      - star size / brightness are GPU attributes
      - disk shader is GPU-generated
      - particle count is automatically lowered on mobile
      - pixel ratio is capped
  */

  const THREE = window.THREE;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  const canvas =
    document.getElementById("webgl");

  const progressFill =
    document.getElementById("progressFill");

  const progressValue =
    document.getElementById("progressValue");

  const phaseName =
    document.getElementById("phaseName");

  const errorPanel =
    document.getElementById("errorPanel");


  /*
    ========================================================================
    SAFETY
  */

  if (
    !THREE ||
    !gsap ||
    !ScrollTrigger
  ) {
    if (errorPanel) {
      errorPanel.hidden =
        false;

      const message =
        errorPanel.querySelector("span");

      if (message) {
        message.textContent =
          "Three.js / GSAP / ScrollTrigger не загрузились. Проверьте CDN.";
      }
    }

    return;
  }

  gsap.registerPlugin(
    ScrollTrigger
  );


  /*
    ========================================================================
    DEVICE PROFILE
  */

  const mobile =
    window.matchMedia(
      "(max-width: 700px)"
    ).matches;

  const reducedMotion =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;


  const CONFIG = {

    /*
      5000+ stars on desktop as requested.
      On phones the number is reduced for GPU stability.
    */

    stars:
      mobile
        ? 3000
        : 6200,

    ejecta:
      mobile
        ? 1500
        : 3000,

    stellarShell:
      mobile
        ? 360
        : 720,

    remnantCloud:
      mobile
        ? 620
        : 1150,

    fallbackDust:
      mobile
        ? 420
        : 820,

    debrisKnots:
      mobile
        ? 180
        : 360,

    fallbackStreams:
      mobile
        ? 260
        : 520,

    jets:
      mobile
        ? 650
        : 1350,

    diskParticles:
      mobile
        ? 900
        : 1800,

    blackHoleRadius:
      2.08,

    cameraDistance:
      10.15,

    cameraFov:
      43,

    supernovaRadius:
      17.0,

    molecularCloud:
      mobile ? 1200 : 2400,

    protoDust:
      mobile ? 420 : 800,

    protojets:
      mobile ? 220 : 420,

    bloomStrength:
      mobile
        ? 1.42
        : 1.96,

    bloomRadius:
      0.92,

    bloomThreshold:
      0.035

  };


  /*
    ========================================================================
    STATE
  */

  const state = {

    progress:
      0,

    targetProgress:
      0,

    cinematicPulse:
      0,

    cloud:
      0,

    protostar:
      0,

    redSupergiant:
      0,

    compactRemnant:
      0,

    collapse:
      0,

    nova:
      0,

    disk:
      0,

    blackHole:
      0,

    jets:
      0,

    time:
      0,

    lastPercent:
      -1
  };


  /*
    ========================================================================
    THREE CORE
  */

  let scene;
  let camera;
  let renderer;
  let composer;
  let bloomPass;
  let clock;

  let starField;
  let supergiantGroup;
  let supergiantMesh;
  let supergiantShell;

  let molecularCloud;
  let protostarGroup;
  let protostarCore;
  let protostarHalo;
  let protostarDisk;
  let protoJets;
  let protoDust;
  let redGiantShell;
  let remnantStar;
  let remnantPulseRings;
  let evolutionDust;

  let supernovaPoints;
  let supernovaGeometry;
  let supernovaMaterial;

  let stellarEnvelope;
  let collapseCore;
  let collapseHalo;
  let shockGroup;

  let remnantCloud;
  let fallbackDust;
  let neutrinoCloud;

  let forwardShock;
  let reverseShock;
  let debrisKnots;
  let fallbackStreams;
  let diskHalo;

  let blackHole;
  let blackHoleHalo;

  let lensingDisk;
  let lensingDiskMaterial;

  let diskParticles;

  let jetParticles;
  let jetGeometry;
  let jetMaterial;

  let cinematicLight;

  let currentPhase = -1;
  let phaseChangeTimer = 0;


  /*
    ========================================================================
    SHARED COLOR OBJECTS
    ========================================================================

    Reused on CPU loops to avoid per-frame allocations.
  */

  const colorBlue =
    new THREE.Color(
      0x55cfff
    );

  const colorWhite =
    new THREE.Color(
      0xffffff
    );

  const colorOrange =
    new THREE.Color(
      0xff7425
    );

  const colorBurgundy =
    new THREE.Color(
      0x350509
    );


  /*
    ========================================================================
    HELPERS
  */

  function clamp01(
    value
  ) {

    return Math.max(
      0,
      Math.min(
        1,
        value
      )
    );
  }


  function smooth(
    value
  ) {

    const t =
      clamp01(
        value
      );

    return (
      t *
      t *
      (
        3 -
        2 *
        t
      )
    );
  }


  function smoother(
    value
  ) {

    const t =
      clamp01(
        value
      );

    return (
      t *
      t *
      t *
      (
        t *
        (
          t *
          6 -
          15
        ) +
        10
      )
    );
  }


  function range(
    progress,
    start,
    end
  ) {

    return clamp01(
      (
        progress -
        start
      ) /
      (
        end -
        start
      )
    );
  }


  // Quintic smoothstep: much softer at both ends than a cubic blend.
  function smootherStep(value) {
    const t = clamp01(value);
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  // Critically-damped-ish scalar follower. The response is smooth,
  // frame-rate independent and does not overshoot.
  function damp(current, target, lambda, delta) {
    return current + (target - current) * (1 - Math.exp(-lambda * delta));
  }

  // Map linear scroll to the visual timeline. The render loop applies the
  // only time-based smoothing, keeping input predictable and the scene calm.
  const CINEMATIC_TRACK = [
    { scroll: 0.000, story: 0.000 },
    { scroll: 0.100, story: 0.070 },
    { scroll: 0.155, story: 0.115 },
    { scroll: 0.215, story: 0.180 },
    { scroll: 0.275, story: 0.255 },
    { scroll: 0.335, story: 0.325 },
    { scroll: 0.405, story: 0.395 },
    { scroll: 0.470, story: 0.460 },
    { scroll: 0.520, story: 0.500 },
    { scroll: 0.575, story: 0.555 },
    { scroll: 0.620, story: 0.605 },
    { scroll: 0.675, story: 0.670 },
    { scroll: 0.730, story: 0.735 },
    { scroll: 0.790, story: 0.805 },
    { scroll: 0.845, story: 0.865 },
    { scroll: 0.905, story: 0.925 },
    { scroll: 0.955, story: 0.970 },
    { scroll: 0.985, story: 0.992 },
    { scroll: 1.000, story: 1.000 }
  ];

  function mapScrollToStory(scroll) {
    const p = clamp01(scroll);
    if (p <= 0) return 0;
    if (p >= 1) return 1;

    for (let i = 1; i < CINEMATIC_TRACK.length; i++) {
      const a = CINEMATIC_TRACK[i - 1];
      const b = CINEMATIC_TRACK[i];
      if (p <= b.scroll) {
        const local = range(p, a.scroll, b.scroll);
        return a.story + (b.story - a.story) * smootherStep(local);
      }
    }
    return 1;
  }


  /*
    ========================================================================
    GLSL — STARS
    ========================================================================

    GPU-controlled point size / brightness / twinkle.
  */

  const STAR_VERTEX_SHADER = `
    attribute float aSize;
    attribute float aBrightness;

    varying vec3 vColor;
    varying float vBrightness;

    uniform float uTime;
    uniform float uPixelRatio;

    void main() {

      vec4 mvPosition =
        modelViewMatrix *
        vec4(
          position,
          1.0
        );

      float twinkle =
        0.72 +
        0.28 *
        sin(
          uTime *
          (
            0.65 +
            aBrightness *
            1.75
          ) +
          position.x *
          0.17 +
          position.z *
          0.11
        );

      float pointSize =
        aSize *
        twinkle *
        uPixelRatio;

      gl_PointSize =
        pointSize *
        (
          22.0 /
          max(
            -mvPosition.z,
            1.0
          )
        );

      gl_Position =
        projectionMatrix *
        mvPosition;

      vColor =
        color;

      vBrightness =
        aBrightness *
        twinkle;
    }
  `;


  const STAR_FRAGMENT_SHADER = `
    precision highp float;

    varying vec3 vColor;
    varying float vBrightness;

    void main() {

      vec2 p =
        gl_PointCoord -
        0.5;

      float distanceFromCenter =
        length(
          p
        );

      float core =
        smoothstep(
          0.5,
          0.0,
          distanceFromCenter
        );

      float halo =
        smoothstep(
          0.5,
          0.10,
          distanceFromCenter
        );

      float alpha =
        core *
        (
          0.48 +
          0.52 *
          halo
        );

      if (
        alpha <
        0.01
      ) {
        discard;
      }

      gl_FragColor =
        vec4(
          vColor *
          (
            0.70 +
            vBrightness *
            0.85
          ),
          alpha
        );
    }
  `;


  /*
    ========================================================================
    GLSL — BLUE SUPERGIANT PLASMA
    ========================================================================
  */

  const STAR_SURFACE_VERTEX = `
    varying vec3 vNormalWorld;
    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;

    void main() {

      vec4 worldPosition =
        modelMatrix *
        vec4(
          position,
          1.0
        );

      vWorldPosition =
        worldPosition.xyz;

      vLocalPosition =
        position;

      vNormalWorld =
        normalize(
          mat3(
            modelMatrix
          ) *
          normal
        );

      gl_Position =
        projectionMatrix *
        viewMatrix *
        worldPosition;
    }
  `;


  const STAR_SURFACE_FRAGMENT = `
    precision highp float;

    varying vec3 vNormalWorld;
    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;

    uniform float uTime;
    uniform float uCollapse;
    uniform float uEvolution;
    uniform vec3 uCameraPosition;


    vec3 mod289(
      vec3 x
    ) {
      return x -
        floor(
          x *
          0.003460207612
        ) *
        289.0;
    }


    vec4 mod289(
      vec4 x
    ) {
      return x -
        floor(
          x *
          0.003460207612
        ) *
        289.0;
    }


    vec4 permute(
      vec4 x
    ) {
      return mod289(
        (
          x *
          34.0 +
          1.0
        ) *
        x
      );
    }


    vec4 taylorInvSqrt(
      vec4 r
    ) {
      return 1.792842914 -
        0.853734721 *
        r;
    }


    float snoise(
      vec3 v
    ) {

      const vec2 C =
        vec2(
          1.0 / 6.0,
          1.0 / 3.0
        );

      const vec4 D =
        vec4(
          0.0,
          0.5,
          1.0,
          2.0
        );

      vec3 i =
        floor(
          v +
          dot(
            v,
            C.yyy
          )
        );

      vec3 x0 =
        v -
        i +
        dot(
          i,
          C.xxx
        );

      vec3 g =
        step(
          x0.yzx,
          x0.xyz
        );

      vec3 l =
        1.0 -
        g;

      vec3 i1 =
        min(
          g.xyz,
          l.zxy
        );

      vec3 i2 =
        max(
          g.xyz,
          l.zxy
        );

      vec3 x1 =
        x0 -
        i1 +
        C.xxx;

      vec3 x2 =
        x0 -
        i2 +
        C.yyy;

      vec3 x3 =
        x0 -
        D.yyy;

      i =
        mod289(
          i
        );

      vec4 p =
        permute(
          permute(
            permute(
              i.z +
              vec4(
                0.0,
                i1.z,
                i2.z,
                1.0
              )
            ) +
            i.y +
            vec4(
              0.0,
              i1.y,
              i2.y,
              1.0
            )
          ) +
          i.x +
          vec4(
            0.0,
            i1.x,
            i2.x,
            1.0
          )
        );

      float n_ =
        0.142857142857;

      vec3 ns =
        n_ *
        D.wyz -
        D.xzx;

      vec4 j =
        p -
        49.0 *
        floor(
          p *
          ns.z *
          ns.z
        );

      vec4 x_ =
        floor(
          j *
          ns.z
        );

      vec4 y_ =
        floor(
          j -
          7.0 *
          x_
        );

      vec4 x =
        x_ *
        ns.x +
        ns.yyyy;

      vec4 y =
        y_ *
        ns.x +
        ns.yyyy;

      vec4 h =
        1.0 -
        abs(
          x
        ) -
        abs(
          y
        );

      vec4 b0 =
        vec4(
          x.xy,
          y.xy
        );

      vec4 b1 =
        vec4(
          x.zw,
          y.zw
        );

      vec4 s0 =
        floor(
          b0
        ) *
        2.0 +
        1.0;

      vec4 s1 =
        floor(
          b1
        ) *
        2.0 +
        1.0;

      vec4 sh =
        -step(
          h,
          vec4(
            0.0
          )
        );

      vec4 a0 =
        b0.xzyw +
        s0.xzyw *
        sh.xxyy;

      vec4 a1 =
        b1.xzyw +
        s1.xzyw *
        sh.zzww;

      vec3 p0 =
        vec3(
          a0.xy,
          h.x
        );

      vec3 p1 =
        vec3(
          a0.zw,
          h.y
        );

      vec3 p2 =
        vec3(
          a1.xy,
          h.z
        );

      vec3 p3 =
        vec3(
          a1.zw,
          h.w
        );

      vec4 norm =
        taylorInvSqrt(
          vec4(
            dot(
              p0,
              p0
            ),
            dot(
              p1,
              p1
            ),
            dot(
              p2,
              p2
            ),
            dot(
              p3,
              p3
            )
          )
        );

      p0 *=
        norm.x;

      p1 *=
        norm.y;

      p2 *=
        norm.z;

      p3 *=
        norm.w;

      vec4 m =
        max(
          0.6 -
          vec4(
            dot(
              x0,
              x0
            ),
            dot(
              x1,
              x1
            ),
            dot(
              x2,
              x2
            ),
            dot(
              x3,
              x3
            )
          ),
          0.0
        );

      m =
        m *
        m;

      return 42.0 *
        dot(
          m *
          m,
          vec4(
            dot(
              p0,
              x0
            ),
            dot(
              p1,
              x1
            ),
            dot(
              p2,
              x2
            ),
            dot(
              p3,
              x3
            )
          )
        );
    }


    float fbm(
      vec3 p
    ) {

      float value =
        0.0;

      float amplitude =
        0.5;

      float frequency =
        1.0;

      for (
        int i = 0;
        i < 6;
        i++
      ) {

        value +=
          snoise(
            p *
            frequency
          ) *
          amplitude;

        frequency *=
          1.95;

        amplitude *=
          0.5;
      }

      return value;
    }


    void main() {

      vec3 normal =
        normalize(
          vNormalWorld
        );

      vec3 viewDir =
        normalize(
          uCameraPosition -
          vWorldPosition
        );

      float facing =
        max(
          dot(
            normal,
            viewDir
          ),
          0.0
        );

      float rim =
        pow(
          1.0 -
          facing,
          2.35
        );

      vec3 position =
        normalize(
          vLocalPosition
        );

      /*
        Slow horizontal plasma flow.
      */

      float fieldA =
        fbm(
          position *
          3.8 +
          vec3(
            uTime *
            0.12,
            -uTime *
            0.06,
            uTime *
            0.09
          )
        );

      /*
        Fine convection cells.
      */

      float fieldB =
        fbm(
          position *
          8.4 +
          vec3(
            -uTime *
            0.19,
            uTime *
            0.14,
            -uTime *
            0.11
          )
        );

      float plasma =
        clamp(
          fieldA *
          0.68 +
          fieldB *
          0.32 +
          0.5,
          0.0,
          1.0
        );


      vec3 darkCyan =
        vec3(
          0.012,
          0.07,
          0.20
        );

      vec3 cyan =
        vec3(
          0.04,
          0.48,
          0.92
        );

      vec3 hotWhite =
        vec3(
          0.92,
          0.99,
          1.0
        );

      vec3 warmRed =
        vec3(
          0.95,
          0.095,
          0.018
        );

      vec3 warmOrange =
        vec3(
          1.0,
          0.30,
          0.035
        );


      vec3 color =
        mix(
          darkCyan,
          cyan,
          smoothstep(
            0.12,
            0.70,
            plasma
          )
        );

      color =
        mix(
          color,
          hotWhite,
          pow(
            plasma,
            2.25
          )
        );

      float redPhase =
        smoothstep(
          0.26,
          0.58,
          uEvolution
        );

      vec3 warmColor =
        mix(
          warmOrange,
          warmRed,
          0.64 + plasma * 0.22
        );

      color =
        mix(
          color,
          warmColor,
          redPhase * (0.78 + 0.22 * plasma)
        );


      /*
        Limb brightening.
      */

      color *=
        0.78 +
        rim *
        1.7;


      /*
        Core collapse increases temperature.
      */

      color *=
        1.0 +
        uCollapse *
        2.7;


      float alpha =
        1.0 -
        uCollapse;


      gl_FragColor =
        vec4(
          color,
          alpha
        );
    }
  `;


  /*
    ========================================================================
    GLSL — GARGANTUA / LENSING DISK
    ========================================================================

    This is the most important visual upgrade.

    We model the observed disk in image-space:
      1. Direct front-side emission makes the central horizontal band.
      2. Back-side emission is mapped through a deflection function
         alpha ~ 1 / b, which lifts the apparent image above/below
         the shadow.
      3. A photon-ring term adds the thin bright ring.
      4. Doppler boosting makes the approaching side substantially brighter.
      5. Temperature follows a radial power law, giving white-hot inner
         gas, then gold/orange/red outer gas.
      6. Logarithmic spiral bands and FBM turbulence break the perfect ring.

    It is deliberately much closer to the characteristic NASA / Gargantua
    geometry than two simple crossed rings.
  */

  const LENS_VERTEX_SHADER = `
    varying vec2 vUv;

    void main() {

      vUv =
        uv;

      gl_Position =
        projectionMatrix *
        modelViewMatrix *
        vec4(
          position,
          1.0
        );
    }
  `;


  const LENS_FRAGMENT_SHADER = `
    precision highp float;

    varying vec2 vUv;

    uniform float uTime;
    uniform float uPower;
    uniform float uLensing;
    uniform float uShadow;
    uniform float uSpin;

    /*
      ================================================================
      GARGANTUA IMAGE MODEL

      The visible image is decomposed into:
        A) horizontal direct image of the equatorial disk
        B) bright upper/lower images of the BACK side of the disk
        C) a thin photon ring
        D) higher-order faint rings
        E) turbulent thermal structure
        F) Doppler beaming

      This preserves the characteristic Interstellar/NASA silhouette
      while remaining cheap enough for a browser.
    ================================================================
    */

    float hash21(vec2 p) {
      p = fract(p * vec2(127.1, 311.7));
      p += dot(p, p + 34.5);
      return fract(p.x * p.y);
    }

    float noise21(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);

      f = f * f * (3.0 - 2.0 * f);

      return mix(
        mix(
          hash21(i),
          hash21(i + vec2(1.0, 0.0)),
          f.x
        ),
        mix(
          hash21(i + vec2(0.0, 1.0)),
          hash21(i + vec2(1.0, 1.0)),
          f.x
        ),
        f.y
      );
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;

      for (int i = 0; i < 6; i++) {
        value += noise21(p) * amplitude;
        p *= 2.02;
        amplitude *= 0.5;
      }

      return value;
    }

    float gaussian(float x, float width) {
      return exp(-pow(x / max(width, 0.0001), 2.0));
    }

    float ringSDF(float radius, float target, float width) {
      return exp(-pow((radius - target) / width, 2.0));
    }

    void main() {

      vec2 p = vUv * 2.0 - 1.0;

      /*
        The viewport is treated as the observer's image plane.
        A slight horizontal stretch keeps the apparent shadow round.
      */

      float aspect =
        1.0;

      p.x *= aspect;

      float r =
        length(p);

      float angle =
        atan(p.y, p.x);

      /*
        --------------------------------------------------------------
        BLACK-HOLE SHADOW
        --------------------------------------------------------------
      */

      float shadowRadius =
        uShadow;

      float shadow =
        smoothstep(
          shadowRadius + 0.026,
          shadowRadius - 0.045,
          r
        );

      /*
        --------------------------------------------------------------
        LOCAL GRAVITATIONAL LENSING COORDINATE
        --------------------------------------------------------------

        A cheap approximation to the way rays passing close to the
        critical curve are strongly deflected.
      */

      float b =
        max(r, 0.035);

      float weakDeflection =
        uLensing *
        0.145 /
        b;

      float strongDeflection =
        uLensing *
        0.050 /
        (
          max(
            b - shadowRadius * 0.63,
            0.035
          )
        );

      float totalDeflection =
        clamp(
          weakDeflection +
          strongDeflection,
          0.0,
          1.22
        );

      /*
        Spin / frame-dragging-inspired sideways displacement.
      */

      float spinOffset =
        uSpin *
        0.055 *
        (
          1.0 -
          smoothstep(
            0.15,
            0.90,
            r
          )
        );

      float lensY =
        p.y +
        sign(
          p.y +
          0.0001
        ) *
        totalDeflection *
        0.34 +
        spinOffset *
        p.x;

      /*
        --------------------------------------------------------------
        DIRECT EQUATORIAL DISK
        --------------------------------------------------------------
      */

      float directThickness =
        0.026 +
        0.030 *
        smoothstep(
          shadowRadius,
          0.90,
          r
        );

      float directBand =
        gaussian(
          p.y,
          directThickness
        );

      float directInner =
        smoothstep(
          shadowRadius + 0.025,
          shadowRadius + 0.13,
          r
        );

      float directOuter =
        1.0 -
        smoothstep(
          0.73,
          0.99,
          r
        );

      directBand *=
        directInner *
        directOuter;

      /*
        --------------------------------------------------------------
        BACK-SIDE DISK / U-SHAPED LENSED IMAGE
        --------------------------------------------------------------

        The ray-bent back disk is represented as two broad arcs:
        one above, one below the shadow. Their curvature is strongest
        close to the photon region.
      */

      float ellipseRadius =
        length(
          vec2(
            p.x * 1.00,
            p.y * 0.86
          )
        );

      float outerLensedArc =
        ringSDF(
          ellipseRadius,
          shadowRadius * 1.44,
          0.055
        );

      float innerLensedArc =
        ringSDF(
          ellipseRadius,
          shadowRadius * 1.115,
          0.023
        );

      /*
        Brightness of the back side changes with x to avoid a
        mathematically sterile ring.
      */

      float backAsymmetry =
        0.72 +
        0.28 *
        (
          0.5 +
          0.5 *
          cos(
            angle -
            0.24
          )
        );

      float backDisk =
        outerLensedArc *
        backAsymmetry;

      /*
        Give the top and bottom arcs the characteristic wide
        "wrapping" seen in edge-on black-hole visualizations.
      */

      float topWrap =
        gaussian(
          p.y -
          0.52 *
          sqrt(
            max(
              0.0,
              1.0 -
              p.x *
              p.x *
              1.18
            )
          ),
          0.078
        );

      float bottomWrap =
        gaussian(
          p.y +
          0.52 *
          sqrt(
            max(
              0.0,
              1.0 -
              p.x *
              p.x *
              1.18
            )
          ),
          0.078
        );

      float wrappingDisk =
        max(
          topWrap,
          bottomWrap
        );

      wrappingDisk *=
        smoothstep(
          shadowRadius * 0.82,
          shadowRadius + 0.18,
          r
        );

      wrappingDisk *=
        1.0 -
        smoothstep(
          0.74,
          1.05,
          r
        );

      /*
        --------------------------------------------------------------
        HIGHER ORDER IMAGES
        --------------------------------------------------------------
      */

      float higherOrder =
        innerLensedArc *
        (
          0.40 +
          0.25 *
          sin(
            angle *
            7.0 -
            uTime *
            0.75
          )
        );

      /*
        --------------------------------------------------------------
        PHOTON RING
        --------------------------------------------------------------
      */

      float photonRadius =
        shadowRadius *
        1.075;

      float photonRing =
        ringSDF(
          r,
          photonRadius,
          0.010
        );

      float photonRingSoft =
        ringSDF(
          r,
          photonRadius,
          0.026
        );

      /*
        --------------------------------------------------------------
        PLASMA STRUCTURE
        --------------------------------------------------------------
      */

      float spiral =
        angle *
        18.0 -
        log(
          max(
            r,
            0.06
          )
        ) *
        31.0 -
        uTime *
        2.8;

      float bands =
        0.5 +
        0.5 *
        sin(
          spiral
        );

      float turbulent =
        fbm(
          p * 7.5 +
          vec2(
            uTime * 0.06,
            -uTime * 0.035
          )
        );

      float filament =
        smoothstep(
          0.27,
          0.82,
          bands *
          0.67 +
          turbulent *
          0.33
        );

      /*
        --------------------------------------------------------------
        DOPPLER BEAMING
        --------------------------------------------------------------
      */

      /*
        The left side is deliberately boosted, matching the common
        edge-on NASA rendering where the approaching side is brighter.
      */

      float velocity =
        clamp(
          0.25 +
          0.28 /
          (
            r +
            0.35
          ),
          0.18,
          0.68
        );

      float towardObserver =
        clamp(
          -p.x /
          max(
            r,
            0.05
          ),
          -1.0,
          1.0
        );

      float doppler =
        pow(
          max(
            0.10,
            1.0 +
            velocity *
            towardObserver
          ),
          2.8
        );

      /*
        --------------------------------------------------------------
        TEMPERATURE
        --------------------------------------------------------------
      */

      float radialHeat =
        pow(
          clamp(
            1.0 -
            (
              r -
              shadowRadius
            ) /
            0.72,
            0.0,
            1.0
          ),
          1.55
        );

      vec3 deepBurgundy =
        vec3(
          0.08,
          0.001,
          0.002
        );

      vec3 red =
        vec3(
          0.55,
          0.014,
          0.003
        );

      vec3 orange =
        vec3(
          1.0,
          0.18,
          0.015
        );

      vec3 gold =
        vec3(
          1.0,
          0.60,
          0.11
        );

      vec3 whiteHot =
        vec3(
          1.0,
          0.97,
          0.88
        );

      vec3 gasColor =
        mix(
          deepBurgundy,
          red,
          radialHeat *
          0.75
        );

      gasColor =
        mix(
          gasColor,
          orange,
          radialHeat *
          0.82
        );

      gasColor =
        mix(
          gasColor,
          gold,
          radialHeat *
          radialHeat *
          0.75
        );

      gasColor =
        mix(
          gasColor,
          whiteHot,
          radialHeat *
          radialHeat *
          radialHeat *
          0.72
        );

      /*
        Gravitational redshift approximation:
        suppress short-wavelength blue/white emission closest to the
        horizon, leaving the inner gas warmer.
      */

      float redshift =
        smoothstep(
          shadowRadius,
          shadowRadius +
          0.30,
          r
        );

      gasColor.b *=
        0.56 +
        0.44 *
        redshift;

      /*
        --------------------------------------------------------------
        COMBINE DIRECT + LENSED IMAGES
        --------------------------------------------------------------
      */

      float directEmission =
        directBand *
        filament *
        doppler;

      float backEmission =
        (
          backDisk *
          0.90 +
          wrappingDisk *
          0.78
        ) *
        filament *
        (
          0.72 +
          0.28 *
          doppler
        );

      float higherEmission =
        higherOrder *
        filament *
        0.27;

      float emission =
        (
          directEmission +
          backEmission +
          higherEmission
        ) *
        uPower;

      /*
        Photon ring is much brighter and thinner.
      */

      emission +=
        photonRing *
        4.8 *
        uPower;

      emission +=
        photonRingSoft *
        0.55 *
        uPower;

      /*
        Very hot inner rim.
      */

      float innerRim =
        smoothstep(
          shadowRadius,
          shadowRadius +
          0.075,
          r
        ) *
        (
          1.0 -
          smoothstep(
            shadowRadius +
            0.08,
            shadowRadius +
            0.21,
            r
          )
        );

      emission +=
        innerRim *
        2.2 *
        doppler *
        uPower;

      /*
        Preserve an absolutely black shadow.
      */

      float visible =
        1.0 -
        shadow;

      float alpha =
        clamp(
          emission *
          0.94,
          0.0,
          1.0
        ) *
        visible;

      vec3 finalColor =
        gasColor *
        emission;

      /*
        Add a warm white specular-looking photon rim.
      */

      finalColor +=
        vec3(
          1.0,
          0.89,
          0.68
        ) *
        photonRing *
        2.8 *
        uPower;

      /*
        Very subtle blue transition at the most relativistic inner edge.
      */

      finalColor +=
        vec3(
          0.26,
          0.55,
          1.0
        ) *
        innerRim *
        photonRingSoft *
        0.34 *
        uPower;

      /*
        Tiny optical spill surrounding the bright disk.
      */

      float halo =
        exp(
          -pow(
            max(
              r -
              shadowRadius,
              0.0
            ) /
            0.19,
            2.0
          )
        );

      finalColor +=
        (
          orange *
          0.22 +
          whiteHot *
          0.08
        ) *
        halo *
        uPower;


      /*
        Final HDR-like compression is intentionally left to the
        renderer / UnrealBloomPass.
      */

      gl_FragColor =
        vec4(
          finalColor,
          alpha
        );
    }
  `;


  /*
    ========================================================================
    INIT
    ========================================================================
  */

  async function init() {

    try {

      renderer =
        new THREE.WebGLRenderer({

          canvas,

          antialias:
            true,

          depth:
            true,

          stencil:
            false,

          alpha:
            false,

          powerPreference:
            "high-performance"
        });

    } catch (error) {

      reportError(
        "Не удалось создать WebGL-контекст. Включите аппаратное ускорение браузера.",
        error
      );

      return;
    }


    const deviceRatio = window.devicePixelRatio || 1;
    const cores = navigator.hardwareConcurrency || 8;
    const pixelRatio = Math.min(
      deviceRatio,
      mobile ? 1.25 : (cores <= 4 ? 1.4 : 1.65)
    );


    renderer.setPixelRatio(
      pixelRatio
    );


    renderer.setSize(
      window.innerWidth,
      window.innerHeight,
      false
    );


    renderer.outputColorSpace =
      THREE.SRGBColorSpace;


    renderer.toneMapping =
      THREE.ACESFilmicToneMapping;


    renderer.toneMappingExposure =
      1.42;


    scene =
      new THREE.Scene();


    scene.background =
      new THREE.Color(
        0x010208
      );


    camera =
      new THREE.PerspectiveCamera(

        CONFIG.cameraFov,

        window.innerWidth /
        window.innerHeight,

        0.1,

        180

      );


    camera.position.set(
      4.8,
      2.35,
      CONFIG.cameraDistance
    );


    camera.lookAt(
      0,
      0,
      0
    );


    clock =
      new THREE.Clock();


    cinematicLight =
      new THREE.PointLight(
        0x98ddff,
        12,
        50,
        2
      );


    cinematicLight.position.set(
      2,
      4,
      8
    );


    scene.add(
      cinematicLight
    );


    scene.add(
      new THREE.AmbientLight(
        0x30405f,
        0.70
      )
    );


    createNebula();
    createStarField();
    createEarlyEvolution();
    createSupergiant();
    createTransitionObjects();
    createSupernova();
    createTransitionFX();
    createBlackHole();
    createLensingDisk();
    createDiskParticles();
    createJets();


    /*
      Post-processing is optional:
      if CDN is unavailable, the scene still renders normally.
    */

    composerReady =
      await initializeBloom();


    window.addEventListener(
      "resize",
      onResize,
      {
        passive:
          true
      }
    );


    setupScroll();


    animate();
  }


  let composerReady =
    false;


  /*
    ========================================================================
    NEBULA
    ========================================================================
  */

  function createNebula() {

    const vertexShader = `
      varying vec2 vUv;

      void main() {

        vUv =
          uv;

        gl_Position =
          vec4(
            position.xy,
            0.0,
            1.0
          );
      }
    `;


    const fragmentShader = `
      precision highp float;

      varying vec2 vUv;

      uniform float uTime;


      float hash(
        vec2 p
      ) {

        p =
          fract(
            p *
            vec2(
              127.1,
              311.7
            )
          );

        p +=
          dot(
            p,
            p +
            34.5
          );

        return fract(
          p.x *
          p.y
        );
      }


      float noise(
        vec2 p
      ) {

        vec2 i =
          floor(
            p
          );

        vec2 f =
          fract(
            p
          );

        f =
          f *
          f *
          (
            3.0 -
            2.0 *
            f
          );

        return mix(
          mix(
            hash(
              i
            ),
            hash(
              i +
              vec2(
                1.0,
                0.0
              )
            ),
            f.x
          ),
          mix(
            hash(
              i +
              vec2(
                0.0,
                1.0
              )
            ),
            hash(
              i +
              vec2(
                1.0,
                1.0
              )
            ),
            f.x
          ),
          f.y
        );
      }


      float fbm(
        vec2 p
      ) {

        float value =
          0.0;

        float amplitude =
          0.5;

        for (
          int i = 0;
          i < 7;
          i++
        ) {

          value +=
            noise(
              p
            ) *
            amplitude;

          p *=
            2.02;

          amplitude *=
            0.5;
        }

        return value;
      }


      void main() {

        vec2 uv =
          vUv;

        vec2 p =
          uv -
          0.5;

        p.x *=
          1.55;


        float low =
          fbm(
            p *
            2.1 +
            vec2(
              uTime *
              .006,
              -uTime *
              .004
            )
          );


        float high =
          fbm(
            p *
            5.7 -
            vec2(
              uTime *
              .003,
              uTime *
              .002
            )
          );


        float cloud =
          low *
          .72 +
          high *
          .28;


        cloud =
          smoothstep(
            .31,
            .79,
            cloud
          );


        float left =
          exp(
            -length(
              (
                uv -
                vec2(
                  .13,
                  .39
                )
              ) *
              vec2(
                1.15,
                1.0
              )
            ) *
            3.2
          );


        float right =
          exp(
            -length(
              (
                uv -
                vec2(
                  .86,
                  .66
                )
              ) *
              vec2(
                1.1,
                1.0
              )
            ) *
            3.0
          );


        float upper =
          exp(
            -length(
              (
                uv -
                vec2(
                  .55,
                  .13
                )
              ) *
              vec2(
                1.3,
                1.0
              )
            ) *
            3.5
          );


        vec3 color =
          vec3(
            0.001,
            0.002,
            0.007
          );


        color +=
          vec3(
            0.16,
            0.035,
            0.37
          ) *
          cloud *
          left *
          .75;


        color +=
          vec3(
            0.018,
            0.095,
            0.31
          ) *
          cloud *
          right *
          .90;


        color +=
          vec3(
            0.29,
            0.016,
            0.085
          ) *
          cloud *
          right *
          .48;


        color +=
          vec3(
            0.12,
            0.035,
            0.29
          ) *
          cloud *
          upper *
          .30;


        float edge =
          smoothstep(
            0.95,
            0.15,
            distance(
              uv,
              vec2(
                .5
              )
            )
          );


        gl_FragColor =
          vec4(
            color *
            edge,
            1.0
          );
      }
    `;


    const material =
      new THREE.ShaderMaterial({

        vertexShader,

        fragmentShader,

        uniforms: {

          uTime: {
            value:
              0
          }
        },

        depthWrite:
          false,

        depthTest:
          false
      });


    const mesh =
      new THREE.Mesh(

        new THREE.PlaneGeometry(
          2,
          2
        ),

        material

      );


    mesh.renderOrder =
      -1000;


    scene.add(
      mesh
    );


    scene.userData.nebula =
      material;
  }


  /*
    ========================================================================
    STARFIELD
    ========================================================================
  */

  function createStarField() {

    const count =
      CONFIG.stars;


    const positions =
      new Float32Array(
        count * 3
      );

    const colors =
      new Float32Array(
        count * 3
      );

    const sizes =
      new Float32Array(
        count
      );

    const brightness =
      new Float32Array(
        count
      );


    for (
      let i = 0;
      i < count;
      i++
    ) {

      const theta =
        Math.random() *
        Math.PI *
        2;


      const phi =
        Math.acos(
          2 *
          Math.random() -
          1
        );


      const radius =
        15 +
        Math.pow(
          Math.random(),
          0.32
        ) *
        62;


      positions[i * 3] =
        Math.sin(phi) *
        Math.cos(theta) *
        radius;


      positions[i * 3 + 1] =
        Math.cos(phi) *
        radius *
        0.78;


      positions[i * 3 + 2] =
        Math.sin(phi) *
        Math.sin(theta) *
        radius;


      const temperature =
        Math.random();


      if (
        temperature <
        0.08
      ) {

        colors[i * 3] =
          0.45;

        colors[i * 3 + 1] =
          0.78;

        colors[i * 3 + 2] =
          1.0;

      } else if (
        temperature <
        0.16
      ) {

        colors[i * 3] =
          0.70;

        colors[i * 3 + 1] =
          0.64;

        colors[i * 3 + 2] =
          1.0;

      } else {

        colors[i * 3] =
          0.91 +
          Math.random() *
          0.09;

        colors[i * 3 + 1] =
          0.92 +
          Math.random() *
          0.08;

        colors[i * 3 + 2] =
          1.0;
      }


      sizes[i] =
        0.65 +
        Math.pow(
          Math.random(),
          3
        ) *
        2.9;


      brightness[i] =
        0.22 +
        Math.random() *
        0.78;
    }


    const geometry =
      new THREE.BufferGeometry();


    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        positions,
        3
      )
    );


    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(
        colors,
        3
      )
    );


    geometry.setAttribute(
      "aSize",
      new THREE.BufferAttribute(
        sizes,
        1
      )
    );


    geometry.setAttribute(
      "aBrightness",
      new THREE.BufferAttribute(
        brightness,
        1
      )
    );


    const material =
      new THREE.ShaderMaterial({

        vertexColors:
          true,

        transparent:
          true,

        depthWrite:
          false,

        blending:
          THREE.AdditiveBlending,

        vertexShader:
          STAR_VERTEX_SHADER,

        fragmentShader:
          STAR_FRAGMENT_SHADER,

        uniforms: {

          uTime:
            {
              value:
                0
            },

          uPixelRatio:
            {
              value:
                Math.min(
                  window.devicePixelRatio ||
                  1,
                  mobile
                    ? 1.25
                    : 1.6
                )
            }
        }
      });


    starField =
      new THREE.Points(
        geometry,
        material
      );


    starField.rotation.set(
      0.14,
      -0.20,
      0
    );


    scene.add(
      starField
    );
  }


  /*
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

    // Do not use a perfect torus here: during the hot-core phase a thin ring
    // made the object read visually as Saturn. A shallow, irregular plasma
    // sheet keeps the accretion geometry but avoids the planetary silhouette.
    const diskGeo = new THREE.SphereGeometry(2.05, 48, 20);
    protostarDisk = new THREE.Mesh(
      diskGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff8c3a,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    protostarDisk.scale.set(1.0, 0.035, 1.0);

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

  function createSupergiant() {

    supergiantGroup =
      new THREE.Group();


    const material =
      new THREE.ShaderMaterial({

        vertexShader:
          STAR_SURFACE_VERTEX,

        fragmentShader:
          STAR_SURFACE_FRAGMENT,

        uniforms: {

          uTime: {
            value:
              0
          },

          uCollapse: {
            value:
              0
          },

          uEvolution: {
            value:
              0
          },

          uCameraPosition: {
            value:
              camera.position
          }
        },

        transparent:
          true,

        depthWrite:
          true,

        depthTest:
          true,

        blending:
          THREE.AdditiveBlending
      });


    supergiantMesh =
      new THREE.Mesh(

        new THREE.SphereGeometry(
          2.42,
          96,
          96
        ),

        material

      );


    supergiantShell =
      new THREE.Mesh(

        new THREE.SphereGeometry(
          2.68,
          72,
          72
        ),

        new THREE.MeshBasicMaterial({

          color:
            0x54caff,

          transparent:
            true,

          opacity:
            0.09,

          side:
            THREE.BackSide,

          blending:
            THREE.AdditiveBlending,

          depthWrite:
            false

        })

      );


    supergiantGroup.add(
      supergiantShell,
      supergiantMesh
    );


    scene.add(
      supergiantGroup
    );
  }


  /*
    ========================================================================
    TRANSITION OBJECTS
    ========================================================================
  */

  function createTransitionObjects() {

    /*
      --------------------------------------------------------------
      Stellar outer envelope
      --------------------------------------------------------------
    */

    {
      const count =
        CONFIG.stellarShell;

      const positions =
        new Float32Array(
          count * 3
        );

      const colors =
        new Float32Array(
          count * 3
        );

      const data =
        new Array(
          count
        );


      for (
        let i = 0;
        i < count;
        i++
      ) {

        const theta =
          Math.random() *
          Math.PI *
          2;

        const phi =
          Math.acos(
            2 *
            Math.random() -
            1
          );

        const r =
          2.35 +
          Math.pow(
            Math.random(),
            1.4
          ) *
          1.15;


        data[i] = {

          theta,

          phi,

          radius:
            r,

          phase:
            Math.random() *
            Math.PI *
            2,

          seed:
            Math.random()
        };


        positions[i * 3] =
          Math.sin(phi) *
          Math.cos(theta) *
          r;


        positions[i * 3 + 1] =
          Math.cos(phi) *
          r;


        positions[i * 3 + 2] =
          Math.sin(phi) *
          Math.sin(theta) *
          r;


        const c =
          Math.random();


        colors[i * 3] =
          0.20 +
          c *
          0.55;


        colors[i * 3 + 1] =
          0.48 +
          c *
          0.44;


        colors[i * 3 + 2] =
          0.90 +
          c *
          0.10;
      }


      const geometry =
        new THREE.BufferGeometry();


      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
          positions,
          3
        )
      );


      geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(
          colors,
          3
        )
      );


      stellarEnvelope =
        new THREE.Points(

          geometry,

          new THREE.PointsMaterial({

            size:
              mobile
                ? 0.042
                : 0.052,

            vertexColors:
              true,

            transparent:
              true,

            opacity:
              0,

            depthWrite:
              false,

            blending:
              THREE.AdditiveBlending

          })

        );


      stellarEnvelope.userData.data =
        data;


      scene.add(
        stellarEnvelope
      );
    }


    /*
      --------------------------------------------------------------
      Compact core + halo.
      --------------------------------------------------------------
    */

    collapseCore =
      new THREE.Mesh(

        new THREE.SphereGeometry(
          0.32,
          48,
          48
        ),

        new THREE.MeshBasicMaterial({
          color:
            0xf3fbff,

          transparent:
            true,

          opacity:
            0,

          blending:
            THREE.AdditiveBlending
        })

      );


    collapseCore.scale.setScalar(
      0.001
    );


    scene.add(
      collapseCore
    );


    collapseHalo =
      new THREE.Mesh(

        new THREE.SphereGeometry(
          0.62,
          48,
          48
        ),

        new THREE.MeshBasicMaterial({

          color:
            0x72dfff,

          transparent:
            true,

          opacity:
            0,

          side:
            THREE.BackSide,

          blending:
            THREE.AdditiveBlending,

          depthWrite:
            false
        })

      );


    collapseHalo.scale.setScalar(
      0.001
    );


    scene.add(
      collapseHalo
    );


    /*
      --------------------------------------------------------------
      Shock fronts.
      --------------------------------------------------------------
    */

    shockGroup =
      new THREE.Group();


    const shockColors = [
      0xd8faff,
      0x6fdcff,
      0xffb14d,
      0xff5d32
    ];


    for (
      let i = 0;
      i < 4;
      i++
    ) {

      const ring =
        new THREE.Mesh(

          new THREE.TorusGeometry(
            1.35 +
              i *
              0.38,

            0.016 +
              i *
              0.008,

            10,

            192
          ),

          new THREE.MeshBasicMaterial({

            color:
              shockColors[i],

            transparent:
              true,

            opacity:
              0,

            blending:
              THREE.AdditiveBlending,

            depthWrite:
              false

          })

        );


      ring.rotation.x =
        Math.PI *
        0.5;


      shockGroup.add(
        ring
      );
    }


    scene.add(
      shockGroup
    );


    /*
      --------------------------------------------------------------
      Remnant cloud
      --------------------------------------------------------------
    */

    createRemnantCloud();


    /*
      --------------------------------------------------------------
      Fallback / bound matter
      --------------------------------------------------------------
    */

    createFallbackMatter();


    /*
      --------------------------------------------------------------
      Neutrino-like transient
      --------------------------------------------------------------
    */

    createNeutrinoCloud();
  }


  function createRemnantCloud() {

    const count =
      CONFIG.remnantCloud;


    const positions =
      new Float32Array(
        count * 3
      );


    const colors =
      new Float32Array(
        count * 3
      );


    const data =
      new Array(
        count
      );


    for (
      let i = 0;
      i < count;
      i++
    ) {

      const theta =
        Math.random() *
        Math.PI *
        2;

      const phi =
        Math.acos(
          2 *
          Math.random() -
          1
        );

      const r =
        2.3 +
        Math.pow(
          Math.random(),
          0.45
        ) *
        5.8;


      data[i] = {

        theta,

        phi,

        radius:
          r,

        seed:
          Math.random(),

        phase:
          Math.random() *
          Math.PI *
          2
      };


      positions[i * 3] =
        Math.sin(phi) *
        Math.cos(theta) *
        r;


      positions[i * 3 + 1] =
        Math.cos(phi) *
        r *
        (
          0.68 +
          Math.random() *
          0.4
        );


      positions[i * 3 + 2] =
        Math.sin(phi) *
        Math.sin(theta) *
        r;


      const heat =
        Math.random();


      if (
        heat <
        0.18
      ) {

        colors[i * 3] =
          1.0;

        colors[i * 3 + 1] =
          0.48;

        colors[i * 3 + 2] =
          0.06;

      } else if (
        heat <
        0.62
      ) {

        colors[i * 3] =
          0.52;

        colors[i * 3 + 1] =
          0.055;

        colors[i * 3 + 2] =
          0.018;

      } else {

        colors[i * 3] =
          0.16;

        colors[i * 3 + 1] =
          0.012;

        colors[i * 3 + 2] =
          0.018;
      }
    }


    const geometry =
      new THREE.BufferGeometry();


    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        positions,
        3
      )
    );


    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(
        colors,
        3
      )
    );


    remnantCloud =
      new THREE.Points(

        geometry,

        new THREE.PointsMaterial({

          size:
            mobile
              ? 0.052
              : 0.064,

          vertexColors:
            true,

          transparent:
            true,

          opacity:
            0,

          depthWrite:
            false,

          blending:
            THREE.AdditiveBlending
        })

      );


    remnantCloud.userData.data =
      data;


    scene.add(
      remnantCloud
    );
  }


  function createFallbackMatter() {

    const count =
      CONFIG.fallbackDust;


    const positions =
      new Float32Array(
        count * 3
      );


    const colors =
      new Float32Array(
        count * 3
      );


    const data =
      new Array(
        count
      );


    for (
      let i = 0;
      i < count;
      i++
    ) {

      const r =
        2.2 +
        Math.random() *
        7.0;


      const theta =
        Math.random() *
        Math.PI *
        2;


      const y =
        (
          Math.random() -
          0.5
        ) *
        0.75;


      data[i] = {

        radius:
          r,

        angle:
          theta,

        height:
          y,

        speed:
          0.5 +
          1.25 /
          Math.max(
            r,
            1.2
          ),

        phase:
          Math.random() *
          Math.PI *
          2
      };


      positions[i * 3] =
        Math.cos(theta) *
        r;


      positions[i * 3 + 1] =
        y;


      positions[i * 3 + 2] =
        Math.sin(theta) *
        r;


      colors[i * 3] =
        1.0;

      colors[i * 3 + 1] =
        0.22 +
        Math.random() *
        0.30;

      colors[i * 3 + 2] =
        0.035;
    }


    const geometry =
      new THREE.BufferGeometry();


    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        positions,
        3
      )
    );


    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(
        colors,
        3
      )
    );


    fallbackDust =
      new THREE.Points(

        geometry,

        new THREE.PointsMaterial({

          size:
            mobile
              ? 0.036
              : 0.044,

          vertexColors:
            true,

          transparent:
            true,

          opacity:
            0,

          depthWrite:
            false,

          blending:
            THREE.AdditiveBlending
        })

      );


    fallbackDust.userData.data =
      data;


    scene.add(
      fallbackDust
    );
  }


  function createNeutrinoCloud() {

    const count =
      120;


    const positions =
      new Float32Array(
        count * 3
      );


    const colors =
      new Float32Array(
        count * 3
      );


    const directions =
      new Array(
        count
      );


    for (
      let i = 0;
      i < count;
      i++
    ) {

      const direction =
        new THREE.Vector3()
          .randomDirection()
          .normalize();


      directions[i] =
        direction;


      colors[i * 3] =
        0.24;

      colors[i * 3 + 1] =
        0.78;

      colors[i * 3 + 2] =
        1.0;
    }


    const geometry =
      new THREE.BufferGeometry();


    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        positions,
        3
      )
    );


    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(
        colors,
        3
      )
    );


    neutrinoCloud =
      new THREE.Points(

        geometry,

        new THREE.PointsMaterial({

          size:
            0.045,

          vertexColors:
            true,

          transparent:
            true,

          opacity:
            0,

          depthWrite:
            false,

          blending:
            THREE.AdditiveBlending

        })

      );


    neutrinoCloud.userData.directions =
      directions;


    scene.add(
      neutrinoCloud
    );
  }



  /*
    ========================================================================
    TRANSITION FX — FORWARD / REVERSE SHOCKS, DEBRIS KNOTS, STREAMS
    ========================================================================
  */

  function createTransitionFX() {

    /*
      Forward shock: a broad emissive shell.
    */
    forwardShock =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          2.9,
          72,
          72
        ),
        new THREE.MeshBasicMaterial({
          color:
            0x8bdfff,
          transparent:
            true,
          opacity:
            0,
          wireframe:
            true,
          blending:
            THREE.AdditiveBlending,
          depthWrite:
            false
        })
      );

    forwardShock.scale.setScalar(0.001);
    scene.add(forwardShock);

    /*
      Reverse shock: a separate warm shell that turns on later.
    */
    reverseShock =
      new THREE.Mesh(
        new THREE.SphereGeometry(
          2.35,
          72,
          72
        ),
        new THREE.MeshBasicMaterial({
          color:
            0xff713d,
          transparent:
            true,
          opacity:
            0,
          wireframe:
            true,
          blending:
            THREE.AdditiveBlending,
          depthWrite:
            false
        })
      );

    reverseShock.scale.setScalar(0.001);
    scene.add(reverseShock);

    /*
      Dense clumps: macroscopic knots in the ejecta.
    */
    {
      const count =
        CONFIG.debrisKnots;

      const positions =
        new Float32Array(
          count * 3
        );

      const colors =
        new Float32Array(
          count * 3
        );

      const data =
        new Array(count);

      for (
        let i = 0;
        i < count;
        i++
      ) {
        const direction =
          new THREE.Vector3()
            .randomDirection()
            .normalize();

        data[i] = {
          x:
            direction.x,
          y:
            direction.y,
          z:
            direction.z,
          radius:
            0.7 +
            Math.random() *
            2.4,
          speed:
            0.75 +
            Math.random() *
            1.65,
          size:
            1.0 +
            Math.random() *
            2.8,
          phase:
            Math.random() *
            Math.PI *
            2
        };

        const c =
          Math.random();

        positions[i * 3] =
          0;
        positions[i * 3 + 1] =
          0;
        positions[i * 3 + 2] =
          0;

        colors[i * 3] =
          0.64 +
          c * 0.36;
        colors[i * 3 + 1] =
          0.09 +
          c * 0.37;
        colors[i * 3 + 2] =
          0.015;
      }

      const geometry =
        new THREE.BufferGeometry();

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
          positions,
          3
        )
      );

      geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(
          colors,
          3
        )
      );

      debrisKnots =
        new THREE.Points(
          geometry,
          new THREE.PointsMaterial({
            size:
              mobile
                ? 0.075
                : 0.09,
            vertexColors:
              true,
            transparent:
              true,
            opacity:
              0,
            depthWrite:
              false,
            blending:
              THREE.AdditiveBlending
          })
        );

      debrisKnots.userData.data =
        data;

      scene.add(
        debrisKnots
      );
    }

    /*
      Fallback streams: elongated filaments that bridge the remnant
      to the future disk rather than instantly producing a flat ring.
    */
    {
      const count =
        CONFIG.fallbackStreams;

      const positions =
        new Float32Array(
          count * 3
        );

      const colors =
        new Float32Array(
          count * 3
        );

      const data =
        new Array(count);

      for (
        let i = 0;
        i < count;
        i++
      ) {
        const phi =
          Math.random() *
          Math.PI *
          2;

        data[i] = {
          phi,
          radius:
            2.2 +
            Math.random() *
            5.0,
          q:
            Math.random(),
          phase:
            Math.random() *
            Math.PI *
            2,
          arm:
            Math.floor(
              Math.random() *
              4
            )
        };

        positions[i * 3] =
          Math.cos(phi) *
          data[i].radius;
        positions[i * 3 + 1] =
          (
            Math.random() -
            0.5
          ) *
          0.55;
        positions[i * 3 + 2] =
          Math.sin(phi) *
          data[i].radius;

        colors[i * 3] =
          0.72;
        colors[i * 3 + 1] =
          0.23 +
          Math.random() *
          0.22;
        colors[i * 3 + 2] =
          0.035;
      }

      const geometry =
        new THREE.BufferGeometry();

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(
          positions,
          3
        )
      );

      geometry.setAttribute(
        "color",
        new THREE.BufferAttribute(
          colors,
          3
        )
      );

      fallbackStreams =
        new THREE.Points(
          geometry,
          new THREE.PointsMaterial({
            size:
              mobile
                ? 0.038
                : 0.045,
            vertexColors:
              true,
            transparent:
              true,
            opacity:
              0,
            depthWrite:
              false,
            blending:
              THREE.AdditiveBlending
          })
        );

      fallbackStreams.userData.data =
        data;

      scene.add(
        fallbackStreams
      );
    }

    /*
      Disk corona / haze: a diffuse volumetric-looking outer layer.
    */
    diskHalo =
      new THREE.Mesh(
        new THREE.RingGeometry(
          1.55,
          5.55,
          192
        ),
        new THREE.MeshBasicMaterial({
          color:
            0xff682c,
          transparent:
            true,
          opacity:
            0,
          side:
            THREE.DoubleSide,
          blending:
            THREE.AdditiveBlending,
          depthWrite:
            false
        })
      );

    diskHalo.rotation.x =
      Math.PI *
      0.5;

    diskHalo.scale.setScalar(
      0.001
    );

    scene.add(
      diskHalo
    );
  }


  /*
    ========================================================================
    SUPERNOVA
    ========================================================================
  */

  function createSupernova() {

    const count =
      CONFIG.ejecta;


    const positions =
      new Float32Array(
        count * 3
      );


    const colors =
      new Float32Array(
        count * 3
      );


    const velocity =
      new Float32Array(
        count * 3
      );


    const seed =
      new Float32Array(
        count
      );


    const phase =
      new Float32Array(
        count
      );


    for (
      let i = 0;
      i < count;
      i++
    ) {

      const direction =
        new THREE.Vector3()
          .randomDirection()
          .normalize();


      const speed =
        0.75 +
        Math.pow(
          Math.random(),
          0.44
        ) *
        2.1;


      velocity[i * 3] =
        direction.x *
        speed;


      velocity[i * 3 + 1] =
        direction.y *
        speed *
        (
          0.90 +
          Math.random() *
          0.22
        );


      velocity[i * 3 + 2] =
        direction.z *
        speed;


      seed[i] =
        Math.random();


      phase[i] =
        Math.random() *
        Math.PI *
        2;


      /*
        White hot material in the inner ejecta, orange/red farther out.
      */

      const heat =
        Math.random();


      if (
        heat >
        0.58
      ) {

        colors[i * 3] =
          1.0;

        colors[i * 3 + 1] =
          0.92;

        colors[i * 3 + 2] =
          0.76;

      } else if (
        heat >
        0.18
      ) {

        colors[i * 3] =
          1.0;

        colors[i * 3 + 1] =
          0.30 +
          heat *
          0.48;

        colors[i * 3 + 2] =
          0.025;

      } else {

        colors[i * 3] =
          0.35;

        colors[i * 3 + 1] =
          0.02;

        colors[i * 3 + 2] =
          0.012;
      }
    }


    supernovaGeometry =
      new THREE.BufferGeometry();


    supernovaGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        positions,
        3
      )
    );


    supernovaGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(
        colors,
        3
      )
    );


    /*
      Store particle vectors and other arrays on geometry userData.
    */

    supernovaGeometry.userData = {
      velocity,
      seed,
      phase
    };


    supernovaMaterial =
      new THREE.PointsMaterial({

        size:
          mobile
            ? 0.07
            : 0.085,

        sizeAttenuation:
          true,

        vertexColors:
          true,

        transparent:
          true,

        opacity:
          0,

        depthWrite:
          false,

        blending:
          THREE.AdditiveBlending

      });


    supernovaPoints =
      new THREE.Points(

        supernovaGeometry,

        supernovaMaterial

      );


    scene.add(
      supernovaPoints
    );
  }


  /*
    ========================================================================
    BLACK HOLE
    ========================================================================
  */

  function createBlackHole() {

    blackHole =
      new THREE.Mesh(

        new THREE.SphereGeometry(
          CONFIG.blackHoleRadius,
          128,
          128
        ),

        new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0 },
            uStrength: { value: 0 }
          },
          vertexShader: `
            varying vec3 vLocalPosition;
            varying vec3 vNormalView;

            void main() {
              vLocalPosition = normalize(position);
              vNormalView = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            precision highp float;

            uniform float uTime;
            uniform float uStrength;
            varying vec3 vLocalPosition;
            varying vec3 vNormalView;

            void main() {
              vec3 p = normalize(vLocalPosition);
              float longitude = atan(p.z, p.x);
              float latitude = asin(clamp(p.y, -1.0, 1.0));

              // Several very dark counter-moving bands make the horizon feel
              // alive and rotating without turning the event horizon grey.
              float flowA = 0.5 + 0.5 * sin(longitude * 7.0 + latitude * 5.0 - uTime * 0.78);
              float flowB = 0.5 + 0.5 * sin(longitude * 13.0 - latitude * 8.0 - uTime * 1.12);
              float shear = 0.5 + 0.5 * sin(longitude * 3.0 + latitude * 15.0 - uTime * 0.46);
              float flow = flowA * 0.48 + flowB * 0.34 + shear * 0.18;

              float facing = clamp(abs(vNormalView.z), 0.0, 1.0);
              float limb = pow(1.0 - facing, 3.0);

              // Keep the centre essentially black. Only a tiny moving
              // near-black structure and edge sheen reveal the rotation.
              float surface = (0.0025 + flow * 0.0105 + limb * 0.0075) * uStrength;
              vec3 tint = mix(vec3(0.55, 0.60, 0.78), vec3(0.28, 0.18, 0.48), flowB);
              gl_FragColor = vec4(tint * surface, 1.0);
            }
          `,
          depthWrite: true,
          depthTest: true
        })

      );


    blackHole.scale.setScalar(
      0.001
    );


    blackHole.renderOrder =
      40;


    scene.add(
      blackHole
    );


    blackHoleHalo =
      new THREE.Mesh(

        new THREE.SphereGeometry(
          CONFIG.blackHoleRadius *
          1.52,
          80,
          80
        ),

        new THREE.MeshBasicMaterial({

          color:
            0x3c2e72,

          transparent:
            true,

          opacity:
            0.015,

          side:
            THREE.BackSide,

          blending:
            THREE.AdditiveBlending,

          depthWrite:
            false
        })

      );


    blackHoleHalo.scale.setScalar(
      0.001
    );


    blackHoleHalo.renderOrder =
      25;


    scene.add(
      blackHoleHalo
    );
  }


  /*
    ========================================================================
    PROCEDURAL LENSING DISK
    ========================================================================
  */

  function createLensingDisk() {

    const geometry =
      new THREE.PlaneGeometry(
        11.6,
        11.6,
        1,
        1
      );


    lensingDiskMaterial =
      new THREE.ShaderMaterial({

        vertexShader:
          LENS_VERTEX_SHADER,

        fragmentShader:
          LENS_FRAGMENT_SHADER,

        uniforms: {

          uTime: {
            value:
              0
          },

          uPower: {
            value:
              0
          },

          uLensing: {
            value:
              1.0
          },

          uShadow: {
            value:
              0.32
          },

          uSpin: {
            value:
              0.88
          }
        },

        transparent:
          true,

        depthTest:
          false,

        depthWrite:
          false,

        side:
          THREE.DoubleSide,

        blending:
          THREE.AdditiveBlending
      });


    lensingDisk =
      new THREE.Mesh(
        geometry,
        lensingDiskMaterial
      );


    /*
      Attach the image-space lens to the camera so the silhouette
      stays fixed in the viewport while the physical camera drifts.
    */

    camera.add(
      lensingDisk
    );


    lensingDisk.position.set(
      0,
      0,
      -0.34
    );


    lensingDisk.scale.setScalar(
      0.001
    );


    lensingDisk.renderOrder =
      50;
  }


  /*
    ========================================================================
    DISK PARTICLES
    ========================================================================
  */

  function createDiskParticles() {

    const count =
      CONFIG.diskParticles;


    const positions =
      new Float32Array(
        count * 3
      );


    const colors =
      new Float32Array(
        count * 3
      );


    const radius =
      new Float32Array(
        count
      );


    const angle =
      new Float32Array(
        count
      );


    const height =
      new Float32Array(
        count
      );


    const speed =
      new Float32Array(
        count
      );


    for (
      let i = 0;
      i < count;
      i++
    ) {

      const r =
        1.55 +
        Math.pow(
          Math.random(),
          0.60
        ) *
        3.65;


      radius[i] =
        r;


      angle[i] =
        Math.random() *
        Math.PI *
        2;


      height[i] =
        (
          Math.random() -
          0.5
        ) *
        (
          0.035 +
          Math.pow(
            r /
            5.2,
            1.75
          ) *
          0.20
        );


      speed[i] =
        0.55 +
        1.65 /
        Math.max(
          r,
          1.0
        );


      positions[i * 3] =
        Math.cos(
          angle[i]
        ) *
        r;


      positions[i * 3 + 1] =
        height[i];


      positions[i * 3 + 2] =
        Math.sin(
          angle[i]
        ) *
        r;


      /*
        Avoid allocations:
        write colors directly.
      */

      const hot =
        Math.random();


      colors[i * 3] =
        1.0;


      colors[i * 3 + 1] =
        hot > 0.55
          ? 0.75 +
            Math.random() *
            0.22
          : 0.18 +
            Math.random() *
            0.32;


      colors[i * 3 + 2] =
        hot > 0.68
          ? 0.55 +
            Math.random() *
            0.35
          : 0.02;
    }


    diskParticles =
      new THREE.Points(

        (() => {

          const geometry =
            new THREE.BufferGeometry();

          geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(
              positions,
              3
            )
          );

          geometry.setAttribute(
            "color",
            new THREE.BufferAttribute(
              colors,
              3
            )
          );

          geometry.userData = {
            radius,
            angle,
            height,
            speed
          };

          return geometry;

        })(),

        new THREE.PointsMaterial({

          size:
            mobile
              ? 0.034
              : 0.041,

          vertexColors:
            true,

          transparent:
            true,

          opacity:
            0,

          depthWrite:
            false,

          blending:
            THREE.AdditiveBlending

        })

      );


    /*
      Match the 24° observer inclination used by the lens shader.
    */

    diskParticles.rotation.x =
      THREE.MathUtils.degToRad(
        24
      );


    scene.add(
      diskParticles
    );
  }


  /*
    ========================================================================
    JETS
    ========================================================================
  */

  function createJets() {

    const count =
      CONFIG.jets;


    const positions =
      new Float32Array(
        count * 3
      );


    const colors =
      new Float32Array(
        count * 3
      );


    const q =
      new Float32Array(
        count
      );


    const side =
      new Float32Array(
        count
      );


    const radius =
      new Float32Array(
        count
      );


    const phase =
      new Float32Array(
        count
      );


    for (
      let i = 0;
      i < count;
      i++
    ) {

      q[i] =
        Math.random();

      side[i] =
        i % 2 === 0
          ? 1
          : -1;

      radius[i] =
        Math.pow(
          Math.random(),
          2.35
        ) *
        0.48;

      phase[i] =
        Math.random() *
        Math.PI *
        2;


      const color =
        new THREE.Color().setHSL(

          0.64 +
          Math.random() *
          0.12,

          0.90,

          0.60 +
          Math.random() *
          0.30

        );


      colors[i * 3] =
        color.r;

      colors[i * 3 + 1] =
        color.g;

      colors[i * 3 + 2] =
        color.b;
    }


    jetGeometry =
      new THREE.BufferGeometry();


    jetGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        positions,
        3
      )
    );


    jetGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(
        colors,
        3
      )
    );


    jetGeometry.userData = {
      q,
      side,
      radius,
      phase
    };


    jetMaterial =
      new THREE.PointsMaterial({

        size:
          mobile
            ? 0.050
            : 0.060,

        vertexColors:
          true,

        transparent:
          true,

        opacity:
          0,

        depthWrite:
          false,

        blending:
          THREE.AdditiveBlending

      });


    jetParticles =
      new THREE.Points(

        jetGeometry,

        jetMaterial

      );


    scene.add(
      jetParticles
    );
  }


  /*
    ========================================================================
    BLOOM
    ========================================================================
  */

  async function initializeBloom() {

    const urls = [

      "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/postprocessing/EffectComposer.js",
      "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/postprocessing/RenderPass.js",
      "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/postprocessing/UnrealBloomPass.js"

    ];


    try {

      for (
        const url of urls
      ) {

        await loadScript(
          url
        );
      }


      if (
        !THREE.EffectComposer ||
        !THREE.RenderPass ||
        !THREE.UnrealBloomPass
      ) {

        return false;
      }


      composer =
        new THREE.EffectComposer(
          renderer
        );


      const renderPass =
        new THREE.RenderPass(
          scene,
          camera
        );


      composer.addPass(
        renderPass
      );


      bloomPass =
        new THREE.UnrealBloomPass(

          new THREE.Vector2(
            window.innerWidth,
            window.innerHeight
          ),

          CONFIG.bloomStrength,

          CONFIG.bloomRadius,

          CONFIG.bloomThreshold

        );


      composer.addPass(
        bloomPass
      );


      return true;

    } catch (error) {

      console.warn(
        "Bloom fallback: post-processing CDN unavailable.",
        error
      );


      return false;
    }
  }


  function loadScript(
    url
  ) {

    return new Promise(
      (
        resolve,
        reject
      ) => {

        const script =
          document.createElement(
            "script"
          );


        script.src =
          url;


        script.async =
          false;


        script.crossOrigin =
          "anonymous";


        script.onload =
          () => resolve();


        script.onerror =
          () =>
            reject(
              new Error(
                `Failed to load ${url}`
              )
            );


        document.head.appendChild(
          script
        );
      }
    );
  }


  /*
    ========================================================================
    CINEMATIC SCROLL / STORY TIMELINE
    ========================================================================

    Scroll is the single source of truth for the cinematic state.
    ScrollTrigger reports the normalized scroll position, the visual loop
    applies one frame-rate-independent damping layer, and the phase systems
    interpolate continuously from the resulting state.
  */

  const CINEMATIC_PHASES = [
    {
      point: 0.000,
      name: "MOLECULAR CLOUD"
    },
    {
      point: 0.135,
      name: "PROTOSTAR"
    },
    {
      point: 0.270,
      name: "MASSIVE STAR"
    },
    {
      point: 0.410,
      name: "RED SUPERGIANT"
    },
    {
      point: 0.555,
      name: "CORE COLLAPSE"
    },
    {
      point: 0.700,
      name: "SUPERNOVA"
    },
    {
      point: 0.840,
      name: "COMPACT REMNANT"
    },
    {
      point: 1.000,
      name: "BLACK HOLE / GARGANTUA"
    }
  ];

  const PHASE_POINTS = CINEMATIC_PHASES.map((phase) => phase.point);

  function setupScroll() {
    // One scroll source + one visual damping layer. The previous version
    // stacked a scrubbed GSAP timeline on top of a second smoothing filter
    // while reading the raw ScrollTrigger progress, so the timeline proxy
    // was never actually driving the scene.
    gsap.ticker.lagSmoothing(1000, 16);

    const trigger = ScrollTrigger.create({
      trigger: "#story",
      start: "top top",
      end: () => "bottom bottom-=1px",
      pin: "#storyPin",
      anticipatePin: 1,
      invalidateOnRefresh: true,
      fastScrollEnd: false,
      onUpdate: (self) => updateStory(self.progress),
      onLeave: () => updateStory(1),
      onRefresh: (self) => updateStory(self.progress)
    });

    window.__stellarScrollTrigger = trigger;
    updateStory(0);
  }


  function updateStory(progress) {
    const raw = progress >= 0.995 ? 1 : clamp01(progress);
    state.targetProgress = mapScrollToStory(raw);
  }


  function applyStoryProgress(progress) {
    state.progress = progress >= 0.995 ? 1 : clamp01(progress);

    // Broad overlapping envelopes: the old phase never vanishes at the same
    // instant the new one is born. There is always a visual bridge.
    // Phase 01 → 02 is the only transition deliberately reworked: the
    // cloud contracts continuously into the protostar instead of fading one
    // object out while popping another object in. Later phase envelopes are
    // unchanged.
    const earlyBlend = smootherStep(range(state.progress, 0.055, 0.205));
    state.cloud = 1 - earlyBlend;
    // Protostar now completes its life-cycle BEFORE the massive blue star
    // becomes visible. A short glow-only handoff bridges the two shots, so
    // there is no lingering second star behind the blue-star phase.
    const protoBirth = smootherStep(range(state.progress, 0.070, 0.185));
    const protoDeath = smootherStep(range(state.progress, 0.188, 0.232));
    state.protostar = clamp01(protoBirth * (1 - protoDeath));
    state.redSupergiant = phaseWeight(state.progress, 0.340, 0.565, 0.095);
    state.collapse = phaseWeight(state.progress, 0.485, 0.680, 0.085);
    state.nova = phaseWeight(state.progress, 0.585, 0.805, 0.100);
    state.compactRemnant = phaseWeight(state.progress, 0.705, 0.915, 0.090);
    state.disk = phaseWeight(state.progress, 0.825, 1.000, 0.105);
    state.blackHole = phaseWeight(state.progress, 0.880, 1.000, 0.095);
    state.jets = phaseWeight(state.progress, 0.950, 1.000, 0.065);

    // Continuous event intensity. This is later used by the camera/bloom so
    // the biggest moments feel like one flowing shot rather than keyframes.
    const collapsePulse = smootherStep(range(state.progress, 0.48, 0.62)) *
      (1 - smootherStep(range(state.progress, 0.64, 0.72)));
    const novaPulse = smootherStep(range(state.progress, 0.60, 0.71)) *
      (1 - smootherStep(range(state.progress, 0.76, 0.88)));

    state.cinematicPulse = Math.max(collapsePulse * 0.65, novaPulse);

    const percent = state.progress >= 0.985 ? 100 : Math.round(state.progress * 100);
    if (percent !== state.lastPercent) {
      state.lastPercent = percent;

      if (progressFill) {
        progressFill.style.height = `${percent}%`;
      }

      if (progressValue) {
        progressValue.textContent = `${String(percent).padStart(2, "0")}%`;
      }
    }

    // The interface intentionally exposes only the current phase name.
    // Hysteresis prevents rapid text flicker when the scroll settles near a
    // phase boundary.
    const phaseCenters = PHASE_POINTS;
    let nearest = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < phaseCenters.length; i++) {
      const distance = Math.abs(state.progress - phaseCenters[i]);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = i;
      }
    }

    if (nearest !== currentPhase && (nearestDistance < 0.085 || currentPhase === -1)) {
      currentPhase = nearest;
      if (phaseName) {
        window.clearTimeout(phaseChangeTimer);
        phaseName.classList.add("is-changing");
        phaseChangeTimer = window.setTimeout(() => {
          phaseName.textContent = CINEMATIC_PHASES[currentPhase].name;
          phaseName.classList.remove("is-changing");
        }, 110);
      }
    }
  }


  function phaseWeight(progress, start, end, feather = 0.045) {
    if (end <= start) return 0;

    const inWeight = start <= 0
      ? 1
      : smootherStep(range(progress, start - feather, start + feather));

    const outWeight = end >= 1
      ? 1
      : 1 - smootherStep(range(progress, end - feather, end + feather));

    return clamp01(inWeight * outWeight);
  }


  /*
    ========================================================================
    UPDATE — EARLY EVOLUTION
    ========================================================================
  */

  function updateEarlyEvolution(time) {
    const cloud = state.cloud;
    const proto = state.protostar;
    const red = state.redSupergiant;
    const compact = state.compactRemnant;

    if (molecularCloud) {
      const pos = molecularCloud.geometry.getAttribute("position");
      const data = molecularCloud.geometry.userData.data;
      const collapse = 1 - cloud;

      // Keep particle motion continuous through the transition, but never
      // leave the material with a stale opacity when the phase is over.
      if (cloud > 0.001 || proto > 0.001) {
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
      }
      molecularCloud.material.opacity = cloud * 0.40 + proto * 0.08;
      molecularCloud.visible = molecularCloud.material.opacity > 0.001;
      molecularCloud.rotation.y = time * 0.012;
    }

    if (protostarGroup) {
      const active = proto > 0.001;
      const breathe = 1 + Math.sin(time * 1.75) * 0.028;

      // Explicitly drive every property both in and out of the phase.
      // This prevents Three.js from retaining the last visible frame.
      protostarGroup.visible = active;
      protostarGroup.scale.setScalar(
        active ? (0.38 + proto * 1.15) * breathe : 0.001
      );
      protostarCore.material.opacity = proto * 0.86;
      protostarHalo.material.opacity = proto * 0.12;
      protostarDisk.material.opacity = proto * 0.54;
      protostarDisk.rotation.z = time * 0.18;
      protostarDisk.rotation.x = Math.PI * 0.48 + Math.sin(time * 0.4) * 0.02;
    }

    if (protoDust) {
      const active = proto > 0.001;
      const pos = protoDust.geometry.getAttribute("position");
      const data = protoDust.geometry.userData.data;
      if (active) {
        for (let i = 0; i < data.length; i++) {
          const item = data[i];
          const a = item.a + time * (0.12 + 0.42 / Math.max(item.r, 1.2));
          pos.array[i * 3] = Math.cos(a) * item.r;
          pos.array[i * 3 + 1] = item.thickness + Math.sin(time * 2 + item.phase) * 0.012 * item.r;
          pos.array[i * 3 + 2] = Math.sin(a) * item.r;
        }
        pos.needsUpdate = true;
      }
      protoDust.material.opacity = proto * 0.62;
      protoDust.visible = active;
    }

    if (protoJets) {
      const active = proto > 0.001;
      const pos = protoJets.geometry.getAttribute("position");
      const data = protoJets.geometry.userData.data;
      if (active) {
        for (let i = 0; i < data.length; i++) {
          const item = data[i];
          const w = item.radius * (1 + item.q * 0.55);
          const a = item.angle + time * (0.9 + item.q * 0.8);
          pos.array[i * 3] = Math.cos(a) * w;
          pos.array[i * 3 + 1] = item.side * (0.85 + item.q * 2.7) * (0.35 + proto * 0.65);
          pos.array[i * 3 + 2] = Math.sin(a) * w;
        }
        pos.needsUpdate = true;
      }
      protoJets.material.opacity = proto * 0.48;
      protoJets.visible = active;
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

  function updateSupergiant(
    time
  ) {

    const collapse =
      state.collapse;


    const breathing =
      1 +
      Math.sin(
        time *
        2.0
      ) *
      0.024 *
      (
        1 -
        collapse
      );


    // One continuous star body: the same mesh survives the transition from
    // protostar -> massive blue star -> red supergiant and only then folds
    // inward during core collapse. This avoids the old visual "replacement"
    // where the star seemed to disappear and reappear as another object.
    // Start only after the protostar has fully vanished. The tiny interval
    // before this is carried by bloom/halo rather than by two overlapping
    // stellar meshes.
    const stellarBirth =
      smooth(range(state.progress, 0.232, 0.282));

    const stellarFade =
      1 - smooth(range(state.progress, 0.585, 0.675));

    const stellarPresence =
      stellarBirth * stellarFade;

    const giantExpansion =
      1 + state.redSupergiant * 0.88;

    const scale =
      stellarPresence *
      giantExpansion *
      (1 - collapse * 0.97) *
      breathing;


    supergiantGroup.scale.setScalar(
      Math.max(
        0.001,
        scale
      )
    );


    supergiantMesh.material
      .uniforms
      .uTime
      .value =
      time;


    supergiantMesh.material
      .uniforms
      .uCollapse
      .value =
      collapse;


    supergiantMesh.material
      .uniforms
      .uCameraPosition
      .value =
      camera.position;


    supergiantShell.material.opacity =
      0.095 *
      (
        1 - collapse
      ) *
      (1 - state.redSupergiant * 0.35) *
      stellarPresence;

    supergiantMesh.material.uniforms.uEvolution.value =
      state.redSupergiant;
  }


  /*
    ========================================================================
    UPDATE — TRANSITION OBJECTS
    ========================================================================
  */

  function updateTransitionObjects(
    time
  ) {

    const collapse =
      state.collapse;

    const nova =
      state.nova;

    const disk =
      state.disk;


    /*
      PHASE 1.5 — envelope collapse.
      The shell contracts before the main explosion.
    */
    if (
      stellarEnvelope && collapse > 0.001
    ) {

      const data =
        stellarEnvelope.userData.data;

      const pos =
        stellarEnvelope.geometry
          .getAttribute(
            "position"
          );

      const inward =
        smooth(
          range(
            collapse,
            0.15,
            0.85
          )
        );

      for (
        let i = 0;
        i < data.length;
        i++
      ) {

        const item =
          data[i];

        const radius =
          item.radius *
          (
            1 -
            inward *
            0.82
          );

        const angle =
          item.theta +
          time *
          0.035;

        const ripple =
          Math.sin(
            time *
            1.45 +
            item.phase
          ) *
          0.018;

        pos.array[i * 3] =
          Math.sin(
            item.phi
          ) *
          Math.cos(
            angle
          ) *
          (
            radius +
            ripple
          );

        pos.array[i * 3 + 1] =
          Math.cos(
            item.phi
          ) *
          (
            radius +
            ripple
          );

        pos.array[i * 3 + 2] =
          Math.sin(
            item.phi
          ) *
          Math.sin(
            angle
          ) *
          (
            radius +
            ripple
          );
      }

      pos.needsUpdate =
        true;

      stellarEnvelope.material.opacity =
        (
          0.32 *
          (
            1 -
            inward
          )
        ) *
        (
          1 +
          nova *
          0.50
        );
    }


    /*
      Compact proto-neutron-star / collapsing core flash.
    */
    if (
      collapseCore
    ) {

      const flash =
        smooth(
          range(
            collapse,
            0.42,
            0.75
          )
        );

      const fade =
        smooth(
          range(
            collapse,
            0.78,
            1.0
          )
        );

      collapseCore.scale.setScalar(
        0.001 +
        collapse *
        (
          0.22 +
          flash *
          0.60
        )
      );

      collapseCore.material.opacity =
        collapse *
        (
          0.52 +
          flash *
          0.88
        ) *
        (
          1 -
          fade *
          0.72
        );

      collapseHalo.scale.setScalar(
        0.001 +
        collapse *
        (
          1.2 +
          flash *
          4.0
        )
      );

      collapseHalo.material.opacity =
        collapse *
        (
          0.04 +
          flash *
          0.18
        ) *
        (
          1 -
          fade
        );
    }


    /*
      FORWARD SHOCK.
      The shock expands through the circumstellar material.
    */
    if (
      forwardShock
    ) {

      const local =
        smooth(
          range(
            nova,
            0.0,
            0.64
          )
        );

      const decel =
        1 -
        smooth(
          range(
            nova,
            0.48,
            1.0
          )
        ) *
        0.18;

      forwardShock.scale.setScalar(
        0.001 +
        local *
        4.9 *
        decel
      );

      forwardShock.material.opacity =
        local *
        (
          1 -
          smooth(
            range(
              nova,
              0.52,
              1
            )
          ) *
          0.68
        ) *
        0.12;

      forwardShock.rotation.y =
        time *
        0.028;
    }


    /*
      REVERSE SHOCK.
      It brightens later as expanding ejecta interact with slower material.
    */
    if (
      reverseShock
    ) {

      const local =
        smooth(
          range(
            nova,
            0.34,
            0.98
          )
        );

      reverseShock.scale.setScalar(
        0.001 +
        local *
        (
          2.3 +
          nova *
          1.7
        )
      );

      reverseShock.material.opacity =
        local *
        0.08 *
        (
          1 -
          disk *
          0.72
        );

      reverseShock.rotation.x =
        time *
        0.018;
    }


    /*
      Dense ejecta knots create visible filamentary structure.
    */
    if (
      debrisKnots && nova > 0.001
    ) {

      const data =
        debrisKnots.userData.data;

      const pos =
        debrisKnots.geometry
          .getAttribute(
            "position"
          );

      for (
        let i = 0;
        i < data.length;
        i++
      ) {

        const item =
          data[i];

        const radial =
          nova *
          item.radius *
          item.speed;

        const twist =
          nova *
          (
            0.16 +
            item.q *
            1.05
          );

        const c =
          Math.cos(
            twist
          );

        const si =
          Math.sin(
            twist
          );

        let x =
          (
            item.x *
            c -
            item.z *
            si
          ) *
          radial;

        let z =
          (
            item.x *
            si +
            item.z *
            c
          ) *
          radial;

        let y =
          item.y *
          radial;

        const filament =
          Math.sin(
            time *
            1.2 +
            item.phase +
            radial *
            0.5
          ) *
          0.12 *
          nova;

        x += filament;
        y += filament * 0.7;
        z -= filament;

        pos.array[i * 3] =
          x;

        pos.array[i * 3 + 1] =
          y;

        pos.array[i * 3 + 2] =
          z;
      }

      pos.needsUpdate =
        true;

      debrisKnots.material.opacity =
        nova *
        0.72 *
        (
          1 -
          disk *
          0.55
        );
    }


    /*
      REMNANT CLOUD — broad, asymmetric and fading only when the
      fallback/disk component becomes dominant.
    */
    if (
      remnantCloud && nova > 0.001
    ) {

      const data =
        remnantCloud.userData.data;

      const pos =
        remnantCloud.geometry
          .getAttribute(
            "position"
          );

      for (
        let i = 0;
        i < data.length;
        i++
      ) {

        const item =
          data[i];

        const angularDrift =
          nova *
          (
            0.28 +
            item.seed *
            0.78
          );

        const a =
          item.theta +
          angularDrift +
          time *
          0.010;

        const radial =
          item.radius *
          (
            1 +
            nova *
            0.42
          ) *
          (
            1 -
            disk *
            0.38
          );

        const turbulence =
          (
            Math.sin(
              time *
              0.73 +
              item.phase
            ) +
            0.6 *
            Math.sin(
              time *
              1.21 +
              item.phase *
              1.7
            )
          ) *
          0.075 *
          nova;

        pos.array[i * 3] =
          Math.sin(
            item.phi
          ) *
          Math.cos(
            a
          ) *
          radial +
          turbulence;

        pos.array[i * 3 + 1] =
          Math.cos(
            item.phi
          ) *
          radial *
          (
            0.63 +
            item.seed *
            0.48
          ) +
          turbulence *
          0.7;

        pos.array[i * 3 + 2] =
          Math.sin(
            item.phi
          ) *
          Math.sin(
            a
          ) *
          radial -
          turbulence;
      }

      pos.needsUpdate =
        true;

      const fadeOut =
        smooth(
          range(
            disk,
            0.47,
            0.90
          )
        );

      remnantCloud.material.opacity =
        nova *
        0.52 *
        (
          1 -
          fadeOut *
          0.72
        );
    }


    /*
      FALLBACK / BOUND MATTER:
      gradually flattens and circularizes into the disk instead
      of instantly switching to a finished torus.
    */
    if (
      fallbackDust && disk > 0.001
    ) {

      const data =
        fallbackDust.userData.data;

      const pos =
        fallbackDust.geometry
          .getAttribute(
            "position"
          );

      const circularization =
        smoother(
          range(
            disk,
            0.02,
            0.82
          )
        );

      for (
        let i = 0;
        i < data.length;
        i++
      ) {

        const item =
          data[i];

        const r =
          item.radius *
          (
            1 -
            circularization *
            0.58
          );

        const spiral =
          item.angle +
          time *
          item.speed *
          (
            0.18 +
            0.30 *
            circularization
          ) +
          circularization *
          (
            2.8 /
            Math.max(
              r,
              1
            )
          );

        const vertical =
          item.height *
          (
            1 -
            circularization *
            0.88
          );

        pos.array[i * 3] =
          Math.cos(
            spiral
          ) *
          r;

        pos.array[i * 3 + 1] =
          vertical;

        pos.array[i * 3 + 2] =
          Math.sin(
            spiral
          ) *
          r;
      }

      pos.needsUpdate =
        true;

      fallbackDust.material.opacity =
        circularization *
        0.38;
    }


    /*
      Fallback STREAMS:
      several accretion arms remain visible from 50–75%.
    */
    if (
      fallbackStreams && disk > 0.001
    ) {

      const data =
        fallbackStreams.userData.data;

      const pos =
        fallbackStreams.geometry
          .getAttribute(
            "position"
          );

      const streamProgress =
        smoother(
          range(
            disk,
            0.10,
            0.78
          )
        );

      for (
        let i = 0;
        i < data.length;
        i++
      ) {

        const item =
          data[i];

        const radius =
          item.radius *
          (
            1 -
            streamProgress *
            0.62
          );

        const armAngle =
          item.phi +
          item.arm *
          (
            Math.PI *
            0.5
          );

        const angle =
          armAngle +
          streamProgress *
          (
            3.2 /
            Math.max(
              radius,
              1.0
            )
          ) +
          time *
          0.05;

        const vertical =
          (
            item.q -
            0.5
          ) *
          0.75 *
          (
            1 -
            streamProgress *
            0.92
          );

        pos.array[i * 3] =
          Math.cos(
            angle
          ) *
          radius;

        pos.array[i * 3 + 1] =
          vertical;

        pos.array[i * 3 + 2] =
          Math.sin(
            angle
          ) *
          radius;
      }

      pos.needsUpdate =
        true;

      fallbackStreams.material.opacity =
        streamProgress *
        0.45 *
        (
          1 -
          smooth(
            range(
              disk,
              0.70,
              0.95
            )
          )
        );
    }


    /*
      Disk halo bridges the visual transition.
    */
    if (
      diskHalo
    ) {

      const haloIn =
        smoother(
          range(
            disk,
            0.12,
            0.72
          )
        );

      diskHalo.scale.setScalar(
        0.001 +
        haloIn
      );

      diskHalo.material.opacity =
        haloIn *
        0.065;

      diskHalo.rotation.z =
        time *
        0.07;
    }


    /*
      Neutrino / prompt burst is brief.
    */
    if (
      neutrinoCloud && collapse > 0.001
    ) {

      const burst =
        smooth(
          range(
            collapse,
            0.50,
            0.78
          )
        ) *
        (
          1 -
          smooth(
            range(
              collapse,
              0.78,
              0.95
            )
          )
        );

      const pos =
        neutrinoCloud.geometry
          .getAttribute(
            "position"
          );

      const directions =
        neutrinoCloud.userData
          .directions;

      const distance =
        burst *
        8.0;

      for (
        let i = 0;
        i < directions.length;
        i++
      ) {

        const d =
          directions[i];

        pos.array[i * 3] =
          d.x *
          distance;

        pos.array[i * 3 + 1] =
          d.y *
          distance;

        pos.array[i * 3 + 2] =
          d.z *
          distance;
      }

      pos.needsUpdate =
        true;

      neutrinoCloud.material.opacity =
        burst *
        (
          1 -
          burst
        ) *
        1.25;
    }
  }




  /*
    ========================================================================
    UPDATE — SUPERNOVA
    ========================================================================
  */

  function updateSupernova(
    time
  ) {

    const n =
      state.nova;

    if (n <= 0.0005) {
      if (supernovaMaterial) supernovaMaterial.opacity = 0;
      return;
    }

    const position =
      supernovaGeometry
        .getAttribute(
          "position"
        );

    const colorAttr =
      supernovaGeometry
        .getAttribute(
          "color"
        );

    const data =
      supernovaGeometry.userData;


    const velocity =
      data.velocity;

    const seed =
      data.seed;

    const phase =
      data.phase;


    /*
      Free expansion first, then smooth deceleration.
      This avoids an unnaturally constant-velocity shell.
    */

    const expansion =
      CONFIG.supernovaRadius *
      (
        1 -
        Math.pow(
          1 -
          n,
          2.55
        )
      );

    const deceleration =
      1 -
      smooth(
        range(
          n,
          0.58,
          1.0
        )
      ) *
      0.30;


    const heatColor =
      new THREE.Color();


    for (
      let i = 0;
      i < CONFIG.ejecta;
      i++
    ) {

      const vx =
        velocity[i * 3];

      const vy =
        velocity[i * 3 + 1];

      const vz =
        velocity[i * 3 + 2];

      const s =
        seed[i];


      const travel =
        expansion *
        (
          0.45 +
          s *
          1.48
        ) *
        deceleration;


      /*
        Stronger turbulent vorticity in the post-shock region.
      */

      const swirl =
        n *
        (
          0.15 +
          s *
          1.15
        );


      const c =
        Math.cos(
          swirl
        );

      const si =
        Math.sin(
          swirl
        );


      let x =
        (
          vx *
          c -
          vz *
          si
        ) *
        travel;


      let z =
        (
          vx *
          si +
          vz *
          c
        ) *
        travel;


      let y =
        vy *
        travel;


      const t =
        (
          Math.sin(
            time *
            1.7 +
            phase[i]
          ) +
          0.55 *
          Math.sin(
            time *
            2.9 +
            phase[i] *
            1.7
          )
        ) *
        0.045 *
        n *
        (
          0.3 +
          s
        );


      x +=
        t;

      y +=
        t *
        0.8;

      z -=
        t *
        0.85;


      position.array[i * 3] =
        x;

      position.array[i * 3 + 1] =
        y;

      position.array[i * 3 + 2] =
        z;


      /*
        Cooling:
        inner shock-heated ejecta stay white/gold;
        the outer material shifts into deep orange/red.
      */

      const radial =
        clamp01(
          travel /
          (
            CONFIG.supernovaRadius *
            1.25
          )
        );


      const hot =
        Math.pow(
          1 -
          radial,
          0.72
        );


      if (
        hot >
        0.67
      ) {

        const q =
          (
            hot -
            0.67
          ) /
          0.33;


        heatColor.copy(
          colorWhite
        );


        heatColor.lerp(
          colorOrange,
          1 -
          q
        );

      } else {

        const q =
          hot /
          0.67;


        heatColor.copy(
          colorBurgundy
        );


        heatColor.lerp(
          colorOrange,
          q
        );
      }


      /*
        Density contrast.
      */

      const brightness =
        0.34 +
        hot *
        0.95;


      colorAttr.array[i * 3] =
        heatColor.r *
        brightness;

      colorAttr.array[i * 3 + 1] =
        heatColor.g *
        brightness;

      colorAttr.array[i * 3 + 2] =
        heatColor.b *
        brightness;
    }


    position.needsUpdate =
      true;

    colorAttr.needsUpdate =
      true;


    supernovaMaterial.opacity =
      n *
      (
        1 -
        smooth(
          range(
            n,
            0.88,
            1
          )
        ) *
        0.44
      );
  }




  /*
    ========================================================================
    UPDATE — ACCRETION DISK
    ========================================================================
  */

  function updateDisk(
    time
  ) {

    const d =
      state.disk;

    const h =
      state.blackHole;


    /*
      ------------------------------------------------------------
      Main lensed disk
      ------------------------------------------------------------
    */

    if (
      lensingDisk
    ) {

      const scale =
        0.001 +
        d *
        (
          1.0 +
          h *
          0.12
        );

      lensingDisk.scale.setScalar(
        scale
      );


      lensingDiskMaterial
        .uniforms
        .uTime
        .value =
        time;


      lensingDiskMaterial
        .uniforms
        .uPower
        .value =
        d;


      /*
        Stronger lensing as the horizon becomes established.
      */

      lensingDiskMaterial
        .uniforms
        .uLensing
        .value =
        0.62 +
        h *
        0.92;


      lensingDiskMaterial
        .uniforms
        .uShadow
        .value =
        0.315;


      lensingDiskMaterial
        .uniforms
        .uSpin
        .value =
        0.88;
    }


    /*
      ------------------------------------------------------------
      Event horizon
      ------------------------------------------------------------
    */

    if (
      blackHole
    ) {

      blackHole.scale.setScalar(
        0.001 +
        h
      );

      // The event horizon itself now has a subtle animated flow. Physical
      // sphere rotation is also applied so the motion remains organic even
      // when the procedural bands briefly align with the camera.
      if (blackHole.material && blackHole.material.uniforms) {
        blackHole.material.uniforms.uTime.value = time;
        blackHole.material.uniforms.uStrength.value = h;
      }
      blackHole.rotation.y = time * 0.105;
      blackHole.rotation.x = Math.sin(time * 0.19) * 0.045;
      blackHole.rotation.z = time * 0.024;


      blackHoleHalo.scale.setScalar(
        0.001 +
        h
      );


      blackHoleHalo.material.opacity =
        0.014 +
        h *
        0.025;
    }


    /*
      ------------------------------------------------------------
      Particle disk
      ------------------------------------------------------------
    */

    if (
      diskParticles
    ) {

      /*
        Keep a visible, hot disk even while the shader is still forming.
      */

      diskParticles.material.opacity =
        d *
        0.60;


      const geometry =
        diskParticles.geometry;


      const data =
        geometry.userData;


      const pos =
        geometry.getAttribute(
          "position"
        );


      const radius =
        data.radius;

      const angle0 =
        data.angle;

      const height =
        data.height;

      const speed =
        data.speed;


      for (
        let i = 0;
        i < CONFIG.diskParticles;
        i++
      ) {

        const r =
          radius[i];


        /*
          Differential rotation.
          Inner material orbits faster.
        */

        const orbitalSpeed =
          speed[i] *
          (
            0.75 +
            d *
            0.85
          );


        const angle =
          angle0[i] +
          time *
          orbitalSpeed *
          0.32;


        const thickness =
          (
            1 -
            d *
            0.72
          );


        pos.array[i * 3] =
          Math.cos(
            angle
          ) *
          r;


        pos.array[i * 3 + 1] =
          height[i] *
          thickness +
          Math.sin(
            time *
            1.55 +
            i *
            0.13
          ) *
          0.018 *
          d;


        pos.array[i * 3 + 2] =
          Math.sin(
            angle
          ) *
          r;
      }


      pos.needsUpdate =
        true;


      /*
        Give the approaching side an extra material-level bias by rotating
        the particle layer relative to the main image.
      */

      diskParticles.rotation.z =
        time *
        0.12 *
        d;
    }


    /*
      ------------------------------------------------------------
      Disk halo
      ------------------------------------------------------------
    */

    if (
      diskHalo
    ) {

      diskHalo.scale.setScalar(
        0.001 +
        d
      );


      diskHalo.material.opacity =
        d *
        0.055;


      diskHalo.rotation.z =
        -time *
        0.045;
    }


    /*
      ------------------------------------------------------------
      Bloom
      ------------------------------------------------------------
    */

    if (
      bloomPass
    ) {

      /*
        Highest intensity:
          - early supernova flash
          - hot inner disk
      */

      const novaFlash =
        state.nova *
        (
          1 -
          smooth(
            range(
              state.nova,
              0.78,
              1.0
            )
          )
        );


      bloomPass.strength =
        CONFIG.bloomStrength +
        novaFlash *
        0.92 +
        d *
        0.54;
    }
  }




  /*
    ========================================================================
    UPDATE — JETS
    ========================================================================
  */

  function updateJets(
    time
  ) {

    if (
      !jetParticles
    ) {
      return;
    }


    const data =
      jetGeometry.userData;


    const position =
      jetGeometry.getAttribute(
        "position"
      );


    const j =
      state.jets;


    for (
      let i = 0;
      i < CONFIG.jets;
      i++
    ) {

      const q =
        data.q[i];


      const side =
        data.side[i];


      const radial =
        data.radius[i];


      const phase =
        data.phase[i];


      const local =
        q *
        j;


      /*
        The jet begins narrow near the poles and fans out slowly.
      */

      const width =
        radial *
        (
          0.12 +
          local *
          1.55
        );


      /*
        Helical winding.
      */

      const angle =
        phase +
        time *
        (
          0.85 +
          q *
          1.1
        );


      /*
        Small axial wobble adds plasma instability.
      */

      const wobble =
        Math.sin(
          time *
          2.0 +
          phase
        ) *
        0.025 *
        local;


      position.array[i * 3] =
        Math.cos(
          angle
        ) *
        width +
        wobble;


      position.array[i * 3 + 1] =
        side *
        (
          CONFIG.blackHoleRadius *
          0.80 +
          local *
          CONFIG.jetLength
        );


      position.array[i * 3 + 2] =
        Math.sin(
          angle
        ) *
        width;
    }


    position.needsUpdate =
      true;


    jetMaterial.opacity =
      j *
      0.76;
  }


  /*
    ========================================================================
    CINEMATIC CAMERA
    ========================================================================
  */

  function updateCamera(
    time
  ) {

    /*
      Subtle spacecraft / IMAX camera drift.
      The amplitude is intentionally tiny to avoid motion sickness.
    */

    const driftX =
      reducedMotion
        ? 0
        : Math.sin(
            time *
            0.19
          ) *
          0.055;


    const driftY =
      reducedMotion
        ? 0
        : Math.cos(
            time *
            0.23
          ) *
          0.040;


    const driftZ =
      reducedMotion
        ? 0
        : Math.sin(
            time *
            0.13
          ) *
          0.030;


    /*
      Slow push-in during black-hole formation.
    */

    const pushIn =
      state.blackHole *
      1.15 -
      state.cloud *
      1.25;


    /*
      Slight orbit around the final object makes the disk
      asymmetry read more naturally.
    */

    const orbit =
      state.blackHole *
      0.035;


    const earlySpread =
      state.cloud * 1.55 -
      state.protostar * 0.55;

    camera.position.x =
      4.8 +
      driftX +
      earlySpread +
      orbit +
      Math.sin(
        state.progress *
        Math.PI *
        2
      ) *
      0.20;


    camera.position.y =
      2.35 +
      driftY +
      state.cloud * 0.38;


    camera.position.z =
      CONFIG.cameraDistance -
      pushIn +
      driftZ;


    const pulse = state.cinematicPulse;

    // A tiny, smooth dolly/breath during the supernova gives the shot a
    // physically motivated sense of scale without introducing jitter.
    const cinematicPush = pulse * 0.18;
    camera.position.x =
      4.8 +
      driftX +
      earlySpread +
      orbit +
      Math.sin(state.progress * Math.PI * 2) * 0.20 +
      (reducedMotion ? 0 : Math.sin(time * 0.11) * pulse * 0.018);

    camera.position.y =
      2.35 +
      driftY +
      state.cloud * 0.38 +
      (reducedMotion ? 0 : Math.cos(time * 0.13) * pulse * 0.012);

    camera.position.z =
      CONFIG.cameraDistance -
      pushIn +
      driftZ -
      cinematicPush;

    camera.lookAt(
      0,
      Math.sin(time * 0.14) * 0.018,
      0
    );
  }


  /*
    ========================================================================
    MAIN SCENE UPDATE
    ========================================================================
  */

  function updateScene(
    time
  ) {

    if (
      scene.userData.nebula
    ) {

      scene.userData.nebula
        .uniforms
        .uTime
        .value =
        time;
    }


    if (
      starField
    ) {

      starField.rotation.y +=
        0.00012;


      starField.rotation.x +=
        0.000018;


      starField.material
        .uniforms
        .uTime
        .value =
        time;
    }


    updateEarlyEvolution(
      time
    );


    updateSupergiant(
      time
    );


    updateSupernova(
      time
    );


    updateTransitionObjects(
      time
    );


    updateDisk(
      time
    );


    updateJets(
      time
    );


    updateCamera(
      time
    );


    if (
      cinematicLight
    ) {

      cinematicLight.intensity =
        10 +
        state.nova *
        38 +
        state.disk *
        7;
    }
  }


  /*
    ========================================================================
    RENDER
    ========================================================================
  */

  function animate() {

    requestAnimationFrame(
      animate
    );


    const delta =
      Math.min(
        clock.getDelta(),
        0.05
      );

    state.time +=
      delta;

    // Single frame-rate-independent visual follower. This is the only
    // temporal smoothing applied to scroll, so the response stays predictable.
    state.progress = reducedMotion
      ? state.targetProgress
      : damp(state.progress, state.targetProgress, 8.8, delta);

    if (state.targetProgress >= 0.999999) {
      state.progress = 1;
    }

    applyStoryProgress(state.progress);

    updateScene(
      state.time
    );


    if (
      composerReady &&
      composer
    ) {

      composer.render();

    } else {

      renderer.render(
        scene,
        camera
      );
    }
  }


  /*
    ========================================================================
    RESIZE
    ========================================================================
  */

  function onResize() {

    const width =
      window.innerWidth;


    const height =
      window.innerHeight;


    if (
      !camera ||
      !renderer
    ) {
      return;
    }


    camera.aspect =
      width /
      height;


    camera.updateProjectionMatrix();


    const deviceRatio = window.devicePixelRatio || 1;
    const cores = navigator.hardwareConcurrency || 8;
    const pixelRatio = Math.min(
      deviceRatio,
      width < 700 ? 1.25 : (cores <= 4 ? 1.4 : 1.65)
    );


    renderer.setPixelRatio(
      pixelRatio
    );


    renderer.setSize(
      width,
      height,
      false
    );


    if (
      composer
    ) {

      composer.setSize(
        width,
        height
      );
    }


    if (
      starField
    ) {

      starField.material
        .uniforms
        .uPixelRatio
        .value =
        pixelRatio;
    }


    ScrollTrigger.refresh();
  }


  /*
    ========================================================================
    BOOT
    ========================================================================
  */

  init();

})();
