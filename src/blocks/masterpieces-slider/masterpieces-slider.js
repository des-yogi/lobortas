(function(){
  const masterpieces = new Swiper('.masterpieces-slider__container', {
    slidesPerView: 1,
    spaceBetween: 12,
    grabCursor: true,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
  })
}());
