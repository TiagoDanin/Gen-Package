#!/usr/bin/env node
const fs = require('fs')
const _ = require('lodash')
const path = require('path')
const { prompt } = require('enquirer')
const licenses = require('choosealicense-list')

const main = async() => {
	const packageFile = path.resolve(`${process.cwd()}/package.json`)
	const packageGlobalFile = path.join(process.env.HOME || process.env.USERPROFILE, '.gen-package.json')
	var packageData = {}
	if (fs.existsSync(packageFile)) {
		packageData = JSON.parse(fs.readFileSync(packageFile).toString())
	}
	if (fs.existsSync(packageGlobalFile)) {
		packageData = _.merge(
			JSON.parse(fs.readFileSync(packageGlobalFile).toString()),
			packageData
		)
	}

	var data = {
		name: '',
		main: false,
		version: '1.0.0',
		description: '',
		author: '',
		license: false,
		keywords: [],
		scripts: {},
		private: false,
		repository: false,
		homepage: false,
		bugs: false,
		github: false,
		files: []
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

	if (packageData && !packageData.author) {
		packageData.author = {}
	}

	var response = await prompt([{
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

		data.repository = data.repository || `https://github.com/${response.github.owner}/${response.github.name}.git`
		data.homepage = data.homepage || `https://${response.github.owner}.github.io/${response.github.name}`
		data.bugs = data.bugs || `https://github.com/${response.github.owner}/${response.github.name}/issues`
	}

	const more = async () => {
		return await prompt([{
			type: 'input',
			name: 'repository',
			message: 'Repository GIT:',
			initial: packageData.repository || data.repository
		}, {
			type: 'input',
			name: 'homepage',
			message: 'Homepage URL:',
			initial: packageData.homepage || data.homepage
		}, {
			type: 'input',
			name: 'bugs',
			message: 'Bugs/Issues/Suport URL:',
			initial: packageData.bugs || data.bugs
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

	const packageJson = JSON.stringify({
		...data,
		...packageData,
		...response,
		...await more()
	}, null, '  ')
	console.log(packageJson)
	const is = await prompt({
		type: 'confirm',
		name: 'ok',
		message: 'Is this OK?',
		initial: true
	})
	if (is.ok) {
		fs.writeFileSync(packageFile, packageJson)
	}
}
main()
