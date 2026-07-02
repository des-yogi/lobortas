(function(){
  const customGallery = new Swiper('.custom-made-gallery__container', {
    speed: 400,
    slidesPerView: 1,
    spaceBetween: 12,
    loop: true,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
  });

  Fancybox.bind("[data-fancybox='slider']", {
    // Your custom options for a specific gallery
    theme: "dark", // "light || dark" - default
    Carousel: {
      Toolbar: {
        display: {
          left: [""],//"counter"
          // middle: [
          //   "zoomIn",
          //   "zoomOut",
          //   "toggle1to1",
          //   "rotateCCW",
          //   "rotateCW",
          //   "flipX",
          //   "flipY",
          //   "reset",
          // ],
          right: ["close"],// "toggleFull", "autoplay", "fullscreen",
        },
      },
      Thumbs: {
        showOnStart: false,
      },
    },
  });
}());
