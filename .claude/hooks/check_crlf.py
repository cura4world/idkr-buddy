#!/usr/bin/env python
# .claude/hooks/check_crlf.py — PostToolUse(Edit·Write) 줄바꿈 확인 (2026-11-25)
#
# 이 저장소는 LF 입니다. 윈도우에서 도구가 파일을 CRLF 로 다시 써 두는 일이 있어(CLAUDE.md 작업 절차 7),
# 고친 파일에 CR(\r)이 있으면 exit 2 로 알립니다. 파일은 고치지 않습니다(알리기만).
# 저장소 밖 파일(scratchpad·메모 등)과 바이너리는 건너뜁니다. 판단 중 오류가 나면 조용히 통과합니다.
# 표준 라이브러리만 씁니다. 윈도우·리눅스 공통.

import json
import os
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]  # .claude/hooks/ 의 두 단계 위 = 저장소
BINARY_EXT = {
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".mp3", ".wav", ".ogg", ".m4a", ".mp4",
    ".woff", ".woff2", ".ttf", ".otf", ".zip", ".apk", ".aab", ".pdf", ".jar", ".keystore", ".jks",
}


def main() -> int:
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    try:
        data = json.loads(sys.stdin.buffer.read().decode("utf-8", "replace") or "{}")
        tool_input = data.get("tool_input") or {}
        fp = tool_input.get("file_path") or ""
        if not fp:
            return 0
        p = Path(fp)
        if not p.is_absolute():
            p = Path(data.get("cwd") or os.getcwd()) / p
        p = p.resolve()
        try:
            rel = p.relative_to(REPO)
        except ValueError:
            return 0  # 저장소 밖
        if p.suffix.lower() in BINARY_EXT or not p.is_file():
            return 0
        blob = p.read_bytes()
        if b"\0" in blob[:8192]:
            return 0  # 바이너리
        n = blob.count(b"\r")
    except Exception:
        return 0
    if n:
        sys.stderr.write(
            "[작업 규칙 훅] CRLF 가 생겼습니다: " + rel.as_posix() + " (CR " + str(n) + "개). "
            "이 저장소는 LF 입니다 — 커밋 전에 LF 로 되돌리세요(CLAUDE.md 작업 절차 7).\n"
        )
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
