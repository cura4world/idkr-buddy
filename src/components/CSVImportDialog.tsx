import { useState, useRef } from "react";
import { importWordsFromCSV } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export default function CSVImportDialog({ open, onOpenChange, onImported }: CSVImportDialogProps) {
  const [csv, setCsv] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCsv((ev.target?.result as string) || "");
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!csv.trim()) return;
    const result = importWordsFromCSV(csv);
    toast.success(`${result.imported}개 단어를 가져왔습니다.`, {
      description: result.errors > 0 ? `${result.errors}개 행을 건너뛰었습니다.` : undefined,
    });
    setCsv("");
    onImported();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto bg-card">
        <DialogHeader>
          <DialogTitle className="font-body">CSV 가져오기</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground font-body">
            형식: 단어, 뜻, 발음, 카테고리(선택)
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFile}
            className="hidden"
          />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => fileRef.current?.click()}
          >
            파일 선택
          </Button>
          <Textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={"Selamat pagi, 좋은 아침, 슬라맛 빠기, 인사\nTerima kasih, 감사합니다, 뜨리마 까시, 인사"}
            rows={6}
            className="text-sm font-body"
          />
          <Button onClick={handleImport} className="w-full" disabled={!csv.trim()}>
            가져오기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
