// ================================================
// 인스타그램 이미지 다운로더 유틸리티 함수
// v0.46.3 (2025-05-02)
// ================================================

/**
 * URL 패턴을 분석하는 함수
 * @param {string} url - 분석할 URL
 * @returns {Object} URL 분석 결과
 */
function analyzeInstagramUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    
    let result = {
      isPostPage: false,
      hasUsername: false,
      postId: null,
      username: null,
      pattern: 'unknown'
    };
    
    // 패턴 1: /p/postId
    if (pathParts.length >= 2 && pathParts[0] === 'p') {
      result.isPostPage = true;
      result.postId = pathParts[1];
      result.pattern = 'pattern1';
    }
    // 패턴 2: /username/p/postId
    else if (pathParts.length >= 3 && pathParts[1] === 'p') {
      result.isPostPage = true;
      result.hasUsername = true;
      result.username = pathParts[0];
      result.postId = pathParts[2];
      result.pattern = 'pattern2';
    }
    // 패턴 3: /stories/username
    else if (pathParts.length >= 2 && pathParts[0] === 'stories') {
      result.isPostPage = false;
      result.hasUsername = true;
      result.username = pathParts[1];
      result.pattern = 'stories';
    }
    // 패턴 4: /reel/postId
    else if (pathParts.length >= 2 && pathParts[0] === 'reel') {
      result.isPostPage = true;
      result.postId = pathParts[1];
      result.pattern = 'reel';
    }
    // 패턴 5: 사용자 프로필
    else if (pathParts.length === 1) {
      result.isPostPage = false;
      result.hasUsername = true;
      result.username = pathParts[0];
      result.pattern = 'profile';
    }
    
    return result;
  } catch (e) {
    console.error("URL 분석 오류:", e);
    return {
      isPostPage: false,
      hasUsername: false,
      postId: null,
      username: null,
      pattern: 'error'
    };
  }
}

/**
 * 게시물에서 계정명을 추출
 * @param {Element} post - 계정명을 추출할 게시물 요소
 * @returns {string} 추출된 계정명
 */
function extractAccount(post) {
  if (!post) return "instagram";
  
  // 방법 1: 헤더 링크에서 추출
  const headerLink = post.querySelector('header a[href^="/"]');
  if (headerLink) {
    const href = headerLink.getAttribute("href");
    const match = href.match(/^\/([^\/]+)\/?$/);
    if (match) return match[1];
  }
  
  // 방법 2: 프로필 이미지의 alt 속성에서 추출
  const profileImg = post.querySelector('img[alt*="님의 프로필 사진"]');
  if (profileImg) {
    const alt = profileImg.getAttribute("alt");
    const match = alt.match(/^(.+?)님의 프로필 사진/);
    if (match && match[1]) return match[1].trim();
  }
  
  // 방법 3: 다른 선택자 시도
  const usernameEl = post.querySelector('div > div > div > span > div > span > a');
  if (usernameEl) {
    return usernameEl.textContent.trim();
  }
  
  // 방법 4: 헤더의 다른 요소 시도
  const headerUsername = post.querySelector('header span a');
  if (headerUsername) {
    return headerUsername.textContent.trim();
  }
  
  // 방법 5: URL에서 추출 시도
  const urlAnalysis = analyzeInstagramUrl(window.location.href);
  if (urlAnalysis.hasUsername) {
    return urlAnalysis.username;
  }
  
  return "instagram";
}

/**
 * 게시물 날짜 추출
 * @param {Element} post - 날짜를 추출할 게시물 요소
 * @returns {string} 추출된 날짜 (YYMMDD 형식)
 */
function extractPostDate(post) {
  if (!post) return "unknown";
  
  const timeElement = post.querySelector("time");
  if (timeElement) {
    const datetime = timeElement.getAttribute("datetime");
    if (datetime) {
      return datetime.slice(2, 10).replace(/-/g, '');
    }
  }
  return "unknown";
}

/**
 * 파일명 생성 함수
 * @param {string} account - 계정명
 * @param {string} dateStr - 날짜 문자열
 * @param {number} index - 파일 인덱스
 * @param {string} extension - 파일 확장자
 * @returns {string} 생성된 파일명
 */
function generateFilename(account, dateStr, index, extension) {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  
  // 날짜 포맷: 계정명_게시물날짜_현재날짜시간_인덱스
  return `${account}${dateStr !== "unknown" ? `(${dateStr})` : ''}_${mm}${dd}_${hh}${mi}_${String(index + 1).padStart(2, '0')}.${extension}`;
}

/**
 * URL에서 파일 확장자 추출
 * @param {string} url - 확장자를 추출할 URL
 * @returns {string} 추출된 확장자
 */
function getExtensionFromUrl(url) {
  if (!url) return 'jpg';
  
  // 비디오 URL 특별 처리
  if (url.includes('/video/')) return 'mp4';
  
  // 일반적인 파일 확장자 추출
  const match = url.match(/\.([a-zA-Z0-9]{3,4})(?:[?#]|$)/);
  return match ? match[1].toLowerCase() : 'jpg';
}

/**
 * 이미지 URL 최적화 (고해상도 URL 반환을 위한 안전한 방식)
 * @param {string} url - 최적화할 이미지 URL
 * @returns {string} 최적화된 URL
 */
function optimizeImageUrl(url) {
  if (!url) return url;
  
  // 원본 URL 보존 (인스타그램 API에 필요한 파라미터를 제거하지 않음)
  // 인스타그램 URL은 쿼리 파라미터에 중요한 인증 정보를 포함하므로 조심스럽게 접근
  
  // 이미 캐시 방지 파라미터가 있으면 제거 (중복 방지)
  let optimized = url.replace(/[?&]_t=\d+/g, '')
                     .replace(/[?&]_nocache=[^&]+/g, '');
  
  // 저해상도 패턴만 신중하게 제거 (고해상도로 변환)
  if (optimized.includes('/s150x150/')) {
    // 썸네일 이미지를 고해상도로 변환
    optimized = optimized.replace('/s150x150/', '/');
  }
  
  // URL 클린업 (주의: 기존 파라미터 유지)
  if (optimized.includes('?&')) optimized = optimized.replace('?&', '?');
  if (optimized.endsWith('?')) optimized = optimized.slice(0, -1);
  
  return optimized;
}

/**
 * URL이 비디오인지 확인 (인스타그램 비디오 URL 패턴 인식 개선)
 * @param {string} url - 확인할 URL
 * @returns {boolean} 비디오 여부
 */
function isVideoUrl(url) {
  if (!url) return false;
  
  // 확장자 기반 확인
  if (url.endsWith('.mp4') || 
      url.endsWith('.mov') ||
      url.endsWith('.avi') ||
      url.endsWith('.wmv')) {
    return true;
  }
  
  // 경로 기반 확인 (강화)
  if (url.includes('/video/') || 
      url.includes('/videos/') ||
      url.includes('/reel/') ||
      url.includes('/t50.') ||  // Instagram 비디오 패턴
      url.includes('/t51.') && !url.includes('.jpg') && !url.includes('.jpeg')) {  // 비디오 URL 패턴
    return true;
  }
  
  // 도메인 기반 확인
  if ((url.includes('fbcdn') || url.includes('cdninstagram')) && 
      !url.includes('.jpg') && 
      !url.includes('.jpeg') &&
      !url.includes('.png') &&
      !url.includes('.gif')) {
    
    // 특정 비디오 패턴 확인
    if (url.includes('/v/') || url.includes('/video/')) {
      return true;
    }
    
    // ID 패턴 확인 (비디오 리소스는 보통 이런 패턴)
    const urlParts = url.split('/');
    const fileName = urlParts[urlParts.length - 1].split('?')[0];
    
    // 비디오 ID 패턴 확인
    if (fileName.match(/^\d+_\d+_\d+/) || fileName.match(/^[a-f0-9]{32}$/)) {
      return true;
    }
  }
  
  // 쿼리 파라미터 기반 확인 (강화)
  if (url.includes('video_id=') ||
      url.includes('media_type=video') ||
      url.includes('video_versions=') ||
      url.includes('is_video=true')) {
    return true;
  }
  
  return false;
}

/**
 * 비디오 URL 최적화 (안전한 방식)
 * @param {string} url - 최적화할 비디오 URL
 * @returns {string} 최적화된 URL
 */
function getOptimizedVideoUrl(url) {
  if (!url) return url;
  
  // 원본 URL 추출 (캐시 방지 파라미터 제거)
  let optimized = url.replace(/[?&]_t=\d+/g, '')
                     .replace(/[?&]_nocache=[^&]+/g, '')
                     .replace(/[?&]_retry=[^&]+/g, '');
  
  // 인스타그램 동영상 URL 패턴 처리
  
  // 1. /p/ 경로의 동영상 URL 변환 (스트리밍 용으로 실제 다운로드 가능한 URL로 변환)
  if (optimized.includes('/p/') && optimized.includes('/video/')) {
    // 특정 패턴의 URL을 표준 형식으로 변환
    const parts = optimized.split('/');
    const videoIdIndex = parts.indexOf('video');
    
    if (videoIdIndex !== -1 && videoIdIndex < parts.length - 1) {
      const videoId = parts[videoIdIndex + 1];
      // 인스타그램 스트리밍 URL 형식으로 변환
      return `https://scontent.cdninstagram.com/v/t50.16885-16/${videoId}.mp4`;
    }
  }
  
  // 2. fbcdn 도메인 비디오 처리
  if (optimized.includes('fbcdn') || optimized.includes('cdninstagram')) {
    // 파일 확장자가 없는 경우
    if (!optimized.endsWith('.mp4') && !optimized.endsWith('.mov') && !optimized.endsWith('.avi')) {
      // 쿼리 파라미터 분리
      const hasQuery = optimized.includes('?');
      const baseUrl = hasQuery ? optimized.split('?')[0] : optimized;
      const queryPart = hasQuery ? optimized.substring(optimized.indexOf('?')) : '';
      
      // MP4 확장자 추가
      return `${baseUrl}.mp4${queryPart}`;
    }
  }
  
  // 3. 스트리밍 URL 패턴 처리
  if (optimized.includes('instagram.com') && optimized.includes('media')) {
    // 스트리밍 URL에 직접 접근 가능한 형식으로 변환
    const urlObj = new URL(optimized);
    const videoPath = urlObj.pathname;
    
    if (videoPath.includes('media')) {
      // 최신 인스타그램 동영상 URL 패턴
      const mediaId = videoPath.split('/').pop();
      if (mediaId) {
        return `https://scontent.cdninstagram.com/v/t50.2886-16/${mediaId}.mp4`;
      }
    }
  }
  
  // URL 클린업 (주의: 기존 파라미터 유지)
  if (optimized.includes('?&')) optimized = optimized.replace('?&', '?');
  if (optimized.endsWith('?')) optimized = optimized.slice(0, -1);
  
  return optimized;
}

/**
 * 토스트 메시지 표시 함수
 * @param {string} message - 표시할 메시지
 * @param {number} duration - 표시 지속 시간(ms)
 */
function showToast(message, duration = 3000) {
  // 기존 토스트 제거
  let toast = document.getElementById('ig-toast');
  if (toast) {
    document.body.removeChild(toast);
  }
  
  // 새 토스트 생성
  toast = document.createElement('div');
  toast.id = 'ig-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // 표시 애니메이션
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // 자동 숨김
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, duration);
}

/**
 * 미디어 다운로드 함수 (개선된 에러 처리 및 재시도 로직)
 * @param {string} url - 다운로드할 미디어 URL
 * @param {string} filename - 저장할 파일명
 */
function downloadMedia(url, filename) {
  // 캐시 방지 파라미터 제거 (원본 URL 복원)
  const cleanUrl = url.replace(/[?&]_t=\d+/g, '')
                      .replace(/[?&]_nocache=[^&]+/g, '')
                      .replace(/[?&]_retry=[^&]+/g, '');
  
  console.log(`다운로드 시도: ${filename}`, cleanUrl.substring(0, 80) + "...");
  
  // 로딩 메시지 표시
  showToast(`"${filename}" 다운로드 중...`);
  
  // 비디오 URL 최적화 시도 (비디오인 경우만)
  let downloadUrl = cleanUrl;
  const isVideo = isVideoUrl(cleanUrl);
  
  if (isVideo) {
    // 비디오 URL 최적화
    downloadUrl = getOptimizedVideoUrl(cleanUrl);
    console.log("최적화된 비디오 URL:", downloadUrl.substring(0, 80) + "...");
    
    // 비디오 URL은 대체 방식으로 바로 시도
    const videoUrls = generateAlternativeVideoUrls(cleanUrl);
    console.log("대체 비디오 URL 목록:", videoUrls);
    
    // 다운로드 대체 URL 시도
    tryDownloadWithUrls(videoUrls, filename, 0);
    return;
  }
  
  // 이미지 다운로드 - 직접 다운로드 방식으로 변경
  console.log("이미지 다운로드 시도:", downloadUrl.substring(0, 80) + "...");
  
  // 블롭 방식으로 다운로드 시도 (가장 안정적인 방법)
  try {
    // 이미지를 가져와서 blob으로 변환
    fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Accept': 'image/*',
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
      a.download = filename;  // 반드시 download 속성 설정
      a.setAttribute('download', filename);  // 중복 설정으로 확실하게
      a.target = '_self';  // 새 창이 아닌 현재 창에서 처리
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      
      showToast(`"${filename}" 다운로드 완료`);
    })
    .catch(error => {
      // 첫 번째 방식 실패 시 대안 사용
      console.error("이미지 다운로드 실패, 대체 방식 시도:", error);
      
      // Chrome 확장 프로그램의 다운로드 API 사용
      if (chrome && chrome.downloads && chrome.downloads.download) {
        chrome.downloads.download({
          url: downloadUrl,
          filename: filename,
          saveAs: false
        }, function(downloadId) {
          if (chrome.runtime.lastError) {
            console.error("Chrome 다운로드 API 오류:", chrome.runtime.lastError);
            tryDirectDownload(downloadUrl, filename);
          } else {
            showToast(`"${filename}" 다운로드 중...`);
          }
        });
      } else {
        // Chrome API를 사용할 수 없는 경우 직접 다운로드 시도
        tryDirectDownload(downloadUrl, filename);
      }
    });
  } catch (imgError) {
    console.error("이미지 다운로드 시도 실패:", imgError);
    tryDirectDownload(downloadUrl, filename);
  }
}

/**
 * 직접 다운로드 시도 함수 (마지막 대안)
 * @param {string} url - 다운로드할 URL
 * @param {string} filename - 저장할 파일명
 */
function tryDirectDownload(url, filename) {
  try {
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename;  // 중요: download 속성 설정
        a.setAttribute('download', filename);  // 중복 설정으로 확실하게
        a.target = '_self';  // 새 창이 아닌 현재 창에서 처리
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
        
        showToast(`"${filename}" 다운로드 중...`);
        setTimeout(() => {
          showToast(`"${filename}" 다운로드 완료`);
        }, 1000);
      })
      .catch(finalError => {
        console.error("최종 다운로드 시도 실패:", finalError);
        forceDownload(url, filename);
      });
  } catch (e) {
    console.error("직접 다운로드 시도 실패:", e);
    forceDownload(url, filename);
  }
}

/**
 * 최종 강제 다운로드 시도 (마지막 대안)
 * @param {string} url - 다운로드할 URL
 * @param {string} filename - 저장할 파일명
 */
function forceDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;  // 반드시 download 속성 설정
  a.setAttribute('download', filename);  // 중복 설정으로 확실하게
  a.target = '_self';  // 새 창이 아닌 현재 창에서 처리
  a.rel = 'noopener noreferrer';  // 보안 속성 추가
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  showToast(`"${filename}" 다운로드 중...`);
}

/**
 * 여러 URL로 순차적으로 다운로드 시도 - 개선된 버전
 * @param {Array} urls - 시도할 URL 배열
 * @param {string} filename - 저장할 파일명
 * @param {number} index - 현재 시도 인덱스
 */
function tryDownloadWithUrls(urls, filename, index) {
  if (index >= urls.length) {
    console.error("모든 URL 시도 실패");
    showToast("다운로드 시도 중...");
    
    // 최종 대안: 직접 다운로드 시도
    forceDownload(urls[0], filename);
    return;
  }
  
  const currentUrl = urls[index];
  console.log(`비디오 다운로드 시도 (${index + 1}/${urls.length}):`, currentUrl.substring(0, 80) + "...");
  
  // 블롭 방식으로 다운로드 시도
  fetch(currentUrl, {
    method: 'GET',
    headers: {
      'Accept': 'video/*',
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
    a.download = filename;  // 반드시 download 속성 설정
    a.setAttribute('download', filename);  // 중복 설정으로 확실하게
    a.target = '_self';  // 새 창이 아닌 현재 창에서 처리
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    
    showToast(`"${filename}" 다운로드 완료`);
  })
  .catch(error => {
    console.error(`URL 시도 ${index + 1} 실패:`, error);
    
    // Chrome 다운로드 API 시도
    if (chrome && chrome.downloads && chrome.downloads.download) {
      chrome.downloads.download({
        url: currentUrl,
        filename: filename,
        saveAs: false
      }, function(downloadId) {
        if (chrome.runtime.lastError) {
          console.error("Chrome 다운로드 API 오류:", chrome.runtime.lastError);
          // 다음 URL 시도
          tryDownloadWithUrls(urls, filename, index + 1);
        } else {
          showToast(`"${filename}" 다운로드 중...`);
        }
      });
    } else {
      // 다음 URL 시도
      tryDownloadWithUrls(urls, filename, index + 1);
    }
  });
}

/**
 * 비디오 URL에 대한 대체 URL 생성
 * @param {string} url - 원본 비디오 URL
 * @returns {Array} 대체 URL 배열
 */
function generateAlternativeVideoUrls(url) {
  const urls = [url]; // 원본 URL 포함
  
  // URL 분석
  const hasQuery = url.includes('?');
  const baseUrl = hasQuery ? url.split('?')[0] : url;
  const queryPart = hasQuery ? url.substring(url.indexOf('?')) : '';
  
  // 패턴 1: .mp4 확장자 추가
  if (!baseUrl.match(/\.(mp4|mov|avi|wmv)$/i)) {
    urls.push(baseUrl + '.mp4' + queryPart);
  }
  
  // URL 파라미터와 경로 추출
  const urlParts = url.split('/');
  const fileName = urlParts[urlParts.length - 1].split('?')[0];
  
  // 파일명과 경로 추출 (보다 신뢰성 있는 방법)
  let videoId = '';
  let pathSegment = '';
  
  // 비디오 ID 패턴 추출
  if (fileName.match(/^\d+_\d+_\d+/)) {
    videoId = fileName.split('.')[0];
  } else if (fileName.match(/^[a-f0-9]{32}$/)) {
    videoId = fileName;
  } else {
    // 일반적인 파일명에서 추출
    videoId = fileName.replace(/\.(mp4|mov)$/, '');
  }
  
  // 다양한 인스타그램 비디오 CDN URL 패턴 시도
  
  // 1. 기본 CDN 패턴
  urls.push(`https://scontent.cdninstagram.com/v/t50.2886-16/${videoId}.mp4${queryPart}`);
  urls.push(`https://scontent.cdninstagram.com/v/t50.16885-16/${videoId}.mp4${queryPart}`);
  
  // 2. 다른 리전 CDN 시도
  urls.push(`https://scontent-ssn1-1.cdninstagram.com/v/t50.2886-16/${videoId}.mp4${queryPart}`);
  urls.push(`https://scontent-nrt1-1.cdninstagram.com/v/t50.2886-16/${videoId}.mp4${queryPart}`);
  
  // 3. 다른 비디오 버전 패턴
  urls.push(`https://scontent.cdninstagram.com/v/t51.29350-16/${videoId}.mp4${queryPart}`);
  
  // 4. 다른 해상도 URL 시도
  if (url.includes('cdninstagram') || url.includes('fbcdn')) {
    // 해상도 변경 시도
    ['h1080', 'l1080', 'h720', 'l720'].forEach(resolution => {
      urls.push(url.replace(/\/[a-z]\d+x\d+\//, `/${resolution}/`));
    });
  }
  
  // 5. 특수 케이스: Instagram API 기반 경로 처리
  if (url.includes('instagram.com/p/') && url.includes('/video/')) {
    const match = url.match(/instagram\.com\/p\/([^\/]+)/);
    if (match && match[1]) {
      // 게시물 코드 기반 URL 시도 (API 형식)
      const postCode = match[1];
      urls.push(`https://www.instagram.com/p/${postCode}/video/`)
      urls.push(`https://www.instagram.com/reel/${postCode}/video/`);
    }
  }
  
  // 중복 제거 후 반환
  return [...new Set(urls)];
}

// 외부에서 사용할 함수 내보내기
window.analyzeInstagramUrl = analyzeInstagramUrl;
window.extractAccount = extractAccount;
window.extractPostDate = extractPostDate;
window.generateFilename = generateFilename;
window.getExtensionFromUrl = getExtensionFromUrl;
window.optimizeImageUrl = optimizeImageUrl;
window.isVideoUrl = isVideoUrl;
window.getOptimizedVideoUrl = getOptimizedVideoUrl;
window.showToast = showToast;
window.downloadMedia = downloadMedia;
window.tryDirectDownload = tryDirectDownload;
window.forceDownload = forceDownload;