/**
 * Semantic Knowledge Engine & Dynamic Conceptual Association Generator
 * Integrates curated domain graphs, live Datamuse linguistic triggers,
 * and target-guided bridging algorithms.
 */

// Curated bidirectional graph of core conceptual relations for fast, rich lookups
const KNOWLEDGE_GRAPH = {
  "coffee": ["Caffeine", "Espresso", "Brewing", "Morning", "Energy", "Roasting", "Agriculture"],
  "caffeine": ["Stimulants", "Sleep", "Adenosine", "Neuroscience", "Energy", "Coffee", "Tea"],
  "tea": ["Caffeine", "Herbs", "Culture", "Water", "Antioxidants", "Tradition"],
  "brewing": ["Coffee", "Fermentation", "Chemistry", "Temperature", "Extraction", "Beer"],
  "morning": ["Coffee", "Sun", "Circadian Rhythm", "Time", "Dawn", "Daily Routine"],
  "energy": ["Thermodynamics", "Physics", "Metabolism", "Electricity", "Light", "Work"],
  "stimulants": ["Caffeine", "Dopamine", "Central Nervous System", "Pharmacology", "Alertness"],
  "sleep": ["Dreams", "Circadian Rhythm", "Consciousness", "Rest", "Adenosine", "Brainwaves"],
  "adenosine": ["Sleep", "Cellular Energy", "ATP", "Biochemistry", "Neurochemistry"],
  "neuroscience": ["Brain", "Consciousness", "Synapses", "Cognition", "Psychology", "Neurotransmitters"],
  "brain": ["Neurons", "Consciousness", "Memory", "Neuroscience", "Intelligence", "Mind"],
  "dreams": ["Sleep", "Consciousness", "Subconscious", "Memory", "Imagination", "Psychology"],
  "consciousness": ["Mind", "Philosophy", "Perception", "Neuroscience", "Reality", "Self-awareness"],
  "mind": ["Consciousness", "Thought", "Brain", "Philosophy of Mind", "Cognition"],
  "philosophy": ["Ethics", "Logic", "Epistemology", "Reality", "Existentialism", "Metaphysics"],
  "reality": ["Physics", "Perception", "Philosophy", "Space-Time", "Quantum Mechanics", "Matter"],
  "perception": ["Senses", "Reality", "Brain", "Light", "Psychology", "Illusion"],
  "physics": ["Matter", "Energy", "Gravity", "Quantum Mechanics", "Space-Time", "Forces", "Astrophysics"],
  "matter": ["Atoms", "Mass", "Physics", "Density", "Molecules", "State of Matter"],
  "gravity": ["Space-Time", "Mass", "General Relativity", "Black Holes", "Orbits", "Physics"],
  "space-time": ["General Relativity", "Gravity", "Wormholes", "Dimensions", "Cosmology", "Speed of Light"],
  "black holes": ["Singularity", "Event Horizon", "Gravity", "General Relativity", "Astrophysics", "Hawking Radiation"],
  "stars": ["Nuclear Fusion", "Sun", "Supernova", "Light", "Hydrogen", "Astrophysics"],
  "sun": ["Solar System", "Light", "Photosynthesis", "Morning", "Stars", "Heat"],
  "food": ["Cooking", "Agriculture", "Nutrition", "Pizza", "Metabolism", "Culture"],
  "pizza": ["Cheese", "Baking", "Wheat", "Food", "Fermentation", "Italian Cuisine", "Crust"],
  "cheese": ["Milk", "Fermentation", "Bacteria", "Dairy", "Protein", "Pizza"],
  "earth": ["Atmosphere", "Oceans", "Geology", "Biosphere", "Solar System", "Moon"],
  "moon": ["Tides", "Orbits", "Apollo", "Crater", "Night", "Astronomy", "Gravity"],
  "night": ["Moon", "Stars", "Sleep", "Darkness", "Nocturnal", "Midnight"],
  "nocturnal": ["Night", "Predator", "Bats", "Owls", "Animals", "Moon"],
  "oceans": ["Water", "Marine Biology", "Tides", "Currents", "Ecosystems", "Fish"],
  "water": ["Molecules", "Hydrogen", "Oxygen", "Solvent", "Oceans", "Life"],
  "atoms": ["Electrons", "Protons", "Neutrons", "Molecules", "Quantum Mechanics", "Nucleus"],
  "quantum mechanics": ["Subatomic Particles", "Wave-Particle Duality", "Superposition", "Atoms", "Physics"],
  "light": ["Electromagnetic Waves", "Photons", "Optics", "Vision", "Sun", "Speed of Light"],
  "wi-fi": ["Wireless Networks", "Internet", "Radio Waves", "Routers", "Protocols"],
  "internet": ["World Wide Web", "Networks", "Data", "Servers", "Information Age", "Wi-Fi"],
  "social media": ["Algorithms", "TikTok", "Digital Culture", "Content Creation", "Networks"],
  "tiktok": ["Short-form Video", "Algorithms", "Social Media", "Attention Economy", "Trends"],
  "algorithms": ["Computer Science", "Mathematics", "Data Structures", "Artificial Intelligence", "Logic"],
  "dinosaurs": ["Fossils", "Extinction", "Paleontology", "Evolution", "Reptiles", "Jurassic"],
  "fossils": ["Paleontology", "Dinosaurs", "Sedimentary Rock", "Deep Time", "Geology"],
  "evolution": ["Natural Selection", "Dinosaurs", "Fossils", "DNA", "Adaptation"],
  "mars": ["Red Planet", "Space Exploration", "Rockets", "Solar System", "Astronomy", "Rovers"],
  "dog": ["Canine", "Puppy", "Bark", "Breeds", "Mammals", "Domestic Animal", "Leash"],
  "cat": ["Feline", "Kitten", "Purr", "Whiskers", "Carnivore", "Paws", "Nocturnal"],
  "guitar": ["Acoustic", "Strings", "Chords", "Music", "Electric Guitar", "Amplifier", "Instrument"],
  "music": ["Sound", "Rhythm", "Harmony", "Instruments", "Acoustics", "Melody"],
  "sound": ["Vibrations", "Acoustics", "Frequencies", "Music", "Ears", "Waves"],
  "airplane": ["Flight", "Aviation", "Aerodynamics", "Wings", "Jet Engine", "Travel", "Sky"],
  "flight": ["Aerodynamics", "Birds", "Sky", "Airplane", "Atmosphere", "Lift"],
  "tree": ["Forest", "Wood", "Leaves", "Bark", "Photosynthesis", "Branches", "Botany"],
  "forest": ["Trees", "Ecosystem", "Wildlife", "Canopy", "Nature", "Woodland"]
};

export function normalizeConcept(str) {
  if (!str) return "";
  return str.trim().toLowerCase();
}

export function formatConceptName(str) {
  if (!str) return "";
  return str
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Fetches statistically associated triggers and topical terms from Datamuse
 */
async function fetchDatamuseTriggers(concept) {
  const norm = normalizeConcept(concept);
  const cleanTerm = encodeURIComponent(norm);

  try {
    const [trgRes, jjaRes] = await Promise.all([
      fetch(`https://api.datamuse.com/words?rel_trg=${cleanTerm}&max=35`, { signal: AbortSignal.timeout(3500) }).then(r => r.json()).catch(() => []),
      fetch(`https://api.datamuse.com/words?rel_jja=${cleanTerm}&max=20`, { signal: AbortSignal.timeout(3500) }).then(r => r.json()).catch(() => [])
    ]);

    const seenStems = new Set([norm.replace(/s$/, '')]);
    const results = [];

    // Filter and sanitize words
    for (const item of [...trgRes, ...jjaRes]) {
      if (!item.word) continue;
      const cleanWord = item.word.replace(/[^a-zA-Z\s-]/g, '').trim();
      const lower = cleanWord.toLowerCase();
      const stem = lower.replace(/s$/, '');

      // Avoid self-references, very short words, noise words
      if (
        cleanWord.length >= 3 &&
        !seenStems.has(stem) &&
        !lower.includes(norm) &&
        !norm.includes(lower) &&
        !['the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'over'].includes(lower)
      ) {
        seenStems.add(stem);
        results.push({
          name: formatConceptName(cleanWord),
          raw: lower,
          score: item.score || 1000
        });
      }
    }

    return results;
  } catch (err) {
    return [];
  }
}

/**
 * Dynamically generates 3-5 directly related concepts around currentConcept,
 * ensuring options are genuinely similar and connected to currentConcept,
 * while selecting choices that naturally lead toward destinationConcept.
 */
export async function getSemanticNeighbors(currentConcept, destinationConcept = null, visitedNodes = new Set()) {
  const normCurrent = normalizeConcept(currentConcept);
  const normDest = destinationConcept ? normalizeConcept(destinationConcept) : null;

  const candidateMap = new Map();

  // 1. Check curated knowledge graph first
  if (KNOWLEDGE_GRAPH[normCurrent]) {
    for (const neighbor of KNOWLEDGE_GRAPH[normCurrent]) {
      const normN = normalizeConcept(neighbor);
      candidateMap.set(normN, {
        name: formatConceptName(neighbor),
        raw: normN,
        score: 3000,
        strength: 0.95
      });
    }
  }

  // 2. Fetch live statistical associations from Datamuse for ANY word
  const liveNeighbors = await fetchDatamuseTriggers(currentConcept);
  for (const item of liveNeighbors) {
    if (!candidateMap.has(item.raw)) {
      candidateMap.set(item.raw, {
        name: item.name,
        raw: item.raw,
        score: item.score,
        strength: Math.min(0.92, Math.max(0.72, +(item.score / 2000).toFixed(2)))
      });
    }
  }

  // 3. Fallback if offline or very rare term
  if (candidateMap.size < 3) {
    const fallbacks = [
      `${currentConcept} Structure`,
      `${currentConcept} System`,
      `Design`,
      `Function`
    ];
    for (const f of fallbacks) {
      const normF = normalizeConcept(f);
      if (!candidateMap.has(normF)) {
        candidateMap.set(normF, {
          name: formatConceptName(f),
          raw: normF,
          score: 800,
          strength: 0.75
        });
      }
    }
  }

  // 4. Rank candidates:
  // - High score for direct relevance to currentConcept
  // - Check if destination is directly among the candidates
  // - Check if any candidate has direct link to destination
  const ranked = Array.from(candidateMap.values()).map(c => {
    let destAffinity = 0;

    if (normDest) {
      if (c.raw === normDest) {
        destAffinity = 5000; // Immediate destination match!
      } else if (KNOWLEDGE_GRAPH[c.raw] && KNOWLEDGE_GRAPH[c.raw].some(n => normalizeConcept(n) === normDest)) {
        destAffinity = 2000; // 1-step away from destination!
      }
    }

    let penalty = visitedNodes.has(c.raw) ? 0.4 : 1.0;
    let finalScore = (c.score + destAffinity) * penalty;

    return {
      name: c.name,
      raw: c.raw,
      finalScore,
      strength: c.strength,
      isDirectDest: normDest && c.raw === normDest
    };
  });

  // Sort by composite score
  ranked.sort((a, b) => b.finalScore - a.finalScore);

  // Take 4 to 5 genuine neighbors directly connected to currentConcept
  const selectedCount = Math.min(5, Math.max(3, ranked.length));
  const selected = ranked.slice(0, selectedCount);

  // If destination is in the candidate pool, ensure it is included
  if (normDest && ranked.some(r => r.isDirectDest) && !selected.some(s => s.isDirectDest)) {
    const destCandidate = ranked.find(r => r.isDirectDest);
    selected[selected.length - 1] = destCandidate;
  }

  return {
    concept: formatConceptName(currentConcept),
    related_concepts: selected.map(item => ({
      name: item.name,
      relationship_strength: item.strength,
      rationale: `Direct semantic association to ${formatConceptName(currentConcept)}`
    }))
  };
}

/**
 * Curated interesting pairs for "RANDOM DRIFT"
 */
export const CURATED_RANDOM_PAIRS = [
  { start: "Guitar", destination: "Mars" },
  { start: "Cat", destination: "Moon" },
  { start: "Coffee", destination: "Black Holes" },
  { start: "Dinosaurs", destination: "TikTok" },
  { start: "Shakespeare", destination: "Wi-Fi" },
  { start: "Pizza", destination: "Quantum Mechanics" },
  { start: "Airplane", destination: "Forest" },
  { start: "Bananas", destination: "Nuclear Physics" },
  { start: "Volcanoes", destination: "Video Games" },
  { start: "Origami", destination: "Mars Colony" }
];

export function getRandomDriftPair() {
  const randomIndex = Math.floor(Math.random() * CURATED_RANDOM_PAIRS.length);
  return CURATED_RANDOM_PAIRS[randomIndex];
}
