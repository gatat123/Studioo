# MCP Windows 설정 완료 가이드

## ✅ 수정 완료
PowerShell 래퍼를 사용하여 Windows에서 MCP 서버들이 정상 작동하도록 수정했습니다.

### 변경 내용
- **이전**: `"command": "npx"` - Windows에서 불안정
- **수정**: `"command": "powershell.exe"` with `-NoProfile -Command "npx -y ..."` - 안정적 실행

### 설정 파일 위치
```
C:\Users\a0109\AppData\Roaming\Claude\claude_desktop_config.json
```

## 🚀 적용 방법

### 1. Claude Desktop 완전 종료
- 시스템 트레이에서 Claude 아이콘 우클릭 → 종료
- 또는 작업 관리자에서 Claude 관련 프로세스 모두 종료

### 2. Claude Code 재시작
```bash
# 터미널에서
claude
```

### 3. MCP 서버 확인
```
/mcp
```

## 📋 추가된 MCP 서버들

| MCP 서버 | 용도 |
|---------|-----|
| npm-mcp | NPM 패키지 관리 |
| ruff-mcp | Python 린팅 |
| code-checker-mcp | 코드 품질 검사 |
| sourcesage-mcp | 코드베이스 분석 |
| figma-context-mcp | Figma 연동 |
| daisyui-mcp | DaisyUI 컴포넌트 |

## 🧪 테스트 명령어

개별 MCP 서버 테스트:
```powershell
# ESLint MCP 테스트
powershell.exe -NoProfile -Command "npx -y @eslint/mcp --version"

# GitHub MCP 테스트
powershell.exe -NoProfile -Command "npx -y @modelcontextprotocol/server-github --version"
```

## ⚠️ 주의사항

1. **보안**: API 키들이 노출되어 있으니 새로운 키 발급을 권장합니다
2. **메모리**: 필요없는 MCP 서버는 비활성화하여 메모리 사용량 최적화
3. **경로**: 파일 경로에 공백이 있을 경우 작은따옴표로 감싸기

## 🔍 문제 해결

MCP 서버가 여전히 인식되지 않는 경우:

1. Node.js 재설치 확인
```bash
node --version  # v18 이상 필요
npm --version   # v9 이상 필요
```

2. npm 캐시 정리
```bash
npm cache clean --force
```

3. Claude Desktop 재설치
- 설정 파일은 백업 후 재설치

## ✨ 성공 지표

`/mcp` 명령 실행 시 다음과 같이 표시되면 성공:
```
Available MCP servers:
• filesystem
• github
• eslint-mcp
• context7
• brave-search
... (등등)
```

---
문제가 계속되면 다음을 확인하세요:
1. Windows Defender/백신이 npx 실행을 차단하는지
2. PowerShell 실행 정책이 제한되어 있는지
3. Node.js가 PATH에 제대로 등록되어 있는지