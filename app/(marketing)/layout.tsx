// Public marketing site — unauthenticated. See MONAM_Landing_Page_Build_Spec.md.
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return <div className="flex-1 flex flex-col">{children}</div>;
}
