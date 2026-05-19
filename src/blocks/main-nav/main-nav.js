(function () {
  var nav = document.getElementById('main-nav');
  if (!nav) return;

  var SELECTORS = {
    rootItem: '.main-nav__item',
    rootToggle: '.main-nav__link',
    lev2List: '.main-nav__list-lev2',

    // Для проставления has-children на любых уровнях:
    anyItem: '.main-nav__item, .main-nav__item-lev2, .main-nav__item-lev3'
  };

  var CLASSES = {
    hasChildren: 'has-children',
    open: 'open'
  };

  (function enhanceRootToggles() {
    var roots = nav.querySelectorAll(SELECTORS.rootItem);

    for (var i = 0; i < roots.length; i++) {
      // интересуют только корни с lev2
      if (!hasLev2(roots[i])) continue;

      var toggle = roots[i].querySelector(':scope > ' + SELECTORS.rootToggle);
      if (!toggle) continue;

      // не трогаем ссылки и кнопки — только span
      if (toggle.tagName !== 'SPAN') continue;

      // tabindex: добавляем только если нет
      if (!toggle.hasAttribute('tabindex')) {
        toggle.setAttribute('tabindex', '0');
      }

      // role: добавляем только если нет
      if (!toggle.hasAttribute('role')) {
        toggle.setAttribute('role', 'button');
      }

      // aria-expanded: добавляем только если нет
      if (!toggle.hasAttribute('aria-expanded')) {
        toggle.setAttribute(
          'aria-expanded',
          roots[i].classList.contains(CLASSES.open) ? 'true' : 'false'
        );
      }
    }
  })();

  function closest(el, selector) {
    while (el && el !== document) {
      if (el.matches && el.matches(selector)) return el;
      el = el.parentNode;
    }
    return null;
  }

  function hasLev2(item) {
    return !!(item && item.querySelector(':scope > ' + SELECTORS.lev2List));
  }

  function setExpanded(toggle, expanded) {
    if (!toggle) return;
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }

  function closeAllRoot(exceptItem) {
    var items = nav.querySelectorAll(SELECTORS.rootItem + '.' + CLASSES.open);
    for (var i = 0; i < items.length; i++) {
      if (exceptItem && items[i] === exceptItem) continue;

      items[i].classList.remove(CLASSES.open);

      var t = items[i].querySelector(':scope > ' + SELECTORS.rootToggle);
      setExpanded(t, false);

      // если закрыли открытый пункт — логично снять фокус
      if (t && document.activeElement === t && t.blur) {
        t.blur();
      }
    }
  }

  function toggleRootItem(item) {
    var toggle = item.querySelector(':scope > ' + SELECTORS.rootToggle);
    var isOpen = item.classList.contains(CLASSES.open);

    closeAllRoot(item);

    if (isOpen) {
      item.classList.remove(CLASSES.open);
      setExpanded(toggle, false);

      // иначе :focus-within продолжает держать подменю открытым
      if (toggle && toggle.blur) {
        toggle.blur();
      }
    } else {
      item.classList.add(CLASSES.open);
      setExpanded(toggle, true);
    }
  }

  // 1) Проставляем has-children для всех уровней (на будущее)
  // (здесь считаем "есть дети" если есть вложенный UL)
  (function markHasChildren() {
    var items = nav.querySelectorAll(SELECTORS.anyItem);

    for (var i = 0; i < items.length; i++) {
      // Проверяем только прямых детей UL, чтобы не ловить вложенность глубже случайно
      var directUl = items[i].querySelector(':scope > ul');
      if (directUl) {
        items[i].classList.add(CLASSES.hasChildren);
      }
    }
  })();

  // 2) Инициализация aria-expanded у корней
  (function initAriaExpanded() {
    var roots = nav.querySelectorAll(SELECTORS.rootItem);
    for (var i = 0; i < roots.length; i++) {
      var toggle = roots[i].querySelector(':scope > ' + SELECTORS.rootToggle);
      if (!toggle) continue;

      // Если есть дети — задаём aria-expanded
      if (hasLev2(roots[i]) || roots[i].classList.contains(CLASSES.hasChildren)) {
        // Если уже открыт классом (например, сервером) — true
        setExpanded(toggle, roots[i].classList.contains(CLASSES.open));
      }
    }
  })();

  // 3) Click handler (делегирование)
  nav.addEventListener('click', function (e) {
    var toggle = closest(e.target, SELECTORS.rootToggle);
    if (!toggle || !nav.contains(toggle)) return;

    var item = closest(toggle, SELECTORS.rootItem);
    if (!item) return;

    // Если у корня есть подменю — клик работает как "открыть/закрыть"
    if (hasLev2(item)) {
      // На всякий случай: если toggle — ссылка, отменяем переход
      if (toggle.tagName === 'A') e.preventDefault();

      toggleRootItem(item);
    }
  });

  // 4) Keyboard: Enter/Space на корневом toggle
  nav.addEventListener('keydown', function (e) {
    var key = e.key || e.keyCode;

    var isEnter = (key === 'Enter' || key === 13);
    var isSpace = (key === ' ' || key === 'Spacebar' || key === 32);
    if (!isEnter && !isSpace) return;

    var toggle = closest(e.target, SELECTORS.rootToggle);
    if (!toggle || !nav.contains(toggle)) return;

    var item = closest(toggle, SELECTORS.rootItem);
    if (!item) return;

    if (!hasLev2(item)) return;

    // Space на non-input обычно скроллит страницу
    if (isSpace) e.preventDefault();

    // Для <a> тоже предотвращаем (как ты просил "на всякий")
    if (toggle.tagName === 'A') e.preventDefault();

    toggleRootItem(item);
  });

  // 5) Закрытие по клику вне nav (чтобы не "залипало")
  document.addEventListener('click', function (e) {
    if (nav.contains(e.target)) return;
    closeAllRoot();
  });

  // 6) Закрытие по Esc: если оффканвас закроется сам — ок,
  // но мы дополнительно схлопнем подменю, если Esc нажали и меню открыто.
  document.addEventListener('keydown', function (e) {
    var key = e.key || e.keyCode;
    var isEsc = (key === 'Escape' || key === 'Esc' || key === 27);
    if (!isEsc) return;

    closeAllRoot();
  });
})();
