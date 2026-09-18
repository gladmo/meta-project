# Testing policy

English | [中文](testing.zh.md)

Evidence matches the surface: the narrowest check that would fail for the regression owns the change. Never default to the full suite locally; CI owns exhaustive coverage and the platform matrix. The evidence-selection procedure lives in [pre-push-checks](../.agents/skills/pre-push-checks/SKILL.md).

## Test tiers

<!-- TODO(template): define the tiers this repository actually runs — for example unit, integration, snapshot/expected-output, and real-API e2e — and which surface each tier owns. Delete unused tiers. -->

- **Unit:** behavior of one module in isolation; fast and deterministic.
- **Snapshot / expected output:** user- or model-visible output pinned through recorded fixtures.
- **End-to-end:** real external providers; self-skip without credentials.

## Secrets

Tests that call real external services read `{{SECRET_ENV_VAR}}` and self-skip when it is absent; CI enables them with injected credentials. Never print secrets; never commit credentials or recordings that contain them.

## Test quality rules

- Tests describe behavior, not correctness: an assertion fails on the intended regression and verifies observable state rather than restating the implementation.
- A test that passes only when it runs alone is a defect in the test: own every port, temporary path, and child process through teardown.
- Change obsolete behavior together with its tests and explain why in the PR.
- A non-trivial change to user- or model-visible output updates its owning snapshot or expected-output fixture in the same commit.
