(function(){
  document.querySelectorAll('.gallery-carousel').forEach(section => {
    let slidesPerViewMd = 3;
    if (section.classList.contains('promo-slider')) {
      slidesPerViewMd = 4;
    }

    const container = section.querySelector('.gallery-carousel__container');
    const nextButton = section.querySelector('.gallery-carousel__next');
    const prevButton = section.querySelector('.gallery-carousel__prev');

    // Пропускаем, если не нашли нужные элементы
    if (!container || !nextButton || !prevButton) return;

    new Swiper(container, {
      speed: 400,
      slidesPerView: 2,
      spaceBetween: 12,
      // autoplay: { delay: 5000 }, // если нужно автопрокручивание
      breakpoints: {
        768: {
          slidesPerView: slidesPerViewMd
        }
      },
      navigation: {
        nextEl: nextButton,
        prevEl: prevButton,
      },
    });
  });
}());
