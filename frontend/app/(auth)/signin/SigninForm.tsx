"use client";

import { useState } from "react";

import Button from "@/components/ui/Button";
import { PasswordField, TextField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Misc";
import { useLogin } from "@/hooks/useAuth";
import { ApiError, errorMessage } from "@/lib/api";

export default function SigninForm() {
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Never say which field was wrong, so nobody can find out which emails have accounts.
  const wrongCredentials = login.error instanceof ApiError && login.error.status === 401;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    login.mutate({ email, password });
  }

  return (
    <form className="flex flex-col gap-[18px]" onSubmit={handleSubmit}>
      {login.isError && (
        <Alert>{wrongCredentials ? "That email and password don’t match. Check for typos and try again." : errorMessage(login.error)}</Alert>
      )}
      <TextField
        required
        autoComplete="email"
        label="Email"
        placeholder="name@hospital.com"
        size="lg"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <PasswordField
        required
        autoComplete="current-password"
        invalid={wrongCredentials}
        label="Password"
        size="lg"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Button fullWidth loading={login.isPending} size="lg" type="submit">
        Sign in
      </Button>
    </form>
  );
}
