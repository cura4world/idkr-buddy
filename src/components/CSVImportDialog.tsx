import { useState, useRef } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { importWordsFromCSV } from "@/lib/store";
import { toast } from "sonner";
import { useBackClose } from "@/hooks/useBackClose";
import FormSheet, { FORM_C, FORM_FIELD_CLASS, FormLabel, FormPrimaryButton } from "@/components/FormSheet";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
  categoryId?: string;
}

// 2026-11-13 사용자 요청: 새 입력 시트(FormSheet) 디자인. 파일 고르기는 점선 상자(아이콘 + "파일 고르기" + 형식 안내 한 줄).
// 가져오기 기능·검증은 그대로입니다. SettingsDialog 에서 부를 때도 같은 모양입니다.
export default function CSVImportDialog({ open, onOpenChange, onImported, categoryId }: CSVImportDialogProps) {
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // 폰의 뒤로가기는 이 창만 닫습니다(화면을 떠나지 않음)
  useBackClose(open, () => onOpenChange(false));

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    // UTF-8 로 먼저 읽고, 깨진 글자(U+FFFD)가 있으면 엑셀의 기본 저장 형식(한국어 윈도우 = EUC-KR)으로 다시 읽습니다.
    // 엑셀에서 "CSV(쉼표로 분리)"로 저장한 파일은 UTF-8 이 아니라서 한글이 모두 깨져 들어갔습니다(출시 전 점검 D-06).
    const BROKEN = String.fromCharCode(0xFFFD);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) || "";
      if (text.indexOf(BROKEN) < 0) {
        setCsv(text);
        return;
      }
      const again = new FileReader();
      again.onload = (ev2) => {
        const t2 = (ev2.target?.result as string) || "";
        if (t2.indexOf(BROKEN) < 0) setCsv(t2);
        else {
          setCsv("");
          setFileName("");
          toast("파일의 글자를 읽지 못했습니다. UTF-8 로 저장한 CSV 파일을 골라 주세요");
        }
      };
      again.onerror = () => setCsv(text);
      try {
        again.readAsText(file, "euc-kr");
      } catch (e) {
        setCsv(text);
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const handleImport = () => {
    if (!csv.trim()) return;
    const result = importWordsFromCSV(csv, categoryId);
    if (!result.saved) {
      toast("저장하지 못했습니다. 폰의 저장 공간을 확인해 주세요");
      return;
    }
    const notes: string[] = [];
    if (result.skipped > 0) notes.push(`이미 있는 단어 ${result.skipped}개는 넣지 않았습니다.`);
    if (result.errors > 0) notes.push(`${result.errors}개 행을 건너뛰었습니다.`);
    toast.success(`${result.imported}개 단어를 가져왔습니다.`, {
      description: notes.length > 0 ? notes.join(" ") : undefined,
    });
    setCsv("");
    setFileName("");
    onImported();
    onOpenChange(false);
  };

  return (
    <FormSheet
      open={open}
      onClose={() => onOpenChange(false)}
      title="CSV 가져오기"
      desc="엑셀·CSV 파일의 단어를 한 번에 넣으세요"
      icon={<FileSpreadsheet size={20} strokeWidth={1.8} />}
      tileBg="#E4EEF6"
      tileInk="#2B5F86"
      footer={
        <FormPrimaryButton onClick={handleImport} disabled={!csv.trim()} muted={!csv.trim()}>
          가져오기
        </FormPrimaryButton>
      }
    >
      <input ref={fileRef} type="file" accept="text/csv,text/comma-separated-values,text/plain,.csv,.txt" onChange={handleFile} className="hidden" />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="w-full rounded-2xl flex flex-col items-center gap-1 px-4 py-4 active:opacity-80"
        style={{ border: "1.5px dashed #B9C6CC", background: "#FAFBFB" }}
      >
        <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "#E4EEF6", color: "#2B5F86" }}>
          <Upload size={17} strokeWidth={1.9} />
        </span>
        <span className="mt-0.5 max-w-full truncate font-gothic text-[0.875rem] font-semibold" style={{ color: FORM_C.txt }}>
          {fileName || "파일 고르기"}
        </span>
        <span className="font-gothic text-[0.75rem]" style={{ color: FORM_C.sub }}>
          형식: 단어, 뜻, 예문, 예문 뜻, 단어장 이름(선택)
        </span>
      </button>
      {/* 2026-11-13 사용자 요청: 단어 추가·단어장 만들기 시트와 시트 윗끝이 비슷한 높이에 오도록, 붙여 넣는 칸을 9줄로 키움
          (5줄일 때는 시트가 125px 낮아 + 메뉴에서 멀리 아래에 갑자기 생겼음). 칸이 줄 수로 커지므로 글자 크기가 바뀌어도 함께 따라갑니다. */}
      <div>
        <FormLabel hint="직접 붙여 넣어도 됩니다">내용</FormLabel>
        <div className={FORM_FIELD_CLASS} style={{ minHeight: 66 }}>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={"Selamat pagi, 좋은 아침, Selamat pagi apa kabar?, 좋은 아침 어떻게 지내세요?, 인사"}
            rows={9}
            className="flex-1 min-w-0 resize-none bg-transparent outline-none font-body text-[0.875rem] leading-[1.5] py-[9px]"
            style={{ color: FORM_C.txt }}
          />
        </div>
      </div>
    </FormSheet>
  );
}
