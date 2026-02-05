(function(){
  Fancybox.bind('[data-fancybox="gallery"]', {
  // Your custom options for a specific gallery
    theme: "light", // "dark" - default
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
          right: ["toggleFull", "autoplay", "close"],//"fullscreen",
        },
      },
      Thumbs: {
        showOnStart: false,
      },
    },
  });
}());
