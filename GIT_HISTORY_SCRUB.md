# Git History Scrub — Required Follow-up

The committed secrets have been removed from the **current** source of all three
repos (sri-frontend, sri-backend, atlas-platform). However, they still exist in
**git history**. Anyone with repo access (or anyone who cloned/forked) can recover
them from old commits.

## The only thing that truly neutralizes the leak

**Rotate every credential** (see each repo's `SECRETS.md`). Once rotated, the values
in history are useless. Rotation is the single most important step — do it first.

## Optionally scrub history (after rotation)

History rewriting is **destructive** and force-pushes rewritten branches. Coordinate
with everyone who has clones (they must re-clone or hard-reset). It was **not** done
automatically here because it rewrites shared branches.

> NOTE: This document deliberately does **not** list the raw secret values — doing so
> would re-introduce them to the repo and trip GitHub Push Protection. Build the
> replacements list below from the pre-rotation values (recover them from the old
> commits locally, your secret manager, or the provider console before rotating).

### Using git-filter-repo (recommended)

```bash
pip install git-filter-repo

# Create a replacements file with one entry per leaked literal, in the form:
#   <leaked-value>==>REMOVED
# Values to include (DO NOT commit this file):
#   - Azure Blob Storage account key (databaseblob)
#   - SendGrid API key (SG....)
#   - Azure Form Recognizer key
#   - Atlas API key
#   - Azure APIM subscription key (frontend)
#   - CARTO API key (frontend, JWT)
#   - Google service-account private key (the MIIE... PEM block)
#   - SQL/Spectrum DB passwords
#
#   printf '%s==>REMOVED\n' "$BLOB_KEY" "$SENDGRID_KEY" ... > /tmp/secrets.txt

# Run per repo (this rewrites ALL history):
git filter-repo --replace-text /tmp/secrets.txt --force

# Also purge whole files that only ever held secrets, e.g.:
#   sri-frontend:   src/config/database.config.json, docs/main.*.js
#   atlas-platform: out/
#   git filter-repo --path src/config/database.config.json --invert-paths --force

# Then force-push (coordinate with the team first):
#   git push origin --force --all
#   git push origin --force --tags

# Finally, delete /tmp/secrets.txt.
```

> The Google service-account **private key** must also be revoked in Google Cloud
> Console (delete the key), not merely scrubbed from history.

## Prevention going forward

- Add a pre-commit / CI secret scanner (gitleaks or trufflehog).
- `.gitignore` now excludes `src/environments/environments.ts` (template committed as
  `environments.example.ts`), `atlas-platform/out/`, and the `docs/` build bundles.
- GitHub Push Protection / Secret Scanning should be enabled on all three repos
  (Settings → Code security and analysis).
