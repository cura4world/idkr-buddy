import { useState, useEffect } from "react";
import { updateWord, Word, deleteWord } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  word: Word | null;
  onUpdated: () => void;
}

export default function EditWordDialog({ open, onOpenChange, word, onUpdated }: Props) {
  const [wordText, setWordText] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [exampleMeaning, setExampleMeaning] = useState("");

  useEffect(() => {
    if (word) {
      setWordText(word.word);
      setMeaning(word.meaning);
      setExample(word.example);
      setExampleMeaning(word.exampleMeaning);
    }
  }, [word]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word || !wordText.trim() || !meaning.trim()) return;
    updateWord(word.id, {
      word: wordText.trim(),
      meaning: meaning.trim(),
      example: example.trim(),
      exampleMeaning: exampleMeaning.trim(),
    });
    onUpdated();
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!word) return;
    deleteWord(word.id);
    onUpdated();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto bg-card">
        <DialogHeader>
          <DialogTitle className="font-body">단어 정보</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="font-body text-sm">인도네시아어</Label>
            <Input value={wordText} onChange={(e) => setWordText(e.target.value)} className="mt-1 font-word" autoFocus />
          </div>
          <div>
            <Label className="font-body text-sm">한국어 뜻</Label>
            <Input value={meaning} onChange={(e) => setMeaning(e.target.value)} className="mt-1 font-body" />
          </div>
          <div>
            <Label className="font-body text-sm">예문 (인도네시아어)</Label>
            <Input value={example} onChange={(e) => setExample(e.target.value)} className="mt-1 font-word" />
          </div>
          <div>
            <Label className="font-body text-sm">예문 뜻 (한국어)</Label>
            <Input value={exampleMeaning} onChange={(e) => setExampleMeaning(e.target.value)} className="mt-1 font-body" />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="destructive" className="flex-1" onClick={handleDelete}>
              삭제
            </Button>
            <Button type="submit" className="flex-1">
              저장
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
