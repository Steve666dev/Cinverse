export interface Review {
  author: string;
  rating: number;
  text: string;
}

export interface CastMember {
  id?: number;         // TMDB person ID
  name: string;        // Actor name
  character?: string;  // Character played in the film
  photo?: string;      // Profile headshot image URL
}

export interface ActorDetails {
  id: number;
  name: string;
  photo?: string;
  biography?: string;
  birthday?: string;
  placeOfBirth?: string;
  knownForDepartment?: string;
  movies: Movie[];
}

export interface Movie {
  id: number;
  t: string;       // Title
  y: number;       // Year
  g: string;       // Genre
  r: number;       // Rating
  runtime: number;
  dir: string;     // Director
  tagline: string;
  blurb: string;
  mood: string[];
  motif: string;
  lang?: string;   // Original language code e.g. 'en', 'hi', 'ko'
  cast?: string;   // Starring cast / actors text summary
  castMembers?: CastMember[]; // Full cast with photos & character details
  img?: string;
  trailerUrl?: string;
  reviews?: Review[];
  isAdult?: boolean; // Flag for age restriction
}
