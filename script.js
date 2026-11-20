// ===== Мои проекты =====
// Чтобы добавить видео, допишите строку в этот список:
// { title: "Название", text: "Короткое описание", url: "ссылка на видео" }
// Подходят ссылки на YouTube (и Shorts), Instagram (Reels и посты), TikTok
// или путь к своему файлу, например "videos/korporativ.mp4".
const projects = [
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
  const box = document.getElementById("videos");
  if (!box) return;

  if (projects.length === 0) {
    box.innerHTML = '<p class="empty">Скоро здесь появятся видео с моих мероприятий 🎬</p>';
    return;
  }

  projects.forEach((p) => {
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

renderProjects();

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
