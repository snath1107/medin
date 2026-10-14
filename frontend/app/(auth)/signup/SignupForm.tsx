"use client";

import { Link2Off } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import Avatar from "@/components/ui/Avatar";
import Button, { ButtonLink } from "@/components/ui/Button";
import { PasswordField, SelectField, TextField } from "@/components/ui/Field";
import { Alert, Overline } from "@/components/ui/Misc";
import Spinner from "@/components/ui/Spinner";
import StateMessage from "@/components/ui/StateMessage";
import { useSignup } from "@/hooks/useAuth";
import { api, ApiError, errorMessage } from "@/lib/api";
import { INDIAN_STATES, SPECIALIZATIONS } from "@/lib/constants";
import { doctorLine } from "@/lib/format";
import type { InviteStatus } from "@/lib/types";

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  password: "",
  specialization: "",
  experience_years: "",
  hospital: "",
  city: "",
  state: "",
  doctor_id: "",
};

type FormValues = typeof EMPTY_FORM;
type Errors = Partial<Record<keyof FormValues, string>>;

/** Checks run in the browser for quick feedback. The backend checks everything again. */
function validate(form: FormValues): Errors {
  const errors: Errors = {};
  if (!form.first_name.trim()) errors.first_name = "Enter your first name.";
  if (!form.last_name.trim()) errors.last_name = "Enter your last name.";
  if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = "Enter a full email address, like name@hospital.com.";
  if (form.password.length < 8) errors.password = "Use at least 8 characters.";
  if (!form.specialization) errors.specialization = "Choose your specialization.";
  const years = Number(form.experience_years);
  if (form.experience_years === "" || !Number.isInteger(years) || years < 0 || years > 70) {
    errors.experience_years = "Enter a whole number between 0 and 70.";
  }
  return errors;
}

export default function SignupForm({ inviteToken }: { inviteToken: string | null }) {
  const invite = useQuery({
    queryKey: ["invite", inviteToken],
    queryFn: () => api<InviteStatus>(`/auth/invites/${encodeURIComponent(inviteToken!)}`),
    enabled: !!inviteToken,
  });

  if (!inviteToken || invite.data?.valid === false || invite.isError) {
    return <InviteProblem hasToken={!!inviteToken} />;
  }

  if (invite.isPending) {
    return (
      <div className="flex items-center gap-2.5 py-16 text-ink-500">
        <Spinner /> Checking your invite…
      </div>
    );
  }

  return <SignupFields invite={invite.data} inviteToken={inviteToken} />;
}

function InviteProblem({ hasToken }: { hasToken: boolean }) {
  return (
    <div className="w-full max-w-[480px] rounded-md border border-line-200 bg-white">
      <StateMessage
        actions={
          <ButtonLink href="/signin" variant="secondary">
            Go to sign in
          </ButtonLink>
        }
        card={false}
        description={
          hasToken
            ? "It may have expired or already been used. Invites last 14 days and work once. Ask the colleague who invited you to send a fresh link from their Medin account."
            : "Medin is invite-only. Open the invite link a colleague sent you to create your account."
        }
        icon={Link2Off}
        title={hasToken ? "This invite link is no longer valid" : "You need an invite to join"}
        tone="warning"
      />
    </div>
  );
}

function SignupFields({ invite, inviteToken }: { invite: InviteStatus; inviteToken: string }) {
  const signup = useSignup();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);

  // After the first submit, re-check as the user fixes things.
  const update = (name: keyof FormValues, value: string) => {
    const next = { ...form, [name]: value };
    setForm(next);
    if (submitted) setErrors(validate(next));
  };
  const field = (name: keyof FormValues) => ({
    value: form[name],
    error: errors[name],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => update(name, event.target.value),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    signup.mutate(
      { ...form, experience_years: Number(form.experience_years), invite_token: inviteToken },
      {
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) {
            setErrors({ email: "An account with this email already exists. Sign in instead?" });
          }
        },
      },
    );
  }

  const errorCount = Object.keys(errors).length;
  const daysLeft = invite.expires_at ? Math.max(1, Math.ceil((new Date(invite.expires_at).getTime() - Date.now()) / 86_400_000)) : null;

  return (
    <div className="w-full max-w-[600px] rounded-md border border-line-200 bg-white">
      {invite.inviter && (
        <div className="flex items-center gap-3.5 rounded-t-md border-b border-line-100 bg-paper-75 px-5 py-4 md:px-8 md:py-5">
          <Avatar name={invite.inviter.name} size={40} src={invite.inviter.avatar_url} />
          <div>
            <div className="text-[15px] leading-[21px]">
              <strong>{invite.inviter.name}</strong> invited you to join Medin
            </div>
            <div className="text-[13.5px] leading-[19px] text-ink-500">
              {doctorLine(invite.inviter)}
              {daysLeft && ` · Invite valid for ${daysLeft} more day${daysLeft === 1 ? "" : "s"}`}
            </div>
          </div>
        </div>
      )}

      <form className="px-5 pb-8 pt-6 md:px-8 md:pt-7" noValidate onSubmit={handleSubmit}>
        <h1 className="font-serif text-2xl font-semibold leading-8 md:text-[26px] md:leading-[34px]">Create your account</h1>
        <p className="mt-1 text-[15px] leading-[22px] text-ink-600">Your profile is visible only to other doctors on Medin.</p>

        {errorCount > 0 && (
          <div className="mt-5">
            <Alert>Fix {errorCount === 1 ? "1 field" : `${errorCount} fields`} below to continue.</Alert>
          </div>
        )}
        {signup.isError && !(signup.error instanceof ApiError && signup.error.status === 409) && (
          <div className="mt-5">
            <Alert>{errorMessage(signup.error)}</Alert>
          </div>
        )}

        <div className="mb-3.5 mt-7">
          <Overline>Account</Overline>
        </div>
        <div className="grid gap-x-4 gap-y-[18px] sm:grid-cols-2">
          <TextField autoComplete="given-name" label="First name" {...field("first_name")} />
          <TextField autoComplete="family-name" label="Last name" {...field("last_name")} />
          <div className="sm:col-span-2">
            <TextField autoComplete="email" label="Work email" type="email" {...field("email")} />
          </div>
          <div className="sm:col-span-2">
            <PasswordField
              showStrength
              autoComplete="new-password"
              hint="At least 8 characters. Mixing upper and lower case, numbers and a symbol makes it stronger."
              label="Password"
              {...field("password")}
            />
          </div>
        </div>

        <div className="mb-3.5 mt-7 border-t border-line-100 pt-6">
          <Overline>Professional details</Overline>
        </div>
        <div className="grid gap-x-4 gap-y-[18px] sm:grid-cols-2">
          <SelectField label="Specialization" options={SPECIALIZATIONS} placeholder="Select specialization" {...field("specialization")} />
          <TextField label="Years of experience" max={70} min={0} type="number" {...field("experience_years")} />
          <div className="sm:col-span-2">
            <TextField label="Hospital or clinic" optional {...field("hospital")} />
          </div>
          <TextField label="City" optional {...field("city")} />
          <SelectField label="State" optional options={INDIAN_STATES} placeholder="Select state" {...field("state")} />
          <div className="sm:col-span-2">
            <TextField
              hint="Your State Medical Council or NMC number."
              label="Doctor registration ID"
              optional
              placeholder="e.g. MMC/2014/04521"
              {...field("doctor_id")}
            />
          </div>
        </div>

        <p className="mb-4 mt-6 text-[13.5px] leading-5 text-ink-500">
          By creating an account you agree never to share identifiable patient information on Medin.
        </p>
        <Button fullWidth loading={signup.isPending} size="lg" type="submit">
          Create account
        </Button>
      </form>
    </div>
  );
}
