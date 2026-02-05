(function () {
  'use strict';

  // Допустимые позиции (список для валидации)
  var ALLOWED_PLACES = [
    'top', 'top-left', 'top-right',
    'bottom', 'bottom-left', 'bottom-right',
    'left', 'right',
    'center'
  ];

  // Простейшая нормализация/валидация place
  function normalizePlace(raw) {
    if (!raw) return '';
    var p = String(raw).trim().toLowerCase();
    // удалим недопустимые символы (оставим a-z0-9 и дефис)
    p = p.replace(/[^a-z0-9\-]/g, '');
    return ALLOWED_PLACES.indexOf(p) !== -1 ? p : '';
  }

  // Копирование текста: navigator.clipboard или fallback
  function copyTextToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);

      var sel = document.getSelection();
      var prevRange = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;

      ta.select();

      try {
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (prevRange && sel) {
          sel.removeAllRanges();
          sel.addRange(prevRange);
        }
        if (ok) resolve();
        else reject(new Error('document.execCommand returned false'));
      } catch (err) {
        document.body.removeChild(ta);
        if (prevRange && sel) {
          sel.removeAllRanges();
          sel.addRange(prevRange);
        }
        reject(err);
      }
    });
  }

  // Получаем имя блока БЭМ на основе классов кнопки
  function getBlockName(button) {
    if (!button || !button.classList) return 'copy-page-link';
    var clsArr = Array.prototype.slice.call(button.classList);
    for (var i = 0; i < clsArr.length; i++) {
      var c = clsArr[i];
      if (c === 'copy-page-link' || c.indexOf('copy-page-link') === 0) return c;
    }
    for (var j = 0; j < clsArr.length; j++) {
      var cand = clsArr[j];
      if (cand.indexOf('__') === -1 && cand.indexOf('--') === -1) return cand;
    }
    return clsArr[0] || 'copy-page-link';
  }

  // Устанавливаем position: relative на кнопку при необходимости
  function ensureButtonPositioned(button) {
    var cs = getComputedStyle(button);
    if (cs.position === 'static' || !cs.position) {
      if (!button.hasAttribute('data-cpl-original-position')) {
        button.setAttribute('data-cpl-original-position', cs.position);
      }
      button.style.position = 'relative';
    }
  }

  // Создаем/получаем span-тост внутри кнопки
  function getOrCreateAttachedToast(button, block) {
    var toastSelector = block + '__toast';
    var toast = button.querySelector('.' + toastSelector);
    if (toast) return toast;

    var span = document.createElement('span');
    span.className = toastSelector;
    span.setAttribute('role', 'status');
    span.setAttribute('aria-live', 'polite');
    span.setAttribute('aria-atomic', 'true');
    // aria-hidden оставляем false, но тост не содержит фокусируемых элементов
    button.appendChild(span);
    return span;
  }

  // Показать тост, привязанный к кнопке
  function showAttachedToast(button, block, message, options) {
    options = options || {};
    var duration = typeof options.duration === 'number' ? options.duration : 2200;
    var modifier = options.modifier || '';
    var place = normalizePlace(options.place || '') || 'top';
    var offset = typeof options.offset === 'number' ? options.offset : 8;

    var toast = getOrCreateAttachedToast(button, block);
    var base = block + '__toast';
    var showClass = base + '--show';
    var modClass = modifier ? base + '--' + modifier : '';
    var placeClass = base + '--' + place;

    // Сбросим классы, сохраним базовый
    toast.className = base;

    if (modClass) toast.classList.add(modClass);
    if (placeClass) toast.classList.add(placeClass);

    // Безопасно вставляем текст
    toast.textContent = message || '';
    toast.classList.add(showClass);

    // Управление отступом через CSS-переменную
    toast.style.setProperty('--cpl-offset', offset + 'px');

    if (toast._hideTimer) clearTimeout(toast._hideTimer);

    toast._hideTimer = setTimeout(function () {
      toast.classList.remove(showClass);
      if (toast._hideTimer) {
        clearTimeout(toast._hideTimer);
        toast._hideTimer = null;
      }
      setTimeout(function () { toast.textContent = ''; }, 300);
    }, duration);
  }

  // Привязать обработчик к кнопке. opts: { duration, position, offset, modifierSuccess, modifierError }
  function attachCopyHandler(button, opts) {
    if (!button) return;
    var block = getBlockName(button);
    var defaultOpts = {
      duration: 2200,
      position: 'top',
      offset: 8,
      modifierSuccess: 'success',
      modifierError: 'error'
    };
    var opt = Object.assign({}, defaultOpts, opts || {});

    // сообщения из data-атрибутов
    var successMsgFromAttr = button.getAttribute('data-success');
    var errorMsgFromAttr = button.getAttribute('data-error');
    var successMessage = successMsgFromAttr != null ? successMsgFromAttr : 'Link copied';
    var errorMessage = errorMsgFromAttr != null ? errorMsgFromAttr : 'Failed to copy link';

    // место из data-place (приоритет) -> opt.position -> default 'top'
    var placeAttr = normalizePlace(button.getAttribute('data-place'));
    var placeToUse = placeAttr || normalizePlace(opt.position) || 'top';

    ensureButtonPositioned(button);

    button.addEventListener('click', function (e) {
      e.preventDefault();
      var pageUrl = window.location.href;

      copyTextToClipboard(pageUrl).then(function () {
        showAttachedToast(button, block, successMessage, {
          duration: opt.duration,
          modifier: opt.modifierSuccess,
          place: placeToUse,
          offset: opt.offset
        });
      }).catch(function (err) {
        console.error('Copy failed:', err);
        showAttachedToast(button, block, errorMessage, {
          duration: opt.duration,
          modifier: opt.modifierError,
          place: placeToUse,
          offset: opt.offset
        });
      });
    }, false);
  }

  // Автоматическое подключение по id="currentPageLink"
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('currentPageLink');
    if (btn) attachCopyHandler(btn);
  });

  // Экспорт API
  window.CopyPageLink = {
    attach: attachCopyHandler,
    copyText: copyTextToClipboard,
    // showAttachedToast(buttonOrSelector, message, { place, duration, offset, modifier })
    showAttachedToast: function (buttonOrSelector, message, options) {
      var button = typeof buttonOrSelector === 'string' ? document.querySelector(buttonOrSelector) : buttonOrSelector;
      if (!button) return;
      var block = getBlockName(button);
      ensureButtonPositioned(button);
      options = options || {};
      // если place не передан — попробуем взять из data-place
      if (!options.place) {
        options.place = normalizePlace(button.getAttribute('data-place')) || 'top';
      }
      showAttachedToast(button, block, message, options);
    }
  };
})();
