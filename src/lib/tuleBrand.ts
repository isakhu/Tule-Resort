export const tuleBrand = {
  name: 'Tule Resort',
  subtitle: 'HAWASSA • ETHIOPIA',
  address: 'Tule Resort, Hawassa, Sidama, Ethiopia',
  phones: ['0994 781 422', '0927 146 599'],
  email: 'isakyule@gmail.com',
  defaultCurrency: 'ETB',
  currencySymbol: 'ብር',
  languages: ['en', 'am'] as const,
  defaultLanguage: 'en' as const,
  tagline: 'Where the lake, nature and luxury meet.',
  colors: {
    teal: '#159A9C',
    deepTeal: '#0B3D4A',
    sand: '#D8C7A3',
    gold: '#C8A15A',
    cream: '#F8F5EE',
    charcoal: '#182326',
  },
  paymentMethods: [
    { id: 'pay_at_resort', label: 'Pay at resort' },
    { id: 'telebirr', label: 'Telebirr' },
    { id: 'cbe_birr', label: 'CBE Birr' },
    { id: 'bank_transfer', label: 'Bank transfer' },
  ],
} as const;

export type TuleLanguage = (typeof tuleBrand.languages)[number];

export const tuleCopy = {
  en: {
    homeEyebrow: 'Lakeside luxury • Hawassa, Ethiopia',
    homeTitle: 'A slower way to experience Hawassa.',
    homeDescription: 'Stay by the lake, enjoy Ethiopian-inspired dining, and make every moment at Tule Resort feel memorable.',
    book: 'Book your stay',
    exploreRooms: 'Explore rooms',
    dining: 'Dining',
    experiences: 'Experiences',
    contact: 'Contact',
  },
  am: {
    homeEyebrow: 'የሐዋሳ ሀይቅ ዳርቻ • ኢትዮጵያ',
    homeTitle: 'ሐዋሳን ለመለማመድ የተረጋጋ መንገድ።',
    homeDescription: 'በሀይቁ ዳር ይቆዩ፣ የኢትዮጵያ ጣዕም ያለውን ምግብ ይደሰቱ፣ በTule Resort የማይረሳ ጊዜ ያሳልፉ።',
    book: 'ቆይታዎን ይያዙ',
    exploreRooms: 'ክፍሎችን ይመልከቱ',
    dining: 'ምግብ',
    experiences: 'ተሞክሮዎች',
    contact: 'ያግኙን',
  },
} as const;
