"use client";

import clsx from "clsx";
import { Search, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { TextField } from "@/components/ui/Field";
import { Overline } from "@/components/ui/Misc";
import { PersonRowSkeleton } from "@/components/ui/Skeleton";
import StateMessage from "@/components/ui/StateMessage";
import Tabs from "@/components/ui/Tabs";
import DoctorCard from "@/components/users/DoctorCard";
import { useMe } from "@/hooks/useAuth";
import { useConnections, useProfile, useSuggestions } from "@/hooks/useUsers";
import type { UserCard } from "@/lib/types";

type Tab = "suggestions" | "followers" | "following";

export default function ConnectionsPage() {
  const tabParam = useSearchParams().get("tab");
  const tab: Tab = tabParam === "followers" || tabParam === "following" ? tabParam : "suggestions";
  const { data: me } = useMe();
  const { data: profile } = useProfile(me?.id);

  const items = [
    { key: "suggestions", label: "Suggestions", href: "/connections" },
    { key: "followers", label: "Followers", href: "/connections?tab=followers", count: profile?.stats.followers },
    { key: "following", label: "Following", href: "/connections?tab=following", count: profile?.stats.following },
  ];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[232px_minmax(0,1fr)]">
      {/* Side nav on desktop */}
      <nav className="hidden flex-col gap-0.5 lg:flex">
        <h1 className="px-3 pb-2.5 font-serif text-[19px] font-semibold leading-[26px]">Connections</h1>
        {items.map((item) => (
          <Link
            key={item.key}
            aria-current={tab === item.key ? "page" : undefined}
            className={clsx(
              "flex h-9 items-center justify-between rounded px-3 text-[15px]",
              tab === item.key ? "bg-teal-50 font-semibold text-teal-text" : "text-ink-900 hover:bg-paper-100",
            )}
            href={item.href}
          >
            {item.label}
            {item.count !== undefined && <span className="text-sm text-ink-500">{item.count}</span>}
          </Link>
        ))}
      </nav>

      {/* Tabs on phones */}
      <div className="lg:hidden">
        <Tabs stretch active={tab} items={items} />
      </div>

      <div className="min-w-0">{tab === "suggestions" ? <SuggestionsTab /> : <PeopleTab kind={tab} />}</div>
    </div>
  );
}

function SuggestionsTab() {
  const { data, isPending } = useSuggestions();

  if (isPending) return <PersonRowSkeleton rows={3} />;

  const groups = [
    { title: "From your hospital", subtitle: "Colleagues you may already work with", doctors: data?.same_hospital ?? [] },
    { title: "In your specialization", subtitle: "Doctors in your field across Medin", doctors: data?.same_specialization ?? [] },
  ].filter((group) => group.doctors.length > 0);

  if (groups.length === 0) {
    return (
      <StateMessage
        description="As more doctors from your hospital and specialization join, they’ll show up here."
        icon={Users}
        title="No suggestions right now"
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.title}>
          <div className="mb-3 hidden md:block">
            <h2 className="font-serif text-[19px] font-semibold leading-[26px]">{group.title}</h2>
            <div className="text-sm text-ink-500">{group.subtitle}</div>
          </div>
          <div className="px-4 pb-2 pt-[18px] md:hidden">
            <Overline>{group.title}</Overline>
          </div>
          <DoctorGrid doctors={group.doctors} />
        </section>
      ))}
    </div>
  );
}

function PeopleTab({ kind }: { kind: "followers" | "following" }) {
  const { data, isPending } = useConnections(kind);
  const [filter, setFilter] = useState("");

  if (isPending) return <PersonRowSkeleton rows={3} />;

  const people = data ?? [];
  const query = filter.trim().toLowerCase();
  const shown = query
    ? people.filter((person) =>
        [person.name, person.hospital, person.specialization].some((value) => value?.toLowerCase().includes(query)),
      )
    : people;

  if (people.length === 0) {
    return (
      <StateMessage
        description={
          kind === "followers"
            ? "When doctors follow you, they’ll appear here."
            : "Follow doctors to see their cases in your feed."
        }
        icon={Users}
        title={kind === "followers" ? "No followers yet" : "You’re not following anyone yet"}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 px-4 pt-4 md:flex-row md:items-center md:justify-between md:px-0 md:pt-0">
        <h2 className="font-serif text-[19px] font-semibold leading-[26px]">
          {kind === "followers" ? "Followers" : "Following"} · {people.length}
        </h2>
        <div className="md:w-80">
          <TextField
            aria-label="Filter people"
            icon={Search}
            placeholder="Filter by name, hospital or specialty"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </div>
      </div>
      {shown.length === 0 ? <p className="px-4 text-[15px] text-ink-500 md:px-0">No one matches “{filter}”.</p> : <DoctorGrid doctors={shown} />}
    </div>
  );
}

/** Tiles on wide screens, rows on phones. */
function DoctorGrid({ doctors }: { doctors: UserCard[] }) {
  return (
    <>
      <div className="hidden gap-3 md:grid md:grid-cols-2 xl:grid-cols-3">
        {doctors.map((doctor) => (
          <DoctorCard key={doctor.id} doctor={doctor} />
        ))}
      </div>
      <div className="border-y border-line-200 md:hidden">
        {doctors.map((doctor) => (
          <DoctorCard key={doctor.id} doctor={doctor} layout="row" />
        ))}
      </div>
    </>
  );
}
