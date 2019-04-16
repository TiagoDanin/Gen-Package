#!/usr/bin/env node
const fs = require('fs')
const _ = require('lodash')
const path = require('path')
const got = require('got')
const gh = require('github-url-to-object')
const isOnline = require('is-online')
const { prompt } = require('enquirer')
const licenses = require('choosealicense-list')

const githubData = async (url) => {
	if (!await isOnline()) {
		return false
	}

	const headers = {
		'Accept': 'application/vnd.github.mercy-preview+json',
		'User-Agent': 'awesome-lint'
	};
	if (process.env.github_token) {
		headers.Authorization = `token ${process.env.github_token}`;
	}

	const res = await got.get(url, {
		headers,
		json: true
	}).catch(() => {
		return {
			body: false
		}
	});

	return res.body
}

const main = async () => {
	const packageFile = path.resolve(`${process.cwd()}/package.json`)
	const packageGlobalFile = path.join(process.env.HOME || process.env.USERPROFILE, '.gen-package.json')
	let packageData = {}
	if (fs.existsSync(packageFile)) {
		packageData = JSON.parse(fs.readFileSync(packageFile).toString())
	}
	if (fs.existsSync(packageGlobalFile)) {
		const globalData = JSON.parse(fs.readFileSync(packageGlobalFile).toString())
		packageData = _.merge(
			globalData,
			packageData
		)
		packageData.keywords = _.union(packageData.keywords, globalData.keywords)
	}

	if (packageData.github) {
		const github = gh(`${packageData.github.owner}/${packageData.github.name}`)
		if (github) {
			const githubDataJson = await githubData(github.api_url)
			if (githubDataJson) {
				packageData = _.merge({
					description: githubDataJson.description,
					repository: {
						url: githubDataJson.clone_url
					}
				}, packageData)
				packageData.keywords = _.union(packageData.keywords, githubDataJson.topics)
			}
		}
	}

	let data = {
		name: '',
		main: 'index.js',
		bin: {},
		preferGlobal: false,
		version: '1.0.0',
		description: '',
		author: '',
		license: false,
		keywords: [],
		scripts: {},
		engines: {},
		private: false,
		repository: {},
		homepage: false,
		bugs: {
			url: false
		},
		github: false,
		files: [],
		dependencies: {},
		devDependencies: {}
	}

	const files = fs.readdirSync(process.cwd())
	const license = () => {
		if (packageData.license) {
			return {
				type: 'input',
				name: 'license',
				message: 'License:',
				initial: packageData.license || data.license
			}
		} else {
			return {
				type: 'autocomplete',
				name: 'license',
				message: 'License:',
				limit: 4,
				suggest(input, choices) {
					return choices.filter(choice => choice.message.startsWith(input))
				},
				choices: Object.keys(licenses.license)
			}
		}
	}

	if (!packageData.author) {
		packageData.author = {}
	}
	if (!packageData.repository) {
		packageData.repository = {
			type: 'git'
		}
	}
	if (!packageData.bugs) {
		packageData.bugs = {}
	}
	if (!packageData.engines) {
		packageData.engines = {}
	}
	if (!packageData.bin) {
		packageData.bin = {}
	}
	if (!packageData.dependencies) {
		packageData.dependencies = {}
	}
	if (!packageData.devDependencies) {
		packageData.devDependencies = {}
	}
	if (!packageData.preferGlobal) {
		packageData.preferGlobal = false
	}

	let response = await prompt([{
		type: 'input',
		name: 'name',
		message: 'Name',
		initial: packageData.name || data.name
	}, {
		type: 'input',
		name: 'main',
		message: 'Entry point:',
		initial: packageData.main || data.main
	}, {
		type: 'input',
		name: 'version',
		message: 'Version:',
		initial: packageData.version || data.version
	}, {
		type: 'input',
		name: 'description',
		message: 'Description:',
		initial: packageData.description || data.description
	}, {
		type: 'form',
		name: 'author',
		message: 'Author',
		choices: [{
			name: 'name',
			message: 'Name',
			initial: packageData.author.name || (typeof packageData.author == 'string' ? packageData.author : false) || data.author
		}, {
			name: 'email',
			message: 'Email',
			initial: packageData.author.email || (typeof packageData.author == 'string' ? packageData.author : false) || data.author
		}, {
			name: 'url',
			message: 'url',
			initial: packageData.author.url || (typeof packageData.author == 'string' ?  packageData.author : false) || data.author
		}]
	}, {
		...license(),
	}, {
		type: 'list',
		name: 'keywords',
		message: 'Keywords:',
		initial: packageData.keywords || data.keywords
	}, {
		type: 'confirm',
		name: 'private',
		message: 'Private:',
		initial: packageData.private || data.private
	}, {
		type: 'confirm',
		name: 'github',
		message: 'GitHub Repository:',
		initial: (typeof packageData.github == 'object' ? true : false) || (packageData.private && packageData.private == true ? false : true) || false
	}])

	if (response.github) {
		if (!packageData.github) {
			packageData.github = {}
		}
		response.github = await prompt({
			type: 'form',
			name: 'github',
			message: 'GitHub Repository Info:',
			choices: [{
				name: 'name',
				message: 'Repository Name:',
				initial: packageData.github.name || response.github.name || ''
			}, {
				name: 'owner',
				message: 'Owner/Username:',
				initial: packageData.github.owner || response.github.owner || data.author.name || ''
			}]
		})
		response.github = response.github.github

		data.repository.url = `git+https://github.com/${response.github.owner}/${response.github.name}.git`
		data.homepage = `https://${response.github.owner}.github.io/${response.github.name}`
		data.bugs.url = `https://github.com/${response.github.owner}/${response.github.name}/issues`
	}

	const more = async () => {
		return await prompt([{
			type: 'input',
			name: 'repository',
			message: 'Repository GIT:',
			initial: (typeof packageData.repository == 'string' ? `git+${packageData.repository}` : false) || packageData.repository.url || data.repository.url
		}, {
			type: 'input',
			name: 'homepage',
			message: 'Homepage URL:',
			initial: packageData.homepage || data.homepage
		}, {
			type: 'input',
			name: 'bugs',
			message: 'Bugs/Issues/Suport URL:',
			initial: (typeof packageData.bugs == 'string' ? packageData.bugs : false) || packageData.bugs.url || data.bugs.url
		}, {
			type: 'multiselect',
			name: 'files',
			message: 'Files to upload:',
			initial: (packageData.files || [
				'package.json',
				'README.md',
				'README',
				'readme',
				'LICENSE.md',
				'LICENSE',
				'license',
				response.main || 'index.js'
			]).reduce((total, current, index) => {
				if (files.includes(current)) {
					total.push(current)
				}
				return total
			}, []),
			choices: [
				...files.map((e) => {
					return {name: e, value: e}
				})
			]
		}])
	}

	const moreData = await more()
	moreData.repository = {
		type: 'git',
		url: moreData.repository
	}
	moreData.bugs = {
		url: moreData.bugs
	}

	const isNode = await prompt({
		type: 'confirm',
		name: 'ok',
		message: 'NodeJS Package?',
		initial: packageData.engines.node || false
	})
	if (isNode.ok) {
		const engines = await prompt({
			type: 'input',
			name: 'node',
			message: 'Version:',
			initial: packageData.engines.node || process.version.replace('v', '>=') || '>=8'
		})
		moreData.engines = engines
	}

	const isCli = await prompt({
		type: 'confirm',
		name: 'ok',
		message: 'CLI Package?',
		initial: JSON.stringify(packageData.bin) != '{}' || false
	})
	if (isCli.ok) {
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
		let cli = await prompt({
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
		moreData.bin = {}
		cli = {
			[cli.data.name]: cli.data.point
		}

		moreData.bin = _.merge(
			moreData.bin,
			cli
		)
	}

	const isGlobal = await prompt({
		type: 'confirm',
		name: 'ok',
		message: 'Global Package?',
		initial: packageData.preferGlobal
	})
	if (isGlobal.ok) {
		moreData.preferGlobal = true
	}

	const packageJson = JSON.stringify({
		...data,
		...packageData,
		...response,
		...moreData
	}, null, '\t')
	console.log(packageJson)
	const is = await prompt([{
		type: 'confirm',
		name: 'ok',
		message: 'Is this OK?',
		initial: true
	}])
	if (is.ok) {
		fs.writeFileSync(packageFile, packageJson)
	}
}
main()
