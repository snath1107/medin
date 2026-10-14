"use client";

import { ArrowRight, Building2, Link2, MapPin, Pencil, Stethoscope, UserX } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import Avatar from "@/components/ui/Avatar";
import Button, { ButtonLink } from "@/components/ui/Button";
import { FooterLinks, Panel } from "@/components/ui/Misc";
import { PersonRowSkeleton } from "@/components/ui/Skeleton";
import StateMessage from "@/components/ui/StateMessage";
import { VisibilityBadge } from "@/components/ui/Tag";
import { useToast } from "@/components/ui/Toast";
import DoctorCard from "@/components/users/DoctorCard";
import FollowButton from "@/components/users/FollowButton";
import { InviteBody } from "@/components/users/InviteModal";
import { useUserPosts } from "@/hooks/usePosts";
import { useProfile, useSuggestions } from "@/hooks/useUsers";
import { formatPostDate } from "@/lib/format";
import type { Profile } from "@/lib/types";

import EditProfileModal from "./_components/EditProfileModal";
import PhotoModal from "./_components/PhotoModal";
import ProfileSections from "./_components/ProfileSections";

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { data: profile, isPending, isError } = useProfile(Number(userId));

  if (isError) {
    return (
      <div className="mx-auto max-w-[480px] px-4">
        <StateMessage
          actions={<ButtonLink href="/feed">Back to feed</ButtonLink>}
          card={false}
          icon={UserX}
          title="This profile doesn’t exist"
        />
      </div>
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_304px]">
      <div className="flex min-w-0 flex-col gap-2 md:gap-4">
        {isPending ? <PersonRowSkeleton rows={1} /> : <ProfileHeader profile={profile} />}
        {profile && (
          <>
            <ProfileSections profile={profile} />
            <RecentPosts profile={profile} />
          </>
        )}
      </div>

      <aside className="hidden flex-col gap-4 lg:flex">
        {profile?.is_me ? (
          <Panel className="p-[18px]">
            <h3 className="mb-1.5 font-serif text-[17px] font-semibold leading-6">Invite a colleague</h3>
            <InviteBody />
          </Panel>
        ) : (
          profile && <SuggestedDoctors />
        )}
        <FooterLinks />
      </aside>
    </div>
  );
}

function ProfileHeader({ profile }: { profile: Profile }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [changingPhoto, setChangingPhoto] = useState(false);
  const location = [profile.city, profile.state].filter(Boolean).join(", ");

  const stats = [
    { label: "Cases", value: profile.stats.posts, href: `/u/${profile.id}/posts` },
    { label: "Followers", value: profile.stats.followers, href: profile.is_me ? "/connections?tab=followers" : null },
    { label: "Following", value: profile.stats.following, href: profile.is_me ? "/connections?tab=following" : null },
  ];

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    toast({ message: "Profile link copied." });
  }

  return (
    <section className="border-b border-line-200 bg-white px-4 py-5 md:rounded-md md:border md:p-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-6">
        {profile.is_me ? (
          <button aria-label="Change profile photo" className="self-start rounded-full" type="button" onClick={() => setChangingPhoto(true)}>
            <Avatar name={profile.name} size={96} src={profile.avatar_url} />
          </button>
        ) : (
          <Avatar name={profile.name} size={96} src={profile.avatar_url} />
        )}

        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-[23px] font-semibold leading-[30px] md:text-[28px] md:leading-9">{profile.name}</h1>
          {profile.headline && <div className="mt-1 text-[15.5px] leading-[22px] md:text-[17px] md:leading-6">{profile.headline}</div>}
          <div className="mt-2 flex flex-wrap gap-x-[18px] gap-y-1 text-[14.5px] leading-5 text-ink-600">
            <span className="flex items-center gap-1.5">
              <Stethoscope size={15} />
              {profile.specialization} · {profile.experience_years} yrs
            </span>
            {profile.hospital && (
              <span className="flex items-center gap-1.5">
                <Building2 size={15} />
                {profile.hospital}
              </span>
            )}
            {location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={15} />
                {location}
              </span>
            )}
          </div>
          <div className="mt-4 flex gap-6 text-[15px] text-ink-600">
            {stats.map(({ label, value, href }) =>
              href ? (
                <Link key={label} className="hover:text-teal-600" href={href}>
                  <strong className="font-semibold text-ink-900">{value}</strong> {label}
                </Link>
              ) : (
                <span key={label}>
                  <strong className="font-semibold text-ink-900">{value}</strong> {label}
                </span>
              ),
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {profile.is_me ? (
            <Button icon={Pencil} variant="secondary" onClick={() => setEditing(true)}>
              Edit profile
            </Button>
          ) : (
            <>
              <FollowButton isFollowing={profile.is_following} size="md" user={profile} />
              <Button icon={Link2} title="Copy profile link" variant="secondary" onClick={copyLink} />
            </>
          )}
        </div>
      </div>

      {profile.is_me && (
        <>
          {editing && <EditProfileModal onChangePhoto={() => setChangingPhoto(true)} onClose={() => setEditing(false)} />}
          <PhotoModal open={changingPhoto} profile={profile} onClose={() => setChangingPhoto(false)} />
        </>
      )}
    </section>
  );
}

function RecentPosts({ profile }: { profile: Profile }) {
  const { data, isPending } = useUserPosts(profile.id);
  const posts = (data?.pages[0]?.items ?? []).slice(0, 3);

  return (
    <Panel
      action={<span className="text-sm text-ink-500">{profile.stats.posts} total</span>}
      title="Recent posts"
    >
      <div className="px-6">
        {isPending && <p className="py-4 text-sm text-ink-500">Loading…</p>}
        {!isPending && posts.length === 0 && (
          <p className="py-4 text-[15px] text-ink-500">{profile.is_me ? "Posts you publish will appear here." : "No posts yet."}</p>
        )}
        {posts.map((post) => (
          <div key={post.id} className="border-b border-line-100 py-4 last:border-b-0">
            {post.visibility !== "public" && (
              <div className="mb-2">
                <VisibilityBadge visibility={post.visibility} />
              </div>
            )}
            <Link className="block font-serif text-lg font-semibold leading-[25px] text-ink-900 text-pretty hover:text-teal-600 hover:underline" href={`/posts/${post.id}`}>
              {post.title || "Untitled post"}
            </Link>
            {post.preview_text && <p className="mt-1 line-clamp-2 text-[15px] leading-[23px] text-ink-700">{post.preview_text}</p>}
            <div className="mt-1.5 text-[13.5px] text-ink-500">
              {formatPostDate(post.created_at)} · {post.like_count} likes · {post.comment_count} comments
            </div>
          </div>
        ))}
      </div>
      {profile.stats.posts > 0 && (
        <Link className="flex items-center gap-1.5 border-t border-line-100 px-6 py-3.5 text-[15px] font-semibold text-teal-600 hover:underline" href={`/u/${profile.id}/posts`}>
          View all {profile.stats.posts === 1 ? "1 post" : `${profile.stats.posts} posts`} <ArrowRight size={15} />
        </Link>
      )}
    </Panel>
  );
}

function SuggestedDoctors() {
  const { data } = useSuggestions();
  const doctors = [...(data?.same_specialization ?? []), ...(data?.same_hospital ?? [])].slice(0, 4);
  if (doctors.length === 0) return null;

  return (
    <Panel title="Suggested for you">
      <div className="overflow-hidden rounded-b-md">
        {doctors.map((doctor) => (
          <DoctorCard key={doctor.id} doctor={doctor} layout="row" />
        ))}
      </div>
    </Panel>
  );
}
