document.addEventListener('DOMContentLoaded', () => {
  const lazyVideos = document.querySelectorAll('video.lazy');
  if (!lazyVideos.length || !('IntersectionObserver' in window)) {
    return;
  }

  const observer = new IntersectionObserver((entries, observerInstance) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const video = entry.target;
      const sources = video.querySelectorAll('source[data-src]');

      sources.forEach(source => {
        source.src = source.dataset.src;
        source.removeAttribute('data-src');
      });

      video.load();
      video.classList.remove('lazy');
      observerInstance.unobserve(video);
    });
  }, {
    rootMargin: '200px 0px',
    threshold: 0
  });

  lazyVideos.forEach(video => observer.observe(video));
});
