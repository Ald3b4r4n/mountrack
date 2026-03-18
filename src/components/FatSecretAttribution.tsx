interface FatSecretAttributionProps {
  compact?: boolean;
  className?: string;
  variant?: "horizontal" | "square";
}

export function FatSecretAttribution({
  compact = false,
  className,
  variant = "horizontal",
}: FatSecretAttributionProps) {
  const isSquare = variant === "square";

  return (
    <div className={className}>
      <a
        href="https://platform.fatsecret.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          textDecoration: "none",
        }}
      >
        <img
          alt="Nutrition information provided by fatsecret Platform API"
          src={
            isSquare
              ? "https://platform.fatsecret.com/api/static/images/powered_by_fatsecret_square_brand.svg"
              : "https://platform.fatsecret.com/api/static/images/powered_by_fatsecret_horizontal_brand.png"
          }
          srcSet={
            isSquare
              ? undefined
              : "https://platform.fatsecret.com/api/static/images/powered_by_fatsecret_horizontal_brand@2x.png 2x, https://platform.fatsecret.com/api/static/images/powered_by_fatsecret_horizontal_brand@3x.png 3x"
          }
          style={{
            width: isSquare
              ? compact
                ? "22px"
                : "28px"
              : compact
                ? "180px"
                : "220px",
            maxWidth: "100%",
            height: "auto",
          }}
        />
      </a>
    </div>
  );
}
