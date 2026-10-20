/* Local interaction prototype. No receiver, storage of personal data, or network submission. */
(() => {
  'use strict';
  const root = document.querySelector('.everest');
  if (!root || root.dataset.initialized) return;
  root.dataset.initialized = 'true';
  const $ = selector => root.querySelector(selector);
  const all = selector => [...root.querySelectorAll(selector)];
  const sceneKeys = ['construction', 'quarry', 'unpaved', 'winter', 'forestry-agro'];
  const sceneWidths = {construction:1024, quarry:1024, unpaved:1024, winter:998, 'forestry-agro':1280};
  const sceneSources = key => `assets/${key}-640.webp 640w, assets/${key}-${sceneWidths[key]}.webp ${sceneWidths[key]}w`;
  // Warm responsive scenes only near their block and after initial page loading.
  // Keep the image objects alive; decoding ahead avoids the first-click cost.
  const warmedScenes = [];
  let scenesWarmed = false;
  function warmScenes() {
    if (scenesWarmed || navigator.connection?.saveData || /2g/.test(navigator.connection?.effectiveType || '')) return;
    scenesWarmed = true;
    for (const key of sceneKeys) {
      const img = new Image();
      img.fetchPriority = 'low';
      img.sizes = $('#siteImage').sizes;
      img.srcset = sceneSources(key);
      img.src = `assets/${key}-${sceneWidths[key]}.webp`;
      warmedScenes.push(img);
      img.decode?.().catch(() => {});
    }
  }
  function observeScenes() {
    if (!('IntersectionObserver' in window)) { warmScenes(); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        if ('requestIdleCallback' in window) requestIdleCallback(warmScenes, {timeout:1000});
        else setTimeout(warmScenes, 0);
      }
    }, {rootMargin:'300px'});
    observer.observe($('#sites'));
  }
  if (document.readyState === 'complete') observeScenes();
  else window.addEventListener('load', observeScenes, {once:true});
  const tabs = all('[data-site]');
  let chosenSite = '';
  function selectSite(index, focus = false) {
    chosenSite = sites[index].name;
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    $('#siteName').textContent = sites[index].name;
    $('#siteDescription').textContent = sites[index].description;
    $('#siteImage').srcset = sceneSources(sceneKeys[index]);
    $('#siteImage').src = `assets/${sceneKeys[index]}-${sceneWidths[sceneKeys[index]]}.webp`;
    $('#siteImage').alt = `Иллюстрация площадки: ${sites[index].name}`;
    if (focus) tabs[index].focus();
  }
  tabs.forEach((tab, index) => {
    tab.tabIndex = index === 0 ? 0 : -1;
    tab.setAttribute('aria-controls', 'sitePanel');
    tab.id = `siteTab${index}`;
    tab.addEventListener('click', () => selectSite(index));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); selectSite(next, true); }
    });
  });
  const panel = $('.scene');
  panel.id = 'sitePanel';
  panel.setAttribute('role', 'tabpanel');
  panel.setAttribute('aria-labelledby', 'siteName');
  // Track only allowlisted advertising parameters, not arbitrary query values.
  const trackingKeys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','utm_id','yclid','gclid','gbraid','wbraid','_openstat'];
  const params = new URLSearchParams(location.search);
  function setHidden(form, name, value) {
    let input = [...form.elements].find(el => el.name === name && el.type === 'hidden');
    if (!input) { input = document.createElement('input'); input.type = 'hidden'; input.name = name; form.append(input); }
    input.value = value;
  }
  all('form').forEach(form => {
    setHidden(form, 'form_type', form.id === 'requestForm' ? 'request' : 'selection');
    setHidden(form, 'page_url', location.origin + location.pathname);
    for (const key of trackingKeys) setHidden(form, key, (params.get(key) || '').slice(0, 1000));
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      // This is an explicit simulation: no network, queue, or persistent storage.
      const feedback = form.querySelector(form.id === 'requestForm' ? '#requestFeedback' : '#quizFeedback');
      feedback.replaceChildren();
      const title = document.createElement('strong');
      title.textContent = 'Заявка отправлена (демонстрация)';
      const detail = document.createElement('p');
      detail.textContent = 'Это демонстрационная версия. Данные никуда не отправлены: приём заявок ещё не подключён.';
      const again = document.createElement('button');
      again.type = 'button'; again.className = 'btn line'; again.textContent = 'Вернуться к форме';
      again.addEventListener('click', () => { form.classList.remove('demo-complete'); feedback.replaceChildren(); });
      feedback.append(title, detail, again);
      form.classList.add('demo-complete');
      feedback.tabIndex = -1;
      feedback.focus({preventScroll:true});
    });
    form.querySelector('[type="submit"]').disabled = false;
  });
  all('input[name="phone"]').forEach(input => {
    input.addEventListener('input', () => {
      const prefix = input.value.trim().startsWith('+') ? '+' : '';
      input.value = prefix + input.value.replace(/[^0-9]/g, '').slice(0, 11);
    });
    input.addEventListener('blur', () => {
      const digits = input.value.replace(/[^0-9]/g, '');
      if (digits.length === 10) input.value = '+7' + digits;
      else if (digits.length === 11 && /^[78]/.test(digits)) input.value = '+7' + digits.slice(1);
    });
  });
  all('.contact-grid input').forEach(input => {
    const error = document.createElement('small');
    error.className = 'validation-message';
    error.hidden = true;
    error.id = input.closest('form').id + '-' + input.name + '-error';
    input.setAttribute('aria-label', input.closest('label').firstChild.textContent.trim());
    input.setAttribute('aria-describedby', error.id);
    input.after(error);
    input.addEventListener('blur', () => {
      const invalid = !input.checkValidity();
      input.setAttribute('aria-invalid', String(invalid));
      error.hidden = !invalid;
      error.textContent = !invalid ? '' : !input.value ? 'Заполните обязательное поле.' : input.name === 'phone' ? 'Введите +7 и 10 цифр номера.' : input.name === 'email' ? 'Введите почту с @ и доменом: company@mail.ru.' : 'Проверьте значение поля.';
    });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true' && input.checkValidity()) {
        input.setAttribute('aria-invalid', 'false'); error.hidden = true;
      }
    });
  });
  const dialog = $('#requestBox');
  const requestForm = $('#requestForm');
  let returnFocus;
  let previousOverflow = '';
  all('[data-request]').forEach(button => button.addEventListener('click', () => {
    const value = button.dataset.request;
    const model = /^ESR(35|40|50|60)$/.test(value) ? value : '';
    setHidden(requestForm, 'model', model);
    setHidden(requestForm, 'site', chosenSite);
    setHidden(requestForm, 'cta_source', button.closest('section')?.id || (button.closest('.hero-shell') ? 'hero' : 'sticky'));
    $('#requestContext').textContent = [model ? `Модель: EVEREST ${model}` : 'Модель: не выбрана, уточнит менеджер', chosenSite ? `Площадка: ${chosenSite}` : 'Площадка: не выбрана, уточнит менеджер'].filter(Boolean).join(' · ');
    requestForm.classList.remove('demo-complete');
    $('#requestFeedback').textContent = '';
    returnFocus = button;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    $('#requestTitle').focus({preventScroll:true});
  }));
  $('#closeRequest').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    returnFocus?.focus({preventScroll:true});
  });
  // Preserve the approved six questions and existing required flags.
  const quiz = $('#quizForm');
  const steps = [...quiz.querySelectorAll('.question'), $('[data-quiz-contact]')];
  const back = $('#quizBack');
  const next = $('#quizNext');
  let currentStep = 0;
  function renderStep(focus = false) {
    steps.forEach((step, index) => { step.hidden = index !== currentStep; });
    $('#quizProgress').textContent = `Шаг ${currentStep + 1} из ${steps.length}${currentStep === 6 ? ' — контакты' : ''}`;
    back.hidden = currentStep === 0;
    next.hidden = currentStep === steps.length - 1;
    $('#selection').classList.toggle('contacts-step', currentStep === steps.length - 1);
    if (focus && matchMedia('(max-width:650px)').matches) quiz.scrollIntoView({behavior:'instant',block:'start'});
    const heading = steps[currentStep].querySelector('h3') || steps[currentStep];
    heading.tabIndex = -1;
    if (focus) heading.focus({preventScroll:true});
  }
  next.addEventListener('click', () => {
    const invalid = [...steps[currentStep].querySelectorAll('input')].find(input => !input.disabled && !input.checkValidity());
    if (invalid) { invalid.reportValidity(); return; }
    currentStep = Math.min(currentStep + 1, steps.length - 1); renderStep(true);
  });
  back.addEventListener('click', () => { currentStep = Math.max(0, currentStep - 1); renderStep(true); });
  quiz.addEventListener('keydown', event => { if (event.key === 'Enter' && event.target.tagName === 'INPUT') { event.preventDefault(); if (!next.hidden) next.click(); } });
  const other = quiz.elements.namedItem('placeOther');
  function syncOther() {
    const show = quiz.elements.namedItem('place').value === 'другое';
    other.closest('label').hidden = !show; other.disabled = !show;
  }
  quiz.querySelectorAll('[name="place"]').forEach(input => input.addEventListener('change', syncOther));
  setHidden(quiz, 'model', ''); // No unapproved automatic model recommendation.
  setHidden(quiz, 'site', '');
  setHidden(quiz, 'cta_source', 'selection');
  quiz.addEventListener('change', () => setHidden(quiz, 'site', quiz.elements.namedItem('place').value || ''));
  syncOther(); renderStep();
  const stickyBar = $('#stickyBar');
  function syncSticky() { stickyBar.classList.toggle('show', $('.hero-shell').getBoundingClientRect().bottom < 0 && matchMedia('(max-width:650px)').matches); }
  window.addEventListener('scroll', syncSticky, {passive:true});
  window.addEventListener('resize', syncSticky);
  syncSticky();
})();
