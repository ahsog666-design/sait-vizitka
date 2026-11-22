// ===== Мои проекты =====
// Каждый проект — отдельная вкладка. Чтобы добавить вкладку, скопируйте блок { name: ... }.
// Чтобы добавить видео в проект, допишите строку в его список videos:
// { title: "Название", text: "Короткое описание", url: "ссылка на видео" }
// Подходят ссылки на YouTube (и Shorts), Instagram (Reels и посты), TikTok
// или путь к своему файлу, например "videos/korporativ.mp4".
// Для своего файла можно указать обложку: poster: "videos/korporativ.jpg".
const projects = [
  {
    name: "Tram in the Raive",
    text: "",
    // Папки с фотоотчётами. Чтобы добавить папку, скопируйте строку { name: ... }.
    // Большие фото лежат в folder, маленькие превью в folder/thumbs (01.jpg, 02.jpg, ...)
    albums: [
      { name: "14 октября", folder: "images/tram/1", count: 20 },
    ],
    // vertical: true — для вертикальных видео с телефона
    videos: [
      { url: "videos/tram-raive.mp4", poster: "videos/tram-raive.jpg", vertical: true },
      { url: "videos/tram-raive-2.mp4", poster: "videos/tram-raive-2.jpg", vertical: true },
      { url: "videos/tram-raive-3.mp4", poster: "videos/tram-raive-3.jpg", vertical: true },
    ],
  },
  {
    name: "Teambuilding",
    text: "",
    videos: [
      { url: "videos/teambuilding.mp4", poster: "videos/teambuilding.jpg" },
      { url: "videos/quadro.mp4", poster: "videos/quadro.jpg", vertical: true },
      { url: "videos/paintball.mp4", poster: "videos/paintball.jpg" },
      { url: "videos/team-games.mp4", poster: "videos/team-games.jpg", vertical: true },
      { url: "videos/sport-games.mp4", poster: "videos/sport-games.jpg", vertical: true },
      { url: "videos/picnic.mp4", poster: "videos/picnic.jpg", vertical: true },
      { url: "videos/western.mp4", poster: "videos/western.jpg", vertical: true },
    ],
  },
];

// Превращает ссылку в встроенный плеер
function makePlayer(url) {
  let m;

  // YouTube Shorts: вертикальное видео
  if ((m = url.match(/youtube\.com\/shorts\/([\w-]{11})/))) {
    return { src: `https://www.youtube-nocookie.com/embed/${m[1]}`, vertical: true };
  }
  // Обычное видео YouTube
  if ((m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([\w-]{11})/))) {
    return { src: `https://www.youtube-nocookie.com/embed/${m[1]}`, vertical: false };
  }
  // Instagram: Reels и посты
  if ((m = url.match(/instagram\.com\/(?:[\w.]+\/)?(reel|reels|p|tv)\/([\w-]+)/))) {
    const type = m[1] === "reels" ? "reel" : m[1];
    return { src: `https://www.instagram.com/${type}/${m[2]}/embed`, vertical: true, tall: true };
  }
  // TikTok
  if ((m = url.match(/tiktok\.com\/.*\/video\/(\d+)/))) {
    return { src: `https://www.tiktok.com/embed/v2/${m[1]}`, vertical: true, tall: true };
  }
  // Свой видеофайл
  if (/\.(mp4|webm|mov)$/i.test(url)) {
    return { file: url, vertical: false };
  }
  return null;
}

function renderProjects() {
  const tabs = document.getElementById("project-tabs");
  const box = document.getElementById("videos");
  if (!tabs || !box) return;

  projects.forEach((project, i) => {
    const btn = document.createElement("button");
    btn.className = "tab";
    btn.type = "button";
    btn.setAttribute("role", "tab");
    btn.textContent = project.name;
    btn.addEventListener("click", () => showProject(i));
    tabs.appendChild(btn);
  });

  if (projects.length > 0) showProject(0);
}

function showProject(index) {
  const project = projects[index];
  const box = document.getElementById("videos");
  const about = document.getElementById("project-text");

  document.querySelectorAll("#project-tabs .tab").forEach((btn, i) => {
    btn.classList.toggle("active", i === index);
    btn.setAttribute("aria-selected", String(i === index));
  });

  about.textContent = project.text || "";
  about.hidden = !project.text;
  box.innerHTML = "";
  box.classList.remove("gallery", "albums", "mixed", "carousel-box", "curve-box");
  carouselStop?.();
  carouselStop = null;

  if (project.albums) {
    renderAlbums(box, project);
    return;
  }

  if (project.videos.length === 0) {
    box.innerHTML = '<p class="empty">Скоро здесь появятся видео</p>';
    return;
  }

  // Свои файлы — показываем изогнутой 3D-лентой
  if (project.videos.every((p) => makePlayer(p.url)?.file)) {
    renderCurve(box, project.videos);
    replayFade(box);
    return;
  }

  // Вертикальные и горизонтальные видео вперемешку — ставим их в ряд одной высоты
  const cards = project.videos.map(makeVideoCard);
  const kinds = new Set(cards.map((c) => c.dataset.vertical));
  box.classList.toggle("mixed", kinds.size > 1);
  cards.forEach((c) => box.appendChild(c));
  replayFade(box);
}

// Карточка одного видео
function makeVideoCard(p) {
    const player = makePlayer(p.url);
    const card = document.createElement("article");
    card.className = "video-card";

    const frame = document.createElement("div");
    const vertical = p.vertical || player?.vertical;
    frame.className = "video-frame" + (vertical ? " vertical" : "") + (player?.tall ? " tall" : "");
    card.dataset.vertical = vertical ? "1" : "0";
    card.style.setProperty("--ar", player?.tall ? 9 / 17 : vertical ? 9 / 16 : 16 / 9);

    if (player?.src) {
      const iframe = document.createElement("iframe");
      iframe.src = player.src;
      iframe.title = p.title || "Видео";
      iframe.loading = "lazy";
      iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      iframe.allowFullscreen = true;
      frame.appendChild(iframe);
    } else if (player?.file) {
      const video = document.createElement("video");
      video.src = player.file;
      if (p.poster) video.poster = p.poster;
      video.controls = true;
      video.preload = "metadata";
      video.playsInline = true;
      frame.appendChild(video);
    } else {
      // Неизвестный сервис: просто кнопка-ссылка
      frame.classList.add("link-only");
      const a = document.createElement("a");
      a.href = p.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "▶ Смотреть видео";
      frame.appendChild(a);
    }

    card.appendChild(frame);

    if (p.title || p.text) {
      const info = document.createElement("div");
      info.className = "video-info";
      if (p.title) {
        const h = document.createElement("h3");
        h.textContent = p.title;
        info.appendChild(h);
      }
      if (p.text) {
        const t = document.createElement("p");
        t.textContent = p.text;
        info.appendChild(t);
      }
      card.appendChild(info);
    }

    return card;
}

// ===== Изогнутая 3D-лента видео =====
// Карточки стоят по кругу, а зритель — в центре круга: посередине карточки дальше
// и меньше, к краям ближе, крупнее и развёрнуты к зрителю. Лента медленно крутится сама,
// её можно тянуть мышкой или пальцем. Нажатие на карточку — видео на весь экран.
const PLAY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>';
let carouselStop = null;

function renderCurve(box, videos) {
  box.classList.add("curve-box");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const items = videos.map((v) => ({ type: "video", src: v.url, poster: v.poster }));

  box.innerHTML = `
    <div class="curve" role="region" aria-roledescription="карусель" aria-label="Видео. Тяните влево или вправо, чтобы листать">
      <div class="curve-ring"></div>
    </div>
    <p class="curve-hint" aria-hidden="true">Тяните ленту — нажмите на видео, чтобы смотреть</p>`;
  const stage = box.querySelector(".curve");
  const ring = box.querySelector(".curve-ring");

  let geo = null; // размеры зависят от ширины экрана
  let cards = [];
  let rot = 0; // текущий поворот ленты, градусы
  let vel = 0; // скорость после броска
  let drag = null;
  let hover = false;
  let visible = false;
  let raf = 0;
  let lastT = 0;

  function build() {
    const phone = window.innerWidth < 700;
    geo = phone
      ? { p: 520, R: 640, w: 150, h: 220, gap: 16 }
      : { p: 950, R: 1250, w: 230, h: 330, gap: 26 };
    geo.step = ((geo.w + geo.gap) / geo.R) * (180 / Math.PI);
    // Сколько карточек влезает в полный круг — видео повторяются по кругу
    const slots = Math.max(videos.length, Math.floor(360 / geo.step));
    geo.step = 360 / slots;

    stage.style.perspective = `${geo.p}px`;
    stage.style.setProperty("--cw", `${geo.w}px`);
    stage.style.setProperty("--ch", `${geo.h}px`);
    ring.innerHTML = "";
    cards = [];
    for (let k = 0; k < slots; k++) {
      const i = k % videos.length;
      const v = videos[i];
      const card = document.createElement("button");
      card.type = "button";
      card.className = "curve-card";
      card.setAttribute("aria-label", `Смотреть видео ${i + 1} из ${videos.length}`);
      if (k >= videos.length) card.tabIndex = -1; // повторы не мешают навигации с клавиатуры
      card.innerHTML = `${v.poster ? `<img src="${v.poster}" alt="" decoding="async" draggable="false">` : ""}<span class="curve-play">${PLAY_ICON}</span>`;
      card.addEventListener("click", (e) => {
        if (moved > 6) { e.preventDefault(); return; }
        galleryPhotos = items;
        openLightbox(i);
      });
      card.addEventListener("focus", () => { rot = -k * geo.step; vel = 0; });
      ring.appendChild(card);
      cards.push({ el: card, a: k * geo.step });
    }
    place();
  }

  // Расставляем карточки по кругу
  function place() {
    const { p, R } = geo;
    ring.style.transform = `translateZ(${p}px) rotateY(${rot}deg)`;
    cards.forEach((c) => {
      let a = (((c.a + rot) % 360) + 540) % 360 - 180; // угол от центра, −180…180
      const show = Math.abs(a) < 62;
      c.el.style.visibility = show ? "visible" : "hidden";
      if (show) {
        c.el.style.transform = `rotateY(${c.a}deg) translateZ(${-R}px)`;
        // К краям чуть светлее, по центру — фокус
        c.el.style.opacity = String(Math.min(1, (62 - Math.abs(a)) / 14));
      }
    });
  }

  function tick(t) {
    raf = 0;
    if (!visible || !box.isConnected) return;
    const dt = lastT ? Math.min(50, t - lastT) : 16;
    lastT = t;
    if (!drag) {
      if (Math.abs(vel) > 0.002) {
        rot += vel * dt;
        vel *= Math.pow(0.94, dt / 16);
      } else if (!hover && !reduce) {
        rot -= 0.0045 * dt; // медленное вращение само по себе
      }
    }
    place();
    raf = requestAnimationFrame(tick);
  }
  const start = () => { if (!raf) { lastT = 0; raf = requestAnimationFrame(tick); } };

  // Перетаскивание мышкой и пальцем
  let moved = 0;
  stage.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, y: e.clientY, rot, t: performance.now(), lastX: e.clientX, id: e.pointerId, horiz: null };
    moved = 0;
    vel = 0;
  });
  stage.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (drag.horiz === null && Math.hypot(dx, dy) > 6) {
      drag.horiz = Math.abs(dx) > Math.abs(dy);
      if (drag.horiz) stage.setPointerCapture(e.pointerId);
    }
    if (!drag.horiz) return;
    moved = Math.abs(dx);
    const k = 0.12 * (geo.R / 1250) ** -0.5;
    rot = drag.rot + dx * k;
    const now = performance.now();
    vel = ((e.clientX - drag.lastX) * k) / Math.max(1, now - drag.t);
    drag.lastX = e.clientX;
    drag.t = now;
    place();
  });
  const end = () => { drag = null; start(); };
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);
  stage.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hover = true; });
  stage.addEventListener("pointerleave", () => { hover = false; });
  // Колёсико / тачпад по горизонтали
  stage.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    rot -= e.deltaX * 0.05;
    vel = 0;
    place();
  }, { passive: false });
  // Клавиши ← → на сфокусированной карточке
  stage.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    rot += (e.key === "ArrowLeft" ? 1 : -1) * geo.step;
    place();
  });

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); }, { threshold: 0.05 });
  io.observe(stage);
  let lastPhone = window.innerWidth < 700;
  const onResize = () => {
    const phone = window.innerWidth < 700;
    if (phone !== lastPhone) { lastPhone = phone; build(); }
  };
  window.addEventListener("resize", onResize);

  build();
  carouselStop = () => {
    io.disconnect();
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
  };
}

// Иконка папки
const FOLDER_ICON = '<svg class="album-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4.4l2 2.2h8.6A1.5 1.5 0 0 1 21 8.7v9.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/></svg>';

// Перезапускает плавное появление блока с проектами
function replayFade(box) {
  box.style.animation = "none";
  void box.offsetWidth;
  box.style.animation = "";
}

// ===== Фотоотчёт =====
let galleryPhotos = [];
let galleryIndex = 0;

// Список папок с фотоотчётами
function renderAlbums(box, project) {
  carouselStop?.();
  carouselStop = null;
  box.innerHTML = "";
  box.classList.remove("gallery");
  box.classList.add("albums");

  project.albums.forEach((album) => {
    const btn = document.createElement("button");
    btn.className = "album";
    btn.type = "button";
    btn.setAttribute("aria-label", `Открыть фотоотчёт «${album.name}», ${album.count} фото`);

    const cover = document.createElement("div");
    cover.className = "album-cover";
    // Обложка папки: первые три фото веером
    for (let i = 3; i >= 1; i--) {
      const img = document.createElement("img");
      img.src = `${album.folder}/thumbs/${String(Math.min(i, album.count)).padStart(2, "0")}.jpg`;
      img.alt = "";
      img.loading = "lazy"; img.width = 600; img.height = 800;
      cover.appendChild(img);
    }

    const info = document.createElement("div");
    info.className = "album-info";
    info.innerHTML = `${FOLDER_ICON}<strong></strong><span class="album-count"></span><span class="album-hint">Открыть фотоотчёт →</span>`;
    info.querySelector("strong").textContent = album.name;
    info.querySelector(".album-count").textContent = `${album.count} фото`;

    btn.append(cover, info);
    btn.addEventListener("click", () => openAlbum(box, project, album));
    box.appendChild(btn);
  });

  // Видео проекта — 3D-лентой под папками, как в Teambuilding
  if (project.videos?.length) {
    const strip = document.createElement("div");
    strip.className = "album-curve";
    box.appendChild(strip);
    renderCurve(strip, project.videos);
  }
  replayFade(box);
}

// Открытая папка: кнопка «Назад» и сетка фото
function openAlbum(box, project, album) {
  carouselStop?.();
  carouselStop = null;
  box.innerHTML = "";
  box.classList.remove("albums");
  box.classList.add("gallery");

  const bar = document.createElement("div");
  bar.className = "album-bar";
  const back = document.createElement("button");
  back.className = "back";
  back.type = "button";
  back.textContent = "← Все папки";
  back.addEventListener("click", () => {
    renderAlbums(box, project);
    box.querySelector(".album")?.focus({ preventScroll: true });
  });
  const title = document.createElement("span");
  title.textContent = `${album.name} · ${album.count} фото`;
  bar.append(back, title);
  box.appendChild(bar);

  renderGallery(box, album);
  replayFade(box);
  back.focus({ preventScroll: true });
}

function renderGallery(box, { folder, count }) {
  galleryPhotos = [];
  for (let i = 1; i <= count; i++) {
    const name = String(i).padStart(2, "0") + ".jpg";
    galleryPhotos.push(`${folder}/${name}`);

    const btn = document.createElement("button");
    btn.className = "photo";
    btn.type = "button";
    btn.setAttribute("aria-label", `Открыть фото ${i}`);
    const img = document.createElement("img");
    img.src = `${folder}/thumbs/${name}`;
    img.alt = "";
    img.loading = "lazy"; img.width = 600; img.height = 800;
    img.decoding = "async";
    btn.appendChild(img);
    btn.addEventListener("click", () => openLightbox(i - 1));
    box.appendChild(btn);
  }
}

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxCount = document.getElementById("lightbox-count");
const lightboxVideo = document.getElementById("lightbox-video");

let lightboxOpener = null;

function openLightbox(index) {
  lightboxOpener = document.activeElement;
  galleryIndex = index;
  updateLightbox();
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
  document.getElementById("lightbox-close").focus({ preventScroll: true });
}

function closeLightbox() {
  lightboxVideo.pause();
  lightboxVideo.removeAttribute("src");
  lightboxVideo.load();
  lightbox.hidden = true;
  document.body.style.overflow = "";
  document.dispatchEvent(new Event("lightbox:close"));
  lightboxOpener?.focus?.({ preventScroll: true });
}

function stepLightbox(delta) {
  galleryIndex = (galleryIndex + delta + galleryPhotos.length) % galleryPhotos.length;
  updateLightbox();
}

function updateLightbox() {
  const item = galleryPhotos[galleryIndex];
  const isVideo = typeof item === "object" && item.type === "video";
  lightbox.setAttribute("aria-label", isVideo ? "Просмотр видео" : "Просмотр фото");
  lightboxCount.textContent = `${galleryIndex + 1} / ${galleryPhotos.length}`;
  lightboxImg.hidden = isVideo;
  lightboxVideo.hidden = !isVideo;

  if (isVideo) {
    lightboxVideo.poster = item.poster || "";
    lightboxVideo.src = item.src;
    lightboxVideo.play().catch(() => {});
    return;
  }

  lightboxVideo.pause();
  lightboxImg.src = item;
  lightboxImg.alt = `Фото с мероприятия, ${galleryIndex + 1} из ${galleryPhotos.length}`;
  // Заранее подгружаем соседнее фото, чтобы листать без задержки
  const next = galleryPhotos[(galleryIndex + 1) % galleryPhotos.length];
  if (typeof next === "string") new Image().src = next;
}

document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
document.getElementById("lightbox-prev").addEventListener("click", () => stepLightbox(-1));
document.getElementById("lightbox-next").addEventListener("click", () => stepLightbox(1));
lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });

document.addEventListener("keydown", (e) => {
  if (lightbox.hidden) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") stepLightbox(-1);
  if (e.key === "ArrowRight") stepLightbox(1);
  // Фокус не уходит из окна просмотра
  if (e.key === "Tab") {
    const items = [...lightbox.querySelectorAll("button")];
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

// Листание свайпом на телефоне
let touchX = null;
lightbox.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
lightbox.addEventListener("touchend", (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 50) stepLightbox(dx < 0 ? 1 : -1);
  touchX = null;
});

renderProjects();

// Текущий год в подвале
document.getElementById("year").textContent = new Date().getFullYear();

// Разделы плавно появляются, когда до них доходит прокрутка
const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });
  revealItems.forEach((el) => observer.observe(el));
} else {
  revealItems.forEach((el) => el.classList.add("visible"));
}

// ===== Меню =====
const nav = document.getElementById("nav");
const burger = document.getElementById("burger");
const menu = document.getElementById("menu");

// После прокрутки меню получает тёмную подложку
const fab = document.querySelector(".fab");
const hero = document.getElementById("top");
function updateNav() {
  nav.classList.toggle("scrolled", window.scrollY > 40);
  // Кнопка WhatsApp появляется, когда первый экран почти прокручен
  fab?.classList.toggle("is-hidden", window.scrollY < hero.offsetHeight * 0.6);
}
updateNav();
window.addEventListener("scroll", updateNav, { passive: true });

// Бургер на телефоне
function setMenu(open) {
  menu.classList.toggle("open", open);
  nav.classList.toggle("menu-open", open);
  burger.setAttribute("aria-expanded", String(open));
  burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
}
burger.addEventListener("click", () => setMenu(!menu.classList.contains("open")));
menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
// Закрыть меню: Esc или нажатие мимо него
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && menu.classList.contains("open")) { setMenu(false); burger.focus(); }
});
document.addEventListener("click", (e) => {
  if (menu.classList.contains("open") && !nav.contains(e.target)) setMenu(false);
});
// При переходе на широкий экран меню не остаётся «открытым»
window.matchMedia("(min-width: 861px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });

// ===== Значок «смотреть проекты»: над белыми разделами становится зелёным =====
(function () {
  const badge = document.querySelector(".badge");
  const lights = document.querySelectorAll(".section.light");
  if (!badge || !lights.length) return;

  let ticking = false;
  function update() {
    ticking = false;
    const b = badge.getBoundingClientRect();
    const y = b.top + b.height / 2; // середина значка
    const overLight = [...lights].some((s) => {
      // белый фон раздела растянут на всю ширину, поэтому сравниваем только по высоте
      const r = s.getBoundingClientRect();
      return y >= r.top && y <= r.bottom;
    });
    badge.classList.toggle("on-light", overLight);
  }
  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();

// ===== Индикатор прокрутки =====
(function () {
  const bar = document.getElementById("scroll-progress");
  if (!bar) return;
  let ticking = false;
  function update() {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  }
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener("resize", update);
  update();
})();
