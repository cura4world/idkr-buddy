import { useState, useEffect } from "react";
import { addWord, getCategories } from "@/lib/store";
import { fillWordWithGemini, hasGeminiApiKey } from "@/lib/gemini";
import { ChevronDown, Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useBackClose } from "@/hooks/useBackClose";
import { aiErrorToast } from "@/lib/aiErrors";
import FormSheet, { FORM_C, FORM_FIELD_CLASS, FORM_INPUT_CLASS, FormLabel, FormPrimaryButton } from "@/components/FormSheet";
import { CategoryGlyph } from "@/components/CategoryIcon";

interface AddWordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategoryId?: string;
  categoryId?: string;
  onAdded: (newWordId: string) => void;
}

// 2026-11-13 사용자 요청: 새 입력 시트(FormSheet) 디자인으로 다시 만듦. 기능·검증·저장은 그대로입니다.
export default function AddWordDialog({ open, onOpenChange, defaultCategoryId, categoryId: categoryIdProp, onAdded }: AddWordDialogProps) {
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [exampleMeaning, setExampleMeaning] = useState("");
  const [categoryId, setCategoryId] = useState(categoryIdProp || defaultCategoryId || "");
  const [filling, setFilling] = useState(false);
  const categories = getCategories();
  const canAutoFill = hasGeminiApiKey();

  useEffect(() => {
    if (open) setCategoryId(categoryIdProp || defaultCategoryId || "");
  }, [open, categoryIdProp, defaultCategoryId]);

  // 폰의 뒤로가기는 이 창만 닫습니다(화면을 떠나지 않음)
  useBackClose(open, () => onOpenChange(false));

  const handleAutoFill = async () => {
    if (!word.trim()) {
      toast("먼저 인도네시아어 단어를 입력하세요");
      return;
    }
    setFilling(true);
    try {
      const result = await fillWordWithGemini(word);
      if (result.meaning) setMeaning(result.meaning);
      if (result.example) setExample(result.example);
      if (result.exampleMeaning) setExampleMeaning(result.exampleMeaning);
      toast("자동 채우기 완료 (내용을 확인하세요)");
    } catch (err) {
      const msg = (err as Error)?.message || "";
      // 공개판은 키 설정이 없으므로 aiErrors 가 사용자용 문장으로 바꿉니다(관리자판은 기존 문구).
      if (msg === "INVALID_API_KEY" || msg === "NOT_AVAILABLE") {
        aiErrorToast(msg, "API 키가 올바르지 않습니다. 설정에서 확인하세요");
      } else if (msg === "RATE_LIMIT") {
        toast("잠시 후 다시 시도하세요 (요청 한도)");
      } else if (msg === "NO_API_KEY" || msg === "SESSION_EXPIRED") {
        aiErrorToast(msg, "설정에서 Gemini API 키를 먼저 입력하세요");
      } else if (msg.indexOf("QUOTA") === 0) {
        // 한도·Plus 안내는 aiProxy 가 이미 띄웠습니다
      } else {
        toast("자동 채우기에 실패했습니다");
      }
    } finally {
      setFilling(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !meaning.trim()) return;
    const newWord = addWord({
      word: word.trim(),
      meaning: meaning.trim(),
      example: example.trim(),
      exampleMeaning: exampleMeaning.trim(),
      categoryId: categoryId || categories[0]?.id || "",
    });
    setWord("");
    setMeaning("");
    setExample("");
    setExampleMeaning("");
    onAdded(newWord.id);
    onOpenChange(false);
  };

  const selectedCat = categories.find((c) => c.id === categoryId) || null;
  const canSubmit = !!word.trim() && !!meaning.trim();

  return (
    <FormSheet
      open={open}
      onClose={() => onOpenChange(false)}
      title="단어 추가"
      desc="단어와 뜻, 예문을 직접 넣으세요"
      icon={<Plus size={20} strokeWidth={1.8} />}
      tileBg="#DDF0EA"
      tileInk="#2C6D63"
      onSubmit={handleSubmit}
      footer={
        <FormPrimaryButton type="submit" disabled={!canSubmit} muted={!canSubmit}>
          추가하기
        </FormPrimaryButton>
      }
    >
      <div>
        <FormLabel>인도네시아어</FormLabel>
        <div className={FORM_FIELD_CLASS} style={{ minHeight: 44 }}>
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Selamat pagi"
            className={FORM_INPUT_CLASS + " font-word"}
            autoCapitalize="none"
            autoCorrect="off"
            autoFocus
          />
          {canAutoFill ? (
            <button
              type="button"
              onClick={handleAutoFill}
              disabled={filling}
              className="shrink-0 h-7 px-2.5 rounded-full flex items-center gap-1 font-gothic text-[0.75rem] font-semibold disabled:opacity-60"
              style={{ background: FORM_C.tealBg, color: FORM_C.teal }}
            >
              {filling ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} strokeWidth={2} />}
              자동 채우기
            </button>
          ) : null}
        </div>
      </div>

      <div>
        <FormLabel>한국어 뜻</FormLabel>
        <div className={FORM_FIELD_CLASS} style={{ minHeight: 44 }}>
          <input
            value={meaning}
            onChange={(e) => setMeaning(e.target.value)}
            placeholder="좋은 아침"
            className={FORM_INPUT_CLASS + " font-body"}
          />
        </div>
      </div>

      <div>
        <FormLabel hint="선택">예문 (인도네시아어)</FormLabel>
        <div className={FORM_FIELD_CLASS} style={{ minHeight: 44 }}>
          <input
            value={example}
            onChange={(e) => setExample(e.target.value)}
            placeholder="Selamat pagi, apa kabar?"
            className={FORM_INPUT_CLASS + " font-word"}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
      </div>

      <div>
        <FormLabel hint="선택">예문 뜻 (한국어)</FormLabel>
        <div className={FORM_FIELD_CLASS} style={{ minHeight: 44 }}>
          <input
            value={exampleMeaning}
            onChange={(e) => setExampleMeaning(e.target.value)}
            placeholder="좋은 아침, 어떻게 지내세요?"
            className={FORM_INPUT_CLASS + " font-body"}
          />
        </div>
      </div>

      <div>
        <FormLabel>카테고리</FormLabel>
        <div className={"relative " + FORM_FIELD_CLASS} style={{ minHeight: 44 }}>
          {selectedCat ? (
            <span className="shrink-0 flex items-center text-[1rem] leading-none" aria-hidden="true">
              <CategoryGlyph value={selectedCat.emoji} size={17} />
            </span>
          ) : null}
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={FORM_INPUT_CLASS + " appearance-none pr-6 font-body"}
            style={{ color: FORM_C.txt }}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={18}
            strokeWidth={2}
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2"
            style={{ color: FORM_C.sub }}
          />
        </div>
      </div>
    </FormSheet>
  );
}
