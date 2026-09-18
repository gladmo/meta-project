# Adding a module

English | [中文](adding-a-module.zh.md)

Add one module to {{PROJECT_NAME}} and wire it into the architecture map, its owning reference page, and the verification gates.

<!-- TODO(template): this guide is a shape example. Replace the generic steps with your repository's real ones; keep the numbered path and the verify step. -->

## Steps

1. Create the module skeleton: source directory, README stating the module contract (config, semantics, limitations, extension points), and a test file.

2. Register the module in the composition where its dependencies are available; a registration is an effect — cleanup returns with the disposer.

3. Add the module to the [module map](../architecture.md) with a one-line responsibility.

4. Create the owning reference page under [modules/](../modules/README.md) when the module exposes types or configuration worth referencing.

5. Add the module to the word-budget manifest only if its README becomes a standing document.

6. Write the behavior tests that fail for the regression this module exists to prevent; see [testing policy](../testing.md).

## Verify

```sh
{{TEST_COMMAND}}
node scripts/run-gates.mjs
```

Both commands exit zero when the module is wired correctly and its documentation resolves.
