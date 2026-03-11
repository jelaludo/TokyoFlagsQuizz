export type AppMode = 'guess' | 'flagmatch' | 'explore'

export interface FlagItem {
  id: string
  name_en: string
  name_ja: string
  flag_url: string
}

export interface SymbolInfo {
  name_en: string;
  species: string;
}

export interface Ward {
  id: string;
  name_en: string;
  name_ja: string;
  number: number;
  tree: SymbolInfo;
  flower: SymbolInfo;
  bird: SymbolInfo | null;
  flag_url: string;
  seal_url: string;
  population: number;
  area_km2: number;
  notable_districts: string[];
}

export type QuizCategory = 'flag' | 'tree' | 'flower' | 'bird' | 'seal';

export type QuizFilter = 'mixed' | 'flags' | 'seals';

export interface QuizQuestion {
  category: QuizCategory;
  ward: Ward;
  options: Ward[];
  isImageQuestion: boolean;
}
