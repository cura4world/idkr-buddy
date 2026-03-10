import { useState } from "react";
import { addWord, getCategories } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddWordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategoryId?: string;
  onAdded: () => void;
}

export default function AddWordDialog({ open, onOpenChange, defaultCategoryId, onAdded }: AddWordDialogProps) {
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [categoryId, setCategoryId] = useState(defaultCategoryId || "");
  const categories = getCategories();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !meaning.trim()) return;
    addWord({
      word: word.trim(),
      meaning: meaning.trim(),
      pronunciation: pronunciation.trim(),
      categoryId: categoryId || categories[0]?.id || "",
    });
    setWord("");
    setMeaning("");
    setPronunciation("");
    onAdded();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto bg-card">
        <DialogHeader>
          <DialogTitle className="font-body">새 단어 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="font-body text-sm">인도네시아어</Label>
            <Input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder="Selamat pagi"
              className="mt-1 font-word"
              autoFocus
            />
          </div>
          <div>
            <Label className="font-body text-sm">한국어 뜻</Label>
            <Input
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              placeholder="좋은 아침"
              className="mt-1 font-body"
            />
          </div>
          <div>
            <Label className="font-body text-sm">발음</Label>
            <Input
              value={pronunciation}
              onChange={(e) => setPronunciation(e.target.value)}
              placeholder="슬라맛 빠기"
              className="mt-1 font-body"
            />
          </div>
          <div>
            <Label className="font-body text-sm">카테고리</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.emoji} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full">
            추가하기
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
