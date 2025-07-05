// popup.js 기능 병합됨
const placeholderThumbnail = 'https://png.pngtree.com/thumb_back/fw800/background/20231125/pngtree-instagram-color-gradient-background-image_13821781.jpg';

function showImageSelector(mediaUrls, account) {
  try {
    console.log("🔽 showImageSelector 실행", account, mediaUrls);
    let index = 0;
    document.getElementById("ig-selector")?.remove();
    document.getElementById("ig-overlay")?.remove();

    const modal = document.createElement("div");
    modal.id = "ig-selector";
    Object.assign(modal.style, {
      position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
      background: "white", padding: "20px", border: "1px solid #ccc", borderRadius: "10px",
      zIndex: "10001", width: "320px", height: "520px", textAlign: "center",
      boxShadow: "0 4px 8px rgba(0,0,0,0.2)"
    });

    const closeBtn = document.createElement("button");
    closeBtn.innerText = "✖";
    Object.assign(closeBtn.style, {
      position: "absolute", top: "5px", right: "10px", background: "transparent",
      border: "none", fontSize: "18px", cursor: "pointer"
    });
    closeBtn.onclick = () => {
      modal.remove();
      document.getElementById("ig-overlay")?.remove();
    };
    modal.appendChild(closeBtn);

    const mediaBox = document.createElement("div");
    Object.assign(mediaBox.style, {
      width: "100%", height: "400px", overflow: "hidden", display: "flex",
      alignItems: "center", justifyContent: "center"
    });

    const navIndicator = document.createElement("div");
    navIndicator.style.marginTop = "8px";
    navIndicator.style.fontSize = "13px";
    navIndicator.style.color = "#555";

    const createMediaElement = (url) => {
      const isVideo = /\.mp4($|\?)/.test(url) || url.includes("video");
      if (isVideo) {
        const video = document.createElement("video");
        video.src = url;
        video.controls = true;
        video.style.maxWidth = "100%";
        video.style.maxHeight = "100%";
        video.onerror = () => video.poster = placeholderThumbnail;
        return video;
      } else {
        const img = document.createElement("img");
        img.src = url;
        img.style.maxWidth = "100%";
        img.style.maxHeight = "100%";
        return img;
      }
    };

    const updateMedia = () => {
      mediaBox.innerHTML = "";
      mediaBox.appendChild(createMediaElement(mediaUrls[index]));
      navIndicator.innerText = `${index + 1} / ${mediaUrls.length}`;
    };

    updateMedia();
    modal.appendChild(mediaBox);
    modal.appendChild(navIndicator);

    const navWrapper = document.createElement("div");
    Object.assign(navWrapper.style, {
      display: "flex", justifyContent: "center", gap: "10px", marginTop: "10px"
    });

    const prevBtn = document.createElement("button");
    prevBtn.innerText = "◀";
    prevBtn.onclick = () => { if (index > 0) { index--; updateMedia(); } };

    const nextBtn = document.createElement("button");
    nextBtn.innerText = "▶";
    nextBtn.onclick = () => { if (index < mediaUrls.length - 1) { index++; updateMedia(); } };

    navWrapper.appendChild(prevBtn);
    navWrapper.appendChild(nextBtn);
    modal.appendChild(navWrapper);

    const downloadBtn = document.createElement("button");
    downloadBtn.innerText = "다운로드";
    downloadBtn.style.marginTop = "10px";
    downloadBtn.onclick = () => {
      const filename = getFilename(account, index);
      fetch(mediaUrls[index])
        .then(res => res.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        });
    };

    const downloadAllBtn = document.createElement("button");
    downloadAllBtn.innerText = "전체 다운로드";
    downloadAllBtn.style.marginTop = "10px";
    downloadAllBtn.onclick = () => {
      mediaUrls.forEach((url, i) => {
        const filename = getFilename(account, i);
        fetch(url)
          .then(res => res.blob())
          .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(blobUrl);
          });
      });
    };

    modal.appendChild(downloadBtn);
    modal.appendChild(downloadAllBtn);

    const overlay = document.createElement("div");
    overlay.id = "ig-overlay";
    Object.assign(overlay.style, {
      position: "fixed", top: "0", left: "0", width: "100vw", height: "100vh",
      zIndex: "10000", background: "rgba(0,0,0,0.3)"
    });
    overlay.onclick = () => { modal.remove(); overlay.remove(); };

    document.body.appendChild(overlay);
    document.body.appendChild(modal);
  } catch (e) {
    console.error("💥 showImageSelector 에서 오류 발생:", e);
    alert("팝업 표시 중 오류가 발생했습니다. 콘솔 로그를 확인해주세요.");
  }
}

function createDownloadButtons() {
  const posts = document.querySelectorAll("article");
  posts.forEach(post => {
    if (post.querySelector(".ig-download-btn")) return;

    const btn = document.createElement("button");
    btn.className = "ig-download-btn";
    btn.innerHTML = `<svg xmlns='http://www.w3.org/2000/svg' fill='white' width='18' height='18' viewBox='0 0 24 24'><path d='M5 20h14v-2H5m14-9h-4V3H9v6H5l7 7 7-7z'/></svg>`;
    Object.assign(btn.style, {
      position: "absolute", top: "10px", right: "30px", zIndex: "1000",
      padding: "5px 8px", background: "#0095f6", border: "none",
      borderRadius: "5px", fontWeight: "bold", cursor: "pointer"
    });

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      try {
        const account = extractAccount(post);

        // 이미지와 비디오 src 수동 수집 (슬라이드 넘김 제거)
        const mediaUrls = Array.from(post.querySelectorAll("img, video")).map(el => {
          if (el.tagName === "VIDEO") {
            return el.getAttribute("src") || el.querySelector("source")?.getAttribute("src");
          } else {
            return el.getAttribute("src") || el.getAttribute("data-src") || el.getAttribute("srcset")?.split(" ")[0];
          }
        }).filter(src => src && src.includes("cdninstagram") && !src.includes("s150x150"));

        console.log("🎯 수집된 미디어:", mediaUrls);

        if (!mediaUrls || mediaUrls.length === 0) {
          alert("다운로드할 이미지나 동영상을 찾을 수 없습니다.");
          return;
        }

        showImageSelector(mediaUrls, account);
      } catch (error) {
        console.error("🔥 다운로드 버튼 클릭 중 오류 발생:", error);
        alert("예상치 못한 오류가 발생했습니다. 콘솔 로그를 확인해주세요.");
      }
    });

    post.style.position = "relative";
    post.appendChild(btn);
  });
}

window.addEventListener("load", () => {
  setTimeout(() => {
    createDownloadButtons();
    const observer = new MutationObserver(() => createDownloadButtons());
    observer.observe(document.body, { childList: true, subtree: true });
  }, 2000);
});