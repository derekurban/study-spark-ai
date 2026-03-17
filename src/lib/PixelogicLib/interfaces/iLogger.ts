export default interface iLogger {
	debug: (context: object | string, msg?: string) => void
	info: (context: object | string, msg?: string) => void
	warn: (context: object | string, msg?: string) => void
	error: (context: object | string, msg?: string) => void
}
