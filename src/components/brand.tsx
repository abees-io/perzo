export function BrandMark({ className = "" }: { className?: string }) {
  return <span className={`brand-mark ${className}`} aria-hidden="true"><img src="/perzo-logo.png" alt="" width="1536" height="1024" /></span>;
}
