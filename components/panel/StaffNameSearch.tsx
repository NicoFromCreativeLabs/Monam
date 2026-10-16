"use client";

import { useRef, useState } from "react";
import { searchAccountsAction, type AccountSuggestion } from "@/lib/actions/staff";

// Name field for the roster's add-person form. Typing searches existing
// accounts (debounced); picking one fills name + email. Free typing still
// works for someone with no account yet — that path sends a real invite.
export function StaffNameSearch({
  value,
  onChange,
  onPick,
  inputClassName,
}: {
  value: string;
  onChange: (name: string) => void;
  onPick: (account: AccountSuggestion) => void;
  inputClassName: string;
}) {
  const [suggestions, setSuggestions] = useState<AccountSuggestion[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(0);

  function handleChange(next: string) {
    onChange(next);
    if (timer.current) clearTimeout(timer.current);
    const requestId = ++latest.current;
    if (next.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    timer.current = setTimeout(() => {
      searchAccountsAction(next)
        .then((results) => {
          if (requestId === latest.current) setSuggestions(results);
        })
        .catch(() => {
          if (requestId === latest.current) setSuggestions([]);
        });
    }, 250);
  }

  function pick(account: AccountSuggestion) {
    latest.current++;
    setSuggestions([]);
    onPick(account);
  }

  return (
    <div className="relative">
      <input
        required
        value={value}
        autoComplete="off"
        placeholder="Escribe un nombre para buscar cuentas existentes"
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        className={inputClassName}
      />
      {suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-lg border border-ciruela/20 bg-hueso shadow-lg">
          {suggestions.map((s) => (
            <li key={s.email}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                className="block w-full px-3 py-2 text-left font-body text-sm text-ciruela hover:bg-ciruela/5"
              >
                {s.name}
                <span className="block text-xs text-ciruela/50">{s.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
