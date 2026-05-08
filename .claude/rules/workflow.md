# Workflow Rules

## The Development Loop

Every piece of work — no matter how small — must follow this loop:

```
1. TASK    Define what you're building, why it's needed, and what "done" looks like
2. BUILD   Implement the change in the smallest reasonable increment
3. VERIFY  Prove it works: screenshot the UI change, or run the relevant test
```

**Never** mark a task complete without verification evidence.

---

## Plan Before You Build (Complex Features)

For any feature that touches more than one file or component, write a brief plan first:
- What problem does this solve?
- What files will change?
- Are there existing utilities or components I can reuse?
- What could go wrong?

Only start building after you (or the team) agree on the plan.

---

## Branch Strategy

| Prefix | When to use |
|--------|------------|
| `feature/` | New functionality |
| `fix/` | Bug fixes |
| `chore/` | Config, tooling, dependency updates |
| `docs/` | Documentation only |

Branch from `main`. Keep branches short-lived. Merge via Pull Request.

---

## Commit Message Format

```
type: short description (present tense, lowercase)

Examples:
feat: add particle system for nurdle animation
fix: correct glTF model scaling on mobile
chore: update Next.js to 15.x
docs: add Fusion 360 export instructions to README
```

---

## 3D Simulation Workflow

Before starting any 3D integration work:
1. Export the latest Fusion 360 model (File > Export > glTF 2.0)
2. Save to `Virtual Simulation/models/`
3. Verify the model loads correctly in the scene before building on top of it

---

## Pull Request Checklist

- [ ] Branch is up to date with `main`
- [ ] No `.env`, secrets, or local config files accidentally staged
- [ ] UI changes include a screenshot in the PR description
- [ ] Tests pass (or new tests added for new behaviour)
- [ ] At least one team member has reviewed
