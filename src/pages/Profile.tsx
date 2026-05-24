import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import { Loader2, Save, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";

export default function Profile() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.profile.me.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: async () => {
      await utils.profile.me.invalidate();
    },
  });

  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#C9A84C");
  const [isPublic, setIsPublic] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!data?.profile) return;
    setHandle(data.profile.handle || "");
    setDisplayName(data.profile.displayName || "");
    setBio(data.profile.bio || "");
    setLocation(data.profile.location || "");
    setWebsite(data.profile.website || "");
    setContactEmail(data.profile.contactEmail || "");
    setAvatarUrl(data.profile.avatarUrl || "");
    setBannerUrl(data.profile.bannerUrl || "");
    setAccentColor(data.profile.accentColor || "#C9A84C");
    setIsPublic(Boolean(data.profile.isPublic));
  }, [data?.profile]);

  if (authLoading) {
    return (
      <div className="min-h-screen pt-32 flex justify-center">
        <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const save = () => {
    setMessage("");
    updateProfile.mutate(
      {
        handle,
        displayName,
        bio,
        location,
        website,
        contactEmail: contactEmail || undefined,
        avatarUrl,
        bannerUrl,
        accentColor,
        isPublic,
      },
      {
        onSuccess: () => setMessage("Profile saved."),
        onError: (err) => setMessage(err.message),
      },
    );
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-[9px] tracking-[4px] uppercase text-[#8A6E2F]">Seller Settings</p>
            <h1 className="font-cinzel text-2xl text-[#F5EED8] tracking-[3px]">My Profile</h1>
          </div>
          {data?.profile?.handle && (
            <Link
              to={`/seller/${data.profile.handle}`}
              className="inline-flex items-center gap-2 px-4 py-2 border border-[#C9A84C]/40 text-[#C9A84C] text-[10px] tracking-[2px] uppercase"
            >
              View Public Page <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 text-[#C9A84C] animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-[#161616] border border-[#C9A84C]/20 p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="handle"
                  className="bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] px-4 py-3 text-sm outline-none focus:border-[#C9A84C]"
                />
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Display name"
                  className="bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] px-4 py-3 text-sm outline-none focus:border-[#C9A84C]"
                />
              </div>

              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell buyers what you sell."
                rows={4}
                className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] px-4 py-3 text-sm outline-none focus:border-[#C9A84C] resize-none"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Location"
                  className="bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] px-4 py-3 text-sm outline-none focus:border-[#C9A84C]"
                />
                <input
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Contact email"
                  className="bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] px-4 py-3 text-sm outline-none focus:border-[#C9A84C]"
                />
              </div>

              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://your-site.com"
                className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] px-4 py-3 text-sm outline-none focus:border-[#C9A84C]"
              />
              <input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="Avatar image URL"
                className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] px-4 py-3 text-sm outline-none focus:border-[#C9A84C]"
              />
              <input
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="Banner image URL"
                className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] px-4 py-3 text-sm outline-none focus:border-[#C9A84C]"
              />

              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-[#C8BC98]">
                  Accent
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-8 h-8 bg-transparent border border-[#C9A84C]/20"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-[#C8BC98]">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="accent-[#C9A84C]"
                  />
                  Public profile
                </label>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={save}
                  disabled={updateProfile.isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-[#080808] text-[10px] tracking-[2px] uppercase font-bold disabled:opacity-60"
                >
                  {updateProfile.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Profile
                </button>
                {message && <p className="text-xs text-[#C8BC98]">{message}</p>}
              </div>
            </div>

            <div className="bg-[#161616] border border-[#C9A84C]/20 p-6">
              <p className="text-[9px] tracking-[3px] uppercase text-[#8A6E2F] mb-4">Your Active Listings</p>
              <div className="space-y-3 max-h-[28rem] overflow-auto pr-1">
                {(data?.listings || []).length === 0 ? (
                  <p className="text-xs text-[#C8BC98]">No active listings yet.</p>
                ) : (
                  (data?.listings || []).map((listing) => (
                    <Link
                      key={listing.id}
                      to={`/listing/${listing.id}`}
                      className="block p-3 border border-[#C9A84C]/15 hover:border-[#C9A84C]/40 transition-colors"
                    >
                      <p className="text-xs text-[#F5EED8] mb-1 line-clamp-1">{listing.title}</p>
                      <p className="text-[10px] text-[#C9A84C]">${Number(listing.price).toLocaleString("en-US")}</p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
