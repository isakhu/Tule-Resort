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
    forestGreen: '#163D32',
    champagneGold: '#C5A46D',
    warmIvory: '#F5F0E6',
    darkCharcoal: '#26312D',
    sageGreen: '#8A9B83',
    // Backwards compatibility tokens
    warmGold: '#C5A46D',
    sandCream: '#F5F0E6',
    terracotta: '#C5A46D',
    teal: '#163D32',
    deepTeal: '#163D32',
    orange: '#C5A46D',
    sunsetOrange: '#C5A46D',
    sand: '#F5F0E6',
    cream: '#F5F0E6',
    charcoal: '#26312D',
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
