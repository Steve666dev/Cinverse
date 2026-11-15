export interface A24Film {
  id: string;
  title: string;
  year: number;
  director?: string;
  starring?: string[];
  discArtUrl: string;
  posterUrl: string;
  trailerYoutubeId?: string;
  trailerUrl?: string;
  publication?: string;
  quote?: string;
  rating?: number;
  overview?: string;
  runtime?: string;
  genre?: string;
  industry?: string;
  language?: string;
  imdbRating?: string;
  imdbVotes?: string;
  imdbId?: string;
  imdbUrl?: string;
  releaseDate: string; // ISO YYYY-MM-DD
  releaseNotice?: string;
  releaseStatus?: string;
  status: string;
  popularity?: number;
  countriesCount?: number;
  revenue?: number;
  // Provenance metadata (Part 4)
  rawDate: string;
  dateSource: string;
  dateCountry: string;
  dateType: number | string;
  fetchedAt: string;
  dateConflict?: boolean;
}
