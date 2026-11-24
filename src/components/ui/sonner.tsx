import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { useAnySheetOpen } from "@/components/sheet/AppSheet";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  // 옵션 창(아래 시트)이 열려 있으면 알림을 위쪽에 — 아래쪽 알림이 시트의 바닥 단추를 가려 눌리지 않았음(2026-11-24)
  const sheetOpen = useAnySheetOpen();

  return (
    <Sonner
      {...props}
      position={sheetOpen ? "top-center" : props.position}
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          // 알림 글 속 "\n" 을 줄바꿈으로 보여 줍니다(2026-11-23 — 한도·오류 안내를 두 줄로)
          title: "whitespace-pre-line",
          description: "group-[.toast]:text-muted-foreground whitespace-pre-line",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
        ...props.toastOptions,
      }}
    />
  );
};

export { Toaster, toast };
