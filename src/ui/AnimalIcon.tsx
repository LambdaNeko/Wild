import type { AnimalType } from "../domain/types";

type AnimalIconProps = {
  animalId: AnimalType;
  label: string;
  className?: string;
  decorative?: boolean;
};

export function tokenAssetUrl(fileName: string) {
  return `${import.meta.env.BASE_URL}assets/tokens/${fileName}`;
}

export function AnimalIcon({
  animalId,
  label,
  className = "animal-icon",
  decorative = false
}: AnimalIconProps) {
  return (
    <img
      className={className}
      src={tokenAssetUrl(`${animalId}.png`)}
      alt={decorative ? "" : label}
      aria-hidden={decorative ? "true" : undefined}
      draggable={false}
    />
  );
}
