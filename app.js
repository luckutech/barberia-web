// === HORARIO NEGOCIO ===
const OPEN_HH = 10;
const CLOSE_HH = 20;
const SLOT_MIN = 15;

// === SERVICIOS (random realistas) ===
const SERVICES = [
  { id: "svc1", name: "Corte Clásico", minutes: 45 },
  { id: "svc2", name: "Fade / Degradado", minutes: 60 },
  { id: "svc3", name: "Barba Premium", minutes: 45 },
  { id: "svc4", name: "Corte + Barba Deluxe", minutes: 90 },
  { id: "svc5", name: "Tinte Express", minutes: 90 },
  { id: "svc6", name: "Limpieza Facial", minutes: 30 },
];

// === ESTILISTAS (ejemplo) ===
const STYLISTS = [
  { id: "any", name: "Cualquiera disponible" },
  { id: "st1", name: "Carlos" },
  { id: "st2", name: "Raul" },
  { id: "st3", name: "Omar" },
  { id: "st4", name: "Tovar" },
];

// === SIMULACIÓN DE OCUPADOS (por día) ===
// Luego esto vendrá del backend: availability
const SIMULATED_BUSY = [
  { start: "11:00", end: "11:45" },
  { start: "13:30", end: "14:30" },
  { start: "17:15", end: "18:00" },
];

let selectedTime = null;

// ---- helpers ----
const pad = (n) => String(n).padStart(2, "0");

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad(h)}:${pad(m)}`;
}

function buildSlots() {
  const start = OPEN_HH * 60;
  const end = CLOSE_HH * 60;
  const out = [];
  for (let t = start; t < end; t += SLOT_MIN) out.push(minutesToTime(t));
  return out;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart; // [start,end)
}

function fitsInBusinessHours(slotStart, durationMin) {
  const s = timeToMinutes(slotStart);
  const e = s + durationMin;
  return e <= CLOSE_HH * 60;
}

function isBusy(slotStart, durationMin) {
  const s = timeToMinutes(slotStart);
  const e = s + durationMin;
  return SIMULATED_BUSY.some(b => {
    const bs = timeToMinutes(b.start);
    const be = timeToMinutes(b.end);
    return overlaps(s, e, bs, be);
  });
}

function getSelectedService() {
  const id = document.getElementById("service").value;
  return SERVICES.find(s => s.id === id) || SERVICES[0];
}

function clearSelection() {
  selectedTime = null;
  document.getElementById("confirm").disabled = true;
  document.getElementById("slotHint").textContent = "Selecciona un horario para continuar.";
  document.getElementById("result").textContent = "";
}

// ---- render catalog ----
function renderCatalog() {
  const serviceSel = document.getElementById("service");
  serviceSel.innerHTML = "";
  SERVICES.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = `${s.name} (${s.minutes} min)`;
    serviceSel.appendChild(opt);
  });

  const stylistSel = document.getElementById("stylist");
  stylistSel.innerHTML = "";
  STYLISTS.forEach(st => {
    const opt = document.createElement("option");
    opt.value = st.id;
    opt.textContent = st.name;
    stylistSel.appendChild(opt);
  });
}

// ---- render slots ----
function renderCalendarGrid() {
  clearSelection();

  const dateISO = document.getElementById("date").value;
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  const service = getSelectedService();
  document.getElementById("durationPill").textContent = `Duración: ${service.minutes} min`;

  if (!dateISO) {
    grid.innerHTML = `<div class="empty">Selecciona un día para ver horarios.</div>`;
    return;
  }

  const slots = buildSlots();

  slots.forEach(hhmm => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slot";
    btn.textContent = hhmm;

    const okHours = fitsInBusinessHours(hhmm, service.minutes);
    const busy = okHours ? isBusy(hhmm, service.minutes) : false;

    if (!okHours) {
      btn.classList.add("disabled");
      btn.disabled = true;
      btn.title = "No alcanza el tiempo para este servicio.";
    } else if (busy) {
      btn.classList.add("busy");
      btn.disabled = true;
      btn.title = "Horario no disponible.";
    } else {
      btn.classList.add("free");
      btn.onclick = () => {
        document.querySelectorAll(".slot.selected").forEach(x => x.classList.remove("selected"));
        btn.classList.add("selected");
        selectedTime = hhmm;
        document.getElementById("confirm").disabled = false;
        document.getElementById("slotHint").textContent =
          `Hora seleccionada: ${hhmm} • Duración: ${service.minutes} min`;
      };
    }

    grid.appendChild(btn);
  });
}

// ---- WhatsApp link (confirmación manual 1 click) ----
function buildWhatsAppLink(phoneE164, message) {
  const digits = phoneE164.replace(/[^\d]/g, "");
  const text = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${text}`;
}

function confirmBooking() {
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const dateISO = document.getElementById("date").value;

  const stylistName = document.getElementById("stylist").selectedOptions[0].textContent;
  const service = getSelectedService();

  if (!name || !phone || !dateISO || !selectedTime) {
    alert("Completa nombre, número, día y selecciona un horario.");
    return;
  }

  const msg =
    `Hola ${name} 👋\n` +
    `Tu cita en *Barbería* está registrada:\n` +
    `📅 ${dateISO}\n` +
    `🕒 ${selectedTime}\n` +
    `✂️ ${service.name} (${service.minutes} min)\n` +
    `💈 Estilista: ${stylistName}\n\n` +
    `Responde a este mensaje si necesitas cambiarla.`;

  const link = buildWhatsAppLink(phone, msg);

  document.getElementById("result").innerHTML =
    `✅ Cita registrada (demo).<br><br>` +
    `👉 <a href="${link}" target="_blank" rel="noopener">Abrir WhatsApp con confirmación</a>`;
}

// ---- events ----
document.getElementById("confirm").addEventListener("click", confirmBooking);
document.getElementById("date").addEventListener("change", renderCalendarGrid);
document.getElementById("service").addEventListener("change", renderCalendarGrid);
document.getElementById("stylist").addEventListener("change", renderCalendarGrid);

// init
renderCatalog();
renderCalendarGrid();
