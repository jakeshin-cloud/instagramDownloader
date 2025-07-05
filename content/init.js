// ================================================
// 인스타그램 이미지 다운로더 초기화 스크립트
// v0.46.3 (2025-05-02)
// ================================================

/**
 * 페이지 로드 감지 및 초기화
 */
function initializeExtension() {
  console.log("인스타그램 이미지 다운로더를 초기화합니다");
  
  try {
    // 초기 다운로드 버튼 생성
    createDownloadButtons();
    
    // DOM 변경 감지 - 새로운 게시물이 로드될 때 버튼 추가
    setupMutationObserver();
    
    // URL 변경 감지 (인스타그램은 SPA)
    setupURLChangeDetection();
    
    // 게시물 페이지 감지 (초기 로드)
    handleInitialPostPage();
    
    // 키보드 단축키 설정
    setupKeyboardShortcuts();
    
    console.log("인스타그램 이미지 다운로더 초기화 완료");
  } catch (error) {
    console.error("확장 프로그램 초기화 중 오류:", error);
  }
}

/**
 * DOM 변경 감지를 위한 MutationObserver 설정
 */
function setupMutationObserver() {
  try {
    // DOM 변경 감지 - 새로운 게시물이 로드될 때 버튼 추가
    const observer = new MutationObserver((mutations) => {
      // DOM 변경이 있을 때만 처리 (최적화)
      const shouldUpdate = mutations.some(mutation => {
        return mutation.addedNodes.length > 0 && 
               Array.from(mutation.addedNodes).some(node => 
                 node.nodeType === Node.ELEMENT_NODE && 
                 (node.tagName === 'ARTICLE' || 
                  node.querySelector('article, div[role="dialog"]')));
      });
      
      if (shouldUpdate) {
        createDownloadButtons();
      }
    });
    
    // body와 하위 요소의 변경 감지
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
    
    console.log("DOM 변경 감지 활성화됨");
  } catch (error) {
    console.error("MutationObserver 설정 중 오류:", error);
  }
}

/**
 * URL 변경 감지 설정
 */
function setupURLChangeDetection() {
  try {
    let lastUrl = location.href;
    
    // URL 변경 감지용 옵저버
    const urlObserver = new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        console.log(`URL 변경: ${lastUrl} → ${currentUrl}`);
        lastUrl = currentUrl;
        
        // URL 변경 감지 시 처리
        handleURLChange(currentUrl);
      }
    });
    
    // URL 변경 감지 설정
    urlObserver.observe(document, { 
      subtree: true, 
      childList: true 
    });
    
    console.log("URL 변경 감지 활성화됨");
  } catch (error) {
    console.error("URL 변경 감지 설정 중 오류:", error);
  }
}

/**
 * URL 변경 시 처리 함수
 * @param {string} url - 현재 URL
 */
function handleURLChange(url) {
  try {
    // URL 분석
    const urlAnalysis = analyzeInstagramUrl(url);
    
    // 지연 실행으로 인스타그램 콘텐츠가 로드될 시간 확보
    setTimeout(() => {
      console.log("URL 변경 후 버튼 초기화");
      createDownloadButtons();
      
      // 게시물 페이지면 다운로드 버튼 추가 시도
      if (urlAnalysis.isPostPage) {
        console.log(`게시물 페이지 감지: ${urlAnalysis.pattern} 패턴`);
        
        // 다단계 시도로 안정성 향상 (점진적으로 시도)
        const retryTimes = [500, 1500, 3000];
        retryTimes.forEach(delay => {
          setTimeout(() => {
            addPostPageDownloadButton();
          }, delay);
        });
      }
    }, 1000);
  } catch (error) {
    console.error("URL 변경 처리 중 오류:", error);
  }
}

/**
 * 초기 페이지 로드 시 게시물 페이지 처리
 */
function handleInitialPostPage() {
  try {
    // 현재 URL 분석
    const currentUrl = location.href;
    const urlAnalysis = analyzeInstagramUrl(currentUrl);
    
    // 게시물 페이지면 다운로드 버튼 추가 시도
    if (urlAnalysis.isPostPage) {
      console.log(`초기 로드: 게시물 페이지 감지 (${urlAnalysis.pattern} 패턴)`);
      
      // 여러 시간 간격으로 다중 시도 (DOM이 완전히 로드될 때까지)
      const retryTimes = [500, 1000, 2000, 3500, 5000];
      retryTimes.forEach(delay => {
        setTimeout(() => {
          addPostPageDownloadButton();
        }, delay);
      });
    }
  } catch (error) {
    console.error("초기 게시물 페이지 처리 중 오류:", error);
  }
}

/**
 * 키보드 단축키 설정
 */
function setupKeyboardShortcuts() {
  try {
    // 키보드 단축키 지원 (Alt+D)
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.key === 'd') {
        console.log("단축키 감지: Alt+D");
        
        // 현재 보이는 첫 번째 게시물의 다운로드 버튼 클릭
        const firstDownloadBtn = document.querySelector(".ig-download-btn");
        if (firstDownloadBtn) {
          firstDownloadBtn.click();
        } else {
          console.log("다운로드 버튼을 찾을 수 없습니다");
          
          // 버튼이 없으면 페이지에 따라 버튼 생성 시도
          createDownloadButtons();
          setTimeout(() => {
            const newBtn = document.querySelector(".ig-download-btn");
            if (newBtn) {
              newBtn.click();
            } else {
              // 사용자에게 알림
              if (typeof showToast === 'function') {
                showToast("다운로드할 미디어를 찾을 수 없습니다");
              }
            }
          }, 500);
        }
      }
    });
    
    console.log("키보드 단축키 활성화됨 (Alt+D)");
  } catch (error) {
    console.error("키보드 단축키 설정 중 오류:", error);
  }
}

// 페이지 로드 완료 시 실행
window.addEventListener("load", () => {
  console.log("인스타그램 이미지 다운로더가 로드되었습니다");
  
  // 버튼 생성 지연 실행 (인스타그램 컨텐츠 로딩 대기)
  setTimeout(initializeExtension, 1500);
});

// 콘솔 메시지
console.log("인스타그램 이미지 다운로더 v0.46.0 로딩 중...");