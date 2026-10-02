import globals from "globals";
import { config } from "./base.js";

export const libraryConfig = [
  ...config,
  {
    ignores: ["generated/**", "node_modules/**"],
  },
  {
    languageOptions: {
      globals: globals.node,
    },
  },
];
