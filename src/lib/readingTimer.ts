// src/lib/readingTimer.ts
// 보이지 않는 읽기 타이머. 화면에는 어떤 카운트도 표시하지 않습니다.
//
// 초가 쌓이는 조건 (셋 다 참일 때만):
//   ① 인도네시아어 면을 보고 있을 때   ② 앱이 전면(visible)일 때
//   ③ 최근 45초 안에 살아있는 신호(스크롤·터치·단어 팝업)가 있을 때
//
// 쌓인 초는 "대기" 상태이고, 그 단위(장·이야기·묵상·기사)의 한국어 면을 처음 여는 순간에만
// 점수로 확정됩니다. 한국어 면을 한 번도 안 열고 떠나면 대기 초는 버려집니다(읽는 척 방지).
// 한 번 확정(해금)한 뒤에는 더 읽은 만큼이 이탈·단위변경·백그라운드에서 조용히 확정됩니다.
//
// 하루 상한(20점)은 엔진(DAILY_CAPS.reading)이 처리하므로 여기서는 신경 쓰지 않습니다.

import { medaliEngine } from "@/lib/medali";

const IDLE_MS = 45000;        // 이 시간 안에 신호 없으면 일시정지
const TICK_MS = 5000;         // 내부 누적 주기
const POINTS_PER_MIN = 2;
const FINISH_BONUS = 2;       // 완독 보너스 (대기 1분 이상 + 단위당 1회)

export class ReadingTracker {
  private onConfirm: (points: number) => void;

  private pendingSec = 0;       // 아직 확정되지 않은 초
  private unlocked = false;     // 이 단위에서 한국어 면을 이미 열었는가
  private indonesian = false;   // 지금 인니어 면인가
  private lastTouch = 0;        // 마지막 살아있는 신호 시각
  private lastTick = 0;         // 마지막 누적 시각
  private timer: number | null = null;
  private attached = false;

  constructor(onConfirm: (points: number) => void) {
    this.onConfirm = onConfirm;
  }

  // ── 내부 ────────────────────────────────────────────────────────
  private onSignal = () => {
    this.lastTouch = Date.now();
  };

  private onVisibility = () => {
    try {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "visible") {
        // 백그라운드에 있던 시간이 적립되지 않게 기준 시각을 다시 잡습니다
        this.lastTick = Date.now();
        this.lastTouch = Date.now();
        return;
      }
      this.accumulate();
      if (this.unlocked) this.settle(false);
      this.lastTick = Date.now();
    } catch {
      // 무시
    }
  };

  private isReading(): boolean {
    if (!this.indonesian) return false;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return false;
    return Date.now() - this.lastTouch < IDLE_MS;
  }

  // 지난 tick 이후 흐른 시간을 조건에 맞을 때만 더합니다 (setInterval 드리프트 무시)
  private accumulate() {
    const now = Date.now();
    const gap = now - this.lastTick;
    this.lastTick = now;
    if (gap <= 0) return;
    if (!this.isReading()) return;
    // 화면이 오래 멈춰 있었다면(탭 절전 등) 한 주기 이상은 인정하지 않습니다
    this.pendingSec += Math.min(gap, TICK_MS * 2) / 1000;
  }

  // 대기 초 → 점수. withBonus는 첫 확정(한국어 면 열기)에서만 true.
  private async settle(withBonus: boolean): Promise<number> {
    const mins = Math.floor(this.pendingSec / 60);
    const bonus = withBonus && mins >= 1 ? FINISH_BONUS : 0;
    if (mins <= 0) return 0;
    this.pendingSec -= mins * 60;   // 자투리 초는 다음으로 이어감
    const amount = mins * POINTS_PER_MIN + bonus;
    try {
      return await medaliEngine.addPoints("reading", amount);
    } catch {
      return 0;
    }
  }

  // ── 공개 메서드 ─────────────────────────────────────────────────
  attach(): void {
    try {
      if (this.attached) return;
      this.attached = true;
      const now = Date.now();
      this.lastTouch = now;
      this.lastTick = now;
      if (typeof window !== "undefined") {
        window.addEventListener("scroll", this.onSignal, { passive: true });
        window.addEventListener("touchstart", this.onSignal, { passive: true });
        window.addEventListener("pointerdown", this.onSignal, { passive: true });
        this.timer = window.setInterval(() => {
          try {
            this.accumulate();
          } catch {
            // 무시
          }
        }, TICK_MS);
      }
      if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", this.onVisibility);
      }
    } catch {
      // 타이머를 못 걸어도 화면은 정상 동작
    }
  }

  dispose(): void {
    try {
      this.accumulate();
      // 해금된 단위만 조용히 확정합니다 (setState 없이 정리만)
      if (this.unlocked) void this.settle(false);
      this.pendingSec = 0;
      if (this.timer !== null && typeof window !== "undefined") {
        window.clearInterval(this.timer);
      }
      this.timer = null;
      if (typeof window !== "undefined") {
        window.removeEventListener("scroll", this.onSignal);
        window.removeEventListener("touchstart", this.onSignal);
        window.removeEventListener("pointerdown", this.onSignal);
      }
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", this.onVisibility);
      }
      this.attached = false;
    } catch {
      // 무시
    }
  }

  // 읽는 단위(장·이야기·묵상·기사)가 바뀜
  setUnit(key: string): void {
    try {
      this.accumulate();
      if (this.unlocked) void this.settle(false);  // 해금된 단위는 조용히 확정
      this.pendingSec = 0;                          // 미해금이면 대기 초는 버림
      this.unlocked = false;
      const now = Date.now();
      this.lastTick = now;
      this.lastTouch = now;
      void key;
    } catch {
      // 무시
    }
  }

  // 인니어 면 / 한국어 면 전환
  setSide(indonesian: boolean): void {
    try {
      this.accumulate();       // 지금까지의 시간을 먼저 정산하고 면을 바꿉니다
      this.indonesian = indonesian;
      this.lastTick = Date.now();
    } catch {
      // 무시
    }
  }

  // 살아있는 신호 (스크롤·터치는 attach가 자동으로 잡습니다)
  touch(): void {
    try {
      this.lastTouch = Date.now();
    } catch {
      // 무시
    }
  }

  // 한국어 면을 열었다 → 미해금이면 여기서 점수가 확정됩니다
  koreanOpened(): void {
    try {
      this.accumulate();
      if (this.unlocked) return;
      this.unlocked = true;
      void this.settle(true).then((got) => {
        try {
          if (got > 0) this.onConfirm(got);
        } catch {
          // 화면 쪽 콜백 실패는 무시
        }
      });
    } catch {
      // 무시
    }
  }
}
