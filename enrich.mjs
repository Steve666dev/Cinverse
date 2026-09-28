import fs from 'fs';

const movies = [
  {id: 0, t:"Inception", y:2010, g:"Sci-Fi · Thriller", r:8.8, runtime:148, dir:"Christopher Nolan", tagline:"The deeper you go, the harder it is to wake up.", blurb:"A thief who steals secrets through dream-sharing technology is offered a shot at redemption: plant an idea instead of stealing one.", mood:["mindbending","thrilling"], motif:"scifi", trailerUrl:"https://www.youtube.com/embed/YoHD9XEInc0"},
  {id: 1, t:"Parasite", y:2019, g:"Thriller · Drama", r:8.5, runtime:132, dir:"Bong Joon-ho", tagline:"Two families, one house, no boundaries.", blurb:"A struggling family cons its way into the household of a wealthy one, and the class divide starts to crack open in unexpected ways.", mood:["mindbending","epic"], motif:"mystery", trailerUrl:"https://www.youtube.com/embed/SEUXfv87Wpk"},
  {id: 2, t:"The Grand Budapest Hotel", y:2014, g:"Comedy · Drama", r:8.1, runtime:99, dir:"Wes Anderson", tagline:"Manners maketh murder mystery.", blurb:"A legendary concierge and his protégé get tangled in a stolen painting, a suspicious death, and a hotel full of secrets between the wars.", mood:["cozy","feelgood"], motif:"comedy", trailerUrl:"https://www.youtube.com/embed/1Fg5iWmQjwk"},
  {id: 3, t:"Mad Max: Fury Road", y:2015, g:"Action", r:8.1, runtime:120, dir:"George Miller", tagline:"Run, or be run down.", blurb:"In a scorched wasteland, a rogue warrior and an ex-commander make a break for freedom across miles of chaos and chrome.", mood:["thrilling","epic"], motif:"action", trailerUrl:"https://www.youtube.com/embed/hEJnMQG9ev8"},
  {id: 4, t:"Spirited Away", y:2001, g:"Animation · Fantasy", r:8.6, runtime:125, dir:"Hayao Miyazaki", tagline:"Some doors should stay closed.", blurb:"A ten-year-old wanders into a bathhouse for spirits and has to work her way back to the world she knows.", mood:["cozy","mindbending"], motif:"fantasy", trailerUrl:"https://www.youtube.com/embed/ByXuk9QqQkk"},
  {id: 5, t:"The Dark Knight", y:2008, g:"Action · Crime", r:9.0, runtime:152, dir:"Christopher Nolan", tagline:"Order has a price.", blurb:"A vigilante, a prosecutor, and an agent of chaos collide over the soul of a city that's stopped trusting all three.", mood:["thrilling","epic"], motif:"action", trailerUrl:"https://www.youtube.com/embed/EXeTwQWrcwY"},
  {id: 6, t:"Amélie", y:2001, g:"Romance · Comedy", r:8.3, runtime:122, dir:"Jean-Pierre Jeunet", tagline:"Small acts, big consequences.", blurb:"A shy Parisian waitress starts quietly fixing the lives around her — until she has to fix her own.", mood:["cozy","feelgood"], motif:"comedy", trailerUrl:"https://www.youtube.com/embed/HUECWi5pX7o"},
  {id: 7, t:"Interstellar", y:2014, g:"Sci-Fi · Drama", r:8.7, runtime:169, dir:"Christopher Nolan", tagline:"Home is worth the distance.", blurb:"As Earth runs out of time, a pilot leaves his family behind to search the stars for somewhere left to live.", mood:["mindbending","epic"], motif:"scifi", trailerUrl:"https://www.youtube.com/embed/zSWdZVtXT7E"},
  {id: 8, t:"La La Land", y:2016, g:"Musical · Romance", r:8.0, runtime:128, dir:"Damien Chazelle", tagline:"Chase the dream, not just each other.", blurb:"A jazz pianist and an aspiring actress fall for each other in a city built on almosts.", mood:["feelgood","cozy"], motif:"music", trailerUrl:"https://www.youtube.com/embed/0pdqf4P9MB8"},
  {id: 9, t:"Get Out", y:2017, g:"Horror · Thriller", r:7.7, runtime:104, dir:"Jordan Peele", tagline:"Meeting the parents was never this dangerous.", blurb:"A weekend visiting his girlfriend's family turns from awkward to something far more sinister.", mood:["thrilling","mindbending"], motif:"horror", trailerUrl:"https://www.youtube.com/embed/DzfpyUB60YY"},
  {id: 10, t:"Whiplash", y:2014, g:"Drama · Music", r:8.5, runtime:106, dir:"Damien Chazelle", tagline:"Greatness costs more than talent.", blurb:"A young drummer's shot at greatness comes with a teacher who believes cruelty is a training method.", mood:["thrilling"], motif:"music", trailerUrl:"https://www.youtube.com/embed/7d_jQycdQGo"},
  {id: 11, t:"Coco", y:2017, g:"Animation · Family", r:8.4, runtime:105, dir:"Lee Unkrich", tagline:"Family doesn't end at the door to the dead.", blurb:"A boy who dreams of being a musician crosses into the Land of the Dead to find the truth about his family.", mood:["feelgood","cozy"], motif:"fantasy", trailerUrl:"https://www.youtube.com/embed/Rvr68u6k5sI"},
  {id: 12, t:"Blade Runner 2049", y:2017, g:"Sci-Fi", r:8.0, runtime:164, dir:"Denis Villeneuve", tagline:"Some truths were built to stay buried.", blurb:"A new-model blade runner unearths a secret that could unravel what's left of society's order.", mood:["mindbending","epic"], motif:"scifi", trailerUrl:"https://www.youtube.com/embed/gCcx85zbxz4"},
  {id: 13, t:"Knives Out", y:2019, g:"Mystery · Comedy", r:7.9, runtime:130, dir:"Rian Johnson", tagline:"Everyone's a suspect. Everyone's lying.", blurb:"A famous novelist's death brings his eccentric family together — and a detective who trusts no one's story.", mood:["thrilling","feelgood"], motif:"mystery", trailerUrl:"https://www.youtube.com/embed/qGqiHJTsRkQ"},
  {id: 14, t:"The Shawshank Redemption", y:1994, g:"Drama", r:9.3, runtime:142, dir:"Frank Darabont", tagline:"Hope is the last thing they can take.", blurb:"A banker wrongly convicted of murder finds an unlikely kind of freedom inside the walls that are meant to break him.", mood:["epic","feelgood"], motif:"drama", trailerUrl:"https://www.youtube.com/embed/6hB3S9bIaco"},
  {id: 15, t:"Everything Everywhere All at Once", y:2022, g:"Sci-Fi · Comedy", r:7.8, runtime:139, dir:"Daniel Kwan & Daniel Scheinert", tagline:"Every choice is another you.", blurb:"An overwhelmed laundromat owner discovers she can access the lives of every version of herself across the multiverse.", mood:["mindbending","thrilling"], motif:"scifi", trailerUrl:"https://www.youtube.com/embed/wxN1T1uxQ2g"},
  {id: 16, t:"Howl's Moving Castle", y:2004, g:"Fantasy · Animation", r:8.2, runtime:119, dir:"Hayao Miyazaki", tagline:"Cursed, but not done growing up.", blurb:"A young woman cursed with an old body finds refuge in a wizard's walking castle — and a way to break the spell.", mood:["cozy","mindbending"], motif:"fantasy", trailerUrl:"https://www.youtube.com/embed/iwROgK94zcM"},
  {id: 17, t:"Dune", y:2021, g:"Sci-Fi · Adventure", r:8.0, runtime:155, dir:"Denis Villeneuve", tagline:"The spice is only the beginning.", blurb:"A duke's son is thrust into a desert planet's war over a resource that controls the fate of the galaxy.", mood:["epic","thrilling"], motif:"scifi", trailerUrl:"https://www.youtube.com/embed/n9xhKvBWxl4"}
];

const mockReviews = [
  { author: "CinematicVoyager", rating: 5, text: "An absolute masterpiece. The pacing, the cinematography, everything is flawless." },
  { author: "MovieBuff99", rating: 4, text: "Really enjoyed it! The third act was a bit slow, but overall a fantastic experience." },
  { author: "TheCriticalEye", rating: 5, text: "I've watched this five times and I still find new details. Truly transcendent filmmaking." }
];

async function enrich() {
  const enriched = [];
  for (const m of movies) {
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(m.t)}&entity=movie&limit=1`);
      const data = await res.json();
      let img = "";
      if (data.results && data.results.length > 0) {
        // use higher res
        img = data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
      }
      enriched.push({
        ...m,
        img: img || undefined,
        reviews: mockReviews
      });
    } catch(_e) {
      console.log('Failed for', m.t);
      enriched.push({...m, reviews: mockReviews});
    }
  }

  const output = `import type { Movie } from '../types';\n\nexport const MOVIES: Movie[] = ${JSON.stringify(enriched, null, 2)};\n\nexport const SCIFI_TITLES = ["Inception","Interstellar","Blade Runner 2049","Dune","Spirited Away","Howl's Moving Castle","Everything Everywhere All at Once"];\n`;

  fs.writeFileSync('src/data/movies.ts', output);
  console.log('Done enriching movies.ts');
}

enrich();
