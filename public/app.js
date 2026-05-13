/* ============================================
   YOSEMITE MIST TRAIL — RSVP FORM JS
   ============================================ */

// ⚠️ REPLACE THIS with your Google Apps Script Web App URL after deployment
const SHEETS_WEBHOOK_URL = '/api/rsvp';

// State
const state = {
  going: null,
  driving: null,
  gas: null,
  guests: 0,
  seats: 3,
};

// ============================================
// CHOICE BUTTONS (Yes/No/Maybe, driving, gas)
// ============================================
document.querySelectorAll('.choice-group').forEach(group => {
  const name = group.dataset.name;
  const buttons = group.querySelectorAll('.choice');
  const hiddenInput = document.getElementById(name);

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const value = btn.dataset.value;
      state[name] = value;
      if (hiddenInput) hiddenInput.value = value;
      handleConditionalSections();
    });
  });
});

// ============================================
// STEPPERS (guests, seats)
// ============================================
document.querySelectorAll('.stepper').forEach(stepper => {
  const name = stepper.dataset.name;
  const valEl = document.getElementById(`${name}-val`);
  const hiddenInput = document.getElementById(name);
  const min = name === 'seats' ? 1 : 0;
  const max = name === 'seats' ? 7 : 10;

  stepper.querySelectorAll('.step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      let val = state[name];
      if (action === 'inc' && val < max) val++;
      if (action === 'dec' && val > min) val--;
      state[name] = val;
      valEl.textContent = val;
      hiddenInput.value = val;
    });
  });
});

// ============================================
// CONDITIONAL SECTIONS
// Show guest/driving/food fields only if going = yes or maybe
// Show driver details only if driving = driving or either
// Show gas amount only if gas = amount
// ============================================
function handleConditionalSections() {
  const conditional = document.getElementById('conditional-section');
  const driverDetails = document.getElementById('driver-details');
  const gasAmount = document.getElementById('gas-amount-field');

  // Main conditional (guest/driving/food)
  if (state.going === 'yes' || state.going === 'maybe') {
    conditional.classList.remove('conditional-hidden');
    conditional.classList.add('conditional-visible');
  } else {
    conditional.classList.add('conditional-hidden');
    conditional.classList.remove('conditional-visible');
  }

  // Driver details
  if (state.driving === 'driving' || state.driving === 'either') {
    driverDetails.classList.remove('conditional-hidden');
    driverDetails.classList.add('conditional-visible');
  } else {
    driverDetails.classList.add('conditional-hidden');
    driverDetails.classList.remove('conditional-visible');
  }

  // Gas amount
  if (state.gas === 'amount') {
    gasAmount.style.display = 'block';
  } else {
    gasAmount.style.display = 'none';
  }
}

// ============================================
// FORM SUBMIT
// ============================================
const form = document.getElementById('rsvp-form');
const submitBtn = document.getElementById('submit-btn');
const errorEl = document.getElementById('form-error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.style.display = 'none';

  // Validate
  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const going = state.going;

  if (!name || !phone || !going) {
    errorEl.textContent = 'Please fill in your name, phone, and RSVP.';
    errorEl.style.display = 'block';
    return;
  }

  // Build payload
  const payload = {
    timestamp: new Date().toISOString(),
    name,
    phone,
    going,
    guests: state.guests,
    driving: state.driving || '',
    seats: (state.driving === 'driving' || state.driving === 'either') ? state.seats : '',
    gas: state.gas || '',
    gasAmount: document.getElementById('gas-amount').value || '',
    food: document.getElementById('food').value.trim(),
    dietary: document.getElementById('dietary').value.trim(),
    notes: document.getElementById('notes').value.trim(),
  };

  // Submit
  submitBtn.disabled = true;
  submitBtn.classList.add('loading');

  try {
    const res = await fetch(SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Submission failed');

    // Refresh going list, show success
    await loadGoingList();
    showSuccessModal(payload);
    form.reset();
    state.going = null;
    state.driving = null;
    state.gas = null;
    state.guests = 0;
    state.seats = 3;
    document.querySelectorAll('.choice.selected').forEach(b => b.classList.remove('selected'));
    document.getElementById('guests-val').textContent = '0';
    document.getElementById('seats-val').textContent = '3';
    handleConditionalSections();

  } catch (err) {
    console.error(err);
    errorEl.textContent = 'Something went wrong. Try again or text the organizer.';
    errorEl.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('loading');
  }
});

// ============================================
// LOAD GOING LIST
// ============================================
async function loadGoingList() {
  const listEl = document.getElementById('going-list');
  try {
    const res = await fetch(SHEETS_WEBHOOK_URL);
    if (!res.ok) throw new Error('Failed to load');
    const data = await res.json();

    if (!data.entries || data.entries.length === 0) {
      listEl.innerHTML = '<div class="going-empty">Be the first to RSVP →</div>';
      return;
    }

    // Show going + maybe, hide nos
    const going = data.entries.filter(e => e.going === 'yes');
    const maybe = data.entries.filter(e => e.going === 'maybe');

    const chips = [];
    going.forEach(e => {
      const guestBadge = e.guests > 0 ? `<span class="guest-badge">+${e.guests}</span>` : '';
      const driverIcon = (e.driving === 'driving' || e.driving === 'either') ? '<span class="driver-icon">🚗</span>' : '';
      chips.push(`<span class="going-chip">${driverIcon}${escapeHtml(e.name)}${guestBadge}</span>`);
    });
    maybe.forEach(e => {
      const guestBadge = e.guests > 0 ? `<span class="guest-badge">+${e.guests}</span>` : '';
      chips.push(`<span class="going-chip maybe">${escapeHtml(e.name)} <small>(maybe)</small>${guestBadge}</span>`);
    });

    // Count totals
    const totalGoing = going.reduce((sum, e) => sum + 1 + (parseInt(e.guests) || 0), 0);
    const drivers = going.filter(e => e.driving === 'driving' || e.driving === 'either').length;
    const totalSeats = going
      .filter(e => e.driving === 'driving' || e.driving === 'either')
      .reduce((sum, e) => sum + (parseInt(e.seats) || 0), 0);

    listEl.innerHTML = chips.join('') + `
      <div class="going-count">
        ${totalGoing} going · ${drivers} ${drivers === 1 ? 'driver' : 'drivers'} · ${totalSeats} open ${totalSeats === 1 ? 'seat' : 'seats'}
      </div>
    `;

  } catch (err) {
    console.error('Failed to load going list:', err);
    listEl.innerHTML = '<div class="going-empty">Couldn\'t load the crew list. Refresh to try again.</div>';
  }
}

// ============================================
// SUCCESS MODAL
// ============================================
function showSuccessModal(payload) {
  const modal = document.getElementById('success-modal');
  const subtitle = document.getElementById('modal-subtitle');
  const modalGoingList = document.getElementById('modal-going-list');

  if (payload.going === 'no') {
    subtitle.textContent = "Bummer you can't make it. We'll catch you on the next one.";
    document.getElementById('modal-going').style.display = 'none';
  } else if (payload.going === 'maybe') {
    subtitle.textContent = "Cool, we'll keep you posted. Lock it in when you know.";
    document.getElementById('modal-going').style.display = 'block';
    modalGoingList.innerHTML = document.getElementById('going-list').innerHTML;
  } else {
    subtitle.textContent = "See you at 3:30 AM. We'll text you the group chat invite.";
    document.getElementById('modal-going').style.display = 'block';
    modalGoingList.innerHTML = document.getElementById('going-list').innerHTML;
  }

  modal.style.display = 'flex';
}

document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('success-modal').style.display = 'none';
});

document.getElementById('success-modal').addEventListener('click', (e) => {
  if (e.target.id === 'success-modal') {
    document.getElementById('success-modal').style.display = 'none';
  }
});

// ============================================
// HELPERS
// ============================================
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================
// INITIAL LOAD
// ============================================
loadGoingList();

// Refresh going list every 30s in case others RSVP while page is open
setInterval(loadGoingList, 30000);
