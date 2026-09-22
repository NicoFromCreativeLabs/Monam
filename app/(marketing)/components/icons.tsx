// Approved line-art icon set — real brand assets in public/brand/icons/,
// not modified from the source files, only sized/placed here.

type IconProps = { className?: string };

const base = {
  viewBox: "0 0 48 48",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function ImgIcon({ src, className }: { src: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" aria-hidden="true" className={className} />
  );
}

export function OrganicoIcon({ className }: IconProps) {
  return <ImgIcon src="/brand/icons/wave.svg" className={className} />;
}

export function SerenidadIcon({ className }: IconProps) {
  return <ImgIcon src="/brand/icons/swirl.svg" className={className} />;
}

export function BalanceIcon({ className }: IconProps) {
  return <ImgIcon src="/brand/icons/sunburst-mini.svg" className={className} />;
}

export function EncuentroIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <rect x="8" y="12" width="32" height="28" rx="4" />
      <path d="M8 20h32" />
      <path d="M16 8v8" />
      <path d="M32 8v8" />
      <path d="M18 28l4 4 8-8" />
    </svg>
  );
}

// Featured-treatment marks — real brand assets, see note above.
export function SunburstIcon({ className }: IconProps) {
  return <ImgIcon src="/brand/icons/sunburst-bold.svg" className={className} />;
}

export function ArchesIcon({ className }: IconProps) {
  return <ImgIcon src="/brand/icons/arches.svg" className={className} />;
}

export function RingIcon({ className }: IconProps) {
  return <ImgIcon src="/brand/icons/sunburst-dot.svg" className={className} />;
}

const FEATURED_ICONS = { sunburst: SunburstIcon, arches: ArchesIcon, ring: RingIcon };

export function FeaturedIcon({
  icon,
  className,
}: {
  icon: "sunburst" | "arches" | "ring";
  className?: string;
}) {
  const Icon = FEATURED_ICONS[icon];
  return <Icon className={className} />;
}
