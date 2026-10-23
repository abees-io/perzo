export function BrandMark({
  className = "",
  state = "idle",
}: {
  className?: string;
  state?: "idle" | "thinking" | "working";
}) {
  return (
    <span className={`brand-mark ${className}`} data-state={state} aria-hidden="true">
      <img src="/perzo-logo.png" alt="" width="1536" height="1024" />
    </span>
  );
}
