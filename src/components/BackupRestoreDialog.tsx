// src/components/BackupRestoreDialog.tsx
// 백업 파일 불러오기 — 백업 파일(.json)을 고르거나, '복사'로 보관해 둔 글을 붙여넣어 이 기기에 합칩니다.
// 덮어쓰지 않고 합치므로 같은 백업을 두 번 넣어도 단어가 두 번 생기지 않습니다.

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  PersonalBundle,
  parseBackupBytes,
  parseBackupText,
  applyBundle,
  summarize,
  describeSummary,
} from "@/lib/transfer";
import { isStoreApp } from "@/lib/platform";
import { useBackClose } from "@/hooks/useBackClose";

interface BackupRestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BackupRestoreDialog({ open, onOpenChange }: BackupRestoreDialogProps) {
  const [text, setText] = useState("");
  const [bundle, setBundle] = useState<PersonalBundle | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // 공개판에는 '복사'가 없고 버튼 이름이 "백업 파일 저장"입니다(내 정보 > 새 폰으로 옮기기)
  const storeApp = isStoreApp();

  // 폰의 뒤로가기는 이 창만 닫습니다(화면을 떠나지 않음)
  useBackClose(open, () => onOpenChange(false));

  useEffect(() => {
    if (open) {
      setText("");
      setBundle(null);
      setMsg("");
      setBusy(false);
    }
  }, [open]);

  const showParsed = (b: PersonalBundle | null) => {
    if (!b) {
      setBundle(null);
      setMsg("백업 내용을 알아보지 못했습니다. Kata kata에서 저장·복사한 백업인지 확인해 주세요");
      return;
    }
    const s = summarize(b);
    const any = s.words + s.categories + s.saved + s.highlights + s.prayers + s.ink + s.medali + s.phrases +
      (s.stories || 0) + (s.scenes || 0) > 0 ||
      Object.keys(b.ls).length > 0;
    setBundle(any ? b : null);
    setMsg(any ? "" : "백업에 옮길 내용이 없습니다");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const buf = reader.result as ArrayBuffer;
        showParsed(await parseBackupBytes(new Uint8Array(buf)));
        setText("");
      } catch (err) {
        showParsed(null);
      }
    };
    reader.onerror = () => showParsed(null);
    reader.readAsArrayBuffer(file);
  };

  const handleTextChange = (v: string) => {
    setText(v);
    if (!v.trim()) { setBundle(null); setMsg(""); return; }
    showParsed(parseBackupText(v));
  };

  const handleApply = async () => {
    if (!bundle || busy) return;
    setBusy(true);
    try {
      const r = await applyBundle(bundle);
      toast("불러왔습니다 — 새로 들어간 단어 " + r.words + "개" + (r.categories > 0 ? ", 단어장 " + r.categories + "개" : "") +
        ((r.skipped || 0) > 0 ? " (이미 있는 단어 " + r.skipped + "개는 넣지 않음)" : ""));
      setTimeout(() => { window.location.reload(); }, 1200);
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      toast(m === "SAVE_FAILED" ? "저장하지 못했습니다. 폰의 저장 공간을 확인해 주세요" : "불러오지 못했습니다. 파일을 다시 골라 주세요");
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto bg-card">
        <DialogHeader>
          <DialogTitle className="font-body text-gray-900">백업 파일 불러오기</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-muted-foreground font-gothic">
            {storeApp
              ? "'백업 파일 저장'으로 받은 파일을 고르세요. 지금 있는 것은 지우지 않고 합칩니다."
              : "'파일 저장'으로 받은 백업 파일을 고르거나, '복사'로 보관해 둔 글을 아래에 붙여넣으세요. 지금 있는 것은 지우지 않고 합칩니다."}
          </p>
          <input
            ref={fileRef}
            type="file"
            // 종류(MIME)를 앞에 둡니다 — 확장자가 맨 앞이면 안드로이드 웹뷰가 선택 창의 종류를 잘못 잡아
            // 파일이 회색(선택 불가)으로 나올 수 있습니다(출시 전 점검 D-02). 옮겨 온 파일은 종류가 octet-stream 일 수도 있습니다.
            accept="application/json,text/plain,text/csv,application/octet-stream,.json,.csv,.txt"
            onChange={handleFile}
            className="hidden"
          />
          <Button variant="outline" className="w-full text-xs" disabled={busy} onClick={() => fileRef.current?.click()}>
            백업 파일 고르기
          </Button>
          {storeApp ? null : (
            <Textarea
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="또는 여기에 붙여넣기"
              rows={4}
              className="text-xs font-body"
              disabled={busy}
            />
          )}
          {bundle ? (
            <p className="rounded-md border border-border bg-muted px-3 py-2 text-xs leading-relaxed text-gray-900 font-gothic">
              {describeSummary(summarize(bundle))}
            </p>
          ) : null}
          {msg ? <p className="text-xs leading-relaxed text-red-500 font-gothic">{msg}</p> : null}
          <Button onClick={handleApply} className="w-full" disabled={!bundle || busy}>
            {busy ? "불러오는 중..." : "이 기기에 합치기"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
