export interface Room {
  id: string;
  slug: string;
  name: string;
  nameAm?: string;
  type: string;
  view?: string;
  description: string;
  price: number;
  capacity: number;
  maxOccupancy: number;
  bedType?: string;
  sizeSqm?: number;
  imageUrl: string;
  images: string[];
  amenities: string[];
  isAvailable: boolean;
}

export const FALLBACK_ROOMS: Room[] = [
  {
    id: "rm-101",
    slug: "classic-queen-room",
    name: "Classic Queen Room (Garden View)",
    nameAm: "ክላሲክ ኩዊን ክፍል (የአትክልት እይታ)",
    type: "Standard",
    view: "Garden View",
    price: 11500,
    capacity: 2,
    maxOccupancy: 3,
    bedType: "1 Queen Bed",
    sizeSqm: 32,
    description: "Comfortable guest room opening to lush tropical resort garden views, fitted with air conditioning, workspace desk, satellite flat-screen TV, and en-suite walk-in rain shower.",
    amenities: [
      "Free High-Speed Wi-Fi",
      "Complimentary Buffet Breakfast",
      "Balcony / Patio",
      "Air Conditioning",
      "Flat-screen TV",
      "Minibar & Refrigerator",
      "Electric Tea & Coffee Maker",
      "In-room Safe",
      "Bathrobes & Slippers",
      "Free Pool & Gym Access"
    ],
    imageUrl: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80",
    images: ["https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80"],
    isAvailable: true
  },
  {
    id: "rm-102",
    slug: "standard-twin-room",
    name: "Standard Twin Room (Garden View)",
    nameAm: "ስታንዳርድ ትዊን ክፍል (የአትክልት እይታ)",
    type: "Standard Twin",
    view: "Garden View",
    price: 12500,
    capacity: 2,
    maxOccupancy: 3,
    bedType: "2 Single Beds",
    sizeSqm: 34,
    description: "Spacious twin bed configuration ideal for friends and colleagues, overlooking landscaped courtyards with private terrace seating and dedicated work desk.",
    amenities: [
      "Free High-Speed Wi-Fi",
      "Complimentary Buffet Breakfast",
      "Balcony",
      "Air Conditioning",
      "Cable Flat-screen TV",
      "Minibar",
      "Coffee & Tea Facilities",
      "En-suite Bathroom with Walk-in Shower",
      "Hairdryer",
      "Direct Dial Phone"
    ],
    imageUrl: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80",
    images: ["https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80"],
    isAvailable: true
  },
  {
    id: "rm-103",
    slug: "deluxe-double-lake-view",
    name: "Deluxe Double Room (Lake View)",
    nameAm: "ዴሉክስ ዳብል ክፍል (የሐይቅ እይታ)",
    type: "Deluxe",
    view: "Lake Hawassa View",
    price: 15000,
    capacity: 2,
    maxOccupancy: 3,
    bedType: "1 King Bed",
    sizeSqm: 38,
    description: "Premium double bedroom featuring panoramic sunrise and sunset vistas directly over Lake Hawassa, private furnished balcony, luxury bedding, and modern bathroom.",
    amenities: [
      "Panoramic Lake View",
      "Private Lake-Facing Balcony",
      "Complimentary Buffet Breakfast",
      "High-Speed Wi-Fi",
      "Air Conditioning",
      "42-inch Smart TV",
      "Stocked Minibar",
      "Espresso & Tea Kettle",
      "Luxury Toiletries",
      "Daily Turndown Service"
    ],
    imageUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
    images: ["https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80"],
    isAvailable: true
  },
  {
    id: "rm-104",
    slug: "executive-lake-view-king",
    name: "Executive Lake View King Room",
    nameAm: "ኤግዚክዩቲቭ ኪንግ ክፍል (የሐይቅ እይታ)",
    type: "Executive",
    view: "Lake Hawassa View",
    price: 18500,
    capacity: 2,
    maxOccupancy: 3,
    bedType: "1 Extra-Long King Bed",
    sizeSqm: 42,
    description: "Elevated accommodation on upper floors with sweeping lake horizon, executive lounge privileges, ergonomic office station, luxury deep-soak bathtub, and rainfall shower.",
    amenities: [
      "Executive Lounge Access",
      "Direct Lake Hawassa Panorama",
      "Furnished Balcony",
      "Deep Soak Bathtub & Walk-in Shower",
      "Complimentary Breakfast & Afternoon Tea",
      "Nespresso Coffee Machine",
      "Ironing Station",
      "55-inch Ultra HD TV",
      "Free Airport Shuttle Pickup"
    ],
    imageUrl: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
    images: ["https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80"],
    isAvailable: true
  },
  {
    id: "rm-105",
    slug: "junior-suite-pool-view",
    name: "Junior Suite (Garden & Pool View)",
    nameAm: "ጁኒየር ስዊት (የአትክልት እና መዋኛ ገንዳ እይታ)",
    type: "Junior Suite",
    view: "Pool & Garden View",
    price: 21000,
    capacity: 2,
    maxOccupancy: 4,
    bedType: "1 King Bed + 1 Sofa Bed",
    sizeSqm: 50,
    description: "Semi-open layout with distinct living area, plush pull-out sofa bed, overlooking both the manicured gardens and resort pool. Excellent for business travelers and small families.",
    amenities: [
      "Integrated Living Area",
      "Pool & Courtyard Terrace",
      "Complimentary Full Breakfast",
      "Two Flat-screen TVs",
      "Minibar and Tea Bar",
      "Double Vanity Bathroom",
      "Express Check-in & Check-out",
      "Spa & Steam Room Vouchers"
    ],
    imageUrl: "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80",
    images: ["https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80"],
    isAvailable: true
  },
  {
    id: "rm-106",
    slug: "deluxe-one-bedroom-suite-lake-view",
    name: "Deluxe One-Bedroom Suite (Lake View)",
    nameAm: "ዴሉክስ ባለ አንድ መኝታ ስዊት (የሐይቅ እይታ)",
    type: "Suite",
    view: "Lake Hawassa View",
    price: 26000,
    capacity: 2,
    maxOccupancy: 4,
    bedType: "1 King Bed + Living Room Lounge",
    sizeSqm: 60,
    description: "Private suite with separated master bedroom, stylish living salon, lakefront balcony, hot tub bathroom, dining nook, and full minibar setup.",
    amenities: [
      "Separate Living Room & Master Bedroom",
      "Private Lakeside Balcony",
      "Private Jacuzzi / Hot Tub",
      "Free Daily Buffet Breakfast",
      "Dining Table for Four",
      "Coffee Machine & Tea Station",
      "Walk-in Wardrobe",
      "VIP Welcome Fruit Basket"
    ],
    imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80",
    images: ["https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80"],
    isAvailable: true
  },
  {
    id: "rm-107",
    slug: "family-room-garden-view",
    name: "Family Room (Garden View)",
    nameAm: "የቤተሰብ ክፍል (የአትክልት እይታ)",
    type: "Family",
    view: "Garden View",
    price: 23500,
    capacity: 2,
    maxOccupancy: 5,
    bedType: "1 Queen Bed + 2 Twin Beds",
    sizeSqm: 58,
    description: "Family-centric connected room layout providing privacy and space. Situated in ground garden wings with direct access to kids play areas and walking paths.",
    amenities: [
      "Interconnecting Bedroom Layout",
      "Two Separate Bathrooms",
      "Direct Garden Pathway Access",
      "Full Breakfast for the Whole Family",
      "Kids Club Complimentary Access",
      "Two 43-inch Smart TVs",
      "Large Family Refrigerator",
      "Baby Cot on Request"
    ],
    imageUrl: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80",
    images: ["https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80"],
    isAvailable: true
  },
  {
    id: "rm-108",
    slug: "family-suite-lake-view",
    name: "Family Suite (Lake View)",
    nameAm: "የቤተሰብ ስዊት (የሐይቅ እይታ)",
    type: "Family Suite",
    view: "Lake Hawassa View",
    price: 29000,
    capacity: 4,
    maxOccupancy: 6,
    bedType: "1 King Bed + 2 Twin Beds + 1 Sofa Bed",
    sizeSqm: 72,
    description: "Expansive dual-bedroom residence with expansive lakeside deck, separate lounge area, master ensuite with tub, and secondary bathroom.",
    amenities: [
      "2 Full Bedrooms + Living Room",
      "Direct Waterfront Lake View",
      "Two Full Bathrooms",
      "Expansive Outdoor Patio",
      "Full Buffet Breakfast Included",
      "Tea/Coffee Maker & Mini-fridge",
      "Tennis Court & Pool Passes",
      "Complimentary Laundry Service (Limited)"
    ],
    imageUrl: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80",
    images: ["https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80"],
    isAvailable: true
  },
  {
    id: "rm-109",
    slug: "superior-one-bedroom-apartment",
    name: "Superior One-Bedroom Apartment",
    nameAm: "ሱፔሪየር ባለ አንድ መኝታ አፓርታማ",
    type: "Apartment",
    view: "Garden & Lake Partial View",
    price: 27500,
    capacity: 2,
    maxOccupancy: 4,
    bedType: "1 King Bed + 1 Sofa Bed",
    sizeSqm: 70,
    description: "Self-contained long-stay serviced apartment featuring an equipped kitchenette with dishwasher, microwave, induction stove, dining area, and spacious bedroom.",
    amenities: [
      "Equipped Kitchenette (Microwave, Cooktop, Fridge)",
      "Dishwasher and Cooking Utensils",
      "Dining Table for 4",
      "Living Salon with Smart TV",
      "Washing Machine / Laundry Area",
      "Balcony Seating",
      "Daily Housekeeping",
      "Free Parking at Doorstep"
    ],
    imageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
    images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"],
    isAvailable: true
  },
  {
    id: "rm-110",
    slug: "deluxe-two-bedroom-apartment",
    name: "Deluxe Two-Bedroom Apartment",
    nameAm: "ዴሉክስ ባለ ሁለት መኝታ አፓርታማ",
    type: "Apartment",
    view: "Garden & Pool View",
    price: 35000,
    capacity: 4,
    maxOccupancy: 6,
    bedType: "1 King Bed + 2 Twin Beds",
    sizeSqm: 85,
    description: "Full apartment with two master bedrooms, two full bathrooms, open-concept kitchen, dining quarters, and private living room suitable for extended resort stays.",
    amenities: [
      "Two Separate En-Suite Bedrooms",
      "Full Modern Kitchen Setup",
      "Generous Living & Dining Room",
      "Dishwasher & Large Refrigerator",
      "Dual Private Balconies",
      "High-speed Dedicated Wi-Fi",
      "Complimentary Buffet Breakfast",
      "Personal Butler Service on Request"
    ],
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    images: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"],
    isAvailable: true
  },
  {
    id: "rm-111",
    slug: "honeymoon-suite-jacuzzi",
    name: "Honeymoon Suite with Private Jacuzzi",
    nameAm: "የጫጉላ ሽርሽር ስዊት ከጃኩዚ ጋር",
    type: "Honeymoon Suite",
    view: "Lake Hawassa Front",
    price: 38000,
    capacity: 2,
    maxOccupancy: 2,
    bedType: "1 King Canopy Bed",
    sizeSqm: 65,
    description: "Romantic lakefront sanctuary appointed with an oversized indoor jacuzzi overlooking the water, king canopy bed, champagne service, and candlelit balcony dining setup.",
    amenities: [
      "Private Heated In-Room Jacuzzi",
      "Unobstructed Lake View",
      "King Size Romantic Canopy Bed",
      "Complimentary Chilled Sparkling Wine & Flowers",
      "Breakfast in Bed Service Included",
      "Couples Spa Massage Discount",
      "Aromatherapy Bath Set",
      "Late Check-out until 4:00 PM"
    ],
    imageUrl: "https://images.unsplash.com/photo-1590490359683-658d3d23f972?auto=format&fit=crop&w=800&q=80",
    images: ["https://images.unsplash.com/photo-1590490359683-658d3d23f972?auto=format&fit=crop&w=800&q=80"],
    isAvailable: true
  },
  {
    id: "rm-112",
    slug: "haile-presidential-suite",
    name: "Haile Presidential Suite",
    nameAm: "ኃይሌ ፕሬዚዳንሻል ስዊት",
    type: "Presidential Suite",
    view: "Full Lake Hawassa 180° View",
    price: 65000,
    capacity: 6,
    maxOccupancy: 8,
    bedType: "2 King Beds + 1 Double Bed + 2 Sofa Beds",
    sizeSqm: 120,
    description: "The resort's crown jewel. Ultra-luxurious residence featuring two master suites, expansive meeting & dining hall, private bar counter, hot tub terrace, and 180-degree lakeside views.",
    amenities: [
      "180° Panoramic Lake Hawassa Terrace",
      "Two Luxury Master Suites + 2 Full Bathrooms",
      "Grand Living Salon & Conference Dining Table",
      "Private Bar Counter & Kitchenette",
      "Private Outdoor Hot Tub & Sun Loungers",
      "24-Hour Dedicated Butler Service",
      "VIP Airport Limousine Transfer",
      "Unlimited Spa & Health Club Access"
    ],
    imageUrl: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80",
    images: ["https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80"],
    isAvailable: true
  }
];
