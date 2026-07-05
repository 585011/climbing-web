# Me Page — Design

**Date:** 2026-07-05
**Issue:** [climbing-web#26](https://github.com/585011/climbing-web/issues/26)

## Goal

Replace the `/me` tab stub with a profile page: editable display name, total routes ticked, log out, delete account. No profile picture. Same look as existing pages; mobile-first per the UX target.

## Decisions made during brainstorming

| Decision | Choice |
|---|---|
| Delete semantics | **DB-only** — `DELETE /users/{id}` wipes the app account and (via `ON DELETE CASCADE`) all ticks. The Auth0 identity survives; logging in again auto-creates a fresh empty account via `POST /users/me`. Confirmed acceptable. |
| Name edit UX | **Approach A: inline edit** — pencil icon swaps the displayed name for input + save/cancel. No separate screen. |
| Backend work | **None needed** — `PUT /users/{id}` and `DELETE /users/{id}` already exist with JWT ownership checks (`assertOwner`). |

## Backend contract (verified in ../climbing-api)

- `PUT /users/{id}` — body `UpdateUserRequest { email, displayName }`. **Both fields required and NotBlank**; displayName max 100 chars, pattern `^[\p{L}\p{N}\s'\-_.]*$`. Owner-only (JWT sub vs auth0_id). Returns updated `UserResponse`.
- `DELETE /users/{id}` — 204 No Content, owner-only. `user_route_ticks.fk_tick_user` is `ON DELETE CASCADE` (migration V2), so ticks vanish with the user.
- Consequence: the name-edit form always sends the user's current `email` unchanged (email is not editable in this page), and an empty display name cannot be saved.

## Layout & data

Route file `src/app/routes/me.tsx` composes queries at the app level (house pattern from the ticks pages): `useCurrentUser()` + `useTicksByUser(userId, { enabled: userId > 0 })`. Ticks count = the map's size (map is keyed by routeId, which literally matches "total number of routes ticked off"; inherits the accepted `size=100` cap already filed as climbing-api#60).

Feature component `MeProfile` in `src/features/users/components/`, props: `{ user: User; ticksCount: number; onSaveName: (displayName: string) => void; isSaving: boolean; saveError: boolean; onDelete: () => void; isDeleting: boolean; deleteError: boolean }`. Loading/error handled in the route around it: pulse skeleton while loading, full-width "Couldn't load profile — tap to retry" button on error (house pattern).

Page top-to-bottom:

1. **Profile header** — display name in `text-3xl font-bold` (page-title style), email in small muted text below. When `displayName` is empty: show "Add display name" prompt in muted style instead of the name. Pencil icon (inline stroke SVG, same family as bottom-nav icons) to the right; tapping it swaps the name for an input (pre-filled with current name) + save/cancel buttons. Big tap targets.
2. **Stat card** — "routes ticked" count, same card styling as the ticks-dashboard stat cards.
3. **Log out** — the existing button, unchanged behaviour (`auth0.logout({ returnTo: origin })`).
4. **Delete account** — danger-styled (accent border + accent text), visually separated below logout.

## Mutations

New files in `src/features/users/`:

- `api/updateUser.ts` — `PUT /users/{id}` via `apiClient`, body `{ email, displayName }`, response parsed with `UserSchema`. Input validated through `UpdateUserInputSchema` before sending.
- `api/deleteUser.ts` — `DELETE /users/{id}`; no response parsing (`apiClient` returns `null` on 204 — verified in `api-client.ts:46`; follow `deleteTick.ts`'s pattern).
- `hooks/useUpdateUser.ts` — mutation; on success invalidate `['users', 'me']`.
- `hooks/useDeleteUser.ts` — mutation; on success the caller logs out (no cache work needed — the session ends).

**Input validation** (UX / defense-in-depth; backend is authoritative): in `src/types/api.ts`:

```ts
export const DISPLAY_NAME_MAX = 100
export const UpdateUserInputSchema = z.object({
  email: z.string().trim().min(1),
  displayName: z.string().trim().min(1).max(DISPLAY_NAME_MAX)
    .regex(/^[\p{L}\p{N}\s'\-_.]*$/u),
})
```

`DISPLAY_NAME_MAX` shared by the schema, the input's `maxLength`, and tests. Save button disabled while the trimmed name is empty, unchanged, or a mutation is pending.

## Delete flow

Two-step inline confirm — no `window.confirm`, no modal infra:

1. Tap **Delete account** → button area expands to a warning: "Deletes your account and all your ticks. This cannot be undone." + two buttons: **Yes, delete everything** (danger) and **Cancel**.
2. Confirm calls `DELETE /users/{id}`; on 204, `auth0.logout({ returnTo: window.location.origin })`. (Auth0 identity survives by design — re-login creates a fresh account.)

Buttons disabled while the delete mutation is pending. Mutation errors (update or delete) render as a small inline message under the respective control; no toast system.

## Testing (TDD)

- `UpdateUserInputSchema` test — trims, rejects empty/blank, caps at 100, rejects disallowed characters (e.g. `<script>`), accepts letters/digits/space/`'`/`-`/`_`/`.` incl. non-ASCII letters (`Åse`).
- `MeProfile` component suite (props-based, mock router/auth0 as needed): renders name + email + count; empty name shows "Add display name"; pencil → input pre-filled → save fires `onSaveName` with trimmed value; save disabled on empty/unchanged/pending; delete is two-step (first tap arms + shows warning, cancel disarms, confirm fires `onDelete`); inline error messages render when `saveError`/`deleteError`.
- Route file stays thin; mutation wiring (invalidate, logout-on-delete) lives in the route and is covered by the hooks being trivial + the component contract. House pattern: route files untested.

## Out of scope

- Auth0 identity deletion (Management API) — not wanted; DB-only delete confirmed.
- Email editing — backend supports it, page doesn't expose it.
- Profile picture — explicitly excluded by the issue.
- Ticks-count pagination fix — climbing-api#60.
