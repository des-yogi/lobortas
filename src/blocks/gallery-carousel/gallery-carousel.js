(function(){
  const carousel = new Swiper('.gallery-carousel__container', {
    speed: 400,
    slidesPerView: 2,
    spaceBetween: 12,
    //autoplay: {
    //  delay: 5000,
    //},
    breakpoints: {
      768: {
        slidesPerView: 3
      }
    },
    navigation: {
      nextEl: '.gallery-carousel__next',
      prevEl: '.gallery-carousel__prev',
    },
  });
}());
