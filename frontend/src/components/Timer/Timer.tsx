import { useEffect, useRef, useState } from "react";

interface TimerProps {
  minutes: number;
  penaltySeconds?: number;
  onTick?: (elapsedSeconds: number) => void;
  onExpire: () => void;
}

export default function Timer({ minutes, penaltySeconds = 0, onTick, onExpire }: TimerProps) {
  const totalSeconds = Math.max(0, Math.ceil(minutes * 60));
  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds);
  const previousPenalty = useRef(penaltySeconds);
  const expired = useRef(false);

  useEffect(() => {
    const additionalPenalty = penaltySeconds - previousPenalty.current;
    previousPenalty.current = penaltySeconds;
    if (additionalPenalty > 0) {
      setSecondsRemaining((current) => Math.max(0, current - additionalPenalty));
    }
  }, [penaltySeconds]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsRemaining((current) => {
        const next = Math.max(0, current - 1);
        onTick?.(totalSeconds - next);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [onTick, totalSeconds]);

  useEffect(() => {
    if (secondsRemaining <= 0 && !expired.current) {
      expired.current = true;
      onExpire();
    }
  }, [secondsRemaining, onExpire]);

  const minutesRemaining = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  return <div className={secondsRemaining <= 60 ? "timer danger" : "timer"}>
    <span>TIME</span><strong>{String(minutesRemaining).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</strong>
  </div>;
}
