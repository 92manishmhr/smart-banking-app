# Take-home — Ship an Update & Roll It Back on OpenShift

The app you deployed in the last session has a **new feature on `main`**:
customers can enable an **OTP step for login** (see PR
[#5](https://github.com/tuladhar/smart-ai-bank-app/pull/5)). Your job is to
ship that update to your existing OpenShift deployment, prove it works, then
practice rolling back to the previous image.

> Prerequisite: your `smart-ai-bank` project from the previous assignment is
> still running (`db`, `backend`, `frontend` pods healthy). If not, redo
> [ASSIGNMENT.md](ASSIGNMENT.md) first.

## Part 1 — Get the new code

The new code is already on the `main` branch of this repository.

**If you forked the repo** (e.g. to work around the GitHub rate limit), your
fork is now behind. Open your fork on GitHub and click **Sync fork → Update
branch** so its `main` has the OTP changes. Your BuildConfigs point at your
fork — building without syncing will just rebuild the old code.

Confirm the OTP commit is on the branch your BuildConfig uses:

```bash
git log --oneline -3
# should include: Add fake OTP step for customer login
```

## Part 2 — Build the new changes

Import from Git created a **BuildConfig** for each service. Trigger a new
build of both (web console: **Builds → BuildConfig → Actions → Start build**):

```bash
oc start-build backend --follow
oc start-build frontend --follow
```

When a build finishes it pushes a new image to the service's ImageStream, and
the image-change trigger rolls the Deployment out automatically. Watch it
happen:

```bash
oc get pods -w
```

## Part 3 — Run the migration

The OTP feature adds a column to the `users` table, so the database schema
must be updated. Run the migration **manually from the backend pod**, exactly
like the first deployment (it resets and re-seeds all demo data):

```bash
oc rsh deployment/backend npm run migration
```

You should see `✅ Migration complete.` and the list of demo users.

## Part 4 — Confirm the OTP feature is live

Open the frontend route and walk the new flow end to end:

1. Log in as `ram` / `customer123`.
2. The dashboard now shows a **Login OTP** card — click **Enable OTP**.
   It displays your OTP code: `123456` (faked — same pin for everyone,
   nothing is really sent).
3. Log out, then log in as `ram` again. After the password you are asked
   for the **OTP code**.
4. Enter a wrong code first (e.g. `000000`) — login is rejected.
5. Enter `123456` — you land on the dashboard.

### Verification checklist

- [ ] Both `backend` and `frontend` show a new successful build
      (`oc get builds`).
- [ ] `oc rsh deployment/backend npm run migration` completed successfully.
- [ ] The customer dashboard shows the **Login OTP** card.
- [ ] With OTP enabled, login asks for the code and accepts `123456`.
- [ ] A wrong code is rejected with an error.

## Part 5 — Roll back to the previous image

Something is "wrong" with the release (pretend!) — roll the **frontend** back
to the image that ran before the update.

1. Look at the rollout history — you should have at least two revisions:

   ```bash
   oc rollout history deployment/frontend
   ```

2. Roll back to the previous revision:

   ```bash
   oc rollout undo deployment/frontend
   oc rollout status deployment/frontend
   ```

3. Confirm: reload the app — the **Login OTP card is gone** from the
   dashboard (old frontend), while the backend still answers with the new
   code.

4. Roll the same way on the backend if you want the full app back on the old
   release, then **roll forward again** (undo the undo, or start a new build)
   so you finish the assignment on the latest version:

   ```bash
   oc rollout undo deployment/backend     # optional: full rollback
   oc rollout undo deployment/frontend    # roll forward again
   ```

> 💡 The old code never reads the new `otp_enabled` column, so the rolled-back
> app keeps working against the migrated database. That is what a
> **backward-compatible migration** buys you — databases are much harder to
> roll back than images.

### Verification checklist

- [ ] `oc rollout history deployment/frontend` shows multiple revisions.
- [ ] After `oc rollout undo`, the Login OTP card disappears.
- [ ] The rolled-back app still logs in and shows customer data.
- [ ] You rolled forward and the OTP feature is live again.

---

## What you practiced

| Skill | Where |
|---|---|
| Rebuilding an app from updated Git source | Part 2 (`oc start-build`) |
| Manual database migrations in a pod | Part 3 (`oc rsh`) |
| Verifying a release like a user would | Part 4 |
| Image rollback with rollout history | Part 5 (`oc rollout undo`) |
