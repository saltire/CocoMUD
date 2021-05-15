'use strict';

module.exports = {
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'script',
  },
  extends: 'airbnb-base',
  rules: {
    'arrow-parens': [2, 'as-needed'],
    'brace-style': [2, 'stroustrup'],
    'function-paren-newline': 0,
    'no-cond-assign': [2, 'except-parens'],
    'no-console': 0,
    'no-multi-assign': 0,
    'no-multiple-empty-lines': [2, { max: 2, maxBOF: 0, maxEOF: 0 }],
    'no-nested-ternary': 0,
    'no-underscore-dangle': [2, { allow: ['_id'] }],
    'object-curly-newline': [2, { multiline: true, consistent: true }],
    'operator-linebreak': [2, 'after'],
    radix: [2, 'as-needed'],
    strict: [2, 'global'],
  },
};
