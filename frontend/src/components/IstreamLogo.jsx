export default function IstreamLogo({ size = 36 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="#ffffff"
      className="brand-icon-glyph"
      aria-hidden="true"
    >
      <circle cx="50" cy="24" r="9" />
      <rect x="30.5" y="54" width="9" height="26" rx="4" />
      <rect x="45.5" y="40" width="9" height="40" rx="4" />
      <rect x="60.5" y="54" width="9" height="26" rx="4" />
    </svg>
  );
}
