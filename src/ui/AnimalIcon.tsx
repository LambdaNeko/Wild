import type { AnimalType } from "../domain/types";

type AnimalIconProps = {
  animalId: AnimalType;
  label: string;
  className?: string;
  decorative?: boolean;
  facing?: "front" | "back";
};

export function tokenAssetUrl(fileName: string) {
  return `${import.meta.env.BASE_URL}assets/tokens/${fileName}`;
}

export function AnimalIcon({
  animalId,
  label,
  className = "animal-icon",
  decorative = false,
  facing = "front"
}: AnimalIconProps) {
  const suffix = facing === "back" ? "-back" : "";

  return (
    <img
      className={className}
      src={tokenAssetUrl(`${animalId}${suffix}.png`)}
      alt={decorative ? "" : label}
      aria-hidden={decorative ? "true" : undefined}
      draggable={false}
    />
  );
}
