import type { Content } from "@/lib/content";

export function Footer({ content }: { content: Content }) {
  const { footer } = content;
  return (
    <footer className="px-8 py-16 min-[860px]:py-24">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 min-[860px]:flex-row min-[860px]:justify-between">
        <div>
          <p className="font-display text-xl tracking-[0.12em] text-ciruela">MONÂM</p>
          <p className="mt-2 font-script text-xl text-ciruela/70">{footer.script}</p>
        </div>

        <div className="flex gap-16">
          <div>
            <p className="font-body text-xs uppercase tracking-[0.2em] text-ciruela/50">
              {footer.explore.heading}
            </p>
            <ul className="mt-3 space-y-2">
              {footer.explore.links.map((link) => (
                <li key={link} className="font-body text-sm text-ciruela/80">
                  {link}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-body text-xs uppercase tracking-[0.2em] text-ciruela/50">
              {footer.connect.heading}
            </p>
            <ul className="mt-3 space-y-2">
              {footer.connect.links.map((link) => (
                <li key={link} className="font-body text-sm text-ciruela/80">
                  {link}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-[1200px] font-body text-xs text-ciruela/40">
        {footer.copyright}
      </p>
    </footer>
  );
}
