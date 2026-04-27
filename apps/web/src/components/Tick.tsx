import { generateTickPath } from "../lib/tick-path";

export function Tick(props: { seed: string }) {
  const d = generateTickPath(props.seed);
  return (
    <svg viewBox="0 0 14 14" class="task-tick" aria-hidden={true}>
      <path d={d} />
    </svg>
  );
}
