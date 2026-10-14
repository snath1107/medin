import type { Metadata } from "next";
import Link from "next/link";

import SigninForm from "./SigninForm";

export const metadata: Metadata = { title: "Sign in" };

export default function SigninPage() {
  return (
    <>
      <div className="w-full max-w-[400px] rounded-md border border-line-200 bg-white p-6 md:p-8">
        <h1 className="font-serif text-[26px] font-semibold leading-[34px]">Sign in</h1>
        <p className="mb-6 mt-1 text-[15px] leading-[22px] text-ink-600">
          Welcome back. Pick up where your colleagues left off.
        </p>
        <SigninForm />
      </div>
      <p className="mt-5 max-w-[400px] text-center text-[14.5px] leading-[22px] text-ink-600">
        New to Medin? Membership is by invitation from a colleague.{" "}
        <Link className="font-semibold text-teal-600 hover:underline" href="/signup">
          Sign up with your invite
        </Link>
      </p>
    </>
  );
}
