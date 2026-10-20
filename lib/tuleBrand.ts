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
  tagline: 'Relax. Enjoy. Remember.',
  colors: {
    forestGreen: '#1F4D3A',
    warmGold: '#C9A24B',
    sandCream: '#F4EBD9',
    terracotta: '#C8643B',
    teal: '#0D828A',
    deepTeal: '#092B33',
    orange: '#C8643B',
    sunsetOrange: '#B7532C',
    sand: '#F4EBD9',
    cream: '#FAF7F2',
    charcoal: '#0B1E19',
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
    homeEyebrow: 'Hawassa · Ethiopia',
    homeTitle: 'Your lakeside escape, naturally unforgettable.',
    homeTagline: 'Relax. Enjoy. Remember.',
    homeDescription: 'Where tranquil Rift Valley waters, indigenous acacia groves, and Ethiopian hospitality meet. Lakeside suites, lakeside fine dining, and restorative wellness on Lake Hawassa.',
    book: 'Book your stay',
    exploreRooms: 'Explore the Resort',
    dining: 'Discover Our Menu',
    experiences: 'Experiences',
    contact: 'Contact',
  },
  am: {
    homeEyebrow: 'ሐዋሳ · ኢትዮጵያ',
    homeTitle: 'የሐይቅ ዳርቻ ማረፊያዎ፣ በተፈጥሮ የማይረሳ።',
    homeTagline: 'እረፍት ያድርጉ። ይደሰቱ። ያስታውሱ።',
    homeDescription: 'የተረጋጋ የሪፍት ቫሊ ውሀ፣ የጥላ ዛፎች እና ሞቅ ያለ የኢትዮጵያ መስተንግዶ የሚገናኙበት። ምርጥ ክፍሎች፣ ልዩ ምግቦች እና የተረጋጋ ቆይታ በሐዋሳ ሀይቅ ዳር።',
    book: 'ቆይታዎን ይያዙ',
    exploreRooms: 'ሪዞርቱን ያስሱ',
    dining: 'ምናሌያችንን ይመልከቱ',
    experiences: 'ተሞክሮዎች',
    contact: 'ያግኙን',
  },
} as const;
