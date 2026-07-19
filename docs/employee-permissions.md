# Employee permissions

- Owner: full access, organisation, integrations, owners, deletion and scoring.
- Admin: prospects, research, outreach, pipeline, non-owner invitations, analytics and most settings.
- Researcher: view prospects, run/edit/approve research and notes; no Gmail drafts.
- Outreach Manager: approved research, outreach, Gmail drafts, pipeline and responses; no organisation settings.
- Viewer: read only, with no jobs, modifications or integration credentials.

`src/lib/auth/permissions.ts` is the central policy map. UI visibility is convenience only; every server mutation must enforce the same permission.
