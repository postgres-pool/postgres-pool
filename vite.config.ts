import { oxlintConfig } from 'eslint-config-decent/oxlint';
import { defineConfig } from 'vite-plus';

// Keep the root `oxlint` devDependency pinned to the version bundled by
// vite-plus (`vp --version`); the OxlintConfig types must come from the same
// oxlint version that `vp lint` executes or this config fails to typecheck.
const lint = oxlintConfig({
  enableReact: false,
  enableTestingLibrary: false,
});

// typescript-eslint (and @vitest/eslint-plugin, which depends on it) cannot
// load under typescript@7 because the TS6 JS compiler API was removed
// (https://github.com/typescript-eslint/typescript-eslint/issues/12518).
// Drop those two compat plugins and their gap rules until upstream supports
// TS7; native typescript rules and tsgolint type-aware rules remain active.
const ts7IncompatiblePlugins = new Set(['@typescript-eslint/eslint-plugin', '@vitest/eslint-plugin']);
const removedPluginNames = new Set<string>();
lint.jsPlugins = lint.jsPlugins?.filter((plugin) => {
  if (typeof plugin === 'string' || !ts7IncompatiblePlugins.has(plugin.specifier)) {
    return true;
  }

  removedPluginNames.add(plugin.name);
  return false;
});

function stripRemovedPluginRules(rules?: Record<string, unknown>): void {
  for (const rule of Object.keys(rules ?? {})) {
    const [pluginName] = rule.split('/');
    if (pluginName && removedPluginNames.has(pluginName)) {
      delete rules?.[rule];
    }
  }
}

stripRemovedPluginRules(lint.rules);
for (const override of lint.overrides ?? []) {
  stripRemovedPluginRules(override.rules);
}

lint.rules = {
  ...lint.rules,
  // PostgresPoolError takes `code` as its second constructor parameter; the
  // `options`-shaped signature this rule wants would break the public API.
  'unicorn-compat/custom-error-definition': 'off',
  // Not enforced before this toolchain migration; enabling it means adding
  // explicit type parameters to every vi.fn() in the test suite.
  'vitest/require-mock-type-parameters': 'off',
};

export default defineConfig({
  lint,
  fmt: {
    printWidth: 200,
    semi: true,
    singleQuote: true,
    bracketSpacing: true,
    arrowParens: 'always',
    quoteProps: 'as-needed',
    trailingComma: 'all',
    useTabs: false,
    tabWidth: 2,
    endOfLine: 'lf',
    arrayWrap: { minElementsToWrap: 3 },
    sortImports: {
      newlinesBetween: true,
      groups: [
        ['value-builtin', 'type-builtin'],
        { newlinesBetween: true },
        ['value-external', 'type-external'],
        { newlinesBetween: true },
        ['value-internal', 'type-internal'],
        { newlinesBetween: true },
        ['value-parent', 'type-parent'],
        { newlinesBetween: true },
        ['value-sibling', 'type-sibling', 'value-index', 'type-index'],
      ],
    },
    sortPackageJson: false,
    ignorePatterns: ['**/node_modules/**', '**/dist/**', 'CHANGELOG.md'],
  },
  pack: {
    entry: 'src/index.ts',
    format: ['esm', 'cjs'],
    fixedExtension: false,
    // typescript@7 no longer ships the JS compiler API the default dts
    // generator needs; drive declaration emit with its native binary instead.
    dts: {
      tsgo: { path: 'node_modules/.bin/tsc' },
    },
    // strict-event-emitter-types is types-only and intentionally inlined into
    // the bundled declarations; disable the unintended-bundling hint.
    deps: {
      onlyBundle: false,
    },
  },
  test: {
    restoreMocks: true,
  },
});
