module.exports = {
    "parser": "babel-eslint",
    "plugins": [
        "react",
        "jest",
    ],
    "extends": [
        "standard",
        "plugin:react/recommended",
        "plugin:jest/recommended",
    ],
    "rules": {
        "indent": ["error", 4],
    },
    "env": {
        "jest/globals": true
    },
};
