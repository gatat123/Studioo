# MCP (Model Context Protocol) 설정 가이드

## 개요
이 프로젝트는 Claude Desktop의 MCP 서버들과 통합되어 개발 효율성을 극대화합니다.

## 설정된 MCP 서버

### 📝 코드 품질
- **eslint-mcp**: ESLint 자동 수정
- **code-checker-mcp**: 코드 품질 분석
- **sourcesage-mcp**: 코드베이스 구조 분석

### 🎨 UI/UX
- **@21st-dev/magic**: UI 컴포넌트 자동 생성
- **figma-mcp**: Figma 디자인 연동
- **daisyui-mcp**: DaisyUI 컴포넌트

### 📊 성능
- **lighthouse-mcp**: 웹 성능 측정
- **screenshot**: 비주얼 테스팅

### 🔧 개발 도구
- **github**: GitHub 통합
- **npm-mcp**: NPM 패키지 관리
- **context7**: 문서 검색
- **brave-search**: 웹 검색

### 🧠 AI 보조
- **task-master-ai**: 작업 관리
- **claude-memory**: 컨텍스트 유지

## 사용 방법

### 1. MCP 서버 활성화
```bash
# Claude Desktop을 재시작하면 자동으로 .mcp.json 설정이 로드됩니다
```

### 2. 작업별 활용 예시

#### ESLint 자동 수정
```
"모든 ESLint 오류를 자동으로 수정해줘"
```

#### UI 컴포넌트 생성
```
"@21st-dev/magic을 사용해서 대시보드 컴포넌트를 만들어줘"
```

#### 성능 분석
```
"lighthouse-mcp로 현재 페이지의 성능을 측정해줘"
```

#### GitHub PR 생성
```
"github MCP를 사용해서 이 변경사항으로 PR을 만들어줘"
```

## 프로젝트별 메모리
작업 내용은 `.memory/memory.json`에 자동 저장되어 다음 세션에서도 컨텍스트가 유지됩니다.

## 주의사항
- `.mcp.json`에는 API 키가 포함되어 있으므로 절대 커밋하지 마세요
- `.memory/` 디렉토리도 gitignore에 포함되어 있습니다

## 문제 해결

### MCP 서버가 연결되지 않을 때
1. Claude Desktop 재시작
2. `.mcp.json` 파일 확인
3. 필요한 npm 패키지 설치 확인

### 특정 MCP가 작동하지 않을 때
```bash
# 개별 MCP 테스트
npx -y @eslint/mcp
```

## 추가 MCP 설치
새로운 MCP 서버가 필요한 경우 `.mcp.json`에 추가하고 Claude Desktop을 재시작하세요.

## 참고 문서
- [MCP 공식 문서](https://modelcontextprotocol.io)
- [Claude Desktop MCP 가이드](https://docs.anthropic.com/en/docs/claude-code/mcp)