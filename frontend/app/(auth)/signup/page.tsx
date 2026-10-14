import type { Metadata } from "next";
import Link from "next/link";

import SignupForm from "./SignupForm";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { invite } = await searchParams;

  return (
    <>
      <SignupForm inviteToken={invite ?? null} />
      <p className="mt-5 text-[14.5px] text-ink-600">
        Already a member?{" "}
        <Link className="font-semibold text-teal-600 hover:underline" href="/signin">
          Sign in
        </Link>
      </p>
    </>
  );
}
