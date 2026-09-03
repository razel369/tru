import type { BreedVisualProfile, Pet } from "../types";

export type PetSpecies = Pet["species"];

export interface BreedOption {
  name: string;
  visualProfile: BreedVisualProfile;
}

const dog = (name: string, visualProfile: BreedVisualProfile = "dog-standard"): BreedOption => ({
  name,
  visualProfile,
});

const cat = (name: string, visualProfile: BreedVisualProfile = "cat-compact"): BreedOption => ({
  name,
  visualProfile,
});

export const DOG_BREEDS: BreedOption[] = [
  dog("Mixed breed"),
  dog("Affenpinscher", "dog-toy"),
  dog("Afghan Hound", "dog-tall"),
  dog("Airedale Terrier", "dog-tall"),
  dog("Akita", "dog-large"),
  dog("Alaskan Malamute", "dog-large"),
  dog("American Akita", "dog-large"),
  dog("American Bulldog", "dog-compact"),
  dog("American Cocker Spaniel", "dog-compact"),
  dog("American Staffordshire Terrier", "dog-compact"),
  dog("Australian Cattle Dog"),
  dog("Australian Kelpie"),
  dog("Australian Shepherd", "dog-fluffy"),
  dog("Australian Terrier", "dog-toy"),
  dog("Basenji"),
  dog("Basset Hound", "dog-long-low"),
  dog("Beagle", "dog-compact"),
  dog("Bearded Collie", "dog-fluffy"),
  dog("Bedlington Terrier"),
  dog("Belgian Shepherd Dog"),
  dog("Bernese Mountain Dog", "dog-large"),
  dog("Bichon Frise", "dog-toy"),
  dog("Bloodhound", "dog-large"),
  dog("Border Collie"),
  dog("Border Terrier", "dog-compact"),
  dog("Borzoi", "dog-tall"),
  dog("Boston Terrier", "dog-compact"),
  dog("Bouvier des Flandres", "dog-large"),
  dog("Boxer", "dog-large"),
  dog("Brittany"),
  dog("Brussels Griffon", "dog-toy"),
  dog("Bull Terrier", "dog-compact"),
  dog("Bulldog", "dog-compact"),
  dog("Bullmastiff", "dog-large"),
  dog("Cairn Terrier", "dog-toy"),
  dog("Cane Corso", "dog-large"),
  dog("Cavalier King Charles Spaniel", "dog-toy"),
  dog("Chihuahua", "dog-toy"),
  dog("Chinese Crested", "dog-toy"),
  dog("Chow Chow", "dog-fluffy"),
  dog("Clumber Spaniel", "dog-compact"),
  dog("Collie", "dog-fluffy"),
  dog("Coton de Tulear", "dog-toy"),
  dog("Dachshund", "dog-long-low"),
  dog("Dalmatian", "dog-tall"),
  dog("Dobermann", "dog-tall"),
  dog("Dogo Argentino", "dog-large"),
  dog("Dogue de Bordeaux", "dog-large"),
  dog("English Cocker Spaniel", "dog-compact"),
  dog("English Foxhound", "dog-tall"),
  dog("English Setter", "dog-tall"),
  dog("English Springer Spaniel"),
  dog("English Toy Spaniel", "dog-toy"),
  dog("Finnish Lapphund", "dog-fluffy"),
  dog("Finnish Spitz", "dog-fluffy"),
  dog("Flat-Coated Retriever", "dog-large"),
  dog("French Bulldog", "dog-compact"),
  dog("German Pinscher"),
  dog("German Shepherd Dog", "dog-large"),
  dog("German Shorthaired Pointer", "dog-tall"),
  dog("German Spitz", "dog-fluffy"),
  dog("German Wirehaired Pointer", "dog-tall"),
  dog("Giant Schnauzer", "dog-large"),
  dog("Golden Retriever", "dog-large"),
  dog("Gordon Setter", "dog-tall"),
  dog("Great Dane", "dog-tall"),
  dog("Great Pyrenees", "dog-large"),
  dog("Greyhound", "dog-tall"),
  dog("Havanese", "dog-toy"),
  dog("Hungarian Vizsla", "dog-tall"),
  dog("Irish Setter", "dog-tall"),
  dog("Irish Terrier"),
  dog("Irish Wolfhound", "dog-tall"),
  dog("Italian Greyhound", "dog-toy"),
  dog("Jack Russell Terrier", "dog-compact"),
  dog("Japanese Chin", "dog-toy"),
  dog("Japanese Spitz", "dog-fluffy"),
  dog("Keeshond", "dog-fluffy"),
  dog("Komondor", "dog-large"),
  dog("Labrador Retriever", "dog-large"),
  dog("Lagotto Romagnolo"),
  dog("Leonberger", "dog-large"),
  dog("Lhasa Apso", "dog-toy"),
  dog("Maltese", "dog-toy"),
  dog("Mastiff", "dog-large"),
  dog("Miniature Pinscher", "dog-toy"),
  dog("Miniature Schnauzer", "dog-compact"),
  dog("Newfoundland", "dog-large"),
  dog("Norfolk Terrier", "dog-toy"),
  dog("Norwegian Elkhound", "dog-fluffy"),
  dog("Nova Scotia Duck Tolling Retriever"),
  dog("Old English Sheepdog", "dog-large"),
  dog("Papillon", "dog-toy"),
  dog("Pekingese", "dog-toy"),
  dog("Pembroke Welsh Corgi", "dog-long-low"),
  dog("Pomeranian", "dog-toy"),
  dog("Poodle (Standard)", "dog-tall"),
  dog("Poodle (Miniature)", "dog-compact"),
  dog("Poodle (Toy)", "dog-toy"),
  dog("Portuguese Water Dog"),
  dog("Pug", "dog-compact"),
  dog("Rhodesian Ridgeback", "dog-tall"),
  dog("Rottweiler", "dog-large"),
  dog("Saluki", "dog-tall"),
  dog("Samoyed", "dog-fluffy"),
  dog("Schnauzer"),
  dog("Scottish Terrier", "dog-compact"),
  dog("Shar Pei", "dog-compact"),
  dog("Shetland Sheepdog", "dog-fluffy"),
  dog("Shiba Inu"),
  dog("Shih Tzu", "dog-toy"),
  dog("Siberian Husky", "dog-large"),
  dog("Soft Coated Wheaten Terrier"),
  dog("Staffordshire Bull Terrier", "dog-compact"),
  dog("St. Bernard", "dog-large"),
  dog("Toy Fox Terrier", "dog-toy"),
  dog("Weimaraner", "dog-tall"),
  dog("Welsh Springer Spaniel"),
  dog("West Highland White Terrier", "dog-toy"),
  dog("Whippet", "dog-tall"),
  dog("Yorkshire Terrier", "dog-toy"),
];

export const CAT_BREEDS: BreedOption[] = [
  cat("Mixed breed"),
  cat("Domestic Shorthair"),
  cat("Domestic Medium Hair", "cat-longhair"),
  cat("Domestic Longhair", "cat-longhair"),
  cat("Abyssinian", "cat-tall"),
  cat("American Bobtail"),
  cat("American Curl"),
  cat("American Shorthair"),
  cat("American Wirehair"),
  cat("Australian Mist"),
  cat("Balinese", "cat-tall"),
  cat("Bengal", "cat-tall"),
  cat("Birman", "cat-longhair"),
  cat("Bombay"),
  cat("British Longhair", "cat-longhair"),
  cat("British Shorthair"),
  cat("Burmese"),
  cat("Burmilla"),
  cat("Chartreux"),
  cat("Chausie", "cat-tall"),
  cat("Cornish Rex", "cat-tall"),
  cat("Cymric", "cat-longhair"),
  cat("Devon Rex"),
  cat("Donskoy", "cat-hairless"),
  cat("Egyptian Mau", "cat-tall"),
  cat("European Shorthair"),
  cat("Exotic Shorthair"),
  cat("Havana Brown"),
  cat("Highlander", "cat-tall"),
  cat("Himalayan", "cat-longhair"),
  cat("Japanese Bobtail"),
  cat("Khao Manee"),
  cat("Korat"),
  cat("Kurilian Bobtail"),
  cat("LaPerm", "cat-longhair"),
  cat("Lykoi"),
  cat("Maine Coon", "cat-longhair"),
  cat("Manx"),
  cat("Minskin", "cat-hairless"),
  cat("Munchkin"),
  cat("Nebelung", "cat-longhair"),
  cat("Norwegian Forest Cat", "cat-longhair"),
  cat("Ocicat", "cat-tall"),
  cat("Oriental Longhair", "cat-longhair"),
  cat("Oriental Shorthair", "cat-tall"),
  cat("Persian", "cat-longhair"),
  cat("Peterbald", "cat-hairless"),
  cat("Pixiebob"),
  cat("Ragamuffin", "cat-longhair"),
  cat("Ragdoll", "cat-longhair"),
  cat("Russian Blue"),
  cat("Savannah", "cat-tall"),
  cat("Scottish Fold"),
  cat("Selkirk Rex", "cat-longhair"),
  cat("Serengeti", "cat-tall"),
  cat("Siamese", "cat-tall"),
  cat("Siberian", "cat-longhair"),
  cat("Singapura"),
  cat("Snowshoe"),
  cat("Sokoke", "cat-tall"),
  cat("Somali", "cat-longhair"),
  cat("Sphynx", "cat-hairless"),
  cat("Thai", "cat-tall"),
  cat("Tonkinese", "cat-tall"),
  cat("Toybob"),
  cat("Toyger", "cat-tall"),
  cat("Turkish Angora", "cat-longhair"),
  cat("Turkish Van", "cat-longhair"),
];

export const PET_SCENE_LAYOUTS: Record<
  BreedVisualProfile,
  { scale: number; anchorX: number; feetY: number; maxWidth: number }
> = {
  "cat-compact": { scale: 1, anchorX: 0.5, feetY: 0.79, maxWidth: 0.46 },
  "cat-longhair": { scale: 1.06, anchorX: 0.5, feetY: 0.8, maxWidth: 0.52 },
  "cat-hairless": { scale: 0.98, anchorX: 0.5, feetY: 0.79, maxWidth: 0.43 },
  "cat-tall": { scale: 1.08, anchorX: 0.5, feetY: 0.8, maxWidth: 0.45 },
  "dog-toy": { scale: 0.8, anchorX: 0.5, feetY: 0.8, maxWidth: 0.35 },
  "dog-long-low": { scale: 0.9, anchorX: 0.5, feetY: 0.81, maxWidth: 0.5 },
  "dog-compact": { scale: 0.94, anchorX: 0.5, feetY: 0.8, maxWidth: 0.45 },
  "dog-standard": { scale: 1, anchorX: 0.5, feetY: 0.8, maxWidth: 0.48 },
  "dog-tall": { scale: 1.1, anchorX: 0.5, feetY: 0.81, maxWidth: 0.46 },
  "dog-large": { scale: 1.12, anchorX: 0.5, feetY: 0.81, maxWidth: 0.54 },
  "dog-fluffy": { scale: 1.06, anchorX: 0.5, feetY: 0.81, maxWidth: 0.54 },
  other: { scale: 1, anchorX: 0.5, feetY: 0.8, maxWidth: 0.48 },
};

export function getBreedOptions(species: PetSpecies): BreedOption[] {
  if (species === "dog") return DOG_BREEDS;
  if (species === "cat") return CAT_BREEDS;
  return [];
}

export function searchBreeds(species: PetSpecies, query: string, limit = 7): BreedOption[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const options = getBreedOptions(species);
  if (!normalizedQuery) return options.slice(0, limit);

  return options
    .filter((option) => option.name.toLocaleLowerCase().includes(normalizedQuery))
    .sort((a, b) => {
      const aStarts = a.name.toLocaleLowerCase().startsWith(normalizedQuery) ? 0 : 1;
      const bStarts = b.name.toLocaleLowerCase().startsWith(normalizedQuery) ? 0 : 1;
      return aStarts - bStarts || a.name.localeCompare(b.name);
    })
    .slice(0, limit);
}

export function getBreedVisualProfile(species: PetSpecies, breedName: string): BreedVisualProfile {
  const match = getBreedOptions(species).find(
    (option) => option.name.toLocaleLowerCase() === breedName.trim().toLocaleLowerCase(),
  );
  if (match) return match.visualProfile;
  if (species === "cat") return "cat-compact";
  if (species === "dog") return "dog-standard";
  return "other";
}
