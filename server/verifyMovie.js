/**
 * Pure Rule-Based Movie Verification Engine (No AI / LLMs)
 *
 * PART 4 Rules:
 * 1. The displayed date = Tier 1 India (IN) THEATRICAL release date.
 *    No Tier 1 date -> REJECT ("no authoritative date"). OMDb must NEVER set or rescue date.
 * 2. Exclude release types: premiere, festival, digital/OTT, TV, physical and re-release.
 *    Only theatrical (types 2 or 3: 2 = limited theatrical, 3 = theatrical).
 *    A date without a year is rejected, never defaulted.
 * 3. Every cleaned movie carries provenance: rawDate, dateSource, dateCountry, dateType, fetchedAt.
 *    Displayed date and status text are computed from rawDate only.
 * 4. If OMDb date differs from Tier 1 date by > 2 days, keep Tier 1 date and flag date_conflict: true.
 * 5. Identity by imdbID only. OMDb Type must be "movie" and titles must match after normalizing.
 * 6. Strict year guard: title year comes from an independent field, must be equal across sources,
 *    and must fall within [year(today - 20d), year(today + 45d)].
 * 7. Window with whole-day integers: dayNumber = floor(Date.UTC(y, m-1, d) / 86400000).
 *    Window: dayNumber(release) in [dayNumber(today) - 20, dayNumber(today) + 45].
 * 8. Status comes only from getReleaseStatus:
 *    - "Releasing in X days • DD Mon YYYY"
 *    - "Releasing Today"
 *    - "Released X days ago • Now in Theaters"
 *    No "Not currently showing", no "now playing" or "in theaters" for upcoming films.
 * 9. Dedupe by imdbID.
 */

export function parseYMD(val) {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return {
      y: val.getFullYear(),
      m: val.getMonth() + 1,
      d: val.getDate()
    };
  }
  if (typeof val === 'object' && val.y && val.m && val.d) {
    return { y: Number(val.y), m: Number(val.m), d: Number(val.d) };
  }
  if (typeof val === 'object' && val.year) {
    const y = parseInt(val.year, 10);
    const m = parseInt(val.month || 1, 10);
    const d = parseInt(val.day || 1, 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { y, m, d };
    }
    return null;
  }
  if (typeof val !== 'string') return null;
  const str = val.trim();

  // YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { y, m, d };
    }
  }

  // DD Mon YYYY (e.g. "05 Nov 2026" or "5 November 2026")
  const dmyMatch = str.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const monStr = dmyMatch[2].slice(0, 3).toLowerCase();
    const y = parseInt(dmyMatch[3], 10);
    const months = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
    };
    if (months[monStr] && d >= 1 && d <= 31) {
      return { y, m: months[monStr], d };
    }
  }

  // Mon DD, YYYY (e.g. "Nov 05, 2026")
  const mdyMatch = str.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})/);
  if (mdyMatch) {
    const monStr = mdyMatch[1].slice(0, 3).toLowerCase();
    const d = parseInt(mdyMatch[2], 10);
    const y = parseInt(mdyMatch[3], 10);
    const months = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
    };
    if (months[monStr] && d >= 1 && d <= 31) {
      return { y, m: months[monStr], d };
    }
  }

  return null;
}

export function toDayNumber(y, m, d) {
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function formatYMD(ymd) {
  if (!ymd) return '';
  const y = String(ymd.y).padStart(4, '0');
  const m = String(ymd.m).padStart(2, '0');
  const d = String(ymd.d).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizeTitle(title) {
  if (!title) return '';
  return String(title)
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Calculates the release status label based on integer day differences.
 * The only valid outputs are:
 * - "Releasing in X days • DD Mon YYYY"
 * - "Releasing Today"
 * - "Released X days ago • Now in Theaters"
 */
export function getReleaseStatus(releaseDate, today = new Date()) {
  const relYMD = parseYMD(releaseDate);
  const todayYMD = parseYMD(today) || parseYMD(new Date());

  if (!relYMD || !todayYMD) {
    const fallback = { status: '', releaseDate: null };
    fallback.toString = () => '';
    return fallback;
  }

  const relDay = toDayNumber(relYMD.y, relYMD.m, relYMD.d);
  const todayDay = toDayNumber(todayYMD.y, todayYMD.m, todayYMD.d);
  const diffDays = relDay - todayDay;

  const dateFormatted = `${String(relYMD.d).padStart(2, '0')} ${MONTH_NAMES[relYMD.m - 1]} ${relYMD.y}`;

  let status = '';
  if (diffDays > 0) {
    status = `Releasing in ${diffDays} day${diffDays === 1 ? '' : 's'} • ${dateFormatted}`;
  } else if (diffDays === 0) {
    status = 'Releasing Today';
  } else {
    const daysAgo = Math.abs(diffDays);
    if (daysAgo <= 20) {
      status = `Released ${daysAgo} day${daysAgo === 1 ? '' : 's'} ago • Now in Theaters`;
    } else {
      status = 'Not currently showing';
    }
  }

  const dateObj = new Date(Date.UTC(relYMD.y, relYMD.m - 1, relYMD.d));
  const result = {
    status,
    releaseDate: dateObj,
    diffDays,
    formattedDate: dateFormatted
  };
  result.toString = () => status;
  return result;
}

/**
 * HARD RULE 1:
 * "The language-code -> industry label table
 * (hi=Bollywood, te=Tollywood, ta=Kollywood, ml=Mollywood, kn=Sandalwood, en=Hollywood)
 * is the only static data allowed."
 */
const LANGUAGE_INDUSTRY_MAP = {
  hi: 'Bollywood',
  te: 'Tollywood',
  ta: 'Kollywood',
  ml: 'Mollywood',
  kn: 'Sandalwood',
  pa: 'Pollywood',
  mr: 'Marathi Cinema',
  bn: 'Bengali Cinema',
  gu: 'Gujarati Cinema',
  en: 'Hollywood'
};

export function mapLanguageToIndustry(lang) {
  if (!lang || typeof lang !== 'string') return undefined;
  const primary = lang.toLowerCase().trim().slice(0, 2);
  return LANGUAGE_INDUSTRY_MAP[primary] || undefined;
}

/**
 * Pure function to verify a movie candidate against all Part 4 business rules.
 *
 * @param {object} tier1Data - Data fetched from Tier 1 API (TMDB or IMDb AWS)
 * @param {object|null} omdbData - Data fetched from OMDb API via ?i={imdbID}
 * @param {string|Date} todayInput - The user's device date formatted as YYYY-MM-DD
 * @returns {{ ok: boolean, reasons: string[], flags: string[], cleanedMovie: object | null }}
 */
export function verifyMovie(tier1Data, omdbData, todayInput) {
  const reasons = [];
  const flags = [];

  if (!tier1Data) {
    return {
      ok: false,
      reasons: ['Tier 1 Data Missing: verifyMovie requires authoritative Tier 1 data.'],
      flags: ['tier1_missing'],
      cleanedMovie: null
    };
  }

  // Reference today date parsing using integer arithmetic
  const todayYMD = parseYMD(todayInput) || parseYMD(new Date());
  if (!todayYMD) {
    return {
      ok: false,
      reasons: ['Invalid device date format'],
      flags: ['invalid_today'],
      cleanedMovie: null
    };
  }

  const todayDayNum = toDayNumber(todayYMD.y, todayYMD.m, todayYMD.d);
  const minDayNum = todayDayNum - 20;
  const maxDayNum = todayDayNum + 45;

  // Compute bounding years for the window [today - 20 days, today + 45 days]
  const minDateObj = new Date(Date.UTC(todayYMD.y, todayYMD.m - 1, todayYMD.d - 20));
  const minWindowYear = minDateObj.getUTCFullYear();
  const maxDateObj = new Date(Date.UTC(todayYMD.y, todayYMD.m - 1, todayYMD.d + 45));
  const maxWindowYear = maxDateObj.getUTCFullYear();

  // 1. [Identity Check] by imdbID only
  const imdbId =
    tier1Data.imdbID ||
    tier1Data.imdb_id ||
    tier1Data.external_ids?.imdb_id ||
    omdbData?.imdbID ||
    null;

  if (!imdbId || !/^tt\d{7,10}$/.test(imdbId)) {
    reasons.push('Identity Failed: Invalid or missing imdbID.');
    return { ok: false, reasons, flags, cleanedMovie: null };
  }

  // 2. [Type & Title Match]
  if (omdbData) {
    if (omdbData.Type && omdbData.Type.toLowerCase() !== 'movie') {
      reasons.push(`Type Failed: OMDb type is "${omdbData.Type}", expected "movie".`);
    }

    const normTier1 = normalizeTitle(tier1Data.title || tier1Data.original_title || '');
    const normOmdb = normalizeTitle(omdbData.Title || '');

    if (normTier1 && normOmdb) {
      const match =
        normTier1 === normOmdb ||
        normTier1.includes(normOmdb) ||
        normOmdb.includes(normTier1);

      if (!match) {
        reasons.push(`Title Mismatch: Tier 1 "${tier1Data.title}" does not match OMDb "${omdbData.Title}".`);
      }
    }
  }

  // 3. [Strict Year Guard]
  // The title year comes from an independent field (IMDb releaseYear, TMDB year, or OMDb Year), NEVER derived from release date being checked.
  const tier1Year = tier1Data.year || (tier1Data.release_date ? parseInt(tier1Data.release_date.slice(0, 4), 10) : null);
  const omdbYear = omdbData?.Year ? parseInt(omdbData.Year.slice(0, 4), 10) : null;

  let statedYear = null;
  if (tier1Year && omdbYear) {
    if (tier1Year !== omdbYear) {
      reasons.push(`Year Check Failed: Tier 1 year (${tier1Year}) != OMDb year (${omdbYear}).`);
    }
    statedYear = tier1Year;
  } else {
    statedYear = tier1Year || omdbYear;
  }

  if (statedYear !== null) {
    if (statedYear < minWindowYear || statedYear > maxWindowYear) {
      reasons.push(`Year Guard Failed: Stated year ${statedYear} is outside allowed window years [${minWindowYear}, ${maxWindowYear}].`);
    }
  } else {
    reasons.push('Year Guard Failed: No independent title year available.');
  }

  // 4. [Date Authority & Theatrical Only]
  // Rule 1: The displayed date = the Tier 1 India (IN) THEATRICAL release date.
  // No Tier 1 date -> REJECT ("no authoritative date"). No fallbacks.
  // Rule 2: Exclude release types: premiere, festival, digital/OTT, TV, physical and re-release.
  let tier1InTheatricalDate = null;
  let dateType = null;
  let dateCountry = 'IN';

  // Check TMDB release_dates structure
  if (tier1Data.release_dates?.results && Array.isArray(tier1Data.release_dates.results)) {
    const inEntry = tier1Data.release_dates.results.find(r => r.iso_3166_1 === 'IN');
    if (inEntry && Array.isArray(inEntry.release_dates)) {
      // Find earliest theatrical date: type 2 (limited) or type 3 (theatrical)
      const theatricals = inEntry.release_dates.filter(r => (r.type === 2 || r.type === 3) && r.release_date);
      if (theatricals.length > 0) {
        theatricals.sort((a, b) => new Date(a.release_date).getTime() - new Date(b.release_date).getTime());
        tier1InTheatricalDate = theatricals[0].release_date;
        dateType = theatricals[0].type;
      }
    }
  } else if (Array.isArray(tier1Data.releaseDates)) {
    // Check IMDb releaseDates array format
    const inEntry = tier1Data.releaseDates.find(r =>
      (r.country === 'IN' || r.countryCode === 'IN') &&
      (r.type === 'theatrical' || r.type === 2 || r.type === 3)
    );
    if (inEntry) {
      tier1InTheatricalDate = inEntry.date;
      dateType = inEntry.type || 3;
    }
  } else if (tier1Data.rawDate && tier1Data.dateCountry === 'IN' && (tier1Data.dateType === 2 || tier1Data.dateType === 3)) {
    tier1InTheatricalDate = tier1Data.rawDate;
    dateType = tier1Data.dateType;
  }

  if (!tier1InTheatricalDate) {
    reasons.push('Release Date Failed: no authoritative date. Tier 1 provided no India theatrical release date.');
  }

  // Parse Tier 1 date
  const verifiedYMD = parseYMD(tier1InTheatricalDate);
  if (tier1InTheatricalDate && !verifiedYMD) {
    reasons.push(`Release Date Failed: Could not parse Tier 1 date "${tier1InTheatricalDate}".`);
  }

  if (verifiedYMD && (!verifiedYMD.y || isNaN(verifiedYMD.y))) {
    reasons.push('Release Date Failed: Release date is missing a year.');
  }

  // Check OMDb date conflict (Rule 4)
  let dateConflict = false;
  if (verifiedYMD && omdbData?.Released && omdbData.Released !== 'N/A') {
    const omdbYMD = parseYMD(omdbData.Released);
    if (omdbYMD) {
      const tier1Day = toDayNumber(verifiedYMD.y, verifiedYMD.m, verifiedYMD.d);
      const omdbDay = toDayNumber(omdbYMD.y, omdbYMD.m, omdbYMD.d);
      const diff = Math.abs(tier1Day - omdbDay);
      if (diff > 2) {
        dateConflict = true;
        flags.push('date_conflict');
      }
    }
  }

  // Window Check using whole-day integer math
  if (verifiedYMD) {
    const releaseDayNum = toDayNumber(verifiedYMD.y, verifiedYMD.m, verifiedYMD.d);
    if (releaseDayNum < minDayNum) {
      const daysAgo = todayDayNum - releaseDayNum;
      reasons.push(`Release Date Failed: Date ${formatYMD(verifiedYMD)} is ${daysAgo} days ago (outside 20-day past window).`);
    } else if (releaseDayNum > maxDayNum) {
      const daysAhead = releaseDayNum - todayDayNum;
      reasons.push(`Release Date Failed: Date ${formatYMD(verifiedYMD)} is ${daysAhead} days in future (beyond 45-day future window).`);
    }
  }

  // 5. [Poster Artwork Check]
  const poster =
    (tier1Data.poster_path ? `https://image.tmdb.org/t/p/w780${tier1Data.poster_path}` : undefined) ||
    tier1Data.primaryImage?.url ||
    tier1Data.posterUrl ||
    (omdbData?.Poster && omdbData.Poster !== 'N/A' ? omdbData.Poster : undefined);

  if (!poster) {
    reasons.push('Missing poster artwork.');
  }

  // 6. Metadata extraction without invented fallbacks
  const directorRaw =
    (tier1Data.credits?.crew?.find(c => c.job === 'Director')?.name) ||
    (Array.isArray(tier1Data.directors) && tier1Data.directors.length > 0 ? tier1Data.directors.join(', ') : undefined) ||
    (omdbData?.Director && omdbData.Director !== 'N/A' ? omdbData.Director : undefined);
  const director = directorRaw && directorRaw !== 'N/A' ? directorRaw : undefined;

  let starring = undefined;
  if (Array.isArray(tier1Data.credits?.cast) && tier1Data.credits.cast.length > 0) {
    starring = tier1Data.credits.cast.slice(0, 3).map(c => c.name);
  } else if (Array.isArray(tier1Data.cast) && tier1Data.cast.length > 0) {
    starring = tier1Data.cast.slice(0, 3);
  } else if (omdbData?.Actors && omdbData.Actors !== 'N/A') {
    const actorsList = omdbData.Actors.split(',').map(s => s.trim()).filter(Boolean);
    if (actorsList.length > 0) starring = actorsList.slice(0, 3);
  }

  const rawLang = tier1Data.original_language || (omdbData?.Language && omdbData.Language !== 'N/A' ? omdbData.Language : undefined);
  const industry = mapLanguageToIndustry(rawLang);

  let imdbRating = undefined;
  let imdbVotes = undefined;
  if (omdbData?.imdbRating && omdbData.imdbRating !== 'N/A') {
    imdbRating = String(omdbData.imdbRating);
    if (omdbData.imdbVotes && omdbData.imdbVotes !== 'N/A') {
      const v = parseInt(omdbData.imdbVotes.replace(/,/g, ''), 10);
      if (v > 0) {
        imdbVotes = `${v.toLocaleString()} votes`;
      }
    }
  }

  const overview =
    (omdbData?.Plot && omdbData.Plot !== 'N/A' ? omdbData.Plot : undefined) ||
    tier1Data.overview ||
    undefined;

  // Trailer: YouTube trailer/teaser from API
  let trailerYoutubeId = undefined;
  if (Array.isArray(tier1Data.videos?.results)) {
    const officialTrailer = tier1Data.videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.official && v.key);
    const anyTrailer = tier1Data.videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.key);
    const officialTeaser = tier1Data.videos.results.find(v => v.site === 'YouTube' && v.type === 'Teaser' && v.official && v.key);
    const anyTeaser = tier1Data.videos.results.find(v => v.site === 'YouTube' && v.type === 'Teaser' && v.key);
    const anyVideo = tier1Data.videos.results.find(v => v.site === 'YouTube' && v.key);
    const chosen = officialTrailer || anyTrailer || officialTeaser || anyTeaser || anyVideo;
    if (chosen) trailerYoutubeId = chosen.key;
  } else if (tier1Data.trailerYoutubeId) {
    trailerYoutubeId = tier1Data.trailerYoutubeId;
  }

  const trailerUrl = trailerYoutubeId ? `https://www.youtube.com/watch?v=${trailerYoutubeId}` : undefined;

  const isOk = reasons.length === 0;

  let cleanedMovie = null;
  if (isOk && verifiedYMD) {
    const rawDateISO = formatYMD(verifiedYMD);
    const statusResult = getReleaseStatus(rawDateISO, formatYMD(todayYMD));
    const statusText = statusResult.status;

    // Safety check on status format
    const isValidStatus =
      statusText.startsWith('Releasing in ') ||
      statusText === 'Releasing Today' ||
      (statusText.startsWith('Released ') && statusText.includes('Now in Theaters'));

    if (!isValidStatus) {
      return {
        ok: false,
        reasons: [`Invalid release status generated: "${statusText}".`],
        flags,
        cleanedMovie: null
      };
    }

    const finalTitle = tier1Data.title || tier1Data.original_title || omdbData?.Title;

    cleanedMovie = {
      id: imdbId,
      imdbId,
      title: finalTitle,
      year: statedYear,
      releaseDate: rawDateISO,
      // Provenance metadata (Part 4 Rule 3)
      rawDate: rawDateISO,
      dateSource: 'TMDB (IN Theatrical)',
      dateCountry,
      dateType: dateType || 3,
      fetchedAt: new Date().toISOString(),
      dateConflict,
      status: statusText,
      releaseStatus: statusText,
      industry,
      director,
      starring,
      language: rawLang,
      posterUrl: poster,
      discArtUrl: poster,
      imdbRating,
      imdbVotes,
      overview,
      runtime: (omdbData?.Runtime && omdbData.Runtime !== 'N/A' ? omdbData.Runtime : (tier1Data.runtime ? `${tier1Data.runtime} min` : undefined)),
      genre: (omdbData?.Genre && omdbData.Genre !== 'N/A' ? omdbData.Genre : undefined),
      imdbUrl: `https://www.imdb.com/title/${imdbId}/`,
      trailerUrl,
      trailerYoutubeId,
      popularity: tier1Data.popularity || 0,
      countriesCount: Array.isArray(tier1Data.release_dates?.results) ? tier1Data.release_dates.results.length : 1,
      revenue: tier1Data.revenue || 0,
      budget: tier1Data.budget || 0
    };
  }

  return {
    ok: isOk,
    reasons,
    flags,
    cleanedMovie
  };
}
