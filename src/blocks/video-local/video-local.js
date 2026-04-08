document.addEventListener('DOMContentLoaded', () => {
  const lazyVideos = document.querySelectorAll('video.lazy');
  if (!lazyVideos.length) return; // нет видео — выходим сразу

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const video = entry.target;

      // Подставляем src из data-src для каждого <source>
      video.querySelectorAll('source[data-src]').forEach(source => {
        source.src = source.dataset.src;
      });

      // Говорим видео перезагрузить источники
      video.load();
      video.classList.remove('lazy');

      // Отписываемся — грузить повторно не нужно
      observer.unobserve(video);
    });
  }, {
    rootMargin: '200px', // начинаем загрузку чуть заранее до появления в viewport
    threshold: 0
  });

  lazyVideos.forEach(video => observer.observe(video));
});
