/**
 * Suggests trigger tags from a free-text meal description (English and Portuguese).
 * Runs entirely on the device: plain keyword matching with simple plural, negation
 * ("sem leite", "no coffee") and "gluten-free / sem lactose / decaf" handling.
 */

interface FoodEntry {
  /** Words or phrases that identify the food (accents and case are ignored). */
  terms: string[]
  tags: string[]
}

const COFFEE = 'coffee'
const ALCOHOL = 'alcohol'
const FAT = 'high-fat meal'
const GLUTEN = 'gluten'
const DAIRY = 'dairy'
const FODMAP = 'high-FODMAP'
const SPICY = 'spicy'
const LARGE = 'large meal'
const OUT = 'eating out'

export const FOOD_DICTIONARY: FoodEntry[] = [
  // Coffee
  { terms: ['coffee', 'espresso', 'americano', 'cafe', 'bica', 'abatanado', 'carioca', 'cafe pingado', 'pingo', 'expresso'], tags: [COFFEE] },
  { terms: ['latte', 'cappuccino', 'flat white', 'macchiato', 'mocha', 'galao', 'meia de leite', 'cafe com leite'], tags: [COFFEE, DAIRY] },
  { terms: ['energy drink', 'red bull', 'monster'], tags: [COFFEE] },

  // Alcohol
  { terms: ['beer', 'lager', 'ale', 'ipa', 'cerveja', 'imperial', 'imperiais', 'caneca', 'super bock', 'sagres'], tags: [ALCOHOL, GLUTEN] },
  {
    terms: [
      'wine', 'red wine', 'white wine', 'prosecco', 'champagne', 'cava', 'cider', 'vodka', 'gin', 'tonic', 'whisky', 'whiskey', 'rum', 'tequila',
      'cocktail', 'sangria', 'spritz', 'mojito', 'margarita', 'vinho', 'vinho verde', 'vinho do porto', 'espumante', 'sidra', 'aguardente',
      'licor', 'ginja', 'shot', 'shots', 'medronho', 'poncha',
    ],
    tags: [ALCOHOL],
  },

  // Dairy
  {
    terms: [
      'milk', 'cheese', 'yogurt', 'yoghurt', 'ice cream', 'custard', 'milkshake', 'cream cheese', 'mozzarella', 'cheddar', 'parmesan', 'brie',
      'ricotta', 'mascarpone', 'leite', 'queijo', 'iogurte', 'gelado', 'requeijao', 'leite creme', 'arroz doce', 'pudim', 'natas do ceu',
      'queijo fresco', 'kefir',
    ],
    tags: [DAIRY],
  },
  { terms: ['cream', 'butter', 'natas', 'manteiga', 'molho branco', 'bechamel', 'carbonara', 'alfredo'], tags: [DAIRY, FAT] },

  // Gluten
  {
    terms: [
      'bread', 'toast', 'sandwich', 'baguette', 'bagel', 'wrap', 'tortilla', 'pasta', 'spaghetti', 'macaroni', 'lasagna', 'lasagne', 'noodles',
      'ramen', 'cake', 'biscuit', 'cookie', 'cracker', 'cereal', 'granola', 'muesli', 'couscous', 'bulgur', 'wheat', 'barley', 'rye', 'seitan',
      'muffin', 'pancake', 'waffle', 'brownie', 'pie', 'dumpling', 'pao', 'paes', 'torrada', 'tosta', 'sandes', 'sanduiche', 'papo seco',
      'carcaca', 'broa', 'massa', 'esparguete', 'macarrao', 'bolo', 'bolacha', 'biscoito', 'cereais', 'cuscuz', 'trigo', 'cevada', 'centeio',
      'panqueca', 'prego', 'bifana', 'gluten',
    ],
    tags: [GLUTEN],
  },
  { terms: ['croissant', 'pastry', 'donut', 'doughnut', 'pastel de nata', 'pasteis de nata', 'bola de berlim', 'folhado', 'pao de deus'], tags: [GLUTEN, FAT] },
  { terms: ['pizza'], tags: [GLUTEN, FAT, DAIRY] },
  { terms: ['francesinha'], tags: [GLUTEN, FAT, DAIRY, LARGE] },
  { terms: ['lasanha'], tags: [GLUTEN, FAT, DAIRY] },

  // High fat
  {
    terms: [
      'fried', 'fries', 'chips', 'burger', 'hamburger', 'cheeseburger', 'bacon', 'sausage', 'chorizo', 'salami', 'pepperoni', 'kebab', 'nuggets',
      'fried chicken', 'mayonnaise', 'mayo', 'hot dog', 'pork belly', 'ribs', 'fast food', 'frito', 'frita', 'fritos', 'fritas',
      'batatas fritas', 'hamburguer', 'salsicha', 'chourico', 'alheira', 'farinheira', 'morcela', 'presunto', 'torresmos', 'entrecosto',
      'leitao', 'cozido', 'maionese', 'panado', 'panados', 'croquete', 'rissol', 'rissois', 'pasteis de bacalhau', 'bolinhos de bacalhau',
      'cachorro', 'enchidos', 'chocolate', 'nutella',
    ],
    tags: [FAT],
  },
  { terms: ['feijoada', 'dobrada', 'tripas'], tags: [FAT, FODMAP] },

  // High FODMAP
  {
    terms: [
      'onion', 'garlic', 'leek', 'shallot', 'beans', 'lentils', 'chickpeas', 'hummus', 'peas', 'apple', 'pear', 'mango', 'watermelon', 'cherries',
      'peach', 'plum', 'apricot', 'nectarine', 'dried fruit', 'cauliflower', 'mushroom', 'asparagus', 'artichoke', 'honey', 'cashew', 'pistachio',
      'agave', 'sorbitol', 'xylitol', 'sugar free gum', 'cebola', 'alho', 'alho frances', 'feijao', 'feijoes', 'lentilhas', 'grao', 'grao de bico',
      'ervilhas', 'favas', 'maca', 'pera', 'manga', 'melancia', 'cerejas', 'pessego', 'ameixa', 'damasco', 'diospiro', 'figo', 'figos',
      'couve flor', 'cogumelos', 'espargos', 'alcachofra', 'mel', 'caju', 'pistacio', 'pastilha elastica', 'pastilhas',
    ],
    tags: [FODMAP],
  },

  // Spicy
  {
    terms: [
      'spicy', 'chili', 'chilli', 'curry', 'hot sauce', 'jalapeno', 'sriracha', 'tabasco', 'harissa', 'vindaloo', 'picante', 'piri piri',
      'piripiri', 'malagueta', 'caril', 'jindungo', 'pimenta caiena',
    ],
    tags: [SPICY],
  },

  // Large meal
  {
    terms: [
      'large meal', 'big meal', 'huge meal', 'large portion', 'big portion', 'huge portion', 'buffet', 'all you can eat', 'second helping',
      'seconds', 'two plates', 'feast', 'ate a lot', 'ate too much', 'overate', 'stuffed', 'rodizio', 'repeti', 'dois pratos', 'banquete',
      'refeicao grande', 'prato grande', 'dose grande', 'comi muito', 'comi demais', 'fartei me', 'enfartado', 'enfartada',
    ],
    tags: [LARGE],
  },

  // Eating out
  {
    terms: [
      'restaurant', 'takeaway', 'take away', 'takeout', 'delivery', 'uber eats', 'glovo', 'bolt food', 'mcdonalds', 'burger king', 'kfc',
      'telepizza', 'pizza hut', 'nandos', 'five guys', 'subway', 'food court', 'ate out', 'eating out', 'dinner out', 'lunch out', 'restaurante',
      'tasca', 'churrasqueira', 'marisqueira', 'cervejaria', 'cantina', 'pastelaria', 'jantar fora', 'almoco fora', 'comi fora', 'jantei fora',
      'almocei fora', 'sushi',
    ],
    tags: [OUT],
  },
]

const NEGATIONS = new Set(['no', 'not', 'without', 'skip', 'skipped', 'avoided', 'zero', 'sem', 'nao', 'nada', 'nenhum', 'nenhuma', 'evitei'])

/** Phrases that cancel a tag for everything in the same part of the sentence. */
const CANCELLERS: { phrases: string[]; tag: string }[] = [
  { phrases: ['gluten free', 'glutenfree', 'sem gluten', 'isento de gluten'], tag: GLUTEN },
  { phrases: ['lactose free', 'sem lactose', 'dairy free', 'plant milk', 'oat milk', 'soy milk', 'almond milk', 'bebida vegetal', 'leite de aveia', 'leite de soja', 'leite de amendoa'], tag: DAIRY },
  { phrases: ['decaf', 'decaffeinated', 'descafeinado'], tag: COFFEE },
  { phrases: ['alcohol free', 'non alcoholic', 'sem alcool', 'zero alcool', '0 0'], tag: ALCOHOL },
]

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const tokenize = (s: string) => normalize(s).split(' ').filter(Boolean)

/**
 * Splits on punctuation and on "and / with / e / com / plus", so modifiers apply locally.
 * `shown` keeps the user's own spelling (accents) of each token, for display.
 */
function segments(text: string): { tokens: string[]; shown: string[] }[] {
  return text
    .toLowerCase()
    .split(/[;!?\n]+|[,.](?!\d)|\s(?:and|with|plus|e|com)\s|\+/)
    .map((seg) => {
      const tokens = tokenize(seg)
      const shown = seg.replace(/['’]/g, '').split(/[^\p{L}\p{N}]+/u).filter(Boolean)
      return { tokens, shown: shown.length === tokens.length ? shown : tokens }
    })
    .filter((s) => s.tokens.length)
}

function containsPhrase(tokens: string[], phrase: string[]): boolean {
  for (let i = 0; i + phrase.length <= tokens.length; i++) if (phrase.every((p, j) => tokens[i + j] === p)) return true
  return false
}

/** Index of each occurrence of `term` in tokens, allowing a plural -s/-es on the last word. */
function findTerm(tokens: string[], term: string[]): number[] {
  const hits: number[] = []
  const last = term.length - 1
  for (let i = 0; i + term.length <= tokens.length; i++) {
    const ok = term.every((t, j) => {
      const tok = tokens[i + j]
      return tok === t || (j === last && (tok === `${t}s` || tok === `${t}es`))
    })
    if (ok) hits.push(i)
  }
  return hits
}

export interface FoodMatch {
  /** The recognised food, as the user wrote it (lower-case). */
  term: string
  tags: string[]
}

export interface MealAnalysis {
  matches: FoodMatch[]
  tags: string[]
}

/**
 * @param extraTags the user's own trigger tags; a tag whose name appears in the text is suggested too.
 */
export function analyzeMeal(text: string, extraTags: string[] = []): MealAnalysis {
  const entries: FoodEntry[] = [...FOOD_DICTIONARY, ...extraTags.map((t) => ({ terms: [t], tags: [t] }))]
  // Longest phrases first, so "ice cream" wins over "cream" and "fried chicken" over "fried".
  const candidates = entries
    .flatMap((e) => e.terms.map((term) => ({ term: tokenize(term), tags: e.tags })))
    .filter((c) => c.term.length)
    .sort((a, b) => b.term.length - a.term.length)
  const byTerm = new Map<string, Set<string>>()

  for (const { tokens: seg, shown } of segments(text)) {
    const cancelled = new Set(CANCELLERS.filter((c) => c.phrases.some((p) => containsPhrase(seg, tokenize(p)))).map((c) => c.tag))
    const taken = new Set<number>() // token positions already claimed by a longer phrase
    for (const c of candidates) {
      for (const at of findTerm(seg, c.term)) {
        const span = c.term.map((_, j) => at + j)
        if (span.some((p) => taken.has(p))) continue
        const negated = seg.slice(Math.max(0, at - 2), at).some((t) => NEGATIONS.has(t))
        span.forEach((p) => taken.add(p))
        if (negated) continue
        const tags = c.tags.filter((t) => !cancelled.has(t))
        if (!tags.length) continue
        const key = shown.slice(at, at + c.term.length).join(' ')
        byTerm.set(key, new Set([...(byTerm.get(key) ?? []), ...tags]))
      }
    }
  }

  const matches = [...byTerm.entries()].map(([term, tags]) => ({ term, tags: [...tags] }))
  return { matches, tags: [...new Set(matches.flatMap((m) => m.tags))] }
}
