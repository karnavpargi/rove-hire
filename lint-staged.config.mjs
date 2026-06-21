/** @param {string[]} files */
const EXCLUDED_PATHS = ['/packages/', '/src/generated/'];

/** @param {string[]} files */
const filterExcluded = (files) =>
  files.filter((file) => {
    const normalized = file.replace(/\\/g, '/');
    return !EXCLUDED_PATHS.some((segment) => normalized.includes(segment));
  });

/** @param {string[]} files */
const eslintAndPrettier = (files) => {
  const staged = filterExcluded(files);
  if (staged.length === 0) return [];
  const paths = staged.map((file) => `"${file}"`).join(' ');
  return [`eslint --fix ${paths}`, `prettier --write ${paths}`];
};

/** @param {string[]} files */
const prettierOnly = (files) => {
  const staged = filterExcluded(files);
  if (staged.length === 0) return [];
  const paths = staged.map((file) => `"${file}"`).join(' ');
  return [`prettier --write ${paths}`];
};

export default {
  '*.{ts,tsx}': eslintAndPrettier,
  '*.{js,mjs,cjs}': eslintAndPrettier,
  '*.{json,md,yml,yaml,css}': prettierOnly,
};
