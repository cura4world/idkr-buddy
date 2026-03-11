import { useState } from "react";
import { addCategory } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
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
];

export default function AddCategoryDialog({ open, onOpenChange, onAdded }: Props) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📚");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addCategory(name.trim(), emoji);
    setName("");
    onAdded();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto bg-card">
        <DialogHeader>
          <DialogTitle className="font-body">새 카테고리</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="font-body text-sm">이름</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="여행" className="mt-1" autoFocus />
          </div>
          <div>
            <Label className="font-body text-sm">아이콘</Label>
            <div className="flex gap-2 mt-1 flex-wrap">
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
          </div>
          <Button type="submit" className="w-full">만들기</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
