(function () {
  'use strict';

  var hasWeakMap = typeof WeakMap === 'function';
  var originalParents = hasWeakMap ? new WeakMap() : new Map();
  var wasMoved = hasWeakMap ? new WeakMap() : new Map();

  // Если нет WeakMap, добавим MutationObserver, который будет чистить Map,
  // когда узлы удаляются из документа (уменьшает риск утечек).
  var observer;
  if (!hasWeakMap && typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(function (mutations) {
      // Для производительности: собираем все удалённые узлы и проверяем в Map
      var removed = [];
      mutations.forEach(function (m) {
        m.removedNodes && m.removedNodes.forEach(function (n) {
          if (n && n.nodeType === 1) removed.push(n);
          // также рекурсивно проверяем детей
          if (n && n.querySelectorAll) {
            n.querySelectorAll('*').forEach(function (el) { removed.push(el); });
          }
        });
      });
      if (removed.length === 0) return;
      // Проходим по Map ключам и удаляем те, которых нет в документе
      Array.from(originalParents.keys()).forEach(function (key) {
        if (!key.isConnected) {
          originalParents.delete(key);
          wasMoved.delete(key);
        }
      });
    });
    observer.observe(document.documentElement || document, { childList: true, subtree: true });
  }

  function getModalFromEvent(e) {
    if (!e || !e.target) return null;
    return (e.target instanceof HTMLElement) ? e.target : null;
  }

  document.addEventListener('show.bs.modal', function (e) {
    var modal = getModalFromEvent(e);
    if (!modal) return;

    if (!originalParents.has(modal)) originalParents.set(modal, modal.parentNode);
    if (modal.parentNode !== document.body) {
      try {
        document.body.appendChild(modal);
        wasMoved.set(modal, true);
      } catch (err) {
        console && console.error && console.error('modal relocate append failed', err);
      }
    }
  }, false);

  document.addEventListener('hidden.bs.modal', function (e) {
    var modal = getModalFromEvent(e);
    if (!modal) return;

    try {
      if (wasMoved.has(modal) && wasMoved.get(modal)) {
        var orig = originalParents.get(modal);
        if (orig && orig instanceof Node && orig.isConnected) {
          orig.appendChild(modal);
        }
      }
    } catch (err) {
      console && console.warn && console.warn('modal relocate restore failed', err);
    } finally {
      try { originalParents.delete(modal); } catch (_) {}
      try { wasMoved.delete(modal); } catch (_) {}
    }
  }, false);

  // Опционально: очистка observer при выгрузке страницы (хорошо для SPA/unmount)
  if (observer && typeof window !== 'undefined') {
    window.addEventListener('unload', function () {
      try { observer.disconnect(); } catch (e) {}
    });
  }
})();
