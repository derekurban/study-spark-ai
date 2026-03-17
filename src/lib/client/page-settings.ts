
export const checkTheme = () => {
  let theme: 'light' | 'dark' = "light";
  // Check for saved user theme
  const savedTheme = localStorage.getItem('theme');
  console.log(`Saved Theme ${savedTheme}`)
  // Check for OS preferred theme
  const OStheme = window.matchMedia("(prefers-color-scheme: dark)");

  if (savedTheme) {
    theme = savedTheme == 'dark' ? 'dark' : 'light';
  } else if (OStheme.matches) {
    theme = "dark";
  }

  document.documentElement.setAttribute('data-theme', theme);

  return theme
}

export const toggleTheme = () => {
  // Check the current theme
  const currentTheme = document.documentElement.getAttribute("data-theme");
  let newTheme = "light";

  if (currentTheme === "light") {
    newTheme = "dark";
  }

  // Set the new theme on html tag
  document.documentElement.setAttribute('data-theme', newTheme);

  // Store the user’s preference in localStorage
  localStorage.setItem('theme', newTheme);
}