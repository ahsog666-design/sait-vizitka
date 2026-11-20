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
    videos: [
    ],
  },
  {
    name: "Teambuilding",
    text: "",
    videos: [
      { url: "videos/teambuilding.mp4", poster: "videos/teambuilding.jpg" },
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
    btn.role = "tab";
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
    btn.setAttribute("aria-selected", i === index);
  });

  about.textContent = project.text || "";
  about.hidden = !project.text;
  box.innerHTML = "";
  box.classList.remove("gallery", "albums");

  if (project.albums) {
    renderAlbums(box, project);
    return;
  }

  if (project.videos.length === 0) {
    box.innerHTML = '<p class="empty">Скоро здесь появятся видео 🎬</p>';
    return;
  }

  project.videos.forEach((p) => {
    const player = makePlayer(p.url);
    const card = document.createElement("article");
    card.className = "video-card";

    const frame = document.createElement("div");
    frame.className = "video-frame" + (player?.vertical ? " vertical" : "") + (player?.tall ? " tall" : "");

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

    box.appendChild(card);
  });
}

// ===== Фотоотчёт =====
let galleryPhotos = [];
let galleryIndex = 0;

// Список папок с фотоотчётами
function renderAlbums(box, project) {
  box.innerHTML = "";
  box.classList.remove("gallery");
  box.classList.add("albums");

  project.albums.forEach((album) => {
    const btn = document.createElement("button");
    btn.className = "album";
    btn.type = "button";

    const cover = document.createElement("div");
    cover.className = "album-cover";
    // Обложка папки: первые три фото веером
    for (let i = 3; i >= 1; i--) {
      const img = document.createElement("img");
      img.src = `${album.folder}/thumbs/${String(Math.min(i, album.count)).padStart(2, "0")}.jpg`;
      img.alt = "";
      img.loading = "lazy";
      cover.appendChild(img);
    }

    const info = document.createElement("div");
    info.className = "album-info";
    info.innerHTML = `<span class="album-icon">📁</span><strong></strong><span class="album-count"></span>`;
    info.querySelector("strong").textContent = album.name;
    info.querySelector(".album-count").textContent = `${album.count} фото`;

    btn.append(cover, info);
    btn.addEventListener("click", () => openAlbum(box, project, album));
    box.appendChild(btn);
  });
}

// Открытая папка: кнопка «Назад» и сетка фото
function openAlbum(box, project, album) {
  box.innerHTML = "";
  box.classList.remove("albums");
  box.classList.add("gallery");

  const bar = document.createElement("div");
  bar.className = "album-bar";
  const back = document.createElement("button");
  back.className = "back";
  back.type = "button";
  back.textContent = "← Все папки";
  back.addEventListener("click", () => renderAlbums(box, project));
  const title = document.createElement("span");
  title.textContent = `📁 ${album.name} · ${album.count} фото`;
  bar.append(back, title);
  box.appendChild(bar);

  renderGallery(box, album);
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
    img.loading = "lazy";
    btn.appendChild(img);
    btn.addEventListener("click", () => openLightbox(i - 1));
    box.appendChild(btn);
  }
}

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxCount = document.getElementById("lightbox-count");

function openLightbox(index) {
  galleryIndex = index;
  updateLightbox();
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.style.overflow = "";
}

function stepLightbox(delta) {
  galleryIndex = (galleryIndex + delta + galleryPhotos.length) % galleryPhotos.length;
  updateLightbox();
}

function updateLightbox() {
  lightboxImg.src = galleryPhotos[galleryIndex];
  lightboxCount.textContent = `${galleryIndex + 1} / ${galleryPhotos.length}`;
  // Заранее подгружаем соседнее фото, чтобы листать без задержки
  new Image().src = galleryPhotos[(galleryIndex + 1) % galleryPhotos.length];
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

// Фон: оранжевая спираль из клеток, как на экране «Гоша, включи».
// Если человек просит меньше анимации или нет WebGL — остаётся просто тёмный фон.
if (window.mountDitherBackground && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  mountDitherBackground(document.getElementById("shader"), {
    front: [1.0, 0.486, 0.165], // #ff7c2a
    back: [0.047, 0.039, 0.035], // #0c0a09
    opacity: 0.5,
    pxSize: 4,
    speed: 0.5,
  });
}

// Текущий год в подвале
document.getElementById("year").textContent = new Date().getFullYear();

// Разделы плавно появляются, когда до них доходит прокрутка
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
