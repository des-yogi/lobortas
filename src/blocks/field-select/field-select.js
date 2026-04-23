(function(){
  'use strict';

  const selects = document.querySelectorAll('.slim-select');

  selects.forEach((select) => {
    new SlimSelect({
      select: select,
      settings: {
        showSearch: false,
        hideSelected: true,
        //closeOnSelect: false,
      }
    });
  });
}());
