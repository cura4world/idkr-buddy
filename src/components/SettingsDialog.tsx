import { useState, useEffect } from "react";
import { getGeminiApiKey, setGeminiApiKey } from "@/lib/gemini";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    if (open) setApiKey(getGeminiApiKey());
  }, [open]);

  const handleSave = () => {
    setGeminiApiKey(apiKey);
    toast(apiKey.trim() ? "API 키가 저장되었습니다" : "API 키가 삭제되었습니다");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto bg-card">
        <DialogHeader>
          <DialogTitle className="font-body text-gray-900">설정</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
