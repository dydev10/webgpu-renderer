import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


export default [
  {languageOptions: { globals: globals.browser }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  
  // Custom rules
  {
    rules: {
      "semi": "off",
      "@typescript-eslint/semi": ["error", "always"],
    }
  }
];
