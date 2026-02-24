// === CONFIG ===
const OPEN_HH = 10;
const CLOSE_HH = 20;
const SLOT_MIN = 15;

// Simulación de ocupados (luego esto vendrá del backend)
const SIMULATED_BUSY = [
  { start: "11:00", end: "11:45" },
  { start: "13:30", end: "14:30" },
  { start: "17:15", end: "18:00" },
];

// Servicios (luego vendrán del backend)
const SERVICES = [
  { id: "svc1", name: "Corte Clásico", minutes: 45 },
  { id: "svc2", name: "Fade / Degradado", minutes: 60 },
  { id: "svc3", name: "Barba Premium", minutes: 45 },
  { id: "svc4", name: "Corte + Barba Deluxe", minutes: 90 },
  { id: "svc5", name: "Tinte Express", minutes: 90 },
  { id: "svc6", name: "Limpieza Facial", minutes: 30 },
];

const STYLISTS = [
  { id: "any", name: "Cualquiera disponible" },
  { id: "st1", name: "Alejandro" },
  { id: "st2", name: "Mateo" },
  { id: "st3", name: "Diego" },
  { id: "st4", name: "Sebastián" },
];

// === STATE ===
let selectedTime = null;

// === HELPERS ===
function pad(n) { return String(n).padStart(2, "0"); }

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
  // [start,end)
  return aStart < bEnd && aEnd > bStart;
}

function isBusySlot(slotStart, durationMin) {
  const s = timeToMinutes(slotStart);
  const e = s + durationMin;

  return SIMULATED_BUSY.some(b => {
    const bs = timeToMinutes(b.start);
    const be = timeToMinutes(b.end);
    return overlaps(s, e, bs, be);
  });
}

function fitsInBusinessHours(slotStart, durationMin) {
  const s = timeToMinutes(slotStart);
  const e = s + durationMin;
  return e <= CLOSE_HH * 60;
}

function getSelectedService() {
  const id = document.getElementById("service").value;
  return SERVICES.find(s => s.id === id) || SERVICES[0];
}

// === UI RENDER ===
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

function clearSelection() {
  selectedTime = null;
  document.getElementById("confirm").disabled = true;
  document.getElementById("slotHint").textContent = "Selecciona un horario para continuar.";
}

function renderCalendarGrid() {
  clearSelection();

  const dateISO = document.getElementById("date").value;
  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  if (!dateISO) {
    grid.innerHTML = `<div class="empty">Selecciona un día para ver horarios.</div>`;
    return;
  }

  const service = getSelectedService();
  const slots = buildSlots();

  slots.forEach(hhmm => {
    const btn = document.createElement("button");
    btn.className = "slot";
    btn.textContent = hhmm;

    const okHours = fitsInBusinessHours(hhmm, service.minutes);
    const busy = isBusySlot(hhmm, service.minutes);

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
        // Unselect others
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

// === CONFIRM ===
function buildWhatsAppLink(phoneE164, message) {
  // wa.me needs digits only
  const digits = phoneE164.replace(/[^\d]/g, "");
  const text = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${text}`;
}

async function confirmBooking() {
  const name = document.getElementById("name").value.trim();
  const phoneE164 = document.getElementById("phone").value.trim();
  const dateISO = document.getElementById("date").value;
  const stylist = document.getElementById("stylist").selectedOptions[0].textContent;
  const service = getSelectedService();

  if (!name || !phoneE164 || !dateISO || !selectedTime) {
    alert("Completa nombre, teléfono, día y selecciona un horario.");
    return;
  }

  // MVP sin backend: solo muestra link de confirmación por WhatsApp (1 click)
  const msg =
    `Hola ${name} 👋\n` +
    `Tu cita en *Barbería* está registrada:\n` +
    `📅 ${dateISO}\n` +
    `🕒 ${selectedTime}\n` +
    `✂️ ${service.name} (${service.minutes} min)\n` +
    `💈 Estilista: ${stylist}\n\n` +
    `Si necesitas cambiarla, responde a este mensaje.`;

  const link = buildWhatsAppLink(phoneE164, msg);

  document.getElementById("result").innerHTML =
    `✅ Cita registrada (demo).<br><br>` +
    `👉 <a href="${link}" target="_blank">Abrir WhatsApp con confirmación</a>`;
}

// === EVENTS ===
document.getElementById("confirm").addEventListener("click", confirmBooking);
document.getElementById("date").addEventListener("change", renderCalendarGrid);
document.getElementById("service").addEventListener("change", renderCalendarGrid);
document.getElementById("stylist").addEventListener("change", renderCalendarGrid);

// Init
renderCatalog();
renderCalendarGrid();
