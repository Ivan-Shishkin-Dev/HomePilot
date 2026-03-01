import { useNavigate } from "react-router";
import { MapPin, Bed, Bath, Clock, ExternalLink, Heart, ClipboardCheck } from "lucide-react";
import { useAppliedListings } from "../../contexts/AppliedListingsContext";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { cn } from "./ui/utils";

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
  listingUrl?: string;
  source?: string;
}

export function ListingCard({
  listing,
  className,
  isSaved,
  onToggleSave,
}: {
  listing: Listing;
  className?: string;
  isSaved?: boolean;
  onToggleSave?: (listingId: string) => void;
}) {
  const navigate = useNavigate();
  const { trackExternalLinkClick, appliedIds, removeApplied } = useAppliedListings();
  const isApplied = appliedIds.has(listing.id);

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
    <div className={cn("w-full bg-card rounded-2xl overflow-hidden border border-border hover:border-[#10B981]/30 transition-all text-left group flex flex-col", className)}>
      <button
        onClick={() => navigate(`/listing/${listing.id}`)}
        className="flex-1 text-left min-w-0"
      >
      <div className="relative h-44 lg:h-48">
        <ImageWithFallback
          src={listing.image}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <div
            className={`${getMatchColor(
              listing.matchPercent
            )} px-2.5 py-1 rounded-lg flex items-center gap-1`}
          >
          <span className="text-white text-[13px]" style={{ fontWeight: 700 }}>
            {listing.matchPercent}%
          </span>
          <span className="text-white/80 text-[10px]">match</span>
          </div>
          {onToggleSave && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleSave(listing.id);
              }}
              className="w-9 h-9 rounded-lg bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
            >
              <Heart
                size={18}
                className={isSaved ? "text-[#EF4444] fill-[#EF4444]" : "text-white"}
              />
            </button>
          )}
          {isApplied && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeApplied(listing.id);
              }}
              className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
              title="Mark as not applied"
            >
              <ClipboardCheck size={14} className="text-[#10B981] fill-[#10B981]" />
            </button>
          )}
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
          <Clock size={12} className="text-white/60" />
          <span className="text-white/70 text-[11px]">{listing.timeLeft}</span>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-1.5">
          <h3 className="text-foreground text-[15px]" style={{ fontWeight: 600 }}>
            {listing.title}
          </h3>
          <span className="text-[#10B981] text-[16px] shrink-0 ml-3" style={{ fontWeight: 700 }}>
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
            <span className="text-muted-foreground text-[12px]">
              {listing.beds === 0 ? "Studio" : `${listing.beds} bed`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Bath size={13} className="text-muted-foreground" />
            <span className="text-muted-foreground text-[12px]">{listing.baths} bath</span>
          </div>
          {listing.sqft > 0 && (
            <span className="text-muted-foreground text-[12px]">{listing.sqft} sqft</span>
          )}
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
      {listing.listingUrl && (
        <div
          className="px-4 pb-4 pt-1 flex flex-wrap gap-2 border-t border-border mt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() =>
              trackExternalLinkClick({
                id: listing.id,
                title: listing.title,
                url: listing.listingUrl!,
              })
            }
            className="inline-flex items-center gap-1.5 text-[12px] text-[#10B981] hover:underline"
          >
            <ExternalLink size={12} />
            {listing.source === "apartments" ? "View on Apartments.com" : "View on Zillow"}
          </button>
        </div>
      )}
    </div>
  );
}