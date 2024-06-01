import eslint from '@eslint/js';
import jsdoc from "eslint-plugin-jsdoc";
import mocha from 'eslint-plugin-mocha';
import prettier from "eslint-config-prettier";
import promise from "eslint-plugin-promise";
import security from "eslint-plugin-security";
import tsEslint from 'typescript-eslint';

export default tsEslint.config(
  eslint.configs.recommended,
  ...tsEslint.configs.strictTypeChecked,
  ...tsEslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      }
    }
  },
  {
    files: ["**/*.ts", "**/*.js", "**/*.mjs"],
    plugins: {
      jsdoc,
      promise,
      security,
    },
    settings: {
      jsdoc: {
        preferredTypes: {
          Array: "Array<object>",
          "Array.": "Array<object>",
          "Array<>": "[]",
          "Array.<>": "[]",
          "Promise.<>": "Promise<>"
        }
      }
    },
    rules: {
      "callback-return": ["error", ["callback", "cb", "next", "done"]],
      eqeqeq: ["error", "smart"],
      "func-names": "error",
      "func-style": ["error", "declaration", {
        allowArrowFunctions: false
      }],
      "id-length": ["error", {
        exceptions: ["_", "$", "e", "i", "j", "k", "q", "x", "y"]
      }],
      "handle-callback-err": ["error", "^.*err"],
      "object-shorthand": ["error", "always", {
        ignoreConstructors: false,
        avoidQuotes: true,
        avoidExplicitReturnArrows: true
      }],
      "no-console": "error",
      "no-else-return": "error",
      "no-lone-blocks": "error",
      "no-negated-condition": "error",
      "no-restricted-properties": ["error", {
        object: "arguments",
        property: "callee",
        message: "arguments.callee is deprecated"
      }, {
        property: "__defineGetter__",
        message: "Please use Object.defineProperty instead."
      }, {
        property: "__defineSetter__",
        message: "Please use Object.defineProperty instead."
      }],
      "no-restricted-syntax": ["error", "DebuggerStatement", "LabeledStatement", "WithStatement"],
      "no-template-curly-in-string": "error",
      "no-useless-rename": "error",
      "padding-line-between-statements": [
        "error",
        {
          "blankLine": "always",
          "prev": [
            "directive",
            "block",
            "block-like",
            "multiline-block-like",
            "cjs-export",
            "cjs-import",
            "class",
            "export",
            "import",
            "if"
          ],
          "next": "*"
        },
        {
          "blankLine": "never",
          "prev": "directive",
          "next": "directive"
        },
        {
          "blankLine": "any",
          "prev": "*",
          "next": [
            "if",
            "for",
            "cjs-import",
            "import"
          ]
        },
        {
          "blankLine": "any",
          "prev": [
            "export",
            "import"
          ],
          "next": [
            "export",
            "import"
          ]
        },
        {
          "blankLine": "always",
          "prev": "*",
          "next": [
            "try",
            "function",
            "switch"
          ]
        },
        {
          "blankLine": "always",
          "prev": "if",
          "next": "if"
        },
        {
          "blankLine": "never",
          "prev": [
            "return",
            "throw"
          ],
          "next": "*"
        }
      ],
      yoda: "error",

      "jsdoc/check-alignment": "error",
      "jsdoc/check-indentation": "error",
      "jsdoc/check-param-names": "off",
      "jsdoc/check-tag-names": "error",
      "jsdoc/check-types": "error",
      "jsdoc/newline-after-description": "off",
      "jsdoc/no-undefined-types": "off",
      "jsdoc/require-description": "off",
      "jsdoc/require-description-complete-sentence": "off",
      "jsdoc/require-example": "off",
      "jsdoc/require-hyphen-before-param-description": "error",
      "jsdoc/require-param": "error",
      "jsdoc/require-param-description": "off",
      "jsdoc/require-param-name": "error",
      "jsdoc/require-param-type": "error",
      "jsdoc/require-returns-description": "off",
      "jsdoc/require-returns-type": "error",
      "jsdoc/valid-types": "error",

      "promise/always-return": "error",
      "promise/always-catch": "off",
      "promise/catch-or-return": ["error", {
        allowThen: true
      }],
      "promise/no-native": "off",
      "promise/param-names": "error",

      "security/detect-buffer-noassert": "error",
      "security/detect-child-process": "error",
      "security/detect-disable-mustache-escape": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-new-buffer": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-non-literal-fs-filename": "error",
      "security/detect-non-literal-regexp": "error",
      "security/detect-non-literal-require": "off",
      "security/detect-object-injection": "off",
      "security/detect-possible-timing-attacks": "error",
      "security/detect-pseudoRandomBytes": "error",
      "security/detect-unsafe-regex": "error",
    }
  },
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    rules: {
      "no-shadow": "error",
      "no-undef": "error",
      strict: ["error", "safe"],
    }
  },
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/array-type": ["error", {
        default: "array"
      }],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/explicit-member-accessibility": "error",
      "@typescript-eslint/naming-convention": ["error", {
        selector: "enumMember",
        format: ["camelCase", "PascalCase", "UPPER_CASE"],
        trailingUnderscore: "forbid"
      }],
      "@typescript-eslint/member-ordering": ["error", {
        default: [
          "signature",
          "private-field",
          "public-field",
          "protected-field",
          "public-constructor",
          "protected-constructor",
          "private-constructor",
          "public-method",
          "protected-method",
          "private-method"
        ]
      }],
      "@typescript-eslint/only-throw-error": "error",
      "@typescript-eslint/no-empty-interface": "error",
      "@typescript-eslint/no-extra-semi": "error",
      "@typescript-eslint/no-shadow": "error",
      "@typescript-eslint/parameter-properties": ["error", {
        allow: ["readonly"]
      }],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      "@typescript-eslint/sort-type-constituents": "error",
    }
  },
  {
    files: ["**/*.tests.ts"],

    plugins: ["mocha"],

    rules: {
      ...mocha.configs.recommended.rules,

      "max-classes-per-file": "off",

      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/unbound-method": "off",

      "mocha/no-exclusive-tests": "error",
      "mocha/no-pending-tests": "error"
    }
  },
  prettier,
);
