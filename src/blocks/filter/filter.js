(function () {
  'use strict';

  /**
   * =========================================================
   * Настройки скрипта
   * =========================================================
   */

  /**
   * Технический safeguard:
   * минимально допустимая ширина одной колонки в px.
   *
   * Даже если по формуле получается меньше, колонка уже этой
   * ширины не станет. Это защита от слишком узких и нечитаемых
   * колонок.
   */
  const MIN_COLUMN_WIDTH = 140;

  /**
   * Debounce-задержка для resize / mutation-based rebuild.
   */
  const REBUILD_DELAY = 120;

  /**
   * Небольшая задержка после открытия dropdown, чтобы браузер
   * успел пересчитать layout и размеры стали корректными.
   */
  const DROPDOWN_REBUILD_DELAY = 30;

  /**
   * Селекторы, используемые в скрипте.
   */
  const SELECTORS = {
    scrollable: '.filter__scrollable',
    optionItem: '.field-checkbox__input-wrap',
    generatedColumns: '.filter__columns',
    dropdownShown: '.dropdown-menu.show, .filter__list.show',
    list: '.filter__list',
    listItem: '.filter__list-item',
    fieldCheckbox: '.field-checkbox',
    subtitle: '.filter__subtitle'
  };

  /**
   * Дефолтные значения, если data-атрибуты отсутствуют
   * или содержат невалидные данные.
   */
  const DEFAULTS = {
    columnHeight: 340,
    visibleColumns: 1,
    wheelScroll: false
  };

  /**
   * =========================================================
   * Базовые утилиты
   * =========================================================
   */

  /**
   * Проверка на DOM-элемент.
   *
   * @param {*} node
   * @returns {boolean}
   */
  function isElement(node) {
    return !!(node && node.nodeType === 1);
  }

  /**
   * Проверка, что элемент видим и его можно измерять.
   *
   * Это важно для dropdown: пока он скрыт, размеры элемента
   * ненадёжны.
   *
   * @param {HTMLElement} element
   * @returns {boolean}
   */
  function isVisible(element) {
    return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
  }

  /**
   * Безопасный парсинг положительного целого числа.
   *
   * @param {string|null} value
   * @param {number} fallback
   * @returns {number}
   */
  function toPositiveNumber(value, fallback) {
    const parsed = parseInt(value, 10);

    if (isNaN(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }

  /**
   * Поддерживаем только строку "true" как включение.
   *
   * @param {string|null} value
   * @returns {boolean}
   */
  function toBoolean(value) {
    return value === 'true';
  }

  /**
   * Debounce-обёртка.
   *
   * @param {Function} callback
   * @param {number} delay
   * @returns {Function}
   */
  function debounce(callback, delay) {
    let timer = null;

    return function () {
      const context = this;
      const args = arguments;

      window.clearTimeout(timer);

      timer = window.setTimeout(function () {
        callback.apply(context, args);
      }, delay);
    };
  }

  /**
   * =========================================================
   * Работа с API data-атрибутов
   * =========================================================
   */

  /**
   * Читает базовые настройки блока.
   *
   * Поддерживаются:
   * - data-column-height="340"
   * - data-wheel-scroll="true"
   *
   * @param {HTMLElement} block
   * @returns {{columnHeight: number, wheelScroll: boolean}}
   */
  function getBaseConfig(block) {
    return {
      columnHeight: toPositiveNumber(
        block.getAttribute('data-column-height'),
        DEFAULTS.columnHeight
      ),
      wheelScroll: toBoolean(
        block.getAttribute('data-wheel-scroll')
      )
    };
  }

  /**
   * Читает mobile-first правило:
   * data-columns="1"
   *
   * Если атрибут отсутствует или невалиден — возвращаем 1.
   *
   * @param {HTMLElement} block
   * @returns {number}
   */
  function getDefaultVisibleColumns(block) {
    return toPositiveNumber(
      block.getAttribute('data-columns'),
      DEFAULTS.visibleColumns
    );
  }

  /**
   * Парсит строку вида "768/2".
   *
   * Формат:
   * - первая часть: min viewport width
   * - вторая часть: visible columns count
   *
   * Пример:
   * "1280/3" => { minWidth: 1280, columns: 3 }
   *
   * Если формат невалиден — возвращаем null.
   *
   * @param {string} value
   * @returns {{minWidth: number, columns: number}|null}
   */
  function parseColumnsRule(value) {
    if (!value || typeof value !== 'string') {
      return null;
    }

    const parts = value.split('/');

    if (parts.length !== 2) {
      return null;
    }

    const minWidth = parseInt(parts[0], 10);
    const columns = parseInt(parts[1], 10);

    if (
      isNaN(minWidth) ||
      isNaN(columns) ||
      minWidth < 0 ||
      columns <= 0
    ) {
      return null;
    }

    return {
      minWidth: minWidth,
      columns: columns
    };
  }

  /**
   * Собирает все дополнительные правила из data-columns-*,
   * кроме базового data-columns.
   *
   * Скрипт не зависит от названий suffix'ов.
   * Он смотрит только на:
   * - имя атрибута начинается с "data-columns-"
   * - значение имеет формат "viewport/columns"
   *
   * @param {HTMLElement} block
   * @returns {Array<{minWidth: number, columns: number}>}
   */
  function getColumnsRules(block) {
    const rules = [];
    const attrs = block.attributes;

    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];

      if (!attr || !attr.name) {
        continue;
      }

      if (attr.name === 'data-columns') {
        continue;
      }

      if (attr.name.indexOf('data-columns-') !== 0) {
        continue;
      }

      const parsedRule = parseColumnsRule(attr.value);

      if (!parsedRule) {
        continue;
      }

      rules.push(parsedRule);
    }

    rules.sort(function (a, b) {
      return a.minWidth - b.minWidth;
    });

    return rules;
  }

  /**
   * Определяет количество колонок, которое должно быть
   * видно одновременно на текущем viewport.
   *
   * Логика mobile-first:
   * - сначала берём data-columns
   * - затем последовательно применяем все rules,
   *   у которых viewport >= minWidth
   *
   * @param {HTMLElement} block
   * @returns {number}
   */
  function getVisibleColumnsCount(block) {
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    let visibleColumns = getDefaultVisibleColumns(block);
    const rules = getColumnsRules(block);

    for (let i = 0; i < rules.length; i++) {
      if (viewportWidth >= rules[i].minWidth) {
        visibleColumns = rules[i].columns;
      }
    }

    if (visibleColumns <= 0) {
      return DEFAULTS.visibleColumns;
    }

    return visibleColumns;
  }

  /**
   * =========================================================
   * Работа со структурой DOM
   * =========================================================
   */

  /**
   * Возвращает плоский список опций — только прямых детей
   * .filter__scrollable.
   *
   * @param {HTMLElement} block
   * @returns {HTMLElement[]}
   */
  function getFlatItems(block) {
    const result = [];
    const children = block.children;

    for (let i = 0; i < children.length; i++) {
      if (children[i].matches(SELECTORS.optionItem)) {
        result.push(children[i]);
      }
    }

    return result;
  }

  /**
   * Удаляет ранее сгенерированную структуру колонок и возвращает
   * все элементы обратно в "плоский" список.
   *
   * Это нужно перед каждой пересборкой.
   *
   * @param {HTMLElement} block
   */
  function flattenBlock(block) {
    const generated = block.querySelector(SELECTORS.generatedColumns);

    if (!generated) {
      return;
    }

    const fragment = document.createDocumentFragment();
    const columns = generated.children;

    for (let i = 0; i < columns.length; i++) {
      while (columns[i].firstElementChild) {
        fragment.appendChild(columns[i].firstElementChild);
      }
    }

    generated.parentNode.removeChild(generated);
    block.appendChild(fragment);
  }

  /**
   * Создаёт контейнер для всех колонок.
   *
   * @returns {HTMLDivElement}
   */
  function createColumnsWrap() {
    const wrap = document.createElement('div');
    wrap.className = 'filter__columns';
    return wrap;
  }

  /**
   * Создаёт одну колонку.
   *
   * Ширина задаётся инлайном, потому что она вычисляется динамически
   * из ширины контейнера и текущего числа видимых колонок.
   *
   * @param {number} width
   * @returns {HTMLDivElement}
   */
  function createColumn(width) {
    const column = document.createElement('div');
    column.className = 'filter__column';
    column.style.width = width + 'px';
    column.style.minWidth = width + 'px';
    return column;
  }

  /**
   * =========================================================
   * Измерения и расчёты layout
   * =========================================================
   */

  /**
   * Возвращает горизонтальный gap между колонками из computed styles.
   *
   * Если значение не удалось получить — используем fallback 12.
   *
   * @param {HTMLElement} columnsWrap
   * @returns {number}
   */
  function getColumnsGap(columnsWrap) {
    const styles = window.getComputedStyle(columnsWrap);
    const gapValue = styles.columnGap || styles.gap || '12';
    const parsed = parseFloat(gapValue);

    if (isNaN(parsed) || parsed < 0) {
      return 12;
    }

    return parsed;
  }

  /**
   * Вычисляет ширину одной колонки на основе:
   * - текущей ширины scrollable-блока
   * - желаемого числа видимых колонок
   * - gap между колонками
   * - технического минимального порога MIN_COLUMN_WIDTH
   *
   * Формула:
   * (containerWidth - totalGap) / visibleColumns
   *
   * @param {HTMLElement} block
   * @param {number} visibleColumns
   * @param {number} gap
   * @returns {number}
   */
  function calculateColumnWidth(block, visibleColumns, gap) {
    const containerWidth = block.clientWidth;

    if (!containerWidth || visibleColumns <= 0) {
      return MIN_COLUMN_WIDTH;
    }

    const totalGap = gap * (visibleColumns - 1);
    const calculated = Math.floor((containerWidth - totalGap) / visibleColumns);

    if (isNaN(calculated) || calculated <= 0) {
      return MIN_COLUMN_WIDTH;
    }

    return Math.max(calculated, MIN_COLUMN_WIDTH);
  }

  /**
   * Возвращает фактически занятую высоту колонки:
   * нижняя граница последнего элемента минус верхняя граница колонки.
   *
   * Это надёжнее, чем измерять scrollHeight у всего контейнера,
   * потому что нас интересует именно реальная высота потока элементов.
   *
   * @param {HTMLElement} column
   * @returns {number}
   */
  function getColumnUsedHeight(column) {
    const lastChild = column.lastElementChild;

    if (!lastChild) {
      return 0;
    }

    const columnRect = column.getBoundingClientRect();
    const childRect = lastChild.getBoundingClientRect();
    const styles = window.getComputedStyle(lastChild);
    const marginBottom = parseFloat(styles.marginBottom) || 0;

    return (childRect.bottom - columnRect.top) + marginBottom;
  }

  /**
   * =========================================================
   * Ребаланс высоты внешних filter__list-item
   * =========================================================
   */

  /**
   * Сбрасывает ранее выставленные inline-высоты у filter__list-item,
   * кроме последнего элемента с контролами формы.
   *
   * @param {HTMLElement} list
   */
  function resetListItemsHeight(list) {
    const items = list.querySelectorAll(':scope > ' + SELECTORS.listItem);

    if (!items.length || items.length === 1) {
      return;
    }

    for (let i = 0; i < items.length - 1; i++) {
      items[i].style.height = '';
      items[i].style.minHeight = '';
    }
  }

  /**
   * Выравнивает высоту filter__list-item внутри одного filter__list.
   *
   * Логика:
   * - берём только прямых детей .filter__list-item
   * - последний не трогаем, потому что это блок с контролами формы
   * - все предыдущие выравниваем по самому высокому
   *
   * @param {HTMLElement} list
   */
  function balanceListItemsHeight(list) {
    const items = list.querySelectorAll(':scope > ' + SELECTORS.listItem);

    if (!items.length || items.length === 1) {
      return;
    }

    resetListItemsHeight(list);

    let maxHeight = 0;

    for (let i = 0; i < items.length - 1; i++) {
      const currentHeight = items[i].offsetHeight;

      if (currentHeight > maxHeight) {
        maxHeight = currentHeight;
      }
    }

    if (!maxHeight) {
      return;
    }

    for (let i = 0; i < items.length - 1; i++) {
      items[i].style.minHeight = maxHeight + 'px';
    }
  }

  /**
   * =========================================================
   * Подгонка высоты .filter__scrollable как остатка пространства
   * =========================================================
   */

  /**
   * Сбрасывает ранее выставленные inline-высоты scrollable-блоков
   * внутри filter__list-item, кроме последнего элемента с контролами формы.
   *
   * @param {HTMLElement} list
   */
  function resetScrollableHeights(list) {
    const items = list.querySelectorAll(':scope > ' + SELECTORS.listItem);

    if (!items.length || items.length === 1) {
      return;
    }

    for (let i = 0; i < items.length - 1; i++) {
      const scrollable = items[i].querySelector(SELECTORS.scrollable);

      if (scrollable) {
        scrollable.style.height = '';
        scrollable.style.minHeight = '';
      }
    }
  }

  /**
   * Подгоняет высоту .filter__scrollable так, чтобы линия скролла
   * у всех фильтровых карточек находилась на одной высоте.
   *
   * Логика:
   * - берём высоту внешнего .filter__list-item
   * - вычитаем из неё высоту заголовка и связанные отступы
   * - оставшееся пространство отдаём под .filter__scrollable
   *
   * Последний .filter__list-item не трогаем, потому что это блок
   * с контролами формы.
   *
   * @param {HTMLElement} list
   */
  function fitScrollableHeight(list) {
    const items = list.querySelectorAll(':scope > ' + SELECTORS.listItem);

    if (!items.length || items.length === 1) {
      return;
    }

    resetScrollableHeights(list);

    for (let i = 0; i < items.length - 1; i++) {
      const item = items[i];
      const fieldCheckbox = item.querySelector(SELECTORS.fieldCheckbox);
      const subtitle = item.querySelector(SELECTORS.subtitle);
      const scrollable = item.querySelector(SELECTORS.scrollable);

      if (!fieldCheckbox || !scrollable) {
        continue;
      }

      const itemHeight = item.clientHeight;
      const fieldCheckboxStyles = window.getComputedStyle(fieldCheckbox);

      const fieldPaddingTop = parseFloat(fieldCheckboxStyles.paddingTop) || 0;
      const fieldPaddingBottom = parseFloat(fieldCheckboxStyles.paddingBottom) || 0;
      const fieldBorderTop = parseFloat(fieldCheckboxStyles.borderTopWidth) || 0;
      const fieldBorderBottom = parseFloat(fieldCheckboxStyles.borderBottomWidth) || 0;

      let subtitleTotalHeight = 0;

      if (subtitle) {
        const subtitleStyles = window.getComputedStyle(subtitle);
        const subtitleMarginTop = parseFloat(subtitleStyles.marginTop) || 0;
        const subtitleMarginBottom = parseFloat(subtitleStyles.marginBottom) || 0;

        subtitleTotalHeight = subtitle.offsetHeight + subtitleMarginTop + subtitleMarginBottom;
      }

      const availableHeight =
        itemHeight
        - fieldPaddingTop
        - fieldPaddingBottom
        - fieldBorderTop
        - fieldBorderBottom
        - subtitleTotalHeight;

      if (availableHeight > 0) {
        scrollable.style.height = availableHeight + 'px';
      }
    }
  }

  /**
   * Выравнивает высоты filter__list-item во всех видимых filter__list
   * и затем подгоняет высоту .filter__scrollable как остаток пространства.
   */
  function balanceAllListsItemsHeight() {
    const lists = document.querySelectorAll(SELECTORS.list);

    if (!lists.length) {
      return;
    }

    for (let i = 0; i < lists.length; i++) {
      if (isVisible(lists[i])) {
        balanceListItemsHeight(lists[i]);
        fitScrollableHeight(lists[i]);
      }
    }
  }

  /**
   * =========================================================
   * Основная сборка колонок
   * =========================================================
   */

  /**
   * Собирает плоский список опций в набор колонок.
   *
   * Алгоритм:
   * 1. Определяем число видимых колонок по текущему viewport.
   * 2. Вычисляем ширину одной колонки.
   * 3. Создаём первую колонку.
   * 4. Последовательно добавляем элементы.
   * 5. Если после добавления элемент не помещается по высоте —
   *    переносим его в новую колонку.
   *
   * Поток:
   * сверху-вниз, затем слева-направо.
   *
   * @param {HTMLElement} block
   */
  function buildColumns(block) {
    if (!isElement(block) || !isVisible(block)) {
      return;
    }

    flattenBlock(block);

    const baseConfig = getBaseConfig(block);
    const items = getFlatItems(block);

    if (!items.length) {
      return;
    }

    const visibleColumns = getVisibleColumnsCount(block);
    const columnsWrap = createColumnsWrap();

    /**
     * Сначала вставляем wrap в DOM, чтобы можно было корректно
     * считать gap из computed styles.
     */
    block.appendChild(columnsWrap);

    const gap = getColumnsGap(columnsWrap);
    const columnWidth = calculateColumnWidth(block, visibleColumns, gap);
    let currentColumn = createColumn(columnWidth);

    columnsWrap.appendChild(currentColumn);

    for (let i = 0; i < items.length; i++) {
      currentColumn.appendChild(items[i]);

      /**
       * Если колонка переполнилась и в ней уже был хотя бы один
       * элемент до текущего — переносим текущий элемент в новую колонку.
       *
       * Если даже один элемент выше лимита — оставляем его как есть,
       * иначе такой элемент невозможно будет показать вообще.
       */
      if (
        currentColumn.children.length > 1 &&
        getColumnUsedHeight(currentColumn) > baseConfig.columnHeight
      ) {
        currentColumn.removeChild(items[i]);

        currentColumn = createColumn(columnWidth);
        columnsWrap.appendChild(currentColumn);
        currentColumn.appendChild(items[i]);
      }
    }
  }

  /**
   * Пересобирает один блок.
   *
   * @param {HTMLElement} block
   */
  function rebuildBlock(block) {
    if (!isElement(block)) {
      return;
    }

    buildColumns(block);
  }

  /**
   * Пересобирает все блоки фильтров на странице
   * и затем выравнивает внешние filter__list-item.
   */
  function rebuildAllBlocks() {
    const blocks = document.querySelectorAll(SELECTORS.scrollable);

    if (!blocks.length) {
      return;
    }

    for (let i = 0; i < blocks.length; i++) {
      rebuildBlock(blocks[i]);
    }

    balanceAllListsItemsHeight();
  }

  /**
   * =========================================================
   * Горизонтальный scroll по колесу мыши
   * =========================================================
   */

  /**
   * Навешивает horizontal wheel scroll на один блок.
   *
   * Поведение:
   * - работает только если data-wheel-scroll="true"
   * - работает только при реальном overflow по X
   * - не мешает жестам/тачпаду, если пользователь уже скроллит по X
   *
   * @param {HTMLElement} block
   */
  function bindWheelScroll(block) {
    if (!isElement(block)) {
      return;
    }

    /**
     * Защита от повторного навешивания обработчика.
     */
    if (block.getAttribute('data-wheel-scroll-bound') === 'true') {
      return;
    }

    const baseConfig = getBaseConfig(block);

    if (!baseConfig.wheelScroll) {
      return;
    }

    block.addEventListener('wheel', function (event) {
      /**
       * Если реального горизонтального переполнения нет —
       * не вмешиваемся.
       */
      if (block.scrollWidth <= block.clientWidth) {
        return;
      }

      /**
       * Если пользователь уже скроллит по горизонтали
       * (например, тачпадом), не мешаем стандартному поведению.
       */
      if (event.deltaX !== 0 && Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        return;
      }

      block.scrollLeft += event.deltaY;
      event.preventDefault();
    }, { passive: false });

    block.setAttribute('data-wheel-scroll-bound', 'true');
  }

  /**
   * Навешивает wheel-scroll на все подходящие блоки.
   */
  function bindWheelScrollForAll() {
    const blocks = document.querySelectorAll(SELECTORS.scrollable);

    if (!blocks.length) {
      return;
    }

    for (let i = 0; i < blocks.length; i++) {
      bindWheelScroll(blocks[i]);
    }
  }

  /**
   * =========================================================
   * Инициализация и события
   * =========================================================
   */

  /**
   * Инициализация скрипта.
   */
  function init() {
    bindWheelScrollForAll();
    rebuildAllBlocks();
  }

  /**
   * Пересборка только для конкретного открытого dropdown.
   *
   * @param {HTMLElement} dropdownRoot
   */
  function rebuildInDropdown(dropdownRoot) {
    if (!isElement(dropdownRoot)) {
      return;
    }

    const blocks = dropdownRoot.querySelectorAll(SELECTORS.scrollable);

    for (let i = 0; i < blocks.length; i++) {
      rebuildBlock(blocks[i]);
    }

    if (dropdownRoot.matches(SELECTORS.list)) {
      balanceListItemsHeight(dropdownRoot);
      fitScrollableHeight(dropdownRoot);
      return;
    }

    const lists = dropdownRoot.querySelectorAll(SELECTORS.list);

    for (let i = 0; i < lists.length; i++) {
      balanceListItemsHeight(lists[i]);
      fitScrollableHeight(lists[i]);
    }
  }

  /**
   * Основной старт после готовности DOM.
   */
  function onReady() {
    init();

    /**
     * Пересборка при resize окна.
     *
     * Нужна потому, что:
     * - меняется viewport
     * - меняются активные data-columns-* rules
     * - меняется вычисленная ширина колонки
     * - меняются переносы текста и фактическая высота элементов
     * - надо заново ребалансить внешние filter__list-item
     * - надо заново пересчитать остаточную высоту .filter__scrollable
     */
    window.addEventListener('resize', debounce(function () {
      rebuildAllBlocks();
    }, REBUILD_DELAY));

    /**
     * Основной сценарий для Bootstrap dropdown:
     * после открытия пересобираем колонки, потому что до открытия
     * блок мог быть скрыт и размеры были бы некорректны.
     */
    document.addEventListener('shown.bs.dropdown', function (event) {
      const dropdown = event.target;

      window.setTimeout(function () {
        rebuildInDropdown(dropdown);
      }, DROPDOWN_REBUILD_DELAY);
    }, true);

    /**
     * Фолбэк:
     * если раскрытие блока происходит не через bootstrap-событие,
     * а просто через добавление .show, пересобираем всё по мутации class.
     */
    const observer = new MutationObserver(debounce(function (mutations) {
      let shouldRebuild = false;

      for (let i = 0; i < mutations.length; i++) {
        if (
          mutations[i].type === 'attributes' &&
          mutations[i].attributeName === 'class' &&
          isElement(mutations[i].target) &&
          mutations[i].target.matches(SELECTORS.dropdownShown)
        ) {
          shouldRebuild = true;
          break;
        }
      }

      if (!shouldRebuild) {
        return;
      }

      rebuildAllBlocks();
    }, REBUILD_DELAY));

    observer.observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ['class']
    });
  }

  /**
   * Безопасный запуск:
   * если на странице фильтров нет, скрипт просто ничего не делает.
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
