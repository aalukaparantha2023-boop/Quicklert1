const STORAGE_KEY = 'quicklert.alerts.v1';

const state = {
  filter: 'all',
  alerts: loadAlerts(),
};

const elements = {
  titleInput: document.getElementById('titleInput'),
  messageInput: document.getElementById('messageInput'),
  priorityInput: document.getElementById('priorityInput'),
  addButton: document.getElementById('addButton'),
  clearDoneButton: document.getElementById('clearDoneButton'),
  alertList: document.getElementById('alertList'),
  totalAlerts: document.getElementById('total-alerts'),
  openAlerts: document.getElementById('open-alerts'),
  countAll: document.getElementById('count-all'),
  countUrgent: document.getElementById('count-urgent'),
  countNormal: document.getElementById('count-normal'),
  countDone: document.getElementById('count-done'),
  navItems: Array.from(document.querySelectorAll('.nav-item')),
};

function loadAlerts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to parse saved alerts:', error);
    return [];
  }
}

function saveAlerts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.alerts));
}

function createAlert(title, message, priority) {
  return {
    id: Date.now() + Math.random().toString(16).slice(2),
    title: title.trim() || 'Untitled alert',
    message: message.trim(),
    priority,
    done: false,
    createdAt: new Date().toISOString(),
  };
}

function getFilteredAlerts() {
  switch (state.filter) {
    case 'urgent':
      return state.alerts.filter((alert) => alert.priority === 'urgent' && !alert.done);
    case 'normal':
      return state.alerts.filter((alert) => alert.priority === 'normal' && !alert.done);
    case 'done':
      return state.alerts.filter((alert) => alert.done);
    case 'all':
    default:
      return state.alerts;
  }
}

function updateSummary() {
  const total = state.alerts.length;
  const open = state.alerts.filter((alert) => !alert.done).length;
  const urgent = state.alerts.filter((alert) => alert.priority === 'urgent' && !alert.done).length;
  const normal = state.alerts.filter((alert) => alert.priority === 'normal' && !alert.done).length;
  const done = state.alerts.filter((alert) => alert.done).length;

  elements.totalAlerts.textContent = String(total);
  elements.openAlerts.textContent = String(open);
  elements.countAll.textContent = String(total);
  elements.countUrgent.textContent = String(urgent);
  elements.countNormal.textContent = String(normal);
  elements.countDone.textContent = String(done);
}

function renderAlerts() {
  const alerts = getFilteredAlerts();

  if (!alerts.length) {
    elements.alertList.innerHTML = `
      <div class="empty-state">
        No alerts in this view yet.<br />
        Add a new task to get started.
      </div>
    `;
    updateSummary();
    return;
  }

  elements.alertList.innerHTML = alerts
    .map((alert) => {
      const priorityClass = alert.priority === 'urgent' ? 'urgent' : 'normal';
      const badgeText = alert.priority === 'urgent' ? 'Urgent' : 'Normal';
      const doneClass = alert.done ? 'done' : '';

      return `
        <article class="alert-item ${priorityClass} ${doneClass}" data-id="${alert.id}">
          <span class="priority-badge" aria-label="Priority ${alert.priority}"></span>
          <div class="alert-text">
            <h4>${escapeHtml(alert.title)}</h4>
            ${alert.message ? `<p>${escapeHtml(alert.message)}</p>` : ''}
            <div class="meta-row">
              <span class="meta-tag ${alert.priority === 'urgent' ? 'urgent' : ''}">${badgeText}</span>
              <span class="meta-tag">${alert.done ? 'Completed' : 'Open'}</span>
            </div>
          </div>
          <div class="alert-actions">
            <button class="icon-btn check" type="button" data-action="toggle" data-id="${alert.id}" aria-label="Toggle completion">
              ${alert.done ? '↺' : '✓'}
            </button>
            <button class="icon-btn delete" type="button" data-action="delete" data-id="${alert.id}" aria-label="Delete alert">
              ✕
            </button>
          </div>
        </article>
      `;
    })
    .join('');

  updateSummary();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function addAlert() {
  const title = elements.titleInput.value.trim();
  const message = elements.messageInput.value.trim();
  const priority = elements.priorityInput.value;

  if (!title && !message) {
    elements.titleInput.focus();
    return;
  }

  const alert = createAlert(title || 'New alert', message, priority);
  state.alerts.unshift(alert);
  saveAlerts();
  renderAlerts();

  elements.titleInput.value = '';
  elements.messageInput.value = '';
  elements.priorityInput.value = 'normal';
  elements.titleInput.focus();
}

function toggleAlert(id) {
  state.alerts = state.alerts.map((alert) =>
    alert.id === id ? { ...alert, done: !alert.done } : alert
  );
  saveAlerts();
  renderAlerts();
}

function deleteAlert(id) {
  state.alerts = state.alerts.filter((alert) => alert.id !== id);
  saveAlerts();
  renderAlerts();
}

function clearCompleted() {
  state.alerts = state.alerts.filter((alert) => !alert.done);
  saveAlerts();
  renderAlerts();
}

function updateFilter(selectedFilter) {
  state.filter = selectedFilter;

  elements.navItems.forEach((item) => {
    const active = item.dataset.filter === selectedFilter;
    item.classList.toggle('active', active);
  });

  renderAlerts();
}

function bindEvents() {
  elements.addButton.addEventListener('click', addAlert);

  elements.titleInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      addAlert();
    }
  });

  elements.clearDoneButton.addEventListener('click', clearCompleted);

  elements.navItems.forEach((item) => {
    item.addEventListener('click', () => updateFilter(item.dataset.filter));
  });

  elements.alertList.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target) return;

    const { action, id } = target.dataset;
    if (!action || !id) return;

    if (action === 'toggle') toggleAlert(id);
    if (action === 'delete') deleteAlert(id);
  });
}

function bootstrap() {
  bindEvents();
  updateFilter('all');
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}

bootstrap();
