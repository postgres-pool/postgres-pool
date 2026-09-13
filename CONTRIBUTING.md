# Contributing Guidelines

## Tests

Run `pnpm run build` before `pnpm test` to include the process-exit regression test.
It runs `test/fixtures/naturalExitAfterPoolUsage.mjs` in a separate Node.js process against the built package.
The child must exit naturally: running this check inside the test runner would not prove that pool timers let the process exit.
The fixture stays outside `src` because `src` is included in the published package.

## Pull Request Format

The title of your PR should match the following format:

```text
<type>: <short description>
```

### Types

- **docs** - Documentation changes only
- **feat** - Any new functionality additions
- **fix** - Bugfixes that don't add new functionality
- **test** - Test changes only
- **chore** - Anything else

Within the body of your PR, make sure you reference the issue that you have worked on, as well as pointing out anything
of note you wish us to look at during our review.

### Commits

We do not care about the number, or style of commits in your history, because we squash merge every PR into main.
Feel free to commit in whatever style you feel comfortable with.
