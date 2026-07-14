import { useState, useEffect } from "react";
import { getGeminiApiKey, setGeminiApiKey } from "@/lib/gemini";
import { exportWordsToCSV, getPrivateFolderName, setPrivateFolderName } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CSVImportDialog from "@/components/CSVImportDialog";
import { Copy, Download, Upload, Trash2, Minus, Plus, Type } from "lucide-react";
import { toast } from "sonner";
import { clearStoredImages, countStoredImages } from "@/lib/imageStore";
import { getFontStep, getStepCount, stepFont } from "@/lib/fontScale";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [privateFolder, setPrivateFolder] = useState("");
  const [fontStep, setFontStepState] = useState(2);

  useEffect(() => {
    if (open) {
      setApiKey(getGeminiApiKey());
      setPrivateFolder(getPrivateFolderName());
      setFontStepState(getFontStep());
    }
  }, [open]);

  const changeFont = (delta: number) => {
    setFontStepState(stepFont(delta));
  };

  const handleSave = () => {
    setGeminiApiKey(apiKey);
    toast(apiKey.trim() ? "API 키가 저장되었습니다" : "API 키가 삭제되었습니다");
    onOpenChange(false);
  };

  const handleClearImages = async () => {
    const n = await countStoredImages();
    if (n === 0) {
      toast("저장된 사전 이미지가 없습니다");
      return;
    }
    await clearStoredImages();
    toast(n + "장의 저장된 사전 이미지를 비웠습니다");
  };

  // 개인 단어장 폴더 적용: 저장 후 새로고침해 즉시 동기화
  const handleApplyPrivateFolder = () => {
    setPrivateFolderName(privateFolder);
    toast(privateFolder.trim() ? "개인 단어장을 적용합니다" : "개인 단어장 설정을 해제했습니다");
    setTimeout(() => {
      try { window.location.reload(); } catch (e) {}
    }, 700);
  };

  // 백업: 클립보드 복사 (WebView 앱에서 권장 경로)
  const handleExportCopy = async () => {
    const { csv, count } = exportWordsToCSV();
    if (count === 0) {
      toast("내보낼 단어가 없습니다");
      return;
    }
    try {
      await navigator.clipboard.writeText(csv);
      toast("단어 " + count + "개를 클립보드에 복사했습니다");
    } catch (e) {
      toast("클립보드 복사에 실패했습니다");
    }
  };

  // 백업: 파일 다운로드 (브라우저용)
  const handleExportDownload = () => {
    const { csv, count } = exportWordsToCSV();
    if (count === 0) {
      toast("내보낼 단어가 없습니다");
      return;
    }
    try {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const d = new Date();
      const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
      a.href = url;
      a.download = "kata-kata-backup-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + ".csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      toast("단어 " + count + "개 다운로드를 시작했습니다");
    } catch (e) {
      toast("다운로드에 실패했습니다");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto bg-card">
        <DialogHeader>
          <DialogTitle className="font-body text-gray-900">설정</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="font-body text-sm text-gray-900 flex items-center gap-1.5">
              <Type className="w-4 h-4" /> 글자 크기
            </Label>
            <div className="mt-2 flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => changeFont(-1)}
                disabled={fontStep <= 0}
                aria-label="글자 작게"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <div className="flex-1 flex items-center justify-center gap-1">
                {Array.from({ length: getStepCount() }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === fontStep ? "w-5 bg-primary" : "w-1.5 bg-gray-300"}`}
                  />
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => changeFont(1)}
                disabled={fontStep >= getStepCount() - 1}
                aria-label="글자 크게"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground font-body">
              앱 전체 글자 크기를 조절합니다. 이 기기에만 적용됩니다.
            </p>
          </div>
          <div>
            <Label className="font-body text-sm text-gray-900">Gemini API 키</Label>
            <Input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="mt-1"
            />
            <p className="mt-2 text-xs text-muted-foreground font-body">
              단어 추가 시 뜻과 예문을 자동으로 채우는 데 사용됩니다. 키는 이 기기에만 저장되며, Google AI Studio에서 무료로 발급받을 수 있습니다. 비워두고 저장하면 키가 삭제됩니다.
            </p>
          </div>
          <Button onClick={handleSave} className="w-full">
            저장
          </Button>
          <div className="pt-3 border-t border-border/60">
            <Label className="font-body text-sm text-gray-900">개인 단어장 (선택)</Label>
            <p className="mt-1 text-xs text-muted-foreground font-body">
              GitHub의 data/private/폴더이름 단어장을 이 기기에서만 추가로 불러옵니다. 비워두고 적용하면 해제됩니다.
            </p>
            <div className="flex gap-2 mt-2">
              <Input
                value={privateFolder}
                onChange={(e) => setPrivateFolder(e.target.value)}
                placeholder="폴더 이름"
                autoComplete="off"
                className="flex-1 text-sm"
              />
              <Button type="button" variant="outline" onClick={handleApplyPrivateFolder}>
                적용
              </Button>
            </div>
          </div>
          <div className="pt-3 border-t border-border/60">
            <Label className="font-body text-sm text-gray-900">데이터 백업</Label>
            <p className="mt-1 text-xs text-muted-foreground font-body">
              모든 단어장을 CSV로 백업하고 복원합니다. 앱에서는 파일 저장이 되지 않으니 '복사'를 눌러 메모장이나 메신저에 붙여넣어 보관하세요.
            </p>
            <div className="flex gap-2 mt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={handleExportCopy}>
                <Copy className="w-4 h-4 mr-1.5" />
                복사
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={handleExportDownload}>
                <Download className="w-4 h-4 mr-1.5" />
                파일 저장
              </Button>
            </div>
            <Button type="button" variant="outline" className="w-full mt-2" onClick={() => setImportOpen(true)}>
              <Upload className="w-4 h-4 mr-1.5" />
              CSV 가져오기 (복원)
            </Button>
            <Button type="button" variant="outline" className="w-full mt-2" onClick={handleClearImages}>
              <Trash2 className="w-4 h-4 mr-1.5" />
              저장된 사전 이미지 비우기
            </Button>
          </div>
        </div>
        <CSVImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={() => {}} />
      </DialogContent>
    </Dialog>
  );
}
