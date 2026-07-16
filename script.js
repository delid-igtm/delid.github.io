(() => {
  const navButtons = document.querySelectorAll('[data-target]');
  const pages = document.querySelectorAll('[data-page]');

  let isAnimating = false;
  const LEAVE_MS = 460; // must match .is-leaving animation duration in CSS

  function getPage(id){
    return document.getElementById(id);
  }

  function goTo(targetId){
    const current = document.querySelector('.page.is-active');
    const target = getPage(targetId);

    if (!target || isAnimating || (current && current.id === targetId)) return;

    isAnimating = true;

    // update nav active state immediately
    navButtons.forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.target === targetId);
    });

    if (current) {
      current.classList.remove('is-active');
      current.classList.add('is-leaving');

      window.setTimeout(() => {
        current.classList.remove('is-leaving');
        current.style.display = 'none';
        enter(target);
      }, LEAVE_MS);
    } else {
      enter(target);
    }
  }

  function enter(target){
    target.style.display = 'block';
    target.classList.add('is-entering');

    const onEnd = () => {
      target.classList.remove('is-entering');
      target.classList.add('is-active');
      target.removeEventListener('animationend', onEnd);
      isAnimating = false;
    };
    target.addEventListener('animationend', onEnd);
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => goTo(btn.dataset.target));
  });

  // simple hash routing so links/back-button behave sensibly (optional, non-breaking)
  window.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && getPage(hash)) {
      goTo(hash);
    }
  });

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      history.replaceState(null, '', '#' + btn.dataset.target);
    });
  });
})();
