/* ============================================
   YOSEMITE MIST TRAIL — RSVP FORM JS
   ============================================ */

// ⚠️ REPLACE THIS with your Google Apps Script Web App URL after deployment
const SHEETS_WEBHOOK_URL = "/api/rsvp";

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
document.querySelectorAll(".choice-group").forEach((group) => {
  const name = group.dataset.name;
  const buttons = group.querySelectorAll(".choice");
  const hiddenInput = document.getElementById(name);

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
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
document.querySelectorAll(".stepper").forEach((stepper) => {
  const name = stepper.dataset.name;
  const valEl = document.getElementById(`${name}-val`);
  const hiddenInput = document.getElementById(name);
  const min = name === "seats" ? 1 : 0;
  const max = name === "seats" ? 7 : 10;

  stepper.querySelectorAll(".step-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      let val = state[name];
      if (action === "inc" && val < max) val++;
      if (action === "dec" && val > min) val--;
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
  const conditional = document.getElementById("conditional-section");
  const driverDetails = document.getElementById("driver-details");
  const gasAmount = document.getElementById("gas-amount-field");

  // Main conditional (guest/driving/food)
  if (state.going === "yes" || state.going === "maybe") {
    conditional.classList.remove("conditional-hidden");
    conditional.classList.add("conditional-visible");
  } else {
    conditional.classList.add("conditional-hidden");
    conditional.classList.remove("conditional-visible");
  }

  // Driver details
  if (state.driving === "driving" || state.driving === "either") {
    driverDetails.classList.remove("conditional-hidden");
    driverDetails.classList.add("conditional-visible");
  } else {
    driverDetails.classList.add("conditional-hidden");
    driverDetails.classList.remove("conditional-visible");
  }

  // Gas amount
  if (state.gas === "amount") {
    gasAmount.style.display = "block";
  } else {
    gasAmount.style.display = "none";
  }
}

// ============================================
// FORM SUBMIT
// ============================================
const form = document.getElementById("rsvp-form");
const submitBtn = document.getElementById("submit-btn");
const errorEl = document.getElementById("form-error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.style.display = "none";

  // Validate
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const going = state.going;

  if (!name || !phone || !going) {
    errorEl.textContent = "Please fill in your name, phone, and RSVP.";
    errorEl.style.display = "block";
    return;
  }

  // Build payload
  const payload = {
    timestamp: new Date().toISOString(),
    name,
    phone,
    going,
    guests: state.guests,
    driving: state.driving || "",
    seats:
      state.driving === "driving" || state.driving === "either"
        ? state.seats
        : "",
    gas: state.gas || "",
    gasAmount: document.getElementById("gas-amount").value || "",
    food: document.getElementById("food").value.trim(),
    dietary: document.getElementById("dietary").value.trim(),
    notes: document.getElementById("notes").value.trim(),
  };

  // Submit
  submitBtn.disabled = true;
  submitBtn.classList.add("loading");

  try {
    const res = await fetch(SHEETS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Submission failed");

    // Refresh going list, show success
    await loadGoingList();
    showSuccessModal(payload);
    form.reset();
    state.going = null;
    state.driving = null;
    state.gas = null;
    state.guests = 0;
    state.seats = 3;
    document
      .querySelectorAll(".choice.selected")
      .forEach((b) => b.classList.remove("selected"));
    document.getElementById("guests-val").textContent = "0";
    document.getElementById("seats-val").textContent = "3";
    handleConditionalSections();
  } catch (err) {
    console.error(err);
    errorEl.textContent =
      "Something went wrong. Try again or text the organizer.";
    errorEl.style.display = "block";
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove("loading");
  }
});

// ============================================
// LOAD GOING LIST — fetches RSVPs then hands off to renderGoing()
// ============================================
async function loadGoingList() {
  try {
    const res = await fetch(SHEETS_WEBHOOK_URL);
    if (!res.ok) throw new Error("Failed to load");
    const data = await res.json();
    renderGoing(data.entries || []);
  } catch (err) {
    console.error("Failed to load going list:", err);
    // Show a soft fallback message in the empty-state slot
    const emptyEl = document.getElementById("going-empty");
    if (emptyEl) {
      emptyEl.textContent =
        "Couldn't load the crew list. Refresh to try again.";
      emptyEl.style.display = "block";
    }
    // Hide groups in case stale content is showing
    ["going-drivers-group", "going-riders-group", "going-maybes-group"].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (el) el.hidden = true;
      },
    );
  }
}

// ============================================
// RENDER GOING SECTION
// Splits RSVPs into Drivers / Riders / Maybes,
// computes headline stats, paints the DOM.
// ============================================
function renderGoing(rsvps) {
  const list = Array.isArray(rsvps) ? rsvps : [];
  const attending = list.filter(
    (r) => r.going === "yes" || r.going === "maybe",
  );

  // Bucket. Only confirmed drivers (going=yes + driving=driving) get a car card.
  // "either" stays in riders until they commit.
  const drivers = attending.filter(
    (r) => r.going === "yes" && r.driving === "driving",
  );
  const riders = attending.filter(
    (r) => r.going === "yes" && r.driving !== "driving",
  );
  const maybes = attending.filter((r) => r.going === "maybe");

  // Stats
  const guestCount = (r) => parseInt(r.guests) || 0;
  const totalGoing = attending
    .filter((r) => r.going === "yes")
    .reduce((sum, r) => sum + 1 + guestCount(r), 0);
  const totalSeats = drivers.reduce(
    (sum, d) => sum + (parseInt(d.seats) || 0),
    0,
  );
  const ridersNeedingSeat = riders.reduce(
    (sum, r) => sum + 1 + guestCount(r),
    0,
  );
  const seatsOpen = Math.max(0, totalSeats - ridersNeedingSeat);

  setText("stat-seats", seatsOpen);
  setText("stat-drivers", drivers.length);
  setText("stat-going", totalGoing);

  // Empty state
  const emptyEl = document.getElementById("going-empty");
  emptyEl.style.display = attending.length === 0 ? "block" : "none";
  if (attending.length === 0) emptyEl.textContent = "Be the first to RSVP →";

  // Drivers
  const driversGroup = document.getElementById("going-drivers-group");
  const driverGrid = document.getElementById("driver-grid");
  driverGrid.innerHTML = "";
  if (drivers.length === 0) {
    driversGroup.hidden = true;
  } else {
    driversGroup.hidden = false;
    // Sort by total seats desc — most capacity first
    const sorted = [...drivers].sort(
      (a, b) => (parseInt(b.seats) || 0) - (parseInt(a.seats) || 0),
    );
    sorted.forEach((d) => driverGrid.appendChild(buildDriverCard(d)));
  }

  // Riders
  const ridersGroup = document.getElementById("going-riders-group");
  const riderChips = document.getElementById("rider-chips");
  riderChips.innerHTML = "";
  if (riders.length === 0) {
    ridersGroup.hidden = true;
  } else {
    ridersGroup.hidden = false;
    setText("riders-count", riders.length);
    riders.forEach((r) => riderChips.appendChild(buildPill(r, false)));
  }

  // Maybes
  const maybesGroup = document.getElementById("going-maybes-group");
  const maybeChips = document.getElementById("maybe-chips");
  maybeChips.innerHTML = "";
  if (maybes.length === 0) {
    maybesGroup.hidden = true;
  } else {
    maybesGroup.hidden = false;
    setText("maybes-count", maybes.length);
    maybes.forEach((r) => maybeChips.appendChild(buildPill(r, true)));
  }
}

function buildDriverCard(d) {
  const seats = parseInt(d.seats) || 0;
  // Until you build rider-to-driver assignment, all seats show as open.
  // When you're ready, compute `taken` from your assignment data.
  const taken = 0;
  const open = seats - taken;
  const isFull = open <= 0;

  const dots = Array.from({ length: seats }, (_, i) =>
    i < taken
      ? '<span class="seat-dot"></span>'
      : '<span class="seat-dot empty"></span>',
  ).join("");

  // Gas display from the form's gas/gasAmount fields
  let priceHtml = "";
  if (d.gas === "treat") {
    priceHtml = '<span class="driver-price free">Free</span>';
  } else if (d.gas === "split") {
    priceHtml = '<span class="driver-price split">Split gas</span>';
  } else if (d.gas === "amount" && d.gasAmount) {
    priceHtml = `<span class="driver-price">$${parseInt(d.gasAmount)}<span class="driver-price-unit"> / seat</span></span>`;
  }

  const guests = guestCountSafe(d);
  const guestHtml =
    guests > 0
      ? `<span class="driver-name-guest">+${guests} guest${guests > 1 ? "s" : ""}</span>`
      : "";

  const seatsLabel = isFull
    ? '<span class="driver-seats-label full-label">Full</span>'
    : `<span class="driver-seats-label">${open} seat${open === 1 ? "" : "s"} open</span>`;

  const card = document.createElement("div");
  card.className = "driver-card" + (isFull ? " full" : "");
  card.innerHTML = `
    <div class="driver-card-head">
      <span class="driver-name">${escapeHtml(d.name)}${guestHtml}</span>
      ${priceHtml}
    </div>
    <div class="driver-card-foot">
      <div class="seat-dots">${dots}</div>
      ${seatsLabel}
    </div>
  `;
  return card;
}

function buildPill(person, isMaybe) {
  const guests = guestCountSafe(person);
  const pill = document.createElement("span");
  pill.className = "going-pill" + (isMaybe ? " maybe" : "");
  const guestText =
    guests > 0
      ? `<span class="going-pill-guest">+${guests} guest${guests > 1 ? "s" : ""}</span>`
      : "";
  pill.innerHTML = `${escapeHtml(person.name)}${guestText}`;
  return pill;
}

function guestCountSafe(r) {
  return parseInt(r.guests) || 0;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ============================================
// SUCCESS MODAL
// ============================================
function showSuccessModal(payload) {
  const modal = document.getElementById("success-modal");
  const subtitle = document.getElementById("modal-subtitle");
  const modalGoingList = document.getElementById("modal-going-list");
  const modalGoing = document.getElementById("modal-going");

  if (payload.going === "no") {
    subtitle.textContent =
      "Bummer you can't make it. We'll catch you on the next one.";
    modalGoing.style.display = "none";
  } else {
    if (payload.going === "maybe") {
      subtitle.textContent =
        "Cool, we'll keep you posted. Lock it in when you know.";
    } else {
      subtitle.textContent =
        "See you at 3:30 AM. I'll text you the meetup address and group chat invite within 24 hr.";
    }
    modalGoing.style.display = "block";

    // Build a compact roster for the modal (skip the big stat block)
    modalGoingList.innerHTML = buildModalRoster();
  }

  modal.style.display = "flex";
}

function buildModalRoster() {
  const driversGroup = document.getElementById("going-drivers-group");
  const ridersGroup = document.getElementById("going-riders-group");
  const maybesGroup = document.getElementById("going-maybes-group");

  const parts = [];
  if (driversGroup && !driversGroup.hidden) parts.push(driversGroup.outerHTML);
  if (ridersGroup && !ridersGroup.hidden) parts.push(ridersGroup.outerHTML);
  if (maybesGroup && !maybesGroup.hidden) parts.push(maybesGroup.outerHTML);

  return (
    parts.join("") ||
    "<p style=\"font-style:italic;color:var(--ink-muted);font-size:13px;\">No one else has RSVP'd yet — you're first!</p>"
  );
}

document.getElementById("modal-close").addEventListener("click", () => {
  document.getElementById("success-modal").style.display = "none";
});

document.getElementById("success-modal").addEventListener("click", (e) => {
  if (e.target.id === "success-modal") {
    document.getElementById("success-modal").style.display = "none";
  }
});

// ============================================
// HELPERS
// ============================================
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================
// INITIAL LOAD
// ============================================
loadGoingList();

// Refresh going list every 30s in case others RSVP while page is open
setInterval(loadGoingList, 30000);
