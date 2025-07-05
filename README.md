# Instagram Media Downloader

[![Version](https://img.shields.io/badge/version-0.46.4-blue.svg)](https://github.com/jakeshin-cloud/instagramDownloader)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com/webstore)
[![License](https://img.shields.io/badge/license-MIT-orange.svg)](LICENSE)

**인스타그램에서 이미지와 동영상을 쉽게 다운로드하는 Chrome 확장 프로그램입니다.**

## 📋 주요 기능

### 🎯 다운로드 기능
- **단일 미디어 다운로드**: 개별 이미지/동영상 다운로드
- **전체 다운로드**: 게시물의 모든 미디어 일괄 다운로드
- **고해상도 품질**: 원본 품질로 다운로드 지원
- **다양한 형식 지원**: JPG, PNG, MP4 등 다양한 파일 형식

### 🔄 슬라이드 게시물 지원
- **자동 슬라이드 수집**: 여러 이미지/동영상이 포함된 게시물 완전 지원
- **스마트 미디어 탐지**: 모든 슬라이드의 미디어 자동 수집
- **중복 제거**: 같은 미디어 중복 다운로드 방지

### 🎨 사용자 친화적 UI
- **직관적인 인터페이스**: 간편한 원클릭 다운로드
- **미디어 미리보기**: 다운로드 전 미디어 확인 가능
- **네비게이션**: 슬라이드 간 쉬운 이동

### 🌐 다양한 URL 패턴 지원
- `/p/{postId}` - 일반 게시물
- `/{username}/p/{postId}` - 사용자별 게시물
- `/reel/{postId}` - 릴스 게시물
- `/stories/{username}` - 스토리 (부분 지원)
- 사용자 프로필 페이지

## 🚀 설치 방법

### Chrome 웹스토어에서 설치 (권장)
1. [Chrome 웹스토어](https://chrome.google.com/webstore) 방문
2. "Instagram Media Downloader" 검색
3. "Chrome에 추가" 클릭

### 수동 설치 (개발자 모드)
1. 이 저장소를 클론 또는 다운로드
```bash
git clone https://github.com/jakeshin-cloud/instagramDownloader.git
```

2. Chrome 브라우저에서 `chrome://extensions/` 접속
3. 우측 상단의 "개발자 모드" 활성화
4. "압축해제된 확장 프로그램을 로드합니다" 클릭
5. 다운로드한 프로젝트 폴더 선택

## 📖 사용법

### 기본 사용법
1. **Instagram 접속**: 웹 브라우저에서 Instagram 사이트 방문
2. **게시물 찾기**: 다운로드하려는 게시물로 이동
3. **다운로드 버튼 클릭**: 게시물에 나타나는 다운로드 아이콘 클릭
4. **미디어 선택**: 팝업에서 다운로드할 미디어 선택
5. **다운로드 실행**: "다운로드" 또는 "전체 다운로드" 버튼 클릭

### 파일 이름 규칙
다운로드되는 파일명은 다음과 같은 형식으로 생성됩니다:
```
{계정명}({게시물날짜})_{현재월일}_{시분}_{순번}.{확장자}
```

예시: `jakeshin(240415)_0705_1430_01.jpg`

### 지원하는 미디어 타입
- **이미지**: JPG, PNG, WebP
- **동영상**: MP4, MOV
- **슬라이드**: 여러 이미지/동영상이 포함된 게시물

## 🏗️ 프로젝트 구조

```
InstagramDownloader/
├── manifest.json           # Chrome 확장 프로그램 설정
├── content/                # 컨텐츠 스크립트
│   ├── main.js            # 메인 로직
│   ├── utils.js           # 유틸리티 함수
│   ├── media-selector.js  # 미디어 선택기 UI
│   ├── slide-loader.js    # 슬라이드 로더
│   ├── styles.css         # 스타일시트
│   └── init.js            # 초기화 스크립트
├── back/                   # 백업 파일
│   ├── popup.js           # 팝업 스크립트
│   └── 0.41_이미지다운,동영상이미지다운/
│       └── main.js        # 이전 버전 백업
├── icons/                  # 확장 프로그램 아이콘
│   ├── download.png       # 다운로드 아이콘
│   └── icon48.png         # 확장 프로그램 아이콘
└── README.md              # 프로젝트 설명서
```

## 🔧 기술 스택

- **JavaScript (ES6+)**: 메인 로직 구현
- **HTML5 & CSS3**: 사용자 인터페이스
- **Chrome Extension API**: 브라우저 확장 기능
- **Instagram DOM API**: 인스타그램 웹 페이지 분석

## 🛠️ 개발 환경 설정

### 필요사항
- Chrome 브라우저 (버전 88 이상)
- Node.js (선택사항, 개발 도구용)
- Git

### 개발 시작하기
1. 저장소 클론
```bash
git clone https://github.com/jakeshin-cloud/instagramDownloader.git
cd instagramDownloader
```

2. Chrome 확장 프로그램 개발자 모드로 로드
3. 코드 수정 후 확장 프로그램 새로고침
4. Instagram에서 기능 테스트

### 디버깅
- Chrome 개발자 도구 Console 탭에서 로그 확인
- `console.log()` 출력으로 동작 상태 모니터링
- 네트워크 탭에서 미디어 URL 요청 확인

## 📋 버전 히스토리

### v0.46.4 (2024-07-05)
- 코드 리팩토링 및 최적화
- 다양한 URL 패턴 지원 확장
- UI 개선 및 다운로드 안정성 향상
- 직접 다운로드 기능 개선

### v0.41 (2024-04-15)
- 슬라이드 넘기기 기능 개선
- 동영상 다운로드 지원 강화
- 중복 제거 기능 추가

### v0.32 (초기 버전)
- 기본 이미지 다운로드 기능
- 게시물 인식 기능

## 🤝 기여하기

### 이슈 리포트
버그 발견 시 [Issues](https://github.com/jakeshin-cloud/instagramDownloader/issues) 페이지에 다음 정보와 함께 제보해주세요:
- 브라우저 버전
- 확장 프로그램 버전
- 발생한 오류 메시지
- 재현 방법

### 개발 참여
1. 이 저장소를 Fork
2. 새로운 기능 브랜치 생성 (`git checkout -b feature/새기능`)
3. 변경사항 커밋 (`git commit -am '새 기능 추가'`)
4. 브랜치에 푸시 (`git push origin feature/새기능`)
5. Pull Request 생성

## ⚖️ 라이센스

이 프로젝트는 MIT 라이센스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🚨 주의사항

- 이 확장 프로그램은 개인적인 용도로만 사용하세요
- 저작권이 있는 콘텐츠 다운로드 시 주의하세요
- Instagram의 서비스 약관을 준수하세요
- 상업적 사용 시 적절한 허가를 받으세요

## 📞 문의

- **개발자**: Instagram Media Downloader Team
- **GitHub**: [https://github.com/jakeshin-cloud/instagramDownloader](https://github.com/jakeshin-cloud/instagramDownloader)

---

⭐ 이 프로젝트가 도움이 되었다면 Star를 눌러주세요! 