(function(){
  const container = document.querySelector('.history-slider__container');
  if (!container) return;
  const prevButton = container.querySelector('.history-slider__prev');
  const nextButton = container.querySelector('.history-slider__next');
  const pagination = container.querySelector('.history-slider__pagination');

  // Пропускаем, если не нашли нужные элементы
  if (!nextButton || !prevButton || !pagination) return;

  new Swiper(container, {
    speed: 600,
    slidesPerView: 1,
    spaceBetween: 12,
    // autoplay: { delay: 5000 }, // если нужно автопрокручивание
    navigation: {
      nextEl: nextButton,
      prevEl: prevButton,
    },
    pagination: {
      el: pagination,
      type: 'bullets',
    },
    mousewheel: {
      enable: true,
      releaseOnEdges: true,
    },
    // effect: 'fade',
    // fadeEffect: {
    //   crossFade: true
    // },
  });
}());
