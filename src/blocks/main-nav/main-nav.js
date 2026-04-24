// (function() {
//   const toggler = document.getElementById('menu-dt-toggler');
//   const mainMenu = document.getElementById('main-nav');
//   const menuWrapper = document.querySelector('.dropdown.page-header__menu-desktop');

//   menuWrapper.addEventListener('show.bs.dropdown', event => {
//     mainMenu.setAttribute('aria-hidden', false);
//   });

//   menuWrapper.addEventListener('hide.bs.dropdown', event => {
//     mainMenu.setAttribute('aria-hidden', true);
//   });
// })();

/*document.addEventListener('DOMContentLoaded', () => {
  const mainMenu = document.getElementById('main-nav');
  const wrapper = document.querySelector('.dropdown.page-header__menu-desktop');
  if (!mainMenu || !wrapper) return;

  wrapper.addEventListener('show.bs.dropdown', () => {
    mainMenu.setAttribute('aria-hidden','false');
  });
  wrapper.addEventListener('hide.bs.dropdown',  () => {
    mainMenu.setAttribute('aria-hidden','true');
  });
});

// Показ дивайдера
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('nav.main-nav');
  if (!nav) return;

  const parentItemSelector = '.main-nav__item';
  const submenuSelector = '.main-nav__list-lev2';

  // hover: при наведении на li, у которого есть подменю, показываем делитель
  nav.addEventListener('mouseover', (e) => {
    const li = e.target.closest(parentItemSelector);
    if (li && li.querySelector(submenuSelector)) {
      nav.classList.add('show-submenu');
    }
  });

  // при уходе курсора из nav — прячем делитель
  nav.addEventListener('mouseleave', () => {
    nav.classList.remove('show-submenu');
  });

  // для клавиатуры: focusin/focusout
  nav.addEventListener('focusin', (e) => {
    const li = e.target.closest(parentItemSelector);
    if (li && li.querySelector(submenuSelector)) {
      nav.classList.add('show-submenu');
    }
  });

  nav.addEventListener('focusout', () => {
    // через таймаут проверяем, остался ли фокус в nav
    setTimeout(() => {
      if (!nav.contains(document.activeElement)) nav.classList.remove('show-submenu');
    }, 0);
  });
});*/
