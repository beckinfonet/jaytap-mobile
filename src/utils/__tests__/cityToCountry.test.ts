import { cityToCountry } from '../cityToCountry';

describe('cityToCountry', () => {
  describe('KG', () => {
    it('routes Bishkek (EN) → KG', () => {
      expect(cityToCountry('Bishkek')).toBe('KG');
    });
    it('routes Бишкек (RU) → KG', () => {
      expect(cityToCountry('Бишкек')).toBe('KG');
    });
    it('routes Osh and Ош → KG', () => {
      expect(cityToCountry('Osh')).toBe('KG');
      expect(cityToCountry('Ош')).toBe('KG');
    });
  });

  describe('KZ', () => {
    it('routes Almaty / Алматы → KZ', () => {
      expect(cityToCountry('Almaty')).toBe('KZ');
      expect(cityToCountry('Алматы')).toBe('KZ');
    });
    it('routes Astana / Астана → KZ', () => {
      expect(cityToCountry('Astana')).toBe('KZ');
      expect(cityToCountry('Астана')).toBe('KZ');
    });
    it('routes Shymkent / Шымкент → KZ', () => {
      expect(cityToCountry('Shymkent')).toBe('KZ');
      expect(cityToCountry('Шымкент')).toBe('KZ');
    });
  });

  describe('UZ', () => {
    it('routes Tashkent / Ташкент → UZ', () => {
      expect(cityToCountry('Tashkent')).toBe('UZ');
      expect(cityToCountry('Ташкент')).toBe('UZ');
    });
    it('routes Samarkand / Самарканд → UZ', () => {
      expect(cityToCountry('Samarkand')).toBe('UZ');
      expect(cityToCountry('Самарканд')).toBe('UZ');
    });
  });

  describe('edge cases', () => {
    it('trims whitespace', () => {
      expect(cityToCountry('  Bishkek  ')).toBe('KG');
    });
    it('returns undefined for unknown city', () => {
      expect(cityToCountry('Paris')).toBeUndefined();
    });
    it('returns undefined for empty string', () => {
      expect(cityToCountry('')).toBeUndefined();
    });
    it('returns undefined for undefined input', () => {
      expect(cityToCountry(undefined)).toBeUndefined();
    });
  });
});
