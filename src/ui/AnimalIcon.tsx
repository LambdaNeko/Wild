import type { AnimalType } from "../domain/types";

type AnimalIconProps = {
  animalId: AnimalType;
  label: string;
  className?: string;
  decorative?: boolean;
};

const tokenAssetOverrides: Partial<Record<AnimalType | "mystery", string>> = {
  deer: "deer-komorebi.png",
  fox: "fox-komorebi.png",
  frog: "frog-komorebi.png",
  king: "king-komorebi.png",
  mystery: "mystery-komorebi.png",
  owl: "owl-komorebi.png",
  rabbit: "rabbit-komorebi.png",
  snake: "snake-komorebi.png",
  wolf: "wolf-komorebi.png"
};

export function tokenAssetUrl(fileName: string) {
  const assetName = fileName.replace(/\.png$/, "") as AnimalType | "mystery";
  const override = tokenAssetOverrides[assetName];
  if (override) {
    return `${import.meta.env.BASE_URL}assets/tokens/${override}`;
  }
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
