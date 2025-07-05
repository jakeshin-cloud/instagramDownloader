// ================================================
// 인스타그램 슬라이드 로더 
// v0.46.3 (2025-05-02)
// ================================================

/**
 * 게시물에서 미디어 추출 (단일 슬라이드)
 * @param {Element} post - 미디어를 추출할 게시물 요소
 * @returns {Set} 추출된 미디어 URL Set
 */
function extractMediaFrom(post) {
  if (!post) return new Set();
  
  const result = new Set();

  // 1. 이미지 수집 - 다양한 선택자 시도
  const imgs = Array.from(post.querySelectorAll("img, div[role='button'] img"));
  imgs.forEach(img => {
    // 다양한 소스 속성 확인
    const src = img.getAttribute("src") || 
                img.getAttribute("data-src") || 
                img.getAttribute("srcset")?.split(" ")[0] ||
                img.currentSrc || 
                img.dataset.srcset?.split(' ')[0];
                
    // 유효한 인스타그램 이미지만 추가 (썸네일 제외)
    if (src && 
        (src.includes("cdninstagram") || src.includes("fbcdn")) && 
        !src.includes("s150x150") && 
        !src.startsWith("data:image")) {
      result.add(src);
      
      // 원본 이미지 URL 추출 시도 (data-visualcompletion 등 특수 속성 사용)
      const parent = img.closest("[data-visualcompletion]");
      if (parent && parent.dataset.visualcompletion === "media-vc-image") {
        const style = parent.getAttribute("style");
        if (style) {
          const match = style.match(/url\("([^"]+)"\)/);
          if (match && match[1]) {
            result.add(match[1]);
          }
        }
      }
    }
  });
  
  // 2. 비디오 요소 확인 - 개선된 선택자
  const videos = post.querySelectorAll("video, [data-media-type='video'] video");
  videos.forEach(video => {
    // 직접 src 속성 확인
    if (video.src && video.src.startsWith("http")) {
      result.add(video.src);
    } 
    // poster 이미지 (비디오 썸네일)
    else if (video.poster && video.poster.startsWith("http")) {
      result.add(video.poster);
    }
    
    // 비디오의 모든 소스 요소 확인
    const sources = video.querySelectorAll("source");
    sources.forEach(source => {
      const src = source.getAttribute("src");
      if (src && src.startsWith("http")) {
        result.add(src);
      }
    });
  });
  
  // 3. 독립적인 소스 요소 확인
  post.querySelectorAll("source").forEach(source => {
    const src = source.getAttribute("src");
    if (src && src.startsWith("http")) {
      result.add(src);
    }
  });
  
  // 4. 스크립트 태그에서 미디어 URL 추출 시도
  const scripts = post.querySelectorAll("script");
  scripts.forEach(script => {
    try {
      const text = script.textContent;
      if (text && (text.includes("video_url") || text.includes("display_url"))) {
        // JSON 데이터 찾기
        const match = text.match(/{.*"display_url":"([^"]+)".*}/);
        if (match && match[1]) {
          result.add(match[1].replace(/\\u002F/g, '/'));
        }
        
        // 비디오 URL 찾기
        const videoMatch = text.match(/{.*"video_url":"([^"]+)".*}/);
        if (videoMatch && videoMatch[1]) {
          result.add(videoMatch[1].replace(/\\u002F/g, '/'));
        }
      }
    } catch (e) {
      // 스크립트 파싱 오류 무시
    }
  });
  
  // 5. 데이터 속성에서 미디어 URL 추출
  const mediaContainers = post.querySelectorAll("[data-visualmedia-type], [data-media-id]");
  mediaContainers.forEach(container => {
    try {
      Object.keys(container.dataset).forEach(key => {
        if (key.includes('src') || key.includes('url')) {
          const value = container.dataset[key];
          if (value && 
              value.startsWith('http') && 
              (value.includes('cdninstagram') || value.includes('fbcdn'))) {
            result.add(value);
          }
        }
      });
    } catch (e) {
      // 데이터셋 접근 오류 무시
    }
  });
  
  return result;
}

/**
 * 슬라이드의 모든 이미지 로드 (클릭 방식)
 * @param {Element} post - 미디어를 추출할 게시물 요소
 * @returns {Promise<Array>} 추출된 모든 미디어 URL 배열
 */
async function loadAllSlidesByClick(post) {
  try {
    // 중복 제거를 위한 Set 사용
    const mediaSet = new Set();
    
    // 첫 슬라이드 수집
    const initialMedia = extractMediaFrom(post);
    initialMedia.forEach(url => mediaSet.add(url));
    
    // 사용자에게 진행 상황 알림
    if (typeof showToast === 'function') {
      showToast("미디어 수집 중...");
    }
    
    // 슬라이드 넘기기
    let tries = 0;
    const maxSlides = 15; // 최대 슬라이드 수 제한
    
    // 다음 버튼 선택자 (다양한 UI 버전 지원)
    const nextBtnSelector = 
      'button[aria-label="다음"], ' +
      'button[aria-label="Next"], ' +
      'div[role=button]:has(svg[aria-label="다음"]), ' +
      'div[role=button]:has(svg[aria-label="Next"])';
    
    let nextBtn = post.querySelector(nextBtnSelector);
    
    // 다음 버튼이 있으면 클릭하여 모든 슬라이드 탐색
    while (nextBtn && tries < maxSlides && !nextBtn.disabled) {
      nextBtn.click();
      await new Promise(r => setTimeout(r, 700)); // 슬라이드 전환 대기
      
      // 새 미디어 수집 및 추가
      const newMedia = extractMediaFrom(post);
      let newCount = 0;
      
      newMedia.forEach(url => {
        if (!mediaSet.has(url)) {
          mediaSet.add(url);
          newCount++;
        }
      });
      
      // 더 이상 새 미디어가 없으면 중단 (최적화)
      if (newCount === 0 && tries > 2) {
        console.log("더 이상 새 미디어 없음, 슬라이드 수집 중단");
        break;
      }
      
      // 다음 버튼 다시 찾기
      nextBtn = post.querySelector(nextBtnSelector);
      tries++;
    }
    
    // 처음 슬라이드로 되돌리기
    const prevBtnSelector = 
      'button[aria-label="이전"], ' +
      'button[aria-label="Previous"], ' +
      'div[role=button]:has(svg[aria-label="이전"]), ' +
      'div[role=button]:has(svg[aria-label="Previous"])';
    
    for (let i = 0; i < tries; i++) {
      const prevBtn = post.querySelector(prevBtnSelector);
      if (prevBtn) {
        prevBtn.click();
        await new Promise(r => setTimeout(r, 300));
      }
    }
    
    // 최적화된 URL 반환
    const optimizedUrls = Array.from(mediaSet).map(url => {
      // URL 최적화 (유틸리티 함수가 있다면 사용)
      if (typeof optimizeImageUrl === 'function') {
        return optimizeImageUrl(url);
      }
      return url;
    });
    
    return optimizedUrls;
  } catch (error) {
    console.error("슬라이드 로딩 중 오류:", error);
    return [];
  }
}

/**
 * 모든 미디어 URL 수집 (슬라이드 지원) - 비동기 함수
 * @param {Element} post - 미디어를 추출할 게시물 요소
 * @returns {Promise<Array>} 추출된 모든 미디어 URL 배열 - 원본 URL을 포함하는 객체 배열
 */
async function collectAllMediaUrls(post) {
  if (!post) return [];
  
  try {
    // 두 가지 방식의 수집 결과를 합칩니다
    // 1. 고급 미디어 추출 방식
    const collected = new Set([...extractMediaFrom(post)]);
    
    // 2. 더 단순한 선택자를 이용한 백업 방식 (이전 버전 로직)
    const backupMedia = Array.from(post.querySelectorAll("img, video")).map(el => {
      if (el.tagName === "VIDEO") {
        return el.getAttribute("src") || 
               el.querySelector("source")?.getAttribute("src") ||
               el.getAttribute("poster");
      } else {
        return el.getAttribute("src") || 
               el.getAttribute("data-src") || 
               el.getAttribute("srcset")?.split(" ")[0];
      }
    }).filter(src => src && 
              (src.includes("cdninstagram") || src.includes("fbcdn")) && 
              !src.includes("s150x150") &&
              !src.startsWith("data:"));
    
    // 백업 수집 결과 추가
    backupMedia.forEach(url => collected.add(url));
    
    // 사용자에게 알림
    if (typeof showToast === 'function') {
      showToast("미디어 수집 중...");
    }

    // 슬라이드 탐색
    let slideCount = 0;
    const maxSlides = 20; // 최대 탐색 슬라이드 수
    
    // 탐색 중단 플래그
    let shouldStop = false;
    
    for (let i = 0; i < maxSlides && !shouldStop; i++) {
      // 다음 버튼 찾기 (다양한 선택자 지원)
      const nextBtn = post.querySelector(
        "button[aria-label='다음'], " +
        "button[aria-label='Next'], " +
        "div[role=button]:has(svg[aria-label='다음']), " +
        "div[role=button]:has(svg[aria-label='Next'])"
      );
      
      // 다음 버튼이 없거나 비활성화되었으면 중단
      if (!nextBtn || nextBtn.disabled) {
        console.log("다음 버튼 없음/비활성화, 슬라이드 수집 중단");
        break;
      }

      try {
        // 다음 슬라이드로 이동
        nextBtn.click();
        await new Promise(res => setTimeout(res, 600)); // 슬라이드 전환 대기시간 증가
        slideCount++;
      } catch (e) {
        console.log("슬라이드 이동 실패:", e);
        break;
      }

      // 새 미디어 수집 (두 가지 방식 모두 시도)
      const newMedia = new Set([...extractMediaFrom(post)]);
      
      // 백업 방식으로도 추가 수집 시도
      const newBackupMedia = Array.from(post.querySelectorAll("img, video")).map(el => {
        if (el.tagName === "VIDEO") {
          return el.getAttribute("src") || 
                 el.querySelector("source")?.getAttribute("src") ||
                 el.getAttribute("poster");
        } else {
          return el.getAttribute("src") || 
                 el.getAttribute("data-src") || 
                 el.getAttribute("srcset")?.split(" ")[0];
        }
      }).filter(src => src && 
                (src.includes("cdninstagram") || src.includes("fbcdn")) && 
                !src.includes("s150x150") &&
                !src.startsWith("data:"));
      
      newBackupMedia.forEach(url => newMedia.add(url));
      
      // 새로 수집된 미디어를 기존 컬렉션에 추가
      let newCount = 0;
      newMedia.forEach(url => {
        if (!collected.has(url)) {
          collected.add(url);
          newCount++;
        }
      });
      
      // 더 이상 새 미디어가 없으면 중단 (최적화)
      if (newCount === 0 && i > 1) {
        console.log("새 미디어 없음, 슬라이드 수집 중단");
        shouldStop = true;
      }
    }
    
    // 수집된 URL을 객체 배열로 변환 (원본 및 최적화된 URL 모두 포함)
    const mediaObjects = Array.from(collected).map(url => {
      const optimized = typeof optimizeImageUrl === 'function' ? optimizeImageUrl(url) : url;
      const isVideo = typeof isVideoUrl === 'function' ? isVideoUrl(url) : 
                     (url.includes('/video/') || url.endsWith('.mp4'));
      
      // 원본/최적화 URL 모두 보존
      return { 
        originalUrl: url,
        displayUrl: optimized, // 표시용 URL (최적화)
        isVideo: isVideo,
        downloadUrl: url // 다운로드용 URL (원본 유지)
      };
    });
    
    console.log(`총 ${mediaObjects.length}개 미디어 URL 수집됨, ${slideCount}개 슬라이드 탐색`);
    
    // 표시용으로는 최적화된 URL 배열을 반환하되, 다운로드에는 원본 URL 사용
    return mediaObjects.map(obj => obj.displayUrl);
  } catch (error) {
    console.error("미디어 수집 중 오류:", error);
    return [];
  }
}

// 외부에서 사용할 함수 내보내기
window.extractMediaFrom = extractMediaFrom;
window.loadAllSlidesByClick = loadAllSlidesByClick;
window.collectAllMediaUrls = collectAllMediaUrls;