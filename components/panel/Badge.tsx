const TONE_STYLE: Record<string, string> = {
  neutral: "bg-ciruela/8 text-ciruela/70",
  positive: "bg-oliva/15 text-oliva",
  warning: "bg-crepe/40 text-ciruela",
  info: "bg-pastel/40 text-ciruela",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "positive" | "warning" | "info";
}) {
  return (
    <span className={`rounded-full px-3 py-1 font-body text-xs ${TONE_STYLE[tone]}`}>
      {children}
    </span>
  );
}
