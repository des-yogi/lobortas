(function(){
    const showcase = new Swiper('.showcase-slider', {
      slidesPerView: 1,
      spaceBetween: 12,
      grabCursor: true,
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },
    })
}());
