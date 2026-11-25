#!/usr/bin/env python
# .claude/hooks/guard_command.py — PreToolUse(Bash·PowerShell) 작업 규칙 지키기 (2026-11-25)
#
# CLAUDE.md 의 편집·커밋 규칙을 어기는 명령을 실행 전에 막습니다(exit 2 + 한국어 이유).
#   · heredoc(<<EOF · <<'EOF' · <<-"EOF")          → 편집·스크립트는 Write/Edit 도구로
#   · sed -i · sed --in-place · perl -pi           → 파일 수정은 Edit 도구로
#   · git add -A · --all · .   · git commit -a/-am → 바꾼 파일을 경로로 지정해 git add
#   · git add -f · --force                         → 무시 대상(seed.json·LAB_STATUS 등)은 강제로 담지 않음
#   · git push --force · -f · --force-with-lease · +ref → 강제 push 금지
#   · PowerShell here-string(@' @")으로 파일 쓰기(Set-Content·Add-Content·Out-File·[IO.File]::Write*)
# 따옴표 안의 글자는 보지 않습니다(예: grep -n "<<" 파일, grep "sed -i" CLAUDE.md 는 통과).
# 읽기 전용 명령은 막지 않습니다. 판단 중 오류가 나면 막지 않고 통과시킵니다(세션을 멈추지 않게).
# 표준 라이브러리만 씁니다. 윈도우·리눅스 공통.

import json
import re
import sys

HEREDOC_RE = re.compile(r"<<(?!<)-?\s*[A-Za-z_][A-Za-z0-9_]*")
# 따옴표 안에 든 진짜 heredoc(예: git commit -m "$(cat <<'EOF' … EOF)") — 본문 줄과 끝맺음 줄까지 있을 때만
HEREDOC_FULL_RE = re.compile(r"<<-?\s*(['\"]?)([A-Za-z_][A-Za-z0-9_]*)\1[^\n]*\n(?:.*\n)*?[ \t]*\2[ \t]*\)?[ \t\"']*$", re.M)
SEPARATORS_RE = re.compile(r"&&|\|\||[;|\n&]")
SED_INPLACE_RE = re.compile(r"(^|\s)sed\s+(?:[^\s]+\s+)*?(-i\S*|--in-place\S*)(\s|$)")
PERL_INPLACE_RE = re.compile(r"(^|\s)perl\s+(?:[^\s]+\s+)*?-[A-Za-z]*i[A-Za-z.]*(\s|$)")
PS_HERESTRING_RE = re.compile(r"@['\"]\s*(\r?\n|$)")
PS_FILEWRITE_RE = re.compile(r"Set-Content|Add-Content|Out-File|\[(System\.)?IO\.File\]::Write", re.IGNORECASE)


def strip_quoted(cmd: str) -> str:
    """따옴표 안 글자를 지웁니다(따옴표 자체는 남김). heredoc 구분자의 따옴표('EOF')는 미리 풀어 둡니다."""
    # <<'EOF' · <<"EOF" · <<-'EOF' → <<EOF (따옴표 안으로 사라지지 않게)
    cmd = re.sub(r"<<(-?)\s*(['\"])([A-Za-z_][A-Za-z0-9_]*)\2", r"<<\1\3", cmd)
    out = []
    quote = ""
    i = 0
    while i < len(cmd):
        ch = cmd[i]
        if quote:
            if ch == "\\" and quote == '"' and i + 1 < len(cmd):
                i += 2
                continue
            if ch == quote:
                out.append(ch)
                quote = ""
        else:
            if ch == "\\" and i + 1 < len(cmd):
                out.append(" ")
                i += 2
                continue
            if ch in ("'", '"'):
                quote = ch
            out.append(ch)
        i += 1
    return "".join(out)


def git_args(tokens):
    """['git', ...] 에서 (하위 명령, 그 뒤 인자들). git 이 아니면 None."""
    if not tokens:
        return None
    head = tokens[0].lower()
    if head not in ("git", "git.exe"):
        return None
    i = 1
    while i < len(tokens):
        t = tokens[i]
        if t in ("-C", "-c", "--git-dir", "--work-tree", "--namespace"):
            i += 2
            continue
        if t.startswith("-"):
            i += 1
            continue
        return t, tokens[i + 1:]
    return None


def short_flag_has(arg: str, letter: str) -> bool:
    return arg.startswith("-") and not arg.startswith("--") and letter in arg[1:]


def check_git(tokens):
    ga = git_args(tokens)
    if not ga:
        return None
    sub, args = ga
    if sub == "add":
        for a in args:
            if a in ("-f", "--force") or short_flag_has(a, "f"):
                return "git add -f 금지 — seed.json·LAB_STATUS 같은 무시 대상은 강제로 담지 않습니다(CLAUDE.md 금지 사항)."
        for a in args:
            if a in ("-A", "--all", "--no-ignore-removal", ".", "./", "''", '""') or short_flag_has(a, "A"):
                return "git add -A / --all / . 금지 — 바꾼 파일을 경로로 지정해 git add <경로> 로 담으세요(CLAUDE.md 금지 사항)."
    if sub == "commit":
        for a in args:
            if a == "--all" or short_flag_has(a, "a"):
                return "git commit -a(-am) 금지 — 바꾼 파일을 경로로 지정해 git add 한 뒤 커밋하세요(CLAUDE.md 금지 사항)."
    if sub == "push":
        for a in args:
            if a in ("-f", "--force") or a.startswith("--force-with-lease") or a.startswith("--force-if-includes") or short_flag_has(a, "f"):
                return "강제 push 금지 — 원격 기록을 덮어쓰지 않습니다(CLAUDE.md 배포 방식). 막힌 까닭을 먼저 보고하세요."
            if a.startswith("+") and len(a) > 1:
                return "강제 push 금지 — '+브랜치' 형태도 강제 push 입니다(CLAUDE.md 배포 방식)."
    return None


def check(cmd: str):
    """막을 이유(한국어) 또는 None."""
    raw = cmd or ""
    # PowerShell here-string 으로 파일 쓰기 — here-string 은 여러 줄 글이라 따옴표를 지우기 전에 봅니다
    if PS_HERESTRING_RE.search(raw) and PS_FILEWRITE_RE.search(raw):
        return ("PowerShell here-string(@' '@)으로 파일을 쓰지 않습니다 — 파일 내용은 Write/Edit 도구로 쓰세요"
                "(커밋 메시지는 저장소 밖 파일에 Write 로 쓰고 git commit -F).")
    s = strip_quoted(raw)
    if HEREDOC_RE.search(s) or HEREDOC_FULL_RE.search(raw):
        return ("heredoc(<<EOF) 금지 — 편집·스크립트는 Write/Edit 도구로. 스크립트가 필요하면 저장소 밖(scratchpad)에 Write 로 만들어 "
                "python <파일> 로 실행하세요(heredoc 이 백슬래시를 먹은 사고, CLAUDE.md 작업 절차 3).")
    if SED_INPLACE_RE.search(s):
        return "sed -i 금지 — 파일 수정은 Edit 도구로 하세요(CLAUDE.md 작업 절차 3)."
    if PERL_INPLACE_RE.search(s):
        return "perl -pi 금지 — 파일 수정은 Edit 도구로 하세요(CLAUDE.md 작업 절차 3)."
    for part in SEPARATORS_RE.split(s):
        tokens = part.split()
        # 앞에 붙은 환경 변수(VAR=값)·cmd //c 따위는 건너뜀
        while tokens and ("=" in tokens[0] and not tokens[0].startswith("-") or tokens[0].lower() in ("cmd", "//c", "/c", "&", "time", "command")):
            tokens = tokens[1:]
        why = check_git(tokens)
        if why:
            return why
    return None


def main() -> int:
    try:
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    try:
        data = json.loads(sys.stdin.buffer.read().decode("utf-8", "replace") or "{}")
        tool_input = data.get("tool_input") or {}
        cmd = tool_input.get("command") or ""
        why = check(str(cmd))
    except Exception:
        return 0
    if why:
        sys.stderr.write("[작업 규칙 훅] " + why + "\n")
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
