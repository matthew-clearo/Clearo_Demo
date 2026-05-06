export default function FrostedCard({
  className = "",
  children,
  as: As = "div",
  ...props
}) {
  return (
    <As
      className={`rounded-3xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.06)] border border-black/[0.06] ${className}`}
      {...props}
    >
      {children}
    </As>
  );
}
