import { execSync } from 'child_process'
import readlineLib from 'readline'

const readline = readlineLib.createInterface({
	input: process.stdin,
	output: process.stdout,
})

if (!['major', 'minor', 'patch'].includes(process.argv[2])) {
	console.error('You must provide an update type (major, minor, patch)')
	process.exit(1)
}

readline.question('Commit description: ', (description) => {
	execSync(
		`git add . && git commit -m "${description}" && npm version ${process.argv[2]} && git push && git push --tags`,
		{ stdio: 'inherit' },
	)
	readline.close()
})
