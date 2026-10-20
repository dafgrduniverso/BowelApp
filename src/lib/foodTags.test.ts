import { describe, expect, it } from 'vitest'
import { analyzeMeal } from './foodTags'

const tags = (text: string, extra: string[] = []) => analyzeMeal(text, extra).tags.sort()

describe('meal → trigger tags', () => {
  it('English meal', () => {
    expect(tags('Pizza and two beers at a restaurant')).toEqual(['alcohol', 'dairy', 'eating out', 'gluten', 'high-fat meal'])
  })
  it('Portuguese meal with accents', () => {
    expect(tags('Francesinha com batatas fritas e uma imperial')).toEqual(['alcohol', 'dairy', 'gluten', 'high-fat meal', 'large meal'])
    expect(tags('Bica e um pastel de nata')).toEqual(['coffee', 'gluten', 'high-fat meal'])
    expect(tags('Feijão com arroz, cebola e alho')).toEqual(['high-FODMAP'])
  })
  it('handles plurals', () => {
    expect(tags('scrambled eggs with mushrooms and onions')).toEqual(['high-FODMAP'])
    expect(tags('duas torradas')).toEqual(['gluten'])
  })
  it('prefers the longer phrase', () => {
    expect(analyzeMeal('ice cream').matches).toEqual([{ term: 'ice cream', tags: ['dairy'] }])
    expect(tags('galão')).toEqual(['coffee', 'dairy'])
  })
  it('ignores negated foods', () => {
    expect(tags('salad, no cheese')).toEqual([])
    expect(tags('café sem leite')).toEqual(['coffee'])
    expect(tags('não bebi cerveja')).toEqual([])
  })
  it('applies gluten-free / lactose-free / decaf / alcohol-free locally', () => {
    expect(tags('gluten-free pasta and a glass of milk')).toEqual(['dairy'])
    expect(tags('pão sem glúten')).toEqual([])
    expect(tags('iogurte sem lactose')).toEqual([])
    expect(tags('decaf latte')).toEqual(['dairy'])
    expect(tags('cerveja sem álcool')).toEqual(['gluten'])
    expect(tags('cerveja 0,0')).toEqual(['gluten'])
  })
  it('does not treat a large coffee as a large meal', () => {
    expect(tags('café grande')).toEqual(['coffee'])
    expect(tags('comi demais ao jantar')).toEqual(['large meal'])
  })
  it('matches the user’s own tags by name', () => {
    expect(tags('a lot of chocolate and some popcorn', ['popcorn'])).toEqual(['high-fat meal', 'popcorn'])
  })
  it('returns nothing for empty or unrelated text', () => {
    expect(analyzeMeal('').tags).toEqual([])
    expect(tags('grilled fish, rice and salad')).toEqual([])
  })
})

describe('recognised list', () => {
  it('shows the food as the user wrote it, accents included', () => {
    expect(analyzeMeal('Café e pão').matches.map((m) => m.term)).toEqual(['café', 'pão'])
  })
})
