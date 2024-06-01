import eslint from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import mocha from 'eslint-plugin-mocha';
import prettier from 'eslint-plugin-prettier/recommended';
import promise from 'eslint-plugin-promise';
import security from 'eslint-plugin-security';
import globals from 'globals';
import tsEslint from 'typescript-eslint';

export default tsEslint.config(
  eslint.configs.recommended,
  ...tsEslint.configs.strictTypeChecked,
  ...tsEslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        projectService: {
          allowedDefaultProject: ['./*.js', './*.cjs', './*.mjs', './tests/**/*.ts'],
          defaultProject: 'tsconfig.json',
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.js', '**/*.cjs', '**/*.mjs'],
    plugins: {
      jsdoc,
      promise,
      security,
    },
    settings: {
      jsdoc: {
        preferredTypes: {
          Array: 'Array<object>',
          'Array.': 'Array<object>',
          'Array<>': '[]',
          'Array.<>': '[]',
          'Promise.<>': 'Promise<>',
        },
      },
    },
    rules: {
      'array-callback-return': ['error', { allowImplicit: true }],
      'block-scoped-var': 'error',
      'callback-return': ['error', ['callback', 'cb', 'next', 'done']],
      'class-methods-use-this': [
        'error',
        {
          exceptMethods: [],
        },
      ],
      'default-case': ['error', { commentPattern: '^no default$' }],
      'default-case-last': 'error',
      eqeqeq: ['error', 'smart'],
      'func-names': 'error',
      'func-style': [
        'error',
        'declaration',
        {
          allowArrowFunctions: false,
        },
      ],
      'global-require': 'error',
      'grouped-accessor-pairs': 'error',
      'guard-for-in': 'error',
      'id-length': [
        'error',
        {
          exceptions: ['_', '$', 'e', 'i', 'j', 'k', 'q', 'x', 'y'],
        },
      ],
      'lines-around-directive': [
        'error',
        {
          before: 'always',
          after: 'always',
        },
      ],
      'handle-callback-err': ['error', '^.*err'],
      'max-classes-per-file': ['error', 1],
      'object-shorthand': [
        'error',
        'always',
        {
          ignoreConstructors: false,
          avoidQuotes: true,
          avoidExplicitReturnArrows: true,
        },
      ],
      'one-var': ['error', 'never'],
      'operator-assignment': ['error', 'always'],
      'no-await-in-loop': 'error',
      'no-bitwise': 'error',
      'no-buffer-constructor': 'error',
      'no-caller': 'error',
      'no-cond-assign': ['error', 'always'],
      'no-console': 'error',
      'no-constructor-return': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      'no-empty-static-block': 'error',
      'no-eval': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-extra-label': 'error',
      'no-inner-declarations': 'error',
      'no-iterator': 'error',
      'no-label-var': 'error',
      'no-labels': ['error', { allowLoop: false, allowSwitch: false }],
      'no-lone-blocks': 'error',
      'no-lonely-if': 'error',
      'no-mixed-spaces-and-tabs': 'error',
      'no-multi-assign': ['error'],
      'no-multi-str': 'error',
      'no-negated-condition': 'error',
      'no-nested-ternary': 'error',
      'no-new-object': 'error',
      'no-new-require': 'error',
      'no-new-wrappers': 'error',
      'no-octal-escape': 'error',
      'no-path-concat': 'error',
      'no-promise-executor-return': 'error',
      'no-proto': 'error',
      'no-restricted-exports': [
        'error',
        {
          restrictedNamedExports: [
            'default', // use `export default` to provide a default export
            'then', // this will cause tons of confusion when your module is dynamically `import()`ed, and will break in most node ESM versions
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'isFinite',
          message: 'Use Number.isFinite instead https://github.com/airbnb/javascript#standard-library--isfinite',
        },
        {
          name: 'isNaN',
          message: 'Use Number.isNaN instead https://github.com/airbnb/javascript#standard-library--isnan',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'arguments',
          property: 'callee',
          message: 'arguments.callee is deprecated',
        },
        {
          property: '__defineGetter__',
          message: 'Please use Object.defineProperty instead.',
        },
        {
          property: '__defineSetter__',
          message: 'Please use Object.defineProperty instead.',
        },
      ],
      'no-restricted-syntax': ['error', 'DebuggerStatement', 'LabeledStatement', 'WithStatement'],
      'no-return-assign': ['error', 'always'],
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-script-url': 'error',
      'no-template-curly-in-string': 'error',
      'no-undef-init': 'error',
      'no-unneeded-ternary': ['error', { defaultAssignment: false }],
      'no-unreachable-loop': [
        'error',
        {
          ignore: [], // WhileStatement, DoWhileStatement, ForStatement, ForInStatement, ForOfStatement
        },
      ],
      'no-unused-expressions': [
        'error',
        {
          allowShortCircuit: false,
          allowTernary: false,
          allowTaggedTemplates: false,
        },
      ],
      'no-useless-computed-key': 'error',
      'no-useless-concat': 'error',
      'no-useless-rename': 'error',
      'no-useless-return': 'error',
      'padding-line-between-statements': [
        'error',
        {
          blankLine: 'always',
          prev: ['directive', 'block', 'block-like', 'multiline-block-like', 'cjs-export', 'cjs-import', 'class', 'export', 'import', 'if'],
          next: '*',
        },
        {
          blankLine: 'never',
          prev: 'directive',
          next: 'directive',
        },
        {
          blankLine: 'any',
          prev: '*',
          next: ['if', 'for', 'cjs-import', 'import'],
        },
        {
          blankLine: 'any',
          prev: ['export', 'import'],
          next: ['export', 'import'],
        },
        {
          blankLine: 'always',
          prev: '*',
          next: ['try', 'function', 'switch'],
        },
        {
          blankLine: 'always',
          prev: 'if',
          next: 'if',
        },
        {
          blankLine: 'never',
          prev: ['return', 'throw'],
          next: '*',
        },
      ],
      'prefer-const': [
        'error',
        {
          destructuring: 'any',
          ignoreReadBeforeAssign: true,
        },
      ],
      'prefer-exponentiation-operator': 'error',
      'prefer-numeric-literals': 'error',
      'prefer-object-spread': 'error',
      'prefer-regex-literals': [
        'error',
        {
          disallowRedundantWrapping: true,
        },
      ],
      'prefer-template': 'error',
      'symbol-description': 'error',
      'unicode-bom': ['error', 'never'],
      'vars-on-top': 'error',
      yoda: 'error',

      'jsdoc/check-alignment': 'error',
      'jsdoc/check-indentation': 'error',
      'jsdoc/check-param-names': 'off',
      'jsdoc/check-tag-names': 'error',
      'jsdoc/check-types': 'error',
      'jsdoc/newline-after-description': 'off',
      'jsdoc/no-undefined-types': 'off',
      'jsdoc/require-description': 'off',
      'jsdoc/require-description-complete-sentence': 'off',
      'jsdoc/require-example': 'off',
      'jsdoc/require-hyphen-before-param-description': 'error',
      'jsdoc/require-param': 'error',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-param-name': 'error',
      'jsdoc/require-param-type': 'error',
      'jsdoc/require-returns-description': 'off',
      'jsdoc/require-returns-type': 'error',
      'jsdoc/valid-types': 'error',

      'promise/always-return': 'error',
      'promise/always-catch': 'off',
      'promise/catch-or-return': [
        'error',
        {
          allowThen: true,
        },
      ],
      'promise/no-native': 'off',
      'promise/param-names': 'error',

      'security/detect-buffer-noassert': 'error',
      'security/detect-child-process': 'error',
      'security/detect-disable-mustache-escape': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-new-buffer': 'error',
      'security/detect-no-csrf-before-method-override': 'error',
      'security/detect-non-literal-fs-filename': 'error',
      'security/detect-non-literal-regexp': 'error',
      'security/detect-non-literal-require': 'error',
      'security/detect-object-injection': 'off',
      'security/detect-possible-timing-attacks': 'error',
      'security/detect-pseudoRandomBytes': 'error',
      'security/detect-unsafe-regex': 'error',
    },
  },
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    languageOptions: {
      sourceType: 'script',
    },
    rules: {
      curly: ['error', 'multi-line'],
      'dot-notation': ['error', { allowKeywords: true }],
      'dot-location': ['error', 'property'],
      'getter-return': ['error', { allowImplicit: true }],
      'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: false }],
      'no-array-constructor': 'error',
      'no-empty-function': [
        'error',
        {
          allow: ['arrowFunctions', 'functions', 'methods'],
        },
      ],
      'no-new-func': 'error',
      'no-new-symbol': 'error',
      'no-return-await': 'error',
      'no-shadow': 'error',
      'no-undef': 'error',
      'no-unexpected-multiline': 'error',
      'no-use-before-define': ['error', { functions: true, classes: true, variables: true }],
      'no-useless-constructor': 'error',
      'no-var': 'error',
      'prefer-arrow-callback': [
        'error',
        {
          allowNamedFunctions: false,
          allowUnboundThis: true,
        },
      ],
      'prefer-promise-reject-errors': ['error', { allowEmptyReject: true }],
      'wrap-iife': ['error', 'outside', { functionPrototypeMethods: false }],
    },
  },
  {
    files: ['**/*.js', '**/*.cjs'],
    rules: {
      strict: ['error', 'global'],
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      'no-loss-of-precision': 'off',
      'no-loop-func': 'off',
      'no-return-await': 'off',
      'no-unused-expressions': 'off',
      'no-use-before-defined': 'off',

      '@typescript-eslint/array-type': [
        'error',
        {
          default: 'array',
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/default-param-last': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-member-accessibility': 'error',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'enumMember',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          trailingUnderscore: 'forbid',
        },
      ],
      '@typescript-eslint/no-dupe-class-members': 'error',
      '@typescript-eslint/no-loop-func': 'error',
      '@typescript-eslint/no-redeclare': 'error',
      '@typescript-eslint/member-ordering': [
        'error',
        {
          default: [
            'signature',
            'private-field',
            'public-field',
            'protected-field',
            'public-constructor',
            'protected-constructor',
            'private-constructor',
            'public-method',
            'protected-method',
            'private-method',
          ],
        },
      ],
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/no-empty-interface': 'error',
      '@typescript-eslint/no-extra-semi': 'error',
      '@typescript-eslint/no-shadow': 'error',
      '@typescript-eslint/no-use-before-define': [
        'error',
        {
          functions: true,
          classes: true,
          variables: true,
        },
      ],
      '@typescript-eslint/parameter-properties': [
        'error',
        {
          allow: ['readonly'],
        },
      ],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/return-await': 'error',
      '@typescript-eslint/sort-type-constituents': 'error',
    },
  },
  {
    files: ['**/*.tests.ts', 'tests/tests.ts'],

    plugins: {
      mocha,
    },

    rules: {
      ...mocha.configs.recommended.rules,

      'max-classes-per-file': 'off',

      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/unbound-method': 'off',

      'mocha/no-exclusive-tests': 'error',
      'mocha/no-pending-tests': 'error',
      'mocha/no-mocha-arrows': 'off',
    },
  },
  prettier,
);
