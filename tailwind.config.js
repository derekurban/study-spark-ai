import themes from 'daisyui/src/theming/themes'

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			screens: {
				mobile: { max: '768px' },
				desktop: { min: '768px' },
			},
		},
	},
	plugins: [require('daisyui')],
	daisyui: {
		themes: [
			{
				light: {
					...themes['[data-theme=light]'],

					primary: '#b76efb',
					secondary: '#72a8fb',
					accent: '#fbeb6e',
				},
				dark: {
					...themes['[data-theme=dark]'],

					primary: '#8d38dd',
					secondary: '#3879dd',
					accent: '#d9c736',
				},
			},
		],
		darkTheme: 'dark', // name of one of the included themes for dark mode
		base: true, // applies background color and foreground color for root element by default
		styled: true, // include daisyUI colors and design decisions for all components
		utils: true, // adds responsive and modifier utility classes
		rtl: false, // rotate style direction from left-to-right to right-to-left. You also need to add dir="rtl" to your html tag and install `tailwindcss-flip` plugin for Tailwind CSS.
		prefix: '', // prefix for daisyUI classnames (components, modifiers and responsive class names. Not colors)
		logs: true, // Shows info about daisyUI version and used config in the console when building your CSS
	},
}
