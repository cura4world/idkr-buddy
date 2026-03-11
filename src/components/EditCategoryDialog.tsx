import { useState, useEffect } from "react";
import { updateCategory } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  categoryId: string;
  currentName: string;
  currentEmoji: string;
}

const emojis = [
  "📚", "✈️", "🏠", "💼", "🎵", "🛒", "💬", "🌏",
  "👋", "🍜", "🔢", "☀️", "❤️", "⭐", "🎮", "🏃",
  "🐱", "🌸", "🎨", "📱", "🚗", "🏫", "🏥", "⚽",
  "🎬", "📖", "🧳", "🍕", "☕", "🌙", "🔥", "💡",
  "🎓", "💪", "🧠", "🗣️", "✍️", "🛫", "🏖️", "🎉",
  "🐶", "🐻", "🦁", "🐸", "🦋", "🌺", "🌴", "🍎",
  "🍰", "🎂", "🍷", "🥤", "🏀", "🎾", "🏈", "🎯",
  "🎪", "🎭", "🎤", "🎧", "📷", "🔑", "💎", "👑",
  "🌈", "⚡", "❄️", "🌊", "🏔️", "🌻", "🍀", "🌵",
  "🦄", "🐧", "🐼", "🦊", "🐝", "🐳", "🦀", "🐙",
  "🚀", "🛸", "⛵", "🚲", "🏍️", "🚁", "🚂", "⛺",
  "🗽", "🗼", "🏰", "⛩️", "💊", "🔬", "🧪", "📐",
  "🧩", "🎲", "♟️", "🪁",
  // 기독교 관련
  "✝️", "⛪", "🙏", "📿", "🕊️", "👼", "😇", "🕯️",
  "📖", "🔔", "💒", "🌟", "✨", "🫒", "🍞", "🍇",
  "⭐", "🐑", "🐟", "🪽",
];

export default function EditCategoryDialog({ open, onOpenChange, onUpdated, categoryId, currentName, currentEmoji }: Props) {
  const [name, setName] = useState(currentName);
  const [emoji, setEmoji] = useState(currentEmoji);

  useEffect(() => {
    setName(currentName);
    setEmoji(currentEmoji);
  }, [currentName, currentEmoji]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateCategory(categoryId, name.trim(), emoji);
    onUpdated();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto bg-card">
        <DialogHeader>
          <DialogTitle className="font-body">카테고리 수정</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="font-body text-sm">이름</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" autoFocus />
          </div>
          <div>
            <Label className="font-body text-sm">아이콘</Label>
            <ScrollArea className="h-40 mt-1 rounded-md border">
              <div className="flex gap-2 flex-wrap p-2">
                {emojis.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={`text-2xl p-1 rounded-md transition-colors ${emoji === e ? "bg-primary/10" : "hover:bg-muted"}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
          <Button type="submit" className="w-full">저장</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
