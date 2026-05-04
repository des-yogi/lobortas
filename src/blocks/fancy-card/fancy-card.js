(function(){
  if (typeof Fancybox === 'undefined') return;
  if (!document.querySelector('[data-fancybox="gallery"]')) return;

  Fancybox.bind('[data-fancybox="gallery"]', {
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
          right: ["close"],//""toggleFull", "autoplay", fullscreen",
        },
      },
      Thumbs: {
        showOnStart: false,
      },
    },
  });
}());
