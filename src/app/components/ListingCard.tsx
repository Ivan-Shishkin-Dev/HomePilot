import { useNavigate } from "react-router";
import { MapPin, Bed, Bath, Clock } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface Listing {
  id: string;
  title: string;
  address: string;
  city: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  matchPercent: number;
  demand: string;
  image: string;
  timeLeft: string;
  features: string[];
}

export function ListingCard({ listing }: { listing: Listing }) {
  const navigate = useNavigate();

  const getMatchColor = (pct: number) => {
    if (pct >= 80) return "bg-[#10B981]";
    if (pct >= 65) return "bg-[#F59E0B]";
    return "bg-[#EF4444]";
  };

  const getDemandColor = (demand: string) => {
    if (demand === "Very High" || demand === "High") return "text-[#EF4444]";
    if (demand === "Medium") return "text-[#F59E0B]";
    return "text-[#10B981]";
  };

  return (
    <button
      onClick={() => navigate(`/listing/${listing.id}`)}
      className="w-full bg-card rounded-2xl overflow-hidden border border-border hover:border-[#3B82F6]/30 transition-all text-left group"
    >
      <div className="relative h-44 lg:h-48">
        <ImageWithFallback
          src={listing.image}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent" />
        <div
          className={`absolute top-3 right-3 ${getMatchColor(
            listing.matchPercent
          )} px-2.5 py-1 rounded-lg flex items-center gap-1`}
        >
          <span className="text-white text-[13px]" style={{ fontWeight: 700 }}>
            {listing.matchPercent}%
          </span>
          <span className="text-white/80 text-[10px]">match</span>
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <Clock size={12} className="text-white/60" />
          <span className="text-white/70 text-[11px]">{listing.timeLeft} left</span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-1.5">
          <h3 className="text-foreground text-[15px]" style={{ fontWeight: 600 }}>
            {listing.title}
          </h3>
          <span className="text-[#3B82F6] text-[16px] shrink-0 ml-3" style={{ fontWeight: 700 }}>
            ${listing.price.toLocaleString()}
            <span className="text-muted-foreground text-[11px]" style={{ fontWeight: 400 }}>/mo</span>
          </span>
        </div>
        <div className="flex items-center gap-1 mb-3">
          <MapPin size={12} className="text-muted-foreground" />
          <span className="text-muted-foreground text-[12px]">
            {listing.address}, {listing.city}
          </span>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1">
            <Bed size={13} className="text-muted-foreground" />
            <span className="text-muted-foreground text-[12px]">{listing.beds} bed</span>
          </div>
          <div className="flex items-center gap-1">
            <Bath size={13} className="text-muted-foreground" />
            <span className="text-muted-foreground text-[12px]">{listing.baths} bath</span>
          </div>
          <span className="text-muted-foreground text-[12px]">{listing.sqft} sqft</span>
          <span className={`ml-auto text-[11px] ${getDemandColor(listing.demand)}`}>
            {listing.demand} Demand
          </span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {listing.features.map((f) => (
            <span
              key={f}
              className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}