;(function () {
  var matchesFn = (
    Element.prototype.matches ||
    Element.prototype.webkitMatchesSelector ||
    Element.prototype.mozMatchesSelector ||
    Element.prototype.msMatchesSelector ||
    Element.prototype.oMatchesSelector
  );

  function getClosestParent(element, selector) {
    var parent = element ? element.parentElement : null;

    while (parent) {
      if (matchesFn.call(parent, selector)) {
        return parent;
      }

      parent = parent.parentElement;
    }

    return null;
  }

  function getFileCaption(input) {
    if (input.files && input.files.length > 1) {
      return (input.getAttribute('data-multiple-caption') || '')
        .replace('{count}', input.files.length);
    }

    if (input.value) {
      return input.value.split('\\').pop();
    }

    return '';
  }

  var inputs = document.querySelectorAll('.field-file__input');

  Array.prototype.forEach.call(inputs, function (input) {
    var field = getClosestParent(input, '.field-file');
    var textContainer;
    var valueNode;
    var defaultValue;

    if (!field) {
      return;
    }

    textContainer = field.querySelector('.field-file__name-text');

    if (!textContainer) {
      return;
    }

    valueNode = textContainer.querySelector('.field-file__value');

    if (!valueNode) {
      return;
    }

    defaultValue = valueNode.textContent;

    input.addEventListener('change', function () {
      var caption = getFileCaption(input);

      valueNode.textContent = caption || defaultValue;
    });
  });
}());
