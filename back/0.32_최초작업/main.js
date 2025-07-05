// ✅ v0.35 (2025-04-14)
// ================================================
// 📌 업데이트 내역:
// 1. 이미지 슬라이드 → DOM에 이미지가 실제로 추가될 때까지 대기
// 2. 다운로드 파일명 확장자 누락 방지 → .jpg/.mp4 자동 추출 및 파일명에 강제 추가
// ================================================

const placeholderThumbnail = 'https://png.pngtree.com/thumb_back/fw800/background/20231125/pngtree-instagram-color-gradient-background-image_13821781.jpg';

// ✅ [1] 게시물에서 계정명을 추출하는 함수
function extractAccount(post) {
  const link = post.querySelector("a[href^='/' i][href*='?']");
  if (link) {
    const href = link.getAttribute("href");
    const match = href.match(/^\/([^\/\?]+)\//);
    if (match && match[1]) return match[1];
  }
  const img = post.querySelector("img[alt*='님의 프로필 사진']");
  if (img) {
    const alt = img.getAttribute("alt");
    const match = alt.match(/^(.+?)님의 프로필 사진/);
    if (match && match[1]) return match[1].trim();
  }
  const fallback = post.querySelector("strong, span");
  if (fallback && fallback.textContent) return fallback.textContent.trim();
  return "unknown";
}

// ✅ [2] 확장자 추출 함수
function getExtensionFromUrl(url) {
  const match = url.match(/\.([a-zA-Z0-9]{3,4})(?:[?#]|$)/);
  return match ? match[1] : 'jpg';
}

// ✅ [3] 슬라이드 넘기며 이미지/영상 src를 수집하는 함수
async function collectAllMediaUrls(post) {
  const collected = new Set();

  for (let i = 0; i < 20; i++) {
    // 이미지 수집
    const img = post.querySelector("img[src*='cdninstagram']");
    if (img?.src && !img.src.includes("s150x150")) {
      collected.add(img.src);
    }

    // 동영상 수집
    const video = post.querySelector("video, source");
    if (video?.src?.startsWith("http")) {
      collected.add(video.src);
    }

    // 다음 버튼 클릭
    const nextBtn = post.querySelector("button[aria-label='다음']");
    if (!nextBtn || nextBtn.disabled) break;

    nextBtn.click();
    await new Promise(res => setTimeout(res, 600)); // 슬라이드 대기
  }

  return [...collected];
}


// ✅ [4] 콘솔 오류 무시 처리
window.addEventListener("error", function (e) {
  const msg = e?.message || "";
  if (
    typeof msg === "string" &&
    (msg.includes("DTSG") ||
     msg.includes("WebReverb") ||
     msg.includes("Permissions policy violation"))
  ) {
    e.stopImmediatePropagation();
  }
}, true);

// ✅ [5] 다운로드 버튼 생성 및 이벤트 바인딩
function createDownloadButtons() {
  const posts = document.querySelectorAll("article");
  posts.forEach((post) => {
    if (post.querySelector(".ig-download-btn")) return;

    const btn = document.createElement("button");
    btn.className = "ig-download-btn";
    btn.innerHTML = `<svg xmlns='http://www.w3.org/2000/svg' fill='white' width='18' height='18' viewBox='0 0 24 24'><path d='M5 20h14v-2H5m14-9h-4V3H9v6H5l7 7 7-7z'/></svg>`;
    Object.assign(btn.style, {
      position: "absolute",
      top: "10px",
      right: "30px",
      zIndex: "1000",
      padding: "5px 8px",
      background: "#0095f6",
      border: "none",
      borderRadius: "5px",
      fontWeight: "bold",
      cursor: "pointer",
    });

    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      document.getElementById("ig-selector")?.remove();
      document.getElementById("ig-overlay")?.remove();

      const account = extractAccount(post);
      await preloadAllMediaInPost(post);

      const imageUrls = Array.from(post.querySelectorAll("img"))
        .map(img => img.src || img.getAttribute("src"))
        .filter(src => src.includes("cdninstagram") && !src.includes("s150x150"));

      const videoUrls = Array.from(post.querySelectorAll("video, source"))
        .map(tag => {
          const src = tag.getAttribute("src");
          if (src?.startsWith("blob:")) return null;
          return src || placeholderThumbnail;
        })
        .filter(src => src && src.startsWith("http"));

      const mediaUrls = [...new Set([...imageUrls, ...videoUrls])].slice(0, 20);

      if (mediaUrls.length === 0) {
        alert("다운로드할 이미지나 동영상을 찾을 수 없습니다.");
        return;
      }

      showImageSelector(mediaUrls, account);
    });

    post.style.position = "relative";
    post.appendChild(btn);
  });
}

// ✅ [6] 팝업 UI - 생략 없이 동일 유지 (확장자 반영 포함)
function showImageSelector(mediaUrls, account) {
  let index = 0;
  const modal = document.createElement("div");
  modal.id = "ig-selector";
  Object.assign(modal.style, {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "white",
    padding: "20px",
    border: "1px solid #ccc",
    borderRadius: "10px",
    zIndex: "10001",
    width: "300px",
    height: "450px",
    textAlign: "center",
    boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
  });

  const closeBtn = document.createElement("button");
  closeBtn.innerText = "✖";
  Object.assign(closeBtn.style, {
    position: "absolute",
    top: "5px",
    right: "10px",
    background: "transparent",
    border: "none",
    fontSize: "18px",
    cursor: "pointer",
  });
  closeBtn.onclick = () => {
    modal.remove();
    document.getElementById("ig-overlay")?.remove();
  };
  modal.appendChild(closeBtn);

  const mediaBox = document.createElement("div");
  Object.assign(mediaBox.style, {
    width: "100%",
    height: "350px",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  const navIndicator = document.createElement("div");
  navIndicator.style.marginTop = "8px";
  navIndicator.style.fontSize = "13px";
  navIndicator.style.color = "#555";

  const updateMedia = () => {
    mediaBox.innerHTML = "";
    const url = mediaUrls[index];
    const isVideo = url.endsWith(".mp4") || url.includes("video");

    if (isVideo) {
      const video = document.createElement("video");
      video.src = url;
      video.controls = true;
      video.autoplay = false;
      video.playsInline = true;
      video.style.maxWidth = "100%";
      video.style.maxHeight = "100%";
      mediaBox.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = url;
      img.style.maxWidth = "100%";
      img.style.maxHeight = "100%";
      mediaBox.appendChild(img);
    }
    navIndicator.innerText = `${index + 1} / ${mediaUrls.length}`;
  };

  updateMedia();
  modal.appendChild(mediaBox);
  modal.appendChild(navIndicator);

  const prevBtn = document.createElement("button");
  prevBtn.innerText = "◀";
  prevBtn.onclick = () => {
    if (index > 0) {
      index--;
      updateMedia();
    }
  };

  const nextBtn = document.createElement("button");
  nextBtn.innerText = "▶";
  nextBtn.onclick = () => {
    if (index < mediaUrls.length - 1) {
      index++;
      updateMedia();
    }
  };

  const downloadBtn = document.createElement("button");
  downloadBtn.innerText = "다운로드";
  downloadBtn.style.marginTop = "10px";
  downloadBtn.onclick = () => {
    const now = new Date();
    const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, '');
    const hhmm = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    const url = mediaUrls[index];
    const ext = getExtensionFromUrl(url);
    const filename = `${account}_${yymmdd}_${hhmm}_${String(index + 1).padStart(2, '0')}.${ext}`;

    fetch(url)
      .then(res => res.blob())
      .then(blob => {
        const tempUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = tempUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(tempUrl);
      });
  };

  const downloadAllBtn = document.createElement("button");
  downloadAllBtn.innerText = "전체 다운로드";
  downloadAllBtn.style.marginTop = "10px";
  downloadAllBtn.onclick = () => {
    const now = new Date();
    const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, '');
    const hhmm = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    const prefix = `${account}_${yymmdd}_${hhmm}`;

    mediaUrls.forEach((url, i) => {
      const ext = getExtensionFromUrl(url);
      setTimeout(() => {
        fetch(url)
          .then(res => res.blob())
          .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = `${prefix}_${String(i + 1).padStart(2, '0')}.${ext}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(blobUrl);
          });
      }, i * 600);
    });
  };

  const navWrapper = document.createElement("div");
  Object.assign(navWrapper.style, {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    marginTop: "10px",
  });
  navWrapper.appendChild(prevBtn);
  navWrapper.appendChild(nextBtn);

  modal.appendChild(navWrapper);
  modal.appendChild(downloadBtn);
  modal.appendChild(downloadAllBtn);

  const overlay = document.createElement("div");
  overlay.id = "ig-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    background: "rgba(0,0,0,0.3)",
    zIndex: "10000",
  });
  overlay.onclick = () => {
    modal.remove();
    overlay.remove();
  };

  document.body.appendChild(overlay);
  document.body.appendChild(modal);
}

// ✅ [7] 실행 시작
window.addEventListener("load", () => {
  setTimeout(() => {
    createDownloadButtons();
    const observer = new MutationObserver(() => createDownloadButtons());
    observer.observe(document.body, { childList: true, subtree: true });
  }, 2000);
});