# 🎓 Trainee Assignment: Deploy to OpenShift

Deploy this application to your OpenShift cluster using **Import from Git**,
then complete the access-control task.

## Part 1 — Project

Create a project for the application:

```bash
oc new-project smart-ai-bank
```

## Part 2 — PostgreSQL

Create a Secret holding the database configuration (the backend reads these
exact keys as environment variables):

```bash
oc create secret generic bank-db-secret \
  --from-literal=DB_HOST=db \
  --from-literal=DB_PORT=5432 \
  --from-literal=DB_NAME=smartaibank \
  --from-literal=DB_USER=bankuser \
  --from-literal=DB_PASSWORD=bankpass
```

Deploy PostgreSQL (image `postgres:16-alpine`) and expose it as a Service named
`db` on port 5432, with the Postgres environment variables set from the values
in the Secret:

```bash
oc new-app --name db --image=postgres:16-alpine \
  -e POSTGRES_DB=smartaibank \
  -e POSTGRES_USER=bankuser \
  -e POSTGRES_PASSWORD=bankpass
```

> In the web console you can do the same via **+Add → Container images**.

## Part 3 — Backend

1. In the web console: **+Add → Import from Git**.
2. Git repo URL: this repository. Under **Advanced Git options**, set
   **Context dir** to `/backend` (it has its own Dockerfile).
3. Name the application `backend`, target port **4000**. A public route is not
   required for the backend.
4. Inject the database configuration from the Secret into the Deployment:

   ```bash
   oc set env deployment/backend --from=secret/bank-db-secret
   ```

5. **Run the database migration manually** from the backend pod (this seeds all
   demo data):

   ```bash
   oc rsh deployment/backend npm run migration
   ```

   You should see `✅ Migration complete.` and the list of demo users.

## Part 4 — Frontend

1. **+Add → Import from Git** again, with **Context dir** `/frontend`.
2. Name it `frontend`, target port **3000**, and **create a Route** (this is the
   URL your users open).
3. Tell the frontend where the backend is — the internal Service address:

   ```bash
   oc set env deployment/frontend BACKEND_API_URL=http://backend:4000
   ```

4. Open the route, log in as `ram` / `customer123`, and try the AI chatbox.
   Then log in as `manager` / `manager123` to see the manager view.

### Verification checklist

- [ ] `oc get pods` shows `db`, `backend`, and `frontend` running.
- [ ] `oc rsh deployment/backend npm run migration` completed successfully.
- [ ] Customer login works and shows balance, KYC, account details, and statement.
- [ ] The chatbox answers a canned question.
- [ ] Manager login shows the branch overview.

## Part 5 — Access control (RBAC)

Configure two users for the cluster:

1. **`developer` user** — may work **only inside the `smart-ai-bank` project**,
   with `edit` permission (deploy and manage apps, but no role management or
   access to other projects):

   ```bash
   oc adm policy add-role-to-user edit developer -n smart-ai-bank
   ```

2. **`admin` user** — retains full cluster access (`cluster-admin`).

Prove it works:

```bash
# As developer — allowed
oc auth can-i create deployments -n smart-ai-bank --as=developer   # yes

# As developer — denied
oc auth can-i create projects --as=developer                       # no
oc auth can-i create deployments -n default --as=developer         # no

# As admin — allowed everywhere
oc auth can-i '*' '*' --as=admin                                   # yes
```

---

## Repository layout

```
├── backend/            # Express REST API + migrations (see backend/Dockerfile)
├── frontend/           # Next.js UI (see frontend/Dockerfile)
├── docker-compose.yml  # Local end-to-end test
└── CLAUDE.md           # Project instructions
```
