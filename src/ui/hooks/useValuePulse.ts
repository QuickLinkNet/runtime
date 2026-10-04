import { useEffect, useRef, useState } from 'react';

export type ValuePulse = 'damage' | 'heal' | null;

export function useValuePulse(value: number | undefined, duration = 700): ValuePulse {
  const previous = useRef(value);
  const [pulse, setPulse] = useState<ValuePulse>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = value;
    if (before === undefined || value === undefined || before === value) return;

    setPulse(value < before ? 'damage' : 'heal');
    const timer = window.setTimeout(() => setPulse(null), duration);
    return () => window.clearTimeout(timer);
  }, [duration, value]);

  return pulse;
}
