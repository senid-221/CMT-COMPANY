export const THEME_KEY = 'cmb_theme_v1';

export const THEME_BOOTSTRAP = `try{if(localStorage.getItem('${THEME_KEY}')==='dark')document.documentElement.classList.add('dark');}catch(e){}`;
