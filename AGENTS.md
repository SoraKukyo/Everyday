# Everything App — Working Agreement

## Dependency and external-service rule

- Never install a new npm, pip, plugin, or other dependency without first asking the user, explaining its purpose, and receiving explicit approval.
- When a dependency is needed, add its name and version to `package.json`, but do not run an installation command unless the user has explicitly approved it in the current conversation.
- Never add analytics, telemetry, or third-party scripts without first asking the user and receiving explicit approval.

## Architecture rules

- Keep every engine generic and config-driven. Do not hardcode feature-specific logic inside an engine component.
- Adding a feature should normally mean adding a module configuration entry, rather than creating a new engine or data table.
- Ask the user before making an architectural change that affects more than one engine.
- Use generic Supabase tables with anonymous authentication and Row Level Security; do not create a separate table for each feature.

## Delivery scope

- Build one engine or feature per session. Do not attempt to build multiple engines in one pass.
- Confirm scope and the relevant module configuration before implementing an engine or feature.
- Before any feature proposal or implementation, read and follow `FEATURE_OPTIMIZER.md`. Run both its Feature Architect and Skeptical Reviewer passes, then obtain user approval for the consolidated scope.

## Module audit execution

- The user has approved autonomous, module-by-module audits and improvements after the initial audit scope. Continue through modules without requesting another feature-approval prompt.
- Still pause before any dependency installation, SQL migration the user must run, destructive action, or external integration.
- For every module, record the Architect and Skeptical Reviewer findings in implementation notes or the final handoff, then build and verify before moving on.
