/* Дизеринг-фон: форма, разложенная на клетки матрицей Байера 4×4.
 *
 * Два цвета и ничего между ними: каждая клетка либо передняя, либо задняя, а
 * полутон получается плотностью клеток — как на старых принтерах и в игровых
 * консолях. Форма по умолчанию — «swirl», спираль, медленно вращающаяся из
 * центра. Это перенос эффекта Dithering из Paper Shaders (shape="swirl",
 * type="4x4"), без React и без библиотеки: один фрагментный шейдер.
 *
 * На удар поле дёргается, часть клеток гаснет россыпью, а на сильную долю
 * кадр рвётся горизонтальными участками случайной длины: они уезжают вбок,
 * продырявлены и растворены по краям — глитч в той же паре цветов, что и всё
 * остальное. Всё это приходит снаружи двумя числами через .pulse().
 *
 * Рисуется в полном разрешении, но не выше DPR 1 — клетки должны оставаться
 * ровными квадратами, а считать больше пикселей, чем у панели, незачем.
 * Шейдер крошечный: 2M фрагментов в кадр — ничто для любого GPU.
 *
 *   mountDitherBackground(canvas, {
 *     back:    [r,g,b] 0…1 — задний цвет (по умолчанию бумага #0c0a09)
 *     front:   [r,g,b]     — передний (оранжевый #ff7c2a)
 *     opacity: 0…1         — сила переднего: 0.5 — оранжевый наполовину
 *     pxSize:  css-пикселей в клетке (4)
 *     speed:   скорость (0.9)
 *     scale:   крупность формы (1)
 *   })
 * Возвращает { set(options), stop() } либо null без WebGL.
 */
(function (global) {
  "use strict";

  var VERT = [
    "attribute vec2 a_position;",
    "void main() { gl_Position = vec4(a_position, 0.0, 1.0); }",
  ].join("\n");

  var FRAG = [
    "precision highp float;",
    "uniform vec3 u_back;",
    "uniform vec3 u_front;",
    "uniform vec4 u_scene;",    // resolution.xy, time, pxSize (device px)
    "uniform vec4 u_shape;",    // opacity, scale, -, -",
    "uniform vec4 u_pulse;",    // beat, energy, -, -
    "",
    "float hash21(vec2 p) {",
    "  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);",
    "}",
    "",
    // Матрица Байера 4×4, пороги 1/32 … 31/32.
    "float bayer(vec2 cell) {",
    "  int x = int(mod(cell.x, 4.0));",
    "  int y = int(mod(cell.y, 4.0));",
    "  int i = x + y * 4;",
    "  float m = 0.0;",
    "  if (i == 0) m = 0.0;  else if (i == 1) m = 8.0;  else if (i == 2) m = 2.0;  else if (i == 3) m = 10.0;",
    "  else if (i == 4) m = 12.0; else if (i == 5) m = 4.0;  else if (i == 6) m = 14.0; else if (i == 7) m = 6.0;",
    "  else if (i == 8) m = 3.0;  else if (i == 9) m = 11.0; else if (i == 10) m = 1.0; else if (i == 11) m = 9.0;",
    "  else if (i == 12) m = 15.0; else if (i == 13) m = 7.0; else if (i == 14) m = 13.0; else m = 5.0;",
    "  return (m + 0.5) / 16.0;",
    "}",
    "",
    // Спираль: рукава закручиваются от центра, поверх — медленная волна, чтобы
    // рисунок не был стерильно правильным. Значение 0…1 — доля переднего цвета.
    "float swirl(vec2 p, float t) {",
    "  float r = length(p);",
    "  float a = atan(p.y, p.x);",
    "  float arms = sin(a * 3.0 - r * 7.0 + t * 1.1 + 0.9 * sin(r * 2.4 - t * 0.6));",
    "  float v = 0.5 + 0.5 * arms;",
    "  v = pow(v, 1.4);",
    // К краям спираль растворяется, к центру — чуть гаснет, чтобы не было
    // яркого глаза ровно за знаком.
    "  v *= smoothstep(2.2, 0.25, r) * smoothstep(0.0, 0.35, r);",
    "  return v;",
    "}",
    "",
    "void main() {",
    "  vec2 res = u_scene.xy;",
    "  float px = max(1.0, u_scene.w);",
    "  float beat = u_pulse.x;",
    "  float energy = u_pulse.y;",
    // Дрожь на удар: поле подаётся в сторону и возвращается. Смещение считается
    // в клетках, поэтому картинка не размазывается — она сдвигается по своей же
    // сетке. Частота снижена намеренно: на сорока герцах это была дрожь, на
    // восемнадцати — толчок, который глаз успевает прочитать как удар.
    "  vec2 shake = vec2(sin(u_scene.z * 18.0), cos(u_scene.z * 14.0))",
    "               * beat * px * 2.6;",
    "",
    // --- глитч ---------------------------------------------------------
    //
    // Срабатывает только на сильную долю: smoothstep отсекает мелкие удары,
    // иначе экран рвался бы непрерывно и перестал бы читаться как приём.
    // Второй множитель — громкость: в тихом месте трека глитча почти нет,
    // на припеве он в полную силу.
    "  float glitch = smoothstep(0.55, 1.0, beat) * (0.35 + energy * 0.65);",
    // Экран режется на горизонтальные ленты, и часть из них уезжает вбок — так
    // рвётся кадр на плохой плёнке. Границы лент сами ползают, иначе разрыв
    // каждый раз приходился бы на одно и то же место экрана.
    "  float tb = floor(u_scene.z * 7.0);",
    "  float roll = hash21(vec2(tb, 3.0)) * 60.0;",
    "  float rows = (gl_FragCoord.y + roll) / (px * 14.0);",
    "  float band = floor(rows);",
    // Имя намеренно не `pick`: ниже, в коде дыр, уже живёт `vec2 pick`, и
    // повторное объявление роняет компиляцию всего шейдера — а вместе с ней
    // и весь фон, потому что собирать становится нечего.
    "  float torch = step(1.0 - glitch * 0.22, hash21(vec2(band, tb)));",
    // Лента не обрывается по краю, а сходит на нет: к верхней и нижней своей
    // границе она теряет и сдвиг, и дыры. Резаный край — это прямоугольник, и
    // глаз читает его как элемент вёрстки; растворённый — как разрыв.
    //
    // Второй smoothstep записан через вычитание: убывающая форма, где первый
    // порог больше второго, по спецификации GLSL не определена.
    "  float across = fract(rows);",
    "  float band_y = smoothstep(0.0, 0.32, across)",
    "                 * (1.0 - smoothstep(0.68, 1.0, across));",
    // Разрыв не тянется во всю ширину: у каждой ленты свой участок случайной
    // длины и в случайном месте. Полоса от края до края — это ровная линия,
    // сколько её ни рви внутри; кусок в четверть экрана читается как сбой.
    //
    // Начало берётся с запасом за края, иначе участки жались бы к середине:
    // тот, что начался левее нуля, входит в кадр уже начатым.
    "  float xn = gl_FragCoord.x / res.x;",
    "  float segAt = hash21(vec2(band, tb + 31.0)) * 1.3 - 0.15;",
    "  float segLen = 0.12 + hash21(vec2(band, tb + 47.0)) * 0.45;",
    "  float along = (xn - segAt) / segLen;",
    // Концы участка тоже растворены — обрубленный край дал бы вертикальную
    // линию, то есть ровно то, от чего уходим.
    "  float band_x = step(0.0, along) * step(along, 1.0)",
    "                 * smoothstep(0.0, 0.2, along)",
    "                 * (1.0 - smoothstep(0.8, 1.0, along));",
    "  float live = torch * band_y * band_x;",
    "  float slip = (hash21(vec2(band, tb + 5.5)) - 0.5)",
    "               * live * glitch * res.x * 0.035;",
    // Клетка: форма считается в её центре, чтобы внутри клетки цвет был один.
    "  vec2 cell = floor((gl_FragCoord.xy + shake + vec2(slip, 0.0)) / px);",
    "  vec2 c = (cell + 0.5) * px;",
    "  vec2 uv = (c - 0.5 * res) / min(res.x, res.y) * 2.0 / u_shape.y;",
    // Спираль ходит под музыку: на ударе её центр уезжает вбок и плавно
    // возвращается, каждый раз в другую сторону. Раньше удар доставался всему
    // полю разом — толчок и глитч, — а сама спираль только густела, и через
    // зал её движение под музыку почти не читалось.
    //
    // Направление не выбирается заново на каждый удар, а крутится само,
    // непрерывно и неровно: так соседние удары ложатся в разные стороны, а
    // смена направления никогда не даёт скачка посреди уже идущего сдвига.
    // Поверх удара — медленный увод от громкости: на припеве спираль не
    // стоит в центре, а гуляет.
    "  float sway = u_scene.z * 3.7 + sin(u_scene.z * 1.3) * 4.0;",
    "  vec2 drift = vec2(cos(sway), sin(sway)) * beat * 0.16",
    "             + vec2(sin(u_scene.z * 0.61), cos(u_scene.z * 0.43)) * energy * 0.09;",
    "  uv -= drift;",
    "  float twist = beat * 0.65 + energy * 0.25;",
    // Громче — плотнее клетки: спираль наливается на подъёмах сама.
    "  float v = swirl(uv, u_scene.z + twist) * u_shape.x * (1.0 + energy * 0.85);",
    "  float on = step(bayer(cell), v);",
    // Выпадение клеток. Три правила, и все три — против жути:
    //
    //   дыры есть всегда, а не высыпают разом на удар: россыпь, которая просто
    //   густеет на громком, читается как фактура, а не как сбой;
    //   кандидат — одна клетка из шестнадцати, поэтому между дырами всегда
    //   остаётся расстояние и они не сливаются в рябь;
    //   набор меняется пять раз в секунду, так что рисунок дыр никогда не
    //   застывает и не начинает казаться узором, который на тебя смотрит.
    "  vec2 block = floor(cell / 4.0);",
    "  float t = floor(u_scene.z * 5.0);",
    "  vec2 pick = floor(vec2(hash21(block + t),",
    "                         hash21(block + t + 17.3)) * 4.0);",
    "  vec2 inner = cell - block * 4.0;",
    "  float chosen = step(abs(inner.x - pick.x) + abs(inner.y - pick.y), 0.5);",
    "  float chance = 0.28 + beat * 0.34;",
    "  float hole = chosen * step(hash21(block + t + 3.1), chance);",
    "  on *= 1.0 - hole;",
    // В уехавшей ленте пробиты небольшие дыры по паре клеток. Сплошная полоса
    // читается как аккуратно вырезанный прямоугольник, то есть как оплошность
    // вёрстки; дырявая — как оборванный сигнал.
    //
    // Ленты все одного рода: ни тёмных, ни притушенных. Разнобой читался как
    // несколько разных поломок сразу, а нужна одна — сорванная строка.
    // Порог, а не множитель: цвет клетки остаётся строго одним из двух, иначе
    // на краях ленты полезли бы полутона и весь дизеринг потерял бы смысл.
    "  float torn = step(1.0 - live * 0.22,",
    "                    hash21(floor(cell / 2.0) + tb + 23.0));",
    "  on *= 1.0 - torn;",
    "  gl_FragColor = vec4(mix(u_back, u_front, on), 1.0);",
    "}",
  ].join("\n");

  var DEFAULTS = {
    back: [0.047, 0.039, 0.035],   // #0c0a09
    front: [1.0, 0.486, 0.165],    // #ff7c2a
    opacity: 0.5,
    pxSize: 4,
    speed: 0.9,
    scale: 1.0,
  };

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("dither-bg:", gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  global.mountDitherBackground = function (canvas, options) {
    var o = {};
    var k;
    for (k in DEFAULTS) o[k] = DEFAULTS[k];
    for (k in options || {}) o[k] = options[k];

    var gl = canvas.getContext("webgl", { antialias: false, alpha: false,
                                          preserveDrawingBuffer: false });
    if (!gl) return null;

    var program = null, buf = null, uni = null, raf = 0, disposed = false;
    var start = performance.now();
    // Куда пишет пульс. Ноль — фон живёт сам по себе, как раньше.
    var beat = 0, energy = 0;

    function build() {
      var vs = compile(gl, gl.VERTEX_SHADER, VERT);
      var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fs) return false;
      program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
      gl.useProgram(program);

      buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      uni = {
        back: gl.getUniformLocation(program, "u_back"),
        front: gl.getUniformLocation(program, "u_front"),
        scene: gl.getUniformLocation(program, "u_scene"),
        shape: gl.getUniformLocation(program, "u_shape"),
        pulse: gl.getUniformLocation(program, "u_pulse"),
      };
      apply();
      return true;
    }

    // Что можно менять на лету: цвета, сила, крупность. Скорость и размер
    // клетки читаются в кадре.
    function apply() {
      gl.uniform3fv(uni.back, new Float32Array(o.back));
      gl.uniform3fv(uni.front, new Float32Array(o.front));
      gl.uniform4f(uni.shape, o.opacity, o.scale, 0, 0);
    }

    var dpr = 1;
    function resize() {
      dpr = Math.min(global.devicePixelRatio || 1, 1);
      var rect = canvas.getBoundingClientRect();
      var w = Math.max(1, Math.round(rect.width * dpr));
      var h = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }

    // Время спирали копится кадр за кадром, а не считается как (сейчас − старт)
    // × скорость. Иначе смена скорости на лету — «момент Гоши» разгоняет фон —
    // мгновенно переносила бы спираль в другую фазу, и она прыгала.
    var clock = 0, last = 0;
    function frame(now) {
      raf = 0;
      if (disposed || document.visibilityState !== "visible") return;
      resize();
      var dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      clock += dt * o.speed;
      gl.uniform4f(uni.scene, canvas.width, canvas.height, clock, o.pxSize * dpr);
      gl.uniform4f(uni.pulse, beat, energy, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      request();
    }

    function request() {
      if (!disposed && raf === 0 && document.visibilityState === "visible") {
        raf = requestAnimationFrame(frame);
      }
    }

    canvas.addEventListener("webglcontextlost", function (e) {
      e.preventDefault();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    });
    canvas.addEventListener("webglcontextrestored", function () {
      if (build()) { resize(); request(); }
    });
    document.addEventListener("visibilitychange", function () { last = 0; request(); });
    global.addEventListener("resize", request);

    if (!build()) return null;
    resize();
    request();

    return {
      // Сюда льётся пульс: 0…1 удар и 0…1 громкость. Фон ничего не знает про
      // музыку — ему просто сообщают два числа.
      pulse: function (b, e) { beat = b; energy = e; },
      set: function (options) {
        for (var k in options || {}) o[k] = options[k];
        if (program) apply();
      },
      stop: function () {
        disposed = true;
        if (raf) cancelAnimationFrame(raf);
        gl.deleteBuffer(buf);
        gl.deleteProgram(program);
      },
    };
  };
})(window);
