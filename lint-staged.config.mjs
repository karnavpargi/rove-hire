/** @param {string[]} files */
const excludePackages = (files) =>
  files.filter((file) => !file.replace(/\\/g, '/').includes('/packages/'));

/** @param {string[]} files */
const eslintAndPrettier = (files) => {
  const staged = excludePackages(files);
  if (staged.length === 0) return [];
  const paths = staged.map((file) => `"${file}"`).join(' ');
  return [`eslint --fix ${paths}`, `prettier --write ${paths}`];
};

/** @param {string[]} files */
const prettierOnly = (files) => {
  const staged = excludePackages(files);
  if (staged.length === 0) return [];
  const paths = staged.map((file) => `"${file}"`).join(' ');
  return [`prettier --write ${paths}`];
};

export default {
  '*.{ts,tsx}': eslintAndPrettier,
  '*.{js,mjs,cjs}': eslintAndPrettier,
  '*.{json,md,yml,yaml,css}': prettierOnly,
};
