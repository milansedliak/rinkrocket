# Phase 4 — Launch

Status: `[ ]` not started
Depends on: [Phase 3](./3-practice-sharing.md)
Target duration: 2–3 weeks

## Goal

Take the working product from coaches-on-beta to **public launch-ready**. This phase is about reliability, observability, and getting the first real users in the door.

The product is the canvas (Phase 1), the auth/cloud/sharing layer (Phase 2), and the practice planner (Phase 3). This phase doesn't add new user features. It adds the operational scaffolding to launch responsibly.

---

## Scope

### Reliability

- [ ] Production deploy pipeline (Vercel `main` branch)
- [ ] Preview deploys on every PR
- [ ] Database backups configured (Supabase)
- [ ] Smoke test suite runs against preview deploys in CI
- [ ] Error budget defined and tracked

### Observability

- [ ] Wire Sentry for error tracking in `apps/web`
- [ ] Wire PostHog (or similar) for product analytics
- [ ] Define and instrument core funnel events:
  - signup
  - drill created
  - first element placed
  - first save
  - first share link generated
  - first share link opened
- [ ] Dashboard for funnel + retention

### Security

- [ ] Full RLS audit on all tables
- [ ] Automated RLS test suite that proves cross-user isolation
- [ ] Share link token entropy reviewed (must be ≥ 21 chars from CSPRNG)
- [ ] Rate-limit share link creation
- [ ] Rate-limit auth endpoints

### Marketing Site

- [ ] `/` landing page that explains the product in one screen
- [ ] Live drill demo (interactive, no signup) embedded above the fold
- [ ] Pricing section (even if free for launch — set the expectation)
- [ ] Signup CTA
- [ ] SEO basics: meta tags, sitemap, OpenGraph for shared links

### Legal / Compliance

- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] Cookie banner if PostHog requires it in target geo

### Launch Mechanics

- [ ] Beta cohort onboarded
- [ ] Feedback channel set up (Discord, email, or Loops form)
- [ ] First weekly review of analytics + feedback
- [ ] Soft launch on hockey coach communities (Reddit, Facebook groups, X)

---

## Definition of Done

- [ ] Production environment is stable for 7 consecutive days with no Sentry-flagged incident affecting users
- [ ] Funnel dashboard shows real signups from outside the beta cohort
- [ ] At least 5 coaches outside the original cohort have created and shared a drill
- [ ] The MVP success criteria in `PROJECT.md` are met

Next: [Later — Post-MVP roadmap](./later.md)
