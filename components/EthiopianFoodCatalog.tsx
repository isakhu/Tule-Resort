import React, { useState, useMemo } from 'react';
import { Heart, MessageCircle, Share2, MoreHorizontal, ChevronLeft, Search, Home, MessageSquare, User, ExternalLink, Flame } from 'lucide-react';
import { MenuItem, menuItems } from '../data/menu-items';
const CATEGORY_THEMES: Record<string, { bg: string; text: string; accent: string; badge: string }> = {
"Beef & Lamb": { bg: "bg-red-700", text: "text-red-700", accent: "text-amber-400", badge: "SPECIAL TIBS" },
"Poultry & Fish": { bg: "bg-amber-600", text: "text-amber-600", accent: "text-red-100", badge: "TRADITIONAL" },
"Vegetarian & Vegan": { bg: "bg-emerald-700", text: "text-emerald-700", accent: "text-yellow-300", badge: "100% VEGAN" },
"Breakfast": { bg: "bg-orange-500", text: "text-orange-500", accent: "text-amber-950", badge: "FRESHLY MADE" },
"Sides & Appetizers": { bg: "bg-stone-600", text: "text-stone-600", accent: "text-stone-200", badge: "CRUNCHY SNACKS" },
"Modern & Intercontinental": { bg: "bg-blue-800", text: "text-blue-800", accent: "text-yellow-400", badge: "CHEF SPECIAL" },
"Beverages": { bg: "bg-amber-800", text: "text-amber-800", accent: "text-orange-300", badge: "JEBENA TRADITION" }
};
export default function EthiopianFoodCatalog() {
const [activeItem, setActiveItem] = useState<MenuItem>(menuItems[0]);
const [selectedCategory, setSelectedCategory] = useState<string>("All");
const [searchQuery, setSearchQuery] = useState<string>("");
const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
const currentTheme = useMemo(() => {
return CATEGORY_THEMES[activeItem.category] || {
bg: "bg-neutral-800",
text: "text-neutral-800",
accent: "text-yellow-400",
badge: "HOUSE FAVORITE"
};
}, [activeItem]);
const categories = useMemo(() => {
const types = menuItems.map(item => item.category);
return ["All", ...new Set(types)];
}, []);
const filteredItems = useMemo(() => {
return menuItems.filter(item => {
const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
item.amharicName.includes(searchQuery);
return matchesCategory && matchesSearch;
});
}, [selectedCategory, searchQuery]);
const toggleLike = (id: string) => {
setLikedIds(prev => ({ ...prev, [id]: !prev[id] }));
};
return (
<div className="w-full max-w-md mx-auto bg-white min-h-screen pb-24 shadow-2xl relative flex flex-col font-sans overflow-x-hidden">
<header className="w-full h-12 border-b border-gray-100 px-4 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-50">
<Home className="w-4 h-4 text-gray-700" />
<div className="bg-gray-100 rounded-full py-1 px-3 flex items-center justify-center gap-1.5 text-xs text-gray-500 w-3/5 overflow-hidden whitespace-nowrap">
<span>🔒</span> <span className="truncate">ethiopian-menu.io/pin/{activeItem.id}</span>
</div>
<div className="flex items-center gap-3 text-gray-700 font-semibold text-xs">
<span>+</span>
<div className="border border-gray-800 rounded px-1 text-[9px] h-3.5 flex items-center justify-center">100</div>
<MoreHorizontal className="w-4 h-4" />
</div>
</header>
<div className="w-full px-4 h-14 flex items-center justify-between bg-white">
<div className="text-[#E60023] font-black text-xl tracking-tighter flex items-center gap-0.5">
<span>Pinterest</span>
</div>
<button className="bg-gray-100 hover:bg-gray-200 text-black font-bold text-xs px-3.5 py-1.5 rounded-full transition-transform active:scale-95">
Open app
</button>
</div>
<main className="w-full px-2 flex-1 flex flex-col gap-3">
<div className="relative w-full aspect-[3/4] bg-[#121212] rounded-[2rem] overflow-hidden shadow-xl transition-all duration-300">
<button className="absolute top-4 left-4 z-20 bg-white text-black p-2.5 rounded-full shadow-lg hover:bg-gray-50 active:scale-90 transition-transform">
<ChevronLeft className="w-5 h-5 stroke-[3]" />
</button>
<div className="absolute inset-0 p-6 flex flex-col justify-between z-10 pointer-events-none">
<div className="space-y-0.5">
<span className="text-[11px] font-black tracking-widest text-white/70 uppercase flex items-center gap-1">
<Flame className="w-3.5 h-3.5 fill-current text-orange-500" /> Hot & Fresh
</span>
<h1 className={`text-4xl font-black tracking-tighter uppercase leading-none ${currentTheme.text} drop-shadow-md`}>
{activeItem.category.split(' ')[0]}
</h1>
<p className="text-xs font-asemibold text-white/80 tracking-wide lowercase italic">
{activeItem.name}
</p>
</div>
<div className="flex justify-end">
<div className="text-right">
<p className="text-[9px] text-white/50 uppercase font-bold tracking-widest">VALID IN TOWN</p>
<p className="text-sm font-black uppercase tracking-tight text-white/90">
{currentTheme.badge}
</p>
</div>
</div>
</div>
<div className={`absolute bottom-0 left-0 right-0 h-1/2 ${currentTheme.bg} rounded-t-[3rem] transform translate-y-12 scale-105 transition-all duration-700 ease-out z-0`} />
<div className="absolute left-4 bottom-1/3 z-20 transform -rotate-12 bg-black/20 p-2.5 rounded-xl backdrop-blur-sm border border-white/15 text-center min-w-[70px]">
<p className="text-[9px] text-white/80 uppercase font-medium leading-none">Price</p>
<p className={`text-xl font-black ${currentTheme.accent} leading-tight`}>{activeItem.price}</p>
<p className="text-[9px] text-white font-extrabold uppercase tracking-widest leading-none">ETB</p>
</div>
<div className="absolute inset-0 flex items-center justify-center p-10 z-10">
<img 
src={activeItem.imageUrl} 
alt={activeItem.name} 
loading="lazy"
className="w-[85%] aspect-square object-cover rounded-full shadow-2xl border-4 border-white/20 transform hover:scale-105 transition-transform duration-500"
/>
</div>
<button className="absolute bottom-4 right-4 z-20 bg-white/95 backdrop-blur-md hover:bg-white text-black text-[11px] font-black py-2 px-3.5 rounded-full shadow-md flex items-center gap-1.5 active:scale-95 transition-transform">
<span>🔍 Search image</span>
</button>
</div>
<section className="w-full py-2 px-2 flex items-center justify-between">
<div className="flex items-center gap-4 text-gray-900">
<button 
onClick={() => toggleLike(activeItem.id)}
className={`flex items-center gap-1 active:scale-90 transition-transform ${likedIds[activeItem.id] ? 'text-red-500' : 'text-gray-900'}`}
>
<Heart className={`w-6 h-6 ${likedIds[activeItem.id] ? 'fill-current' : ''}`} />
<span className="text-xs font-bold">{likedIds[activeItem.id] ? '2' : '1'}</span>
</button>
<button className="hover:opacity-60 active:scale-90 transition-transform">
<MessageCircle className="w-6 h-6" />
</button>
<button className="hover:opacity-60 active:scale-90 transition-transform">
<Share2 className="w-6 h-6" />
</button>
<button className="hover:opacity-60 active:scale-90 transition-transform">
<MoreHorizontal className="w-6 h-6" />
</button>
</div>
<button className="bg-[#E60023] hover:bg-red-700 text-white font-extrabold px-5 py-2.5 rounded-full text-xs transition-all active:scale-95">
Save
</button>
</section>
<section className="px-2 pb-3 border-b border-gray-100 flex flex-col gap-1.5">
<div className="flex items-center gap-1.5">
<div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-white text-[10px] font-bold">🇪🇹</div>
<span className="text-xs font-black text-gray-800">Haile Traditional Culinary Group</span>
</div>
<h2 className="text-lg font-black tracking-tight text-gray-900 leading-tight">
{activeItem.name} — <span className="text-base text-gray-500 font-medium">{activeItem.amharicName}</span>
</h2>
<p className="text-xs text-gray-600 leading-relaxed">
{activeItem.description} Try this authentic culinary creation now!
</p>
</section>
<section className="px-2 pt-2 flex flex-col gap-3">
<div className="relative w-full">
<input 
type="text" 
placeholder="Search dishes (e.g. Tibs, Shiro, ቡና)..." 
value={searchQuery}
onChange={(e) => setSearchQuery(e.target.value)}
className="w-full bg-gray-100 placeholder-gray-400 text-gray-800 text-xs rounded-xl py-2.5 pl-8 pr-4 font-medium focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
/>
<Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-3" />
</div>
<div className="w-full">
<div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none snap-x">
{categories.map((cat) => (
<button
key={cat}
onClick={() => setSelectedCategory(cat)}
className={`px-3.5 py-1.5 rounded-full font-extrabold text-[11px] whitespace-nowrap transition-all snap-items-center ${
selectedCategory === cat 
? 'bg-black text-white shadow-md' 
: 'bg-gray-100 text-gray-600 hover:bg-gray-200'
}`}
>
{cat}
</button>
))}
</div>
</div>
<div className="w-full bg-gray-50/70 border border-gray-100 rounded-2xl p-2">
<div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-0.5 scrollbar-thin">
{filteredItems.length > 0 ? (
filteredItems.map((item) => (
<div
key={item.id}
onClick={() => setActiveItem(item)}
className={`p-1.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all bg-white ${
activeItem.id === item.id 
? 'border-black shadow-md ring-1 ring-black/10 scale-[0.98]' 
: 'border-gray-200/60 hover:border-gray-400'
}`}
>
<div className="relative aspect-video w-full rounded-lg overflow-hidden bg-stone-100 mb-1">
<img 
src={item.imageUrl} 
alt={item.name} 
loading="lazy"
className="w-full h-full object-cover"
/>
<span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
{item.price} ETB
</span>
</div>
<div className="px-0.5">
<h4 className="text-[11px] font-black text-gray-900 truncate leading-tight">{item.name}</h4>
<div className="flex justify-between items-center mt-0.5">
<p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">{item.category.split(' ')[0]}</p>
<p className="text-[9px] text-amber-600 font-bold">{item.amharicName}</p>
</div>
</div>
</div>
))
) : (
<div className="col-span-2 py-8 text-center text-xs font-semibold text-gray-400">
No delicious matches found...
</div>
)}
</div>
</div>
</section>
<div className="px-2 pt-1 pb-4">
<button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-extrabold py-3 rounded-full text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95">
<span>Order Menu item from Restaurant</span>
<ExternalLink className="w-3.5 h-3.5" />
</button>
</div>
</main>
<footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-gray-100 h-14 flex items-center justify-around z-50">
<button className="text-black p-2"><Home className="w-5 h-5 stroke-[2.5]" /></button>
<button className="text-gray-400 p-2 hover:text-black"><Search className="w-5 h-5 stroke-[2]" /></button>
<div className="relative">
<button className="text-gray-400 p-2 hover:text-black"><MessageSquare className="w-5 h-5 stroke-[2]" /></button>
<span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
</div>
<button className="text-gray-400 p-2 hover:text-black"><User className="w-5 h-5 stroke-[2]" /></button>
</footer>
</div>
);
}
