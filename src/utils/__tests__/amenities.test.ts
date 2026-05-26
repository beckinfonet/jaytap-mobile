import {
  AMENITIES,
  AMENITY_ICONS,
  AMENITY_LABEL_KEYS,
  RESIDENTIAL_AMENITIES,
  HOSPITALITY_AMENITIES,
  COMMERCIAL_AMENITIES,
  getAmenitiesForPropertyType,
} from '../amenities';

describe('amenities — taxonomy invariants', () => {
  test('AMENITIES is the union of residential + hospitality + commercial sets', () => {
    const expected = new Set([
      ...RESIDENTIAL_AMENITIES,
      ...HOSPITALITY_AMENITIES,
      ...COMMERCIAL_AMENITIES,
    ]);
    expect(new Set(AMENITIES)).toEqual(expected);
  });

  test('every amenity has an icon mapping', () => {
    for (const a of AMENITIES) {
      expect(AMENITY_ICONS[a]).toBeDefined();
    }
  });

  test('every amenity has a label key', () => {
    for (const a of AMENITIES) {
      expect(AMENITY_LABEL_KEYS[a]).toMatch(/^amenity\./);
    }
  });

  test('hospitality set is the verbatim 12-item canonical list (back-compat)', () => {
    expect(HOSPITALITY_AMENITIES).toEqual([
      'wifi',
      'aircon',
      'heating',
      'kitchen',
      'breakfast',
      'parking',
      'reception24',
      'laundry',
      'hotwater',
      'commonarea',
      'lockers',
      'ensuite',
    ]);
  });

  test('residential set has 12 items including washer + dryer + garage + balcony + elevator + gasStove + petFriendly', () => {
    expect(RESIDENTIAL_AMENITIES.length).toBe(12);
    expect(RESIDENTIAL_AMENITIES).toEqual(
      expect.arrayContaining([
        'washer',
        'dryer',
        'garage',
        'balcony',
        'elevator',
        'gasStove',
        'petFriendly',
      ]),
    );
  });

  test('commercial set has 5 items: aircon, heating, wifi, parking, security', () => {
    expect(COMMERCIAL_AMENITIES).toEqual(['aircon', 'heating', 'wifi', 'parking', 'security']);
  });
});

describe('getAmenitiesForPropertyType', () => {
  test('apartment → residential set', () => {
    expect(getAmenitiesForPropertyType('apartment')).toEqual(RESIDENTIAL_AMENITIES);
  });

  test('house → residential set', () => {
    expect(getAmenitiesForPropertyType('house')).toEqual(RESIDENTIAL_AMENITIES);
  });

  test('hotel → hospitality set', () => {
    expect(getAmenitiesForPropertyType('hotel')).toEqual(HOSPITALITY_AMENITIES);
  });

  test('hostel → hospitality set', () => {
    expect(getAmenitiesForPropertyType('hostel')).toEqual(HOSPITALITY_AMENITIES);
  });

  test('office → commercial set', () => {
    expect(getAmenitiesForPropertyType('office')).toEqual(COMMERCIAL_AMENITIES);
  });

  test('commercial → commercial set', () => {
    expect(getAmenitiesForPropertyType('commercial')).toEqual(COMMERCIAL_AMENITIES);
  });

  test('unknown propertyType → empty array (defensive)', () => {
    expect(getAmenitiesForPropertyType('land' as never)).toEqual([]);
    expect(getAmenitiesForPropertyType('' as never)).toEqual([]);
    expect(getAmenitiesForPropertyType(undefined as never)).toEqual([]);
  });
});
