# Gen Package
[![Node](https://img.shields.io/node/v/gen-package.svg?style=flat-square)](https://npmjs.org/package/gen-package)
[![Version](https://img.shields.io/npm/v/gen-package.svg?style=flat-square)](https://npmjs.org/package/gen-package)
[![Downloads](https://img.shields.io/npm/dt/gen-package.svg?style=flat-square)](https://npmjs.org/package/gen-package)

Intuitive and user-friendly generator of package.json


## Installation
Module available through the
[npm registry](https://www.npmjs.com/). It can be installed using the
[`npm`](https://docs.npmjs.com/getting-started/installing-npm-packages-locally)
or
[`yarn`](https://yarnpkg.com/en/)
command line tools.

```sh
# NPM
npm install gen-package --global
# Or Using Yarn
yarn global add gen-package
```

## Usage
```sh
# Create package.json
gen-package

# Create package.json with indent (space)
gen-package --space

# Create package with indent (custom)
gen-package --indent='\t\t'

# Create package.json in offline mode
gen-package --offline

# Create package.json with GitHub mode, replace 'TiagoDanin/Gen-Package' your repository
gen-package --github=TiagoDanin/Gen-Package

```



## Dependencies
- [choosealicense-list](https://ghub.io/choosealicense-list): List of licenses from choosealicense.com
- [enquirer](https://ghub.io/enquirer): Stylish, intuitive and user-friendly prompt system. Fast and lightweight enough for small projects, powerful and extensible enough for the most advanced use cases.
- [github-url-to-object](https://ghub.io/github-url-to-object): Extract user, repo, and other interesting properties from GitHub URLs
- [got](https://ghub.io/got): Simplified HTTP requests
- [is-online](https://ghub.io/is-online): Check if the internet connection is up
- [lodash](https://ghub.io/lodash): Lodash modular utilities.
- [minimist](https://ghub.io/minimist): parse argument options



## Contributors
Pull requests and stars are always welcome. For bugs and feature requests, please [create an issue](https://github.com/TiagoDanin/Gen-Package/issues). [List of all contributors](https://github.com/TiagoDanin/Gen-Package/graphs/contributors).


## License
[MIT](LICENSE) © [TiagoDanin](https://TiagoDanin.github.io)
