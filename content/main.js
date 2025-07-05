// ✅ v0.46.4 (2025-05-02)
// ================================================
// 📌 업데이트 내역:
// 1. 코드 리팩토링 및 최적화
// 2. 모듈 구조 개선으로 성능 향상
// 3. 다양한 URL 패턴 지원 확장 (스토리, 릴스 지원)
// 4. 에러 처리 강화
// 5. 불필요한 코드 제거
// 6. 코드 가독성 개선
// 7. UI 개선: 다운로드 버튼 위치 및 스타일 변경
// 8. 다운로드 안정성 향상: 이미지 및 동영상 다운로드 오류 수정
// 9. 직접 다운로드 기능 개선: 새 창 열기 대신 파일 바로 다운로드
// ================================================

// 배경 이미지 URL (폴백용)
const placeholderThumbnail = 'https://png.pngtree.com/thumb_back/fw800/background/20231125/pngtree-instagram-color-gradient-background-image_13821781.jpg';

/**
 * 게시물 요소 찾기 함수 강화
 * @returns {Element|null} 게시물 컨테이너 요소 또는 null
 */
function findPostContainer() {
  try {
    // 다양한 선택자 시도
    const selectors = [
      'article', // 기본 선택자
      'div[role="presentation"]', // 프레젠테이션 역할을 하는 div
      'div.x1lliihq', // 특정 클래스 선택자
      'div.x1yvgwvq', // 계정이 없는 URL에서 발견된 클래스
      'div.x6s0dn4.x1dqoszc', // 계정이 없는 URL에서 발견된 보다 구체적인 클래스
      'div[role="dialog"]', // 다이얼로그 역할 컨테이너
      'div.x78zum5:has(img)', // 이미지를 포함하는 컨테이너
      'div.x1uhb9sk:has(img)', // 다른 방식으로 이미지를 포함하는 컨테이너
      'div.x9f619:has(img.x5yr21d)', // 미디어 컨테이너를 찾는 더 구체적인 선택자
      'div:has(> div > img.x5yr21d)',
      'div:has(> img)' // 백업 선택자 - 모든 이미지 컨테이너 찾기
    ];

    // 각 선택자 시도
    for (const selector of selectors) {
      try {
        const container = document.querySelector(selector);
        if (container) {
          console.log(`게시물 컨테이너 찾음: ${selector}`);
          return container;
        }
      } catch (e) {
        console.log(`선택자 시도 중 오류: ${selector}`, e);
        // 계속 다음 선택자 시도
      }
    }

    // 미디어 기반 역방향 탐색
    const mediaElements = document.querySelectorAll('img.x5yr21d, video');
    if (mediaElements.length > 0) {
      console.log(`미디어 요소를 통한 컨테이너 검색 중...`);
      // 첫 번째 미디어 요소에서 시작하여 상위 컨테이너 찾기
      let element = mediaElements[0];
      // 상위 8단계까지 올라가며 적절한 컨테이너 찾기
      for (let i = 0; i < 8; i++) {
        element = element.parentElement;
        if (!element) break;
        
        // 적절한 컨테이너 특성 확인 (예: 포지션, 넓이 등)
        if (element.offsetWidth > 400 && 
            (window.getComputedStyle(element).position === 'relative' || 
             element.classList.contains('x1n2onr6'))) {
          console.log(`미디어 기반 컨테이너 찾음: 단계 ${i}`);
          return element;
        }
      }
    }

    console.log('적절한 게시물 컨테이너를 찾을 수 없음');
    return null;
  } catch (error) {
    console.error('게시물 컨테이너 검색 중 오류:', error);
    return null;
  }
}

/**
 * 인스타그램 일반적인 오류 처리
 */
window.addEventListener("error", function (e) {
  // 인스타그램 내부 오류 무시 (확장 프로그램 작동에 영향 없음)
  if (
    e.message?.includes("DTSG") ||
    e.message?.includes("WebReverb") ||
    e.message?.includes("Permissions policy violation")
  ) {
    e.stopImmediatePropagation();
  }
}, true);

/**
 * 다운로드 버튼 생성 및 추가
 */
function createDownloadButtons() {
  try {
    // 모든 게시물 가져오기
    const posts = document.querySelectorAll("article");
    
    posts.forEach((post) => {
      // 이미 버튼이 있는지 확인
      if (post.querySelector(".ig-download-btn")) return;

      // 게시물 하단 액션 버튼 영역 찾기
      const actionBar = post.querySelector('section.x6s0dn4.xrvj5dj.x1o61qjw.x12nagc.x1gslohp');
      
      if (actionBar) {
        // 이미 버튼이 있는지 확인
        if (actionBar.querySelector('.ig-download-btn')) return;
        
        // 새 다운로드 버튼 생성
        const downloadBtn = document.createElement("button");
        downloadBtn.className = "ig-download-btn";
        downloadBtn.style.background = "white";
        downloadBtn.style.border = "none";
        downloadBtn.style.padding = "8px";
        downloadBtn.style.cursor = "pointer";
        downloadBtn.style.display = "flex";
        downloadBtn.style.alignItems = "center";
        downloadBtn.style.justifyContent = "center";
        
        // download.png 이미지 사용
        downloadBtn.innerHTML = `
          <img src="${chrome.runtime.getURL('icons/download.png')}" alt="다운로드" width="24" height="24" style="display: block;" />
        `;
        
        // 클릭 이벤트 리스너
        downloadBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          e.preventDefault();
          
          // 기존 선택기 제거
          document.getElementById("ig-selector")?.remove();
          document.getElementById("ig-overlay")?.remove();
  
          // 계정 및 날짜 정보 추출
          const account = extractAccount(post);
          const postDate = extractPostDate(post);
          
          // 로딩 메시지
          showToast("미디어 수집 중...");
          
          // 미디어 URL 수집
          try {
            // 슬라이드 로더 함수 사용 (window 전역 객체 참조)
            const mediaUrls = await collectAllMediaUrls(post);
            
            if (!mediaUrls || mediaUrls.length === 0) {
              showToast("다운로드할 미디어를 찾을 수 없습니다");
              return;
            }
            
            // 이미지 선택기 표시
            showMediaSelector(mediaUrls, account, postDate);
          } catch (error) {
            console.error("미디어 수집 오류:", error);
            showToast("미디어 수집 중 오류가 발생했습니다");
          }
        });
        
        // "저장" 버튼 앞에 다운로드 버튼 추가 (마지막 div 앞에)
        const saveButtonArea = actionBar.querySelector('.x11i5rnm.x1gryazu');
        if (saveButtonArea) {
          actionBar.insertBefore(downloadBtn, saveButtonArea);
          console.log("게시물에 인라인 다운로드 버튼 추가됨");
        } else {
          // 저장 버튼 영역을 찾지 못했다면 그냥 액션바에 추가
          actionBar.appendChild(downloadBtn);
          console.log("게시물에 인라인 다운로드 버튼 추가됨");
        }
      } else {
        // 원래 방식으로 추가 (기존 동작 유지)
        addLegacyDownloadButton(post);
      }
    });
    
    // 게시물 페이지에서 다운로드 버튼 추가
    addPostPageDownloadButton();
  } catch (error) {
    console.error("다운로드 버튼 생성 중 오류:", error);
  }
}

/**
 * 기존 방식으로 다운로드 버튼 추가 (게시물 오른쪽 상단 배치)
 * @param {Element} post - 다운로드 버튼을 추가할 게시물 요소
 */
function addLegacyDownloadButton(post) {
  // 새 버튼 생성
  const btn = document.createElement("button");
  btn.className = "ig-download-btn";
  
  // download.png 이미지 사용
  btn.innerHTML = `
    <img src="${chrome.runtime.getURL('icons/download.png')}" alt="다운로드" width="24" height="24" />
  `;

  // 클릭 이벤트 리스너
  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    
    // 기존 선택기 제거
    document.getElementById("ig-selector")?.remove();
    document.getElementById("ig-overlay")?.remove();

    // 계정 및 날짜 정보 추출
    const account = extractAccount(post);
    const postDate = extractPostDate(post);
    
    // 로딩 메시지
    showToast("미디어 수집 중...");
    
    // 미디어 URL 수집
    try {
      // 슬라이드 로더 함수 사용 (window 전역 객체 참조)
      const mediaUrls = await collectAllMediaUrls(post);
      
      if (!mediaUrls || mediaUrls.length === 0) {
        showToast("다운로드할 미디어를 찾을 수 없습니다");
        return;
      }
      
      // 이미지 선택기 표시
      showMediaSelector(mediaUrls, account, postDate);
    } catch (error) {
      console.error("미디어 수집 오류:", error);
      showToast("미디어 수집 중 오류가 발생했습니다");
    }
  });

  // 게시물에 버튼 추가
  post.style.position = "relative";
  post.appendChild(btn);
}

/**
 * 게시물 페이지에서 다운로드 버튼 추가
 */
function addPostPageDownloadButton() {
  try {
    // 현재 URL 확인
    const currentUrl = window.location.href;
    const urlAnalysis = analyzeInstagramUrl(currentUrl);
    
    // 게시물 페이지가 아니면 중단
    if (!urlAnalysis.isPostPage) {
      return;
    }
    
    console.log(`게시물 페이지 감지: ${currentUrl} (패턴: ${urlAnalysis.pattern})`);
    
    // 이미 버튼이 있는지 확인
    if (document.querySelector('.ig-download-btn')) {
      console.log('다운로드 버튼이 이미 존재합니다');
      return;
    }
    
    // 게시물 컨테이너 찾기
    const postContainer = findPostContainer();
    
    if (!postContainer) {
      console.log('게시물 컨테이너를 찾을 수 없습니다. 나중에 다시 시도합니다.');
      return;
    }
    
    // 계정 정보 (없는 경우 기본값 사용)
    let account = "instagram";
    try {
      account = extractAccount(postContainer) || "instagram";
    } catch (e) {
      console.log('계정명 추출 실패, 기본값 사용');
    }
    
    // 게시물 날짜 (없는 경우 기본값 사용)
    let postDate = "unknown";
    try {
      postDate = extractPostDate(postContainer);
    } catch (e) {
      console.log('게시물 날짜 추출 실패, 기본값 사용');
    }
    
    // 게시물 하단 액션 버튼 영역 찾기
    const actionBar = postContainer.querySelector('section.x6s0dn4.xrvj5dj.x1o61qjw.x12nagc.x1gslohp');
      
    if (actionBar) {
      // 이미 버튼이 있는지 확인
      if (actionBar.querySelector('.ig-download-btn')) {
        console.log('다운로드 버튼이 이미 존재합니다');
        return;
      }
      
      // 새 다운로드 버튼 생성
      const downloadBtn = document.createElement("button");
      downloadBtn.className = "ig-download-btn";
      downloadBtn.style.background = "white";
      downloadBtn.style.border = "none";
      downloadBtn.style.padding = "8px";
      downloadBtn.style.cursor = "pointer";
      downloadBtn.style.display = "flex";
      downloadBtn.style.alignItems = "center";
      downloadBtn.style.justifyContent = "center";
      
      // download.png 이미지 사용
      downloadBtn.innerHTML = `
        <img src="${chrome.runtime.getURL('icons/download.png')}" alt="다운로드" width="24" height="24" style="display: block;" />
      `;
      
      // 클릭 이벤트 핸들러
      downloadBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        // 로딩 메시지
        showToast("미디어 수집 중...");
        
        try {
          // 미디어 수집
          const mediaUrls = await collectAllMediaUrls(postContainer);
          
          if (!mediaUrls || mediaUrls.length === 0) {
            showToast("다운로드할 미디어를 찾을 수 없습니다");
            return;
          }
          
          // 이미지 선택기 표시
          showMediaSelector(mediaUrls, account, postDate);
        } catch (error) {
          console.error("미디어 수집 오류:", error);
          showToast("미디어 수집 중 오류가 발생했습니다");
        }
      });
      
      // "저장" 버튼 앞에 다운로드 버튼 추가 (마지막 div 앞에)
      const saveButtonArea = actionBar.querySelector('.x11i5rnm.x1gryazu');
      if (saveButtonArea) {
        actionBar.insertBefore(downloadBtn, saveButtonArea);
        console.log("게시물 페이지에 인라인 다운로드 버튼 추가됨");
      } else {
        // 저장 버튼 영역을 찾지 못했다면 그냥 액션바에 추가
        actionBar.appendChild(downloadBtn);
        console.log("게시물 페이지에 인라인 다운로드 버튼 추가됨");
      }
      
      return;
    }
    
    // 인라인 버튼 추가 실패 시 기존 방식으로 진행 (백업)
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'ig-download-btn';
    
    // download.png 이미지 사용
    downloadBtn.innerHTML = `
      <img src="${chrome.runtime.getURL('icons/download.png')}" alt="다운로드" width="24" height="24" />
    `;
    
    // 버튼 스타일 설정
    downloadBtn.style.top = '15px';
    downloadBtn.style.right = '15px';
    
    // 클릭 이벤트 핸들러
    downloadBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      // 로딩 메시지
      showToast("미디어 수집 중...");
      
      try {
        // 미디어 수집
        const mediaUrls = await collectAllMediaUrls(postContainer);
        
        if (!mediaUrls || mediaUrls.length === 0) {
          showToast("다운로드할 미디어를 찾을 수 없습니다");
          return;
        }
        
        // 이미지 선택기 표시
        showMediaSelector(mediaUrls, account, postDate);
      } catch (error) {
        console.error("미디어 수집 오류:", error);
        showToast("미디어 수집 중 오류가 발생했습니다");
      }
    });
    
    // 게시물 컨테이너에 상대 위치 설정 및 버튼 추가
    postContainer.style.position = 'relative';
    postContainer.appendChild(downloadBtn);
    
    console.log(`게시물에 다운로드 버튼 추가 완료: 계정=${account}, 날짜=${postDate}`);
  } catch (error) {
    console.error("게시물 페이지 다운로드 버튼 추가 중 오류:", error);
  }
}