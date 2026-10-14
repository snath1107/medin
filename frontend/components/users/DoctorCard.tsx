import { Briefcase, MapPin } from "lucide-react";
import Link from "next/link";

import Avatar from "@/components/ui/Avatar";
import type { UserCard } from "@/lib/types";

import FollowButton from "./FollowButton";

/**
 * A doctor in a list.
 *  card – a tile in a grid (connections, suggestions)
 *  row  – a full-width row (search results, phones)
 */
export default function DoctorCard({ doctor, layout = "card", isMe }: { doctor: UserCard; layout?: "card" | "row"; isMe?: boolean }) {
  const profileUrl = `/u/${doctor.id}`;
  const follow = !isMe && <FollowButton fullWidth={layout === "card"} isFollowing={doctor.is_following} user={doctor} />;

  if (layout === "row") {
    return (
      <div className="flex items-start gap-3 border-b border-line-100 bg-white px-4 py-3.5 last:border-b-0">
        <Link href={profileUrl}>
          <Avatar name={doctor.name} size={44} src={doctor.avatar_url} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link className="block font-serif text-base font-semibold leading-[21px] text-ink-900 hover:underline" href={profileUrl}>
            {doctor.name}
          </Link>
          <div className="text-sm leading-[19px] text-ink-700">
            {[doctor.specialization, doctor.hospital].filter(Boolean).join(" · ")}
          </div>
          <div className="mt-0.5 text-[13px] leading-[18px] text-ink-500">
            {[doctor.city, `${doctor.experience_years} yrs`].filter(Boolean).join(" · ")}
          </div>
        </div>
        {follow}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3.5 rounded-md border border-line-200 bg-white p-[18px]">
      <div className="flex items-start gap-3">
        <Link href={profileUrl}>
          <Avatar name={doctor.name} size={48} src={doctor.avatar_url} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link className="block font-serif text-[16.5px] font-semibold leading-[22px] text-ink-900 hover:underline" href={profileUrl}>
            {doctor.name}
          </Link>
          <div className="text-sm font-semibold leading-5 text-ink-700">{doctor.specialization}</div>
          {doctor.hospital && <div className="text-sm leading-5 text-ink-500">{doctor.hospital}</div>}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[13.5px] leading-[18px] text-ink-500">
        {doctor.city && (
          <span className="flex items-center gap-[5px]">
            <MapPin size={14} />
            {doctor.city}
          </span>
        )}
        <span className="flex items-center gap-[5px]">
          <Briefcase size={14} />
          {doctor.experience_years} yrs experience
        </span>
      </div>
      <div className="mt-auto">{follow}</div>
    </div>
  );
}
