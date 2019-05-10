#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const {merge, union, cloneDeep} = require('lodash')
const got = require('got')
const gh = require('github-url-to-object')
const isOnline = require('is-online')
const {prompt} = require('enquirer')
const licenses = require('choosealicense-list')
const argv = require('minimist')(process.argv)

let packageData = {}
let packageFile = 'package.json'
const data = {
	name: '',
	main: 'index.js',
	bin: {},
	preferGlobal: false,
	version: '1.0.0',
	description: '',
	author: {
		name: '',
		email: '',
		url: ''
	},
	license: '',
	keywords: [],
	scripts: {},
	engines: {},
	private: false,
	repository: {
		type: 'git',
		url: ''
	},
	homepage: '',
	bugs: {
		url: ''
	},
	github: {
		name: '',
		owner: ''
	},
	files: [],
	dependencies: {},
	devDependencies: {},
	peerDependencies: {},
	optionalDependencies: {}
}

const dataKeys = Object.keys(data)
const arrayKeys = Object.keys(data).filter(key => Array.isArray(data[key]))
const objectKeys = Object.keys(data).filter(key => typeof data[key] === 'object' && !Array.isArray(data[key]))
const booleanKeys = Object.keys(data).filter(key => typeof data[key] === 'boolean')

const allSubKeys = []
objectKeys.map(key => {
	return Object.keys(data[key]).map(k => allSubKeys.push(k))
})
arrayKeys.map(key => allSubKeys.push(key))

const allDataKeys = [...dataKeys, ...allSubKeys]

const githubData = async url => {
	if (!await isOnline()) {
		return false
	}

	const headers = {
		'Accept': 'application/vnd.github.mercy-preview+json',
		'User-Agent': 'awesome-lint'
	}

	if (process.env.github_token) {
		headers.Authorization = `token ${process.env.github_token}`
	}

	const res = await got.get(url, {
		headers,
		json: true
	}).catch(() => {
		return {
			body: false
		}
	})

	return res.body
}

const toFalse = (input, hard) => {
	const stringEmpty = [
		'git+https://github.com//.git',
		'https://.github.io/',
		'https://github.com///issues',
		' ',
		''
	]

	if (typeof input === 'number' && input <= 0) {
		return hard ? false : 0
	} else if (typeof input === 'string') {
		if (input.length <= 0 || stringEmpty.includes(input)) {
			return hard ? false : ''
		}
	} else if (!input) {
		return false
	}

	return input
}

const toFalseValues = values => {
	const keys = [
		'',
		...allDataKeys
	]

	keys.map(key => {
		if (typeof values[key] === 'object') {
			if (Array.isArray(values[key])) {
				values[key] = values[key].map(el => toFalse(el)).filter(e => e)
			} else {
				values[key] = toFalseValues(values[key])
			}
		} else if (typeof values[key] !== 'undefined') {
			values[key] = toFalse(values[key])
		}
	})
	return values
}

const dataMerge = (a = {}, b = {}) => {
	b = cloneDeep(b)
	dataKeys.map(key => {
		if (typeof b[key] === 'undefined') {
			delete b[key]
			return false
		}

		if (typeof b[key] !== typeof data[key]) {
			b[key] = cloneDeep(data[key])
		}

		allSubKeys.map(subKey => {
			if (typeof data[key][subKey] === 'undefined') {
				return false
			}

			if (typeof b[key][subKey] !== typeof data[key][subKey]) {
				b[key][subKey] = cloneDeep(data[key][subKey])
			}
		})
	})

	const output = merge(a, toFalseValues(b))
	arrayKeys.map(key => {
		if (output[key] && b[key]) {
			output[key] = union(output[key], b[key]).filter(e => e)
		}
	})

	return output
}

const sortable = input => {
	if (Array.isArray(input)) {
		return input.sort()
	} else if (typeof input === 'object') {
		const output = {}
		Object.keys(input).sort().map(key => {
			output[key] = input[key]
		})
		return output
	}

	return input
}

const sortPackage = () => {
	const top = [
		'start',
		'dev',
		'test',
		'lint'
	]
	top.reverse()

	const keys = [
		...dataKeys,
		'ava',
		'xo'
	]

	keys.map(key => {
		if (packageData[key]) {
			packageData[key] = sortable(packageData[key])
		}
	})

	if (packageData.scripts) {
		const scripts = Object.keys(packageData.scripts)
		top.map(script => {
			if (scripts.includes(script)) {
				const obj = {
					[script]: packageData.scripts[script]
				}
				packageData.scripts = {
					...obj,
					...packageData.scripts
				}
			}
		})
	}

	return packageData
}

const clean = () => {
	packageData = toFalseValues(packageData)
	if (!packageData.repository.url) {
		delete packageData.repository
	}

	const keys = Object.keys(packageData).filter(key => dataKeys.includes(key) && !booleanKeys.includes(key))

	keys.map(key => {
		if (!packageData[key]) {
			delete packageData[key]
		} else if (typeof packageData[key] == 'object') {
			if (Array.isArray(packageData[key])) {
				packageData[key] = packageData[key].filter(e => e)
				if (packageData[key].length <= 0) {
					delete packageData[key]
				}
			} else {
				Object.keys(packageData[key]).map(k => {
					if (!allSubKeys.includes(key) && !packageData[key][k]) {
						delete packageData[key][k]
					}
				})
			}
		}

		if (objectKeys.includes(key)) {
			if (Object.keys(packageData[key]).length <= 0) {
				delete packageData[key]
			}
		}
	})

	let indent = '\t'
	if (argv.indent) {
		indent = argv.indent
	} else if (argv.space) {
		indent = '  '
	}

	packageData = sortPackage(packageData)
	packageData = JSON.stringify(packageData, null, indent)

	return packageData
}

const loadPackage = async () => {
	packageData = dataMerge({}, cloneDeep(data))
	packageFile = path.resolve(`${process.cwd()}/package.json`)
	let packageGlobalFile = path.join(process.env.HOME || process.env.USERPROFILE, '.gen-package.json')
	if (argv.dev) {
		packageFile = path.resolve(`${process.cwd()}/dev/package.json`)
		packageGlobalFile = path.resolve(`${process.cwd()}/dev/global.json`)
	}

	if (fs.existsSync(packageGlobalFile)) {
		const globalDataJson = JSON.parse(fs.readFileSync(packageGlobalFile).toString())
		packageData = dataMerge(
			packageData,
			globalDataJson
		)
	}

	if (fs.existsSync(packageFile)) {
		const packageDataJson = JSON.parse(fs.readFileSync(packageFile).toString())
		packageData = dataMerge(
			packageData,
			packageDataJson
		)
	}

	if (!argv.offline) {
		let github = false
		if (argv.github) {
			github = gh(argv.github)
			if (github) {
				packageData.github = {
					owner: github.user,
					name: github.repo
				}
			}
		}

		if (packageData.github) {
			if (!github) {
				github = gh(`${packageData.github.owner}/${packageData.github.name}`)
			}

			if (github) {
				const githubDataJson = await githubData(github.api_url)
				if (githubDataJson) {
					packageData = dataMerge(packageData, {
						description: githubDataJson.description,
						repository: {
							url: 'git+' + githubDataJson.clone_url
						},
						keywords: githubDataJson.topics || []
					})
				}
			}
		}
	}

	return packageData
}

const licensePrompt = () => {
	if (packageData.license) {
		return [{
			type: 'input',
			name: 'license',
			message: 'License:',
			initial: packageData.license
		}]
	} else {
		return [{
			type: 'autocomplete',
			name: 'license',
			message: 'License:',
			limit: 4,
			suggest(input, choices) {
				return choices.filter(choice => choice.message.startsWith(input))
			},
			choices: Object.keys(licenses.license)
		}]
	}
}

const basicPrompt = () => {
	return [{
		type: 'input',
		name: 'name',
		message: 'Name',
		initial: packageData.name
	}, {
		type: 'input',
		name: 'main',
		message: 'Entry point:',
		initial: packageData.main
	}, {
		type: 'input',
		name: 'version',
		message: 'Version:',
		initial: packageData.version
	}, {
		type: 'input',
		name: 'description',
		message: 'Description:',
		initial: packageData.description
	}, {
		type: 'list',
		name: 'keywords',
		message: 'Keywords:',
		initial: packageData.keywords || data.keywords
	}, {
		type: 'form',
		name: 'author',
		message: 'Author',
		choices: [{
			name: 'name',
			message: 'Name',
			initial: packageData.author.name
		}, {
			name: 'email',
			message: 'Email',
			initial: packageData.author.email
		}, {
			name: 'url',
			message: 'url',
			initial: packageData.author.url
		}]
	}]
}

const privatePromt = () => {
	return [{
		type: 'confirm',
		name: 'private',
		message: 'Private:',
		initial: Boolean(packageData.private)
	}]
}

const githubPrompt = () => {
	return [{
		type: 'form',
		name: 'github',
		message: 'GitHub Repository Info:',
		choices: [{
			name: 'name',
			message: 'Repository Name:',
			initial: packageData.github.name
		}, {
			name: 'owner',
			message: 'Owner/Username:',
			initial: packageData.github.owner
		}]
	}]
}

const urlsAndFilesPrompt = () => {
	const files = fs.readdirSync(process.cwd())
	return [{
		type: 'input',
		name: 'repository',
		message: 'Repository GIT:',
		initial: packageData.repository.url || data.repository.url
	}, {
		type: 'input',
		name: 'homepage',
		message: 'Homepage URL:',
		initial: packageData.homepage || data.homepage
	}, {
		type: 'input',
		name: 'bugs',
		message: 'Bugs/Issues/Suport URL:',
		initial: packageData.bugs.url || data.bugs.url
	}, {
		type: 'multiselect',
		name: 'files',
		message: 'Files to upload:',
		initial: ((packageData.files.length > 0 && packageData.files) || [
			'package.json',
			'README.md',
			'README',
			'readme',
			'LICENSE.md',
			'LICENSE',
			'license',
			'index.js',
			'dist',
			'lib',
			packageData.main
		]).reduce((total, current) => {
			if (files.includes(current)) {
				total.push(current)
			}

			return total
		}, []),
		choices: [
			...files.map(e => {
				return {name: e, value: e}
			})
		]
	}]
}

const isPrompt = (msg, check) => {
	return prompt({
		type: 'confirm',
		name: 'ok',
		message: msg,
		initial: Boolean(check)
	})
}

const main = async () => {
	await loadPackage()
	const responseBasic = await prompt([
		...basicPrompt(),
		...licensePrompt(),
		...privatePromt(),
		...githubPrompt()
	])

	packageData = dataMerge(
		packageData,
		responseBasic
	)

	if (responseBasic.github.name) {
		data.repository.url = `git+https://github.com/${responseBasic.github.owner}/${responseBasic.github.name}.git`
		data.homepage = `https://${responseBasic.github.owner}.github.io/${responseBasic.github.name}`
		data.bugs.url = `https://github.com/${responseBasic.github.owner}/${responseBasic.github.name}/issues`
	}

	const responseurlsAndFiles = await prompt(urlsAndFilesPrompt())

	packageData = dataMerge(
		packageData,
		{
			files: responseurlsAndFiles.files,
			homepage: responseurlsAndFiles.homepage,
			repository: {
				url: responseurlsAndFiles.repository
			},
			bugs: {
				url: responseurlsAndFiles.bugs
			}
		}
	)

	if (await isPrompt('NodeJS Package?', packageData.engines.node)) {
		const engines = await prompt({
			type: 'input',
			name: 'node',
			message: 'Node Version:',
			initial: packageData.engines.node || process.version.replace('v', '>=') || '>=8'
		})
		packageData.engines.node = engines.node
	}

	if (await isPrompt('CLI Package?', (JSON.stringify(packageData.bin) != '{}' || false))) {
		let fistCli = Object.keys(packageData.bin)
		if (fistCli.length > 0) {
			fistCli = {
				name: fistCli[0],
				point: packageData.bin[fistCli[0]]
			}
		} else {
			fistCli = {
				name: packageData.name || data.name,
				point: packageData.main || data.main
			}
		}

		const cli = await prompt({
			type: 'form',
			name: 'data',
			message: 'CLI:',
			choices: [{
				name: 'name',
				message: 'Name:',
				initial: fistCli.name
			}, {
				name: 'point',
				message: 'Entry point:',
				initial: fistCli.point
			}]
		})

		packageData.bin = merge(
			packageData.bin,
			{
				[cli.data.name]: cli.data.point
			}
		)
	}

	if (await isPrompt('Global Package?', packageData.preferGlobal)) {
		packageData.preferGlobal = true
	}

	const packageJson = clean()
	console.log(packageJson)
	if (await isPrompt('Is this OK?', true)) {
		fs.writeFileSync(packageFile, packageJson)
	}
}

main().catch(error => {
	if (error != '') {
		console.log('Error:', error)
	}
})
