// ================================================
// 인스타그램 미디어 선택기 
// v0.46.3 (2025-05-02)
// ================================================

/**
 * 이전 선택기 정리 함수
 * 기존 모달, 오버레이 및 캐시 데이터 제거
 */
function cleanupPreviousSelectors() {
  try {
    // 기존 모달 및 오버레이 제거
    document.getElementById("ig-selector")?.remove();
    document.getElementById("ig-overlay")?.remove();
    
    // 캐시 데이터 정리
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('ig_media_')) {
        keys.push(key);
      }
    }
    
    // 각 캐시 항목 삭제
    keys.forEach(key => {
      console.log(`캐시 삭제: ${key}`);
      sessionStorage.removeItem(key);
    });
  } catch (error) {
    console.error("선택기 정리 중 오류:", error);
  }
}

/**
 * 미디어 선택기 UI 표시
 * @param {Array} mediaUrls - 미디어 URL 배열
 * @param {string} account - 계정명
 * @param {string} postDate - 게시물 날짜
 * @param {string} pageId - 페이지 ID (선택 사항)
 */
function showMediaSelector(mediaUrls, account, postDate, pageId) {
  try {
    // 유효성 검사
    if (!mediaUrls || mediaUrls.length === 0) {
      if (typeof showToast === 'function') {
        showToast("표시할 미디어가 없습니다", 3000);
      }
      return;
    }
    
    // 이전 인스턴스 정리
    cleanupPreviousSelectors();
    
    // 페이지별 고유 ID 생성 (URL 경로 기반)
    const uniqueId = pageId || `page_${Date.now()}`;
    const timestamp = Date.now();
    console.log(`페이지 ID: ${uniqueId}, 타임스탬프: ${timestamp}, 미디어 개수: ${mediaUrls.length}`);
    
    // 원본 URL 보존 방식으로 URL 처리
    const processedUrls = mediaUrls.map(url => {
      // 최소한의 안전한 URL 처리 (원본 URL 캐시에서 분리)
      
      // 캐시 방지 파라미터 제거 (중복 방지)
      let cleanUrl = url.replace(/[?&]_t=\d+/g, '')
                         .replace(/[?&]_nocache=[^&]+/g, '')
                         .replace(/[?&]_retry=[^&]+/g, '');
      
      // 썸네일 URL인 경우만 고해상도로 변환
      if (cleanUrl.includes('/s150x150/')) {
        cleanUrl = cleanUrl.replace('/s150x150/', '/');
      }
      
      // 전시용으로만 타임스탬프 추가 (불필요한 파라미터 제거 없이)
      const separator = cleanUrl.includes('?') ? '&' : '?';
      const displayUrl = `${cleanUrl}${separator}_t=${timestamp}`;
      
      // 원본 URL을 저장하는 객체 반환 (다운로드에는 원본 사용, 표시에는 타임스탬프 버전 사용)
      return {
        originalUrl: cleanUrl,
        displayUrl: displayUrl
      };
    });
    
    // 표시용 URL 배열과 원본 URL 매핑
    const displayUrls = processedUrls.map(obj => obj.displayUrl);
    
    // 원본 URL 매핑 저장 (다운로드 시 사용)
    window.originalUrlMap = {};
    processedUrls.forEach((obj, idx) => {
      window.originalUrlMap[obj.displayUrl] = obj.originalUrl;
    });
    
    // 원본 URL 배열 (다운로드용)
    const originalUrls = processedUrls.map(obj => obj.originalUrl);
    
    let currentIndex = 0;
    
    console.log(`미디어 선택기 표시 (${displayUrls.length}개 항목)`, 
                 displayUrls.length > 0 ? displayUrls[0].substring(0, 80) + "..." : '미디어 없음');
    
    // UI 요소 생성
    const { modal, overlay, mediaBox, mediaType, navIndicator, prevBtn, nextBtn } = createSelectorUI(uniqueId, account, postDate);
    
    // 미디어 업데이트 함수 정의
    const updateMedia = () => {
      updateMediaContent(
        mediaBox, 
        mediaType, 
        navIndicator, 
        displayUrls,  // 표시용 URL
        originalUrls, // 원본 URL
        currentIndex, 
        uniqueId, 
        timestamp,
        prevBtn,
        nextBtn
      );
    };
    
    // 네비게이션 버튼 이벤트 설정
    prevBtn.onclick = () => {
      if (currentIndex > 0) {
        currentIndex--;
        updateMedia();
      }
    };
    
    nextBtn.onclick = () => {
      if (currentIndex < displayUrls.length - 1) {
        currentIndex++;
        updateMedia();
      }
    };
    
    // 다운로드 버튼 생성
    const actionWrapper = createActionButtons(
      modal, 
      overlay, 
      displayUrls, // 표시용 URL 전달
      account, 
      postDate, 
      currentIndex
    );
    
    // 모달에 모든 요소 추가
    modal.appendChild(actionWrapper);
    
    // 문서에 요소 추가
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    
    // 초기 미디어 표시
    updateMedia();
  } catch (error) {
    console.error("미디어 선택기 표시 중 오류:", error);
    if (typeof showToast === 'function') {
      showToast("미디어 표시 중 오류가 발생했습니다");
    }
  }
}

/**
 * 선택기 UI 요소 생성
 * @param {string} uniqueId - 페이지 고유 ID
 * @param {string} account - 계정명
 * @param {string} postDate - 게시물 날짜
 * @returns {Object} UI 요소 객체
 */
function createSelectorUI(uniqueId, account, postDate) {
  // 오버레이 생성
  const overlay = document.createElement("div");
  overlay.id = "ig-overlay";
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      document.getElementById("ig-selector")?.remove();
      overlay.remove();
    }
  };
  
  // 모달 생성
  const modal = document.createElement("div");
  modal.id = "ig-selector";
  modal.dataset.pageId = uniqueId; // 고유 페이지 ID 저장
  
  // 닫기 버튼
  const closeBtn = document.createElement("button");
  closeBtn.className = "close-btn";
  closeBtn.innerHTML = "✖";
  closeBtn.onclick = () => {
    modal.remove();
    overlay.remove();
  };
  
  // 미디어 표시 영역
  const mediaBox = document.createElement("div");
  mediaBox.className = "media-box";
  
  // 미디어 타입 표시
  const mediaType = document.createElement("div");
  mediaType.className = "media-type";
  
  // 계정 정보 표시
  const accountInfo = document.createElement("div");
  accountInfo.className = "account-info";
  accountInfo.textContent = `${account || 'Unknown'}${postDate !== "unknown" ? ` • ${postDate}` : ''}`;
  
  // 네비게이션 인디케이터
  const navIndicator = document.createElement("div");
  navIndicator.className = "media-count";
  
  // 이전 버튼
  const prevBtn = document.createElement("button");
  prevBtn.className = "nav-btn";
  prevBtn.innerHTML = "◀";
  
  // 다음 버튼
  const nextBtn = document.createElement("button");
  nextBtn.className = "nav-btn";
  nextBtn.innerHTML = "▶";
  
  // 네비게이션 래퍼
  const navWrapper = document.createElement("div");
  navWrapper.className = "nav-wrapper";
  navWrapper.appendChild(prevBtn);
  navWrapper.appendChild(nextBtn);
  
  // 모달에 요소 추가
  modal.appendChild(closeBtn);
  modal.appendChild(accountInfo);
  modal.appendChild(mediaType);
  modal.appendChild(mediaBox);
  modal.appendChild(navIndicator);
  modal.appendChild(navWrapper);
  
  return { modal, overlay, mediaBox, mediaType, navIndicator, prevBtn, nextBtn };
}

/**
 * 미디어 콘텐츠 업데이트 함수
 * @param {Element} mediaBox - 미디어 박스 요소
 * @param {Element} mediaType - 미디어 타입 요소
 * @param {Element} navIndicator - 네비게이션 인디케이터 요소
 * @param {Array} displayUrls - 표시용 URL 배열
 * @param {Array} originalUrls - 원본 URL 배열
 * @param {number} currentIndex - 현재 인덱스
 * @param {string} uniqueId - 페이지 고유 ID
 * @param {number} timestamp - 타임스탬프
 * @param {Element} prevBtn - 이전 버튼
 * @param {Element} nextBtn - 다음 버튼
 */
function updateMediaContent(
  mediaBox, 
  mediaType, 
  navIndicator, 
  displayUrls, 
  originalUrls, 
  currentIndex, 
  uniqueId, 
  timestamp,
  prevBtn,
  nextBtn
) {
  try {
    // 기존 콘텐츠 초기화 (메모리 누수 방지)
    while (mediaBox.firstChild) {
      if (mediaBox.firstChild.tagName === 'VIDEO') {
        // 비디오 정리
        const video = mediaBox.firstChild;
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      mediaBox.removeChild(mediaBox.firstChild);
    }
    
    // 현재 표시용 URL과 원본 URL 가져오기
    const displayUrl = displayUrls[currentIndex];
    const originalUrl = originalUrls[currentIndex];
    
    if (!displayUrl) {
      console.error("미디어 URL이 없습니다:", currentIndex, displayUrls);
      mediaType.textContent = "오류";
      return;
    }
    
    // 비디오 파일 여부 확인 (유틸리티 함수가 있다면 사용)
    const isVideo = typeof isVideoUrl === 'function' ? isVideoUrl(originalUrl) :
                   (originalUrl.endsWith('.mp4') || originalUrl.includes('/video/'));
    
    console.log(`미디어 ${currentIndex+1}/${displayUrls.length} 표시:`, 
                originalUrl.substring(0, 80) + "...", 
                isVideo ? "(비디오)" : "(이미지)");
    
    // 미디어 타입 표시 업데이트
    mediaType.textContent = isVideo ? "동영상" : "이미지";
    
    // 로딩 인디케이터 추가
    const loading = document.createElement("div");
    loading.className = "ig-loading";
    mediaBox.appendChild(loading);
    
    if (isVideo) {
      // 비디오는 원본 URL 사용 (캐시 방지 파라미터 없음)
      createVideoElement(mediaBox, originalUrl, loading);
    } else {
      // 이미지는 표시용 URL 사용 (타임스탬프 포함)
      createImageElement(mediaBox, displayUrl, uniqueId, timestamp, loading);
    }
    
    // 네비게이션 인디케이터 업데이트
    navIndicator.textContent = `${currentIndex + 1} / ${displayUrls.length}`;
    
    // 버튼 상태 업데이트
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === displayUrls.length - 1;
  } catch (error) {
    console.error("미디어 콘텐츠 업데이트 중 오류:", error);
  }
}

/**
 * 비디오 요소 생성 함수
 * @param {Element} mediaBox - 미디어 박스 요소
 * @param {string} url - 비디오 URL
 * @param {Element} loading - 로딩 인디케이터 요소
 */
function createVideoElement(mediaBox, url, loading) {
  // 캐시 방지 파라미터 제거
  const cleanUrl = url.replace(/[?&]_t=\d+/g, '')
                      .replace(/[?&]_nocache=[^&]+/g, '')
                      .replace(/[?&]_retry=[^&]+/g, '');
  
  console.log("비디오 처리 시작:", cleanUrl.substring(0, 80) + "...");
  
  // 비디오 미리보기를 위한 썸네일 추출 시도
  let thumbnailUrl = '';
  
  if (cleanUrl.includes('.jpg') || cleanUrl.includes('.jpeg') || cleanUrl.includes('.png')) {
    thumbnailUrl = cleanUrl;
  } else {
    // 비디오 URL에서 썸네일 URL 생성
    const urlParts = cleanUrl.split('/');
    const fileName = urlParts[urlParts.length - 1].split('?')[0];
    thumbnailUrl = cleanUrl.replace(/\.(mp4|mov)/, '.jpg').replace(/\/video\//, '/');
  }
  
  // 즉시 다운로드 버튼 제공
  const message = document.createElement("div");
  message.style.color = "#333";
  message.style.fontSize = "14px";
  message.style.textAlign = "center";
  message.style.width = "100%";
  message.style.padding = "20px";
  
  // 비디오 플레이어 영역 대신 썸네일 표시
  const thumbnailImg = document.createElement("img");
  thumbnailImg.src = thumbnailUrl;
  thumbnailImg.style.maxWidth = "100%";
  thumbnailImg.style.maxHeight = "260px";
  thumbnailImg.style.objectFit = "contain";
  thumbnailImg.style.marginBottom = "10px";
  thumbnailImg.style.borderRadius = "8px";
  thumbnailImg.style.boxShadow = "0 0 10px rgba(0,0,0,0.1)";
  
  // 썸네일 로드 오류 핸들링
  thumbnailImg.onerror = () => {
    thumbnailImg.src = placeholderThumbnail || 'https://png.pngtree.com/thumb_back/fw800/background/20231125/pngtree-instagram-color-gradient-background-image_13821781.jpg';
    thumbnailImg.alt = "비디오 미리보기를 표시할 수 없습니다";
  };
  
  // 미리보기 텍스트
  const infoText = document.createElement("p");
  infoText.textContent = "비디오 미리보기는 지원되지 않습니다";
  infoText.style.margin = "10px 0";
  
  // 다운로드 버튼
  const downloadBtn = document.createElement("button");
  downloadBtn.id = "direct-video-download-btn";
  downloadBtn.textContent = "비디오 다운로드";
  downloadBtn.style.padding = "10px 20px";
  downloadBtn.style.background = "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)";
  downloadBtn.style.border = "none";
  downloadBtn.style.borderRadius = "8px";
  downloadBtn.style.color = "white";
  downloadBtn.style.fontWeight = "bold";
  downloadBtn.style.margin = "10px auto";
  downloadBtn.style.cursor = "pointer";
  downloadBtn.style.display = "block";
  
  // 다운로드 버튼 클릭 이벤트
  downloadBtn.onclick = () => {
    if (typeof downloadMedia === 'function') {
      const extension = 'mp4';
      const now = new Date();
      const timestamp = now.toISOString().slice(2, 10).replace(/-/g, '') + 
                       now.getHours().toString().padStart(2, '0') + 
                       now.getMinutes().toString().padStart(2, '0');
      const filename = `video_${timestamp}.${extension}`;
      
      // 다운로드 시도 (여러 URL 패턴 생성)
      downloadMedia(cleanUrl, filename);
    } else {
      // 다운로드 함수가 없으면 직접 다운로드 시도
      const a = document.createElement('a');
      a.href = cleanUrl;
      a.download = `video_${Date.now()}.mp4`;  // 반드시 download 속성 설정
      a.setAttribute('download', `video_${Date.now()}.mp4`);  // 중복 설정으로 확실하게
      a.target = '_self';  // 새 창이 아닌 현재 창에서 처리
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      showToast("비디오 다운로드 중...");
    }
  };
  
  // 모든 요소를 메시지 컨테이너에 추가
  message.appendChild(thumbnailImg);
  message.appendChild(infoText);
  message.appendChild(downloadBtn);
  
  // 로딩 인디케이터 제거
  loading?.remove();
  
  // 미리보기 컨테이너 추가
  mediaBox.innerHTML = '';
  mediaBox.appendChild(message);
  
  console.log("비디오 미리보기 썸네일 표시:", thumbnailUrl.substring(0, 80) + "...");
}

/**
 * 이미지 요소 생성 함수
 * @param {Element} mediaBox - 미디어 박스 요소
 * @param {string} url - 이미지 URL
 * @param {string} uniqueId - 페이지 고유 ID
 * @param {number} timestamp - 타임스탬프
 * @param {Element} loading - 로딩 인디케이터 요소
 */
function createImageElement(mediaBox, url, uniqueId, timestamp, loading) {
  const img = document.createElement("img");
  
  // 이미지 로드 이벤트
  img.onload = () => {
    mediaBox.querySelector(".ig-loading")?.remove();
    console.log("이미지 로드 성공:", `(${img.naturalWidth}x${img.naturalHeight})`);
  };
  
  // 이미지 오류 처리 (원본 URL로 다시 시도)
  img.onerror = (e) => {
    console.error("이미지 로드 오류:", url.substring(0, 80) + "...", e);
    
    // 로딩 표시 유지
    const loadingElement = mediaBox.querySelector(".ig-loading");
    
    // 원본 URL로 직접 시도 (캐시 방지 파라미터 없이)
    const cleanUrl = url.replace(/[?&]_t=\d+/g, '')
                        .replace(/[?&]_nocache=[^&]+/g, '')
                        .replace(/[?&]_retry=[^&]+/g, '');
    
    console.log("URL 재시도:", cleanUrl.substring(0, 80) + "...");
    
    const retryImg = new Image();
    retryImg.onload = () => {
      loadingElement?.remove();
      img.src = cleanUrl;
      console.log("원본 URL로 이미지 로드 성공");
    };
    
    retryImg.onerror = () => {
      loadingElement?.remove();
      mediaBox.innerHTML = `<div style="color:#999;font-size:14px;text-align:center;width:100%;">이미지를 불러올 수 없습니다</div>`;
      console.error("원본 URL로도 이미지 로드 실패");
    };
    
    // 로드 시도
    retryImg.src = cleanUrl;
  };
  
  // 이미지 설정 - 중복 파라미터 방지 및 필수 파라미터 유지
  // 이미 캐시 방지 파라미터가 있으면 제거
  let cleanUrl = url.replace(/[?&]_t=\d+/g, '')
                    .replace(/[?&]_nocache=[^&]+/g, '')
                    .replace(/[?&]_retry=[^&]+/g, '');
  
  // 캐시 방지 파라미터 추가
  const separator = cleanUrl.includes('?') ? '&' : '?';
  const displayUrl = `${cleanUrl}${separator}_t=${timestamp}`;
  
  img.src = displayUrl;
  img.style.maxWidth = "100%";
  img.style.maxHeight = "100%";
  img.style.objectFit = "contain";
  
  // 원본 URL 저장 (나중에 오류 시 사용)
  img.dataset.originalUrl = cleanUrl;
  
  mediaBox.appendChild(img);
}

/**
 * 액션 버튼 생성 함수
 * @param {Element} modal - 모달 요소
 * @param {Element} overlay - 오버레이 요소
 * @param {Array} mediaUrls - 미디어 URL 배열
 * @param {string} account - 계정명
 * @param {string} postDate - 게시물 날짜
 * @param {number} currentIndex - 현재 인덱스
 * @returns {Element} 액션 버튼 래퍼 요소
 */
function createActionButtons(modal, overlay, mediaUrls, account, postDate, currentIndex) {
  // 액션 버튼 래퍼
  const actionWrapper = document.createElement("div");
  actionWrapper.className = "action-wrapper";
  
  // 다운로드 버튼
  const downloadBtn = document.createElement("button");
  downloadBtn.className = "download-btn";
  downloadBtn.innerHTML = `<svg xmlns='http://www.w3.org/2000/svg' fill='white' width='16' height='16' viewBox='0 0 24 24'><path d='M5 20h14v-2H5m14-9h-4V3H9v6H5l7 7 7-7z'/></svg> 다운로드`;
  downloadBtn.onclick = () => {
    handleSingleDownload(mediaUrls, currentIndex, account, postDate);
  };
  
  // 전체 다운로드 버튼
  const downloadAllBtn = document.createElement("button");
  downloadAllBtn.className = "download-all-btn";
  downloadAllBtn.innerHTML = "전체 다운로드";
  downloadAllBtn.onclick = () => {
    handleBulkDownload(modal, overlay, mediaUrls, account, postDate);
  };
  
  actionWrapper.appendChild(downloadBtn);
  actionWrapper.appendChild(downloadAllBtn);
  return actionWrapper;
}

/**
 * 단일 파일 다운로드 처리 함수
 * @param {Array} mediaUrls - 미디어 URL 배열
 * @param {number} currentIndex - 현재 인덱스
 * @param {string} account - 계정명
 * @param {string} postDate - 게시물 날짜
 */
function handleSingleDownload(mediaUrls, currentIndex, account, postDate) {
  try {
    // 현재 URL 가져오기
    const displayUrl = mediaUrls[currentIndex];
    
    // 원본 URL 가져오기 (캐시됨)
    let downloadUrl = displayUrl;
    
    // 전역 매핑에서 원본 URL 가져오기 (가능하면)
    if (window.originalUrlMap && window.originalUrlMap[displayUrl]) {
      downloadUrl = window.originalUrlMap[displayUrl];
      console.log("원본 URL로 다운로드:", downloadUrl.substring(0, 80) + "...");
    } else {
      // 매핑이 없으면 캐시 방지 파라미터 제거
      downloadUrl = displayUrl.replace(/[?&]_t=\d+/g, '')
                               .replace(/[?&]_nocache=[^&]+/g, '')
                               .replace(/[?&]_retry=[^&]+/g, '');
    }
    
    // 현재 표시된 요소에서 직접 원본 URL 가져오기 시도
    const mediaElement = document.querySelector("#ig-selector .media-box img, #ig-selector .media-box video");
    if (mediaElement && mediaElement.dataset.originalUrl) {
      downloadUrl = mediaElement.dataset.originalUrl;
      console.log("요소에서 원본 URL 추출:", downloadUrl.substring(0, 80) + "...");
    }
    
    // 확장자 결정
    const extension = typeof getExtensionFromUrl === 'function' 
      ? getExtensionFromUrl(downloadUrl) 
      : (downloadUrl.endsWith('.mp4') || downloadUrl.includes('/video/') ? 'mp4' : 'jpg');
    
    // 파일명 생성
    let filename;
    if (typeof generateFilename === 'function') {
      filename = generateFilename(account, postDate, currentIndex, extension);
    } else {
      const now = new Date();
      const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, '');
      const hhmm = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
      filename = `${account || 'instagram'}${postDate !== "unknown" ? `(${postDate})` : ''}_${yymmdd}_${hhmm}_${String(currentIndex + 1).padStart(2, '0')}.${extension}`;
    }
    
    // 다운로드 함수 호출
    if (typeof downloadMedia === 'function') {
      downloadMedia(downloadUrl, filename);
    } else {
      console.error("downloadMedia 함수를 찾을 수 없습니다");
      
      // 대체 다운로드 방식 - fetch API를 사용하여 직접 다운로드
      downloadWithFetch(downloadUrl, filename);
    }
  } catch (error) {
    console.error("단일 파일 다운로드 중 오류:", error);
    
    // 오류 발생 시 직접 다운로드 시도
    try {
      const displayUrl = mediaUrls[currentIndex];
      // 캐시 방지 파라미터 제거
      const cleanUrl = displayUrl.replace(/[?&]_t=\d+/g, '')
                                 .replace(/[?&]_nocache=[^&]+/g, '')
                                 .replace(/[?&]_retry=[^&]+/g, '');
                                 
      if (typeof showToast === 'function') {
        showToast("대체 방식으로 다운로드 시도 중...");
      }
      
      // 브라우저 내장 다운로드 호출 - download 속성 필수
      const a = document.createElement("a");
      a.href = cleanUrl;
      
      // 파일명 생성
      const extension = cleanUrl.includes('/video/') || cleanUrl.endsWith('.mp4') ? 'mp4' : 'jpg';
      const now = new Date();
      const timestamp = now.toISOString().slice(2, 10).replace(/-/g, '') + 
                      now.getHours().toString().padStart(2, '0') + 
                      now.getMinutes().toString().padStart(2, '0');
      const filename = `instagram_${timestamp}_${String(currentIndex + 1).padStart(2, '0')}.${extension}`;
      
      a.download = filename;  // 반드시 download 속성 지정
      a.style.display = "none"; // 화면에 표시하지 않음
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      if (typeof showToast === 'function') {
        showToast(`"${filename}" 다운로드 중...`);
      }
    } catch (e) {
      console.error("최종 다운로드 시도 실패:", e);
      if (typeof showToast === 'function') {
        showToast("다운로드 실패: 브라우저에서 직접 시도해보세요");
      }
    }
  }
}

/**
 * fetch API를 사용한 다운로드 함수
 * @param {string} url - 다운로드할 URL
 * @param {string} filename - 저장할 파일명
 */
function downloadWithFetch(url, filename) {
  if (typeof showToast === 'function') {
    showToast(`"${filename}" 다운로드 중...`);
  }
  
  fetch(url, {
    method: 'GET',
    headers: {
      'Accept': '*/*',
      'Cache-Control': 'no-cache'
    },
    mode: 'cors'
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`네트워크 응답 오류: ${response.status}`);
    }
    return response.blob();
  })
  .then(blob => {
    // blob URL 생성 및 다운로드
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    
    if (typeof showToast === 'function') {
      showToast(`"${filename}" 다운로드 완료`);
    }
  })
  .catch(error => {
    console.error("Fetch 다운로드 실패:", error);
    
    // 대체 다운로드 방식
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    if (typeof showToast === 'function') {
      showToast(`"${filename}" 다운로드 시도 중...`);
    }
  });
}

/**
 * 일괄 다운로드 처리 함수
 * @param {Element} modal - 모달 요소
 * @param {Element} overlay - 오버레이 요소
 * @param {Array} mediaUrls - 미디어 URL 배열
 * @param {string} account - 계정명
 * @param {string} postDate - 게시물 날짜
 */
function handleBulkDownload(modal, overlay, mediaUrls, account, postDate) {
  try {
    // 전체 다운로드 알림
    if (typeof showToast === 'function') {
      showToast(`${mediaUrls.length}개 파일 다운로드 중...`);
    }
    
    // 각 미디어 다운로드
    mediaUrls.forEach((displayUrl, i) => {
      setTimeout(() => {
        // 원본 URL 가져오기
        let downloadUrl = displayUrl;
        
        // 전역 매핑에서 원본 URL 가져오기 (가능하면)
        if (window.originalUrlMap && window.originalUrlMap[displayUrl]) {
          downloadUrl = window.originalUrlMap[displayUrl];
        } else {
          // 매핑이 없으면 캐시 방지 파라미터 제거
          downloadUrl = displayUrl.replace(/[?&]_t=\d+/g, '')
                                  .replace(/[?&]_nocache=[^&]+/g, '')
                                  .replace(/[?&]_retry=[^&]+/g, '');
        }
        
        // 확장자 결정 (개선된 동영상 체크)
        const isVideo = typeof isVideoUrl === 'function' ? 
                       isVideoUrl(downloadUrl) : 
                       (downloadUrl.endsWith('.mp4') || downloadUrl.includes('/video/'));
                       
        const extension = isVideo ? 'mp4' : 'jpg';
        
        // 파일명 생성
        let filename;
        if (typeof generateFilename === 'function') {
          filename = generateFilename(account, postDate, i, extension);
        } else {
          const now = new Date();
          const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, '');
          const hhmm = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
          filename = `${account || 'instagram'}${postDate !== "unknown" ? `(${postDate})` : ''}_${yymmdd}_${hhmm}_${String(i + 1).padStart(2, '0')}.${extension}`;
        }
        
        // 다운로드 시도
        if (typeof downloadMedia === 'function') {
          // 기본 다운로드 함수 사용
          downloadMedia(downloadUrl, filename);
        } else {
          // 대체 다운로드 방식 사용
          downloadWithFetch(downloadUrl, filename);
        }
      }, i * 800); // 0.8초 간격으로 다운로드 (약간 빠르게)
    });
    
    // 작업 완료 후 모달 닫기 - 더 긴 지연시간 제공
    setTimeout(() => {
      modal.remove();
      overlay.remove();
      if (typeof showToast === 'function') {
        showToast(`${mediaUrls.length}개 파일 다운로드 완료`);
      }
    }, mediaUrls.length * 800 + 1000); // 간격과 맞춤
  } catch (error) {
    console.error("일괄 다운로드 중 오류:", error);
    
    // 오류 발생 시 직접 다운로드 시도
    try {
      // 첫 번째 파일만 일단 다운로드 시도
      const displayUrl = mediaUrls[0];
      const cleanUrl = displayUrl.replace(/[?&]_t=\d+/g, '')
                                 .replace(/[?&]_nocache=[^&]+/g, '')
                                 .replace(/[?&]_retry=[^&]+/g, '');
      
      // 확장자 결정
      const extension = cleanUrl.includes('/video/') || cleanUrl.endsWith('.mp4') ? 'mp4' : 'jpg';
      
      // 파일명 생성
      const now = new Date();
      const timestamp = now.toISOString().slice(2, 10).replace(/-/g, '') + 
                       now.getHours().toString().padStart(2, '0') + 
                       now.getMinutes().toString().padStart(2, '0');
      const filename = `instagram_${timestamp}.${extension}`;
      
      // 브라우저 내장 다운로드 호출
      const a = document.createElement("a");
      a.href = cleanUrl;
      a.download = filename;  // 반드시 download 속성 필요
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      if (typeof showToast === 'function') {
        showToast("일부 파일 다운로드 시도 중...");
      }
    } catch (e) {
      console.error("대체 다운로드 시도 실패:", e);
      if (typeof showToast === 'function') {
        showToast("다운로드 실패: 브라우저에서 직접 시도해보세요");
      }
    }
    
    // 모달은 닫지 않음 (사용자가 수동으로 다운로드할 수 있게)
  }
}

// 전역 스코프로 내보내기
window.showMediaSelector = showMediaSelector;
window.cleanupPreviousSelectors = cleanupPreviousSelectors;