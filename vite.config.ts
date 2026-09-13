import { oxlintConfig } from 'oxlint-config-decent';
import { defineConfig } from 'vite-plus';

// `typescript` is aliased to @typescript/typescript6 (the TypeScript 6 JS API)
// so the typescript-compat and vitest-compat plugins can load, while `tsc`
// comes from TypeScript 7 via @typescript/native. See "Using TypeScript 7" in
// oxlint-config-decent's README.
const lint = oxlintConfig({
  enableReact: false,
  enableTestingLibrary: false,
});

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
    singleQuote: true,
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
