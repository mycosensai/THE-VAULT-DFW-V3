import { Link, useParams } from "react-router";
import { Loader2, MapPin, Globe, Mail } from "lucide-react";
import { trpc } from "@/providers/trpc";

export default function SellerProfile() {
  const { handle } = useParams<{ handle: string }>();
  const { data, isLoading } = trpc.profile.byHandle.useQuery(
    { handle: handle || "" },
    { enabled: !!handle },
  );

  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 flex justify-center">
        <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" />
      </div>
    );
  }

  if (!data?.profile) {
    return (
      <div className="min-h-screen pt-32 px-4 text-center">
        <h1 className="font-cinzel text-xl text-[#F5EED8] tracking-[3px] mb-3">Seller Not Found</h1>
        <Link to="/browse" className="text-[#C9A84C] text-xs tracking-[2px] uppercase">
          Back to Browse
        </Link>
      </div>
    );
  }

  const profile = data.profile;
  const accent = profile.accentColor || "#C9A84C";

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="border border-[#C9A84C]/20 bg-[#161616] overflow-hidden mb-8">
          <div
            className="h-36 sm:h-44 bg-[#1E1E1E] border-b border-[#C9A84C]/20"
            style={{
              backgroundImage: profile.bannerUrl ? `url(${profile.bannerUrl})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-[9px] tracking-[3px] uppercase" style={{ color: accent }}>
                  Seller Profile
                </p>
                <h1 className="font-cinzel text-2xl text-[#F5EED8] tracking-[2px]">
                  {profile.displayName || `@${profile.handle}`}
                </h1>
                <p className="text-xs text-[#8A6E2F]">@{profile.handle}</p>
              </div>
              {profile.avatarUrl && (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName || profile.handle}
                  className="w-16 h-16 rounded-full object-cover border"
                  style={{ borderColor: `${accent}66` }}
                />
              )}
            </div>

            {profile.bio && <p className="mt-4 text-sm text-[#C8BC98] leading-relaxed">{profile.bio}</p>}

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#C8BC98]">
              {profile.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {profile.location}
                </span>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-[#C9A84C]"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Website
                </a>
              )}
              {profile.contactEmail && (
                <a href={`mailto:${profile.contactEmail}`} className="inline-flex items-center gap-1.5 hover:text-[#C9A84C]">
                  <Mail className="w-3.5 h-3.5" />
                  Contact
                </a>
              )}
            </div>
          </div>
        </div>

        <div>
          <p className="text-[9px] tracking-[3px] uppercase text-[#8A6E2F] mb-4">
            Available Listings ({data.listings.length})
          </p>
          {data.listings.length === 0 ? (
            <p className="text-sm text-[#C8BC98]">This seller has no active listings right now.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.listings.map((listing) => (
                <Link
                  key={listing.id}
                  to={`/listing/${listing.id}`}
                  className="block bg-[#161616] border border-[#C9A84C]/20 p-4 hover:border-[#C9A84C]/45 transition-colors"
                >
                  <p className="text-xs text-[#F5EED8] mb-2 line-clamp-2">{listing.title}</p>
                  <p className="text-[10px] text-[#8A6E2F] mb-2">{listing.condition?.replace("_", " ")}</p>
                  <p className="font-cinzel text-sm" style={{ color: accent }}>
                    ${Number(listing.price).toLocaleString("en-US")}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
