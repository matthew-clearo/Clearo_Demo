export default function SoftHeroBackground({ className = "" }) {
  return (
    <div
      className={`absolute inset-0 ${className}`}
      style={{
        background: `
          linear-gradient(135deg, #FBF8F3 0%, #FFFFFF 50%, #FBF8F3 100%)
        `,
      }}
    />
  );
}
