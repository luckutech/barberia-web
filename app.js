// Cambia esto por tu backend real (VPS)
const API_BASE = "https://TU-DOMINIO-O-IP/api";

let selectedTime = null;
let lastAvailability = null;

async function fetchJSON(url, options) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function loadCatalog() {
  const services = await fetchJSON(`${API_BASE}/catalog/services`);
  const stylists = await fetchJSON(`${API_BASE}/catalog/stylists`);

  const serviceSel = document.getElementById("service");
  services.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = `${s.name} (${s.durationMinutes} min)`;
    serviceSel.appendChild(opt);
  });

  const stylistSel = document.getElementById("stylist");
  // ANY option
  const any = document.createElement("option");
  any.value = "ANY";
  any.textContent = "Cualquiera disponible";
  stylistSel.appendChild(any);

  stylists.forEach(st => {
    const opt = document.createElement("option");
    opt.value = st.id;
    opt.textContent = st.name;
    stylistSel.appendChild(opt);
  });
}

async function loadAvailability() {
  selectedTime = null;
  document.getElementById("confirm").disabled = true;
  document.getElementById("result").textContent = "";

  const serviceId = document.getElementById("service").value;
  const stylistId = document.getElementById("stylist").value;
  const dateISO = document.getElementById("date").value;

  if (!dateISO) {
    alert("Selecciona un día");
    return;
  }

  const body = { dateISO, serviceId, stylistId: stylistId === "ANY" ? null : stylistId };
  lastAvailability = await fetchJSON(`${API_BASE}/public/availability`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  const timesDiv = document.getElementById("times");
  timesDiv.innerHTML = "";
  if (!lastAvailability.times.length) {
    timesDiv.textContent = "No hay horarios disponibles.";
    return;
  }

  lastAvailability.times.forEach(t => {
    const btn = document.createElement("button");
    btn.textContent = t;
    btn.onclick = () => {
      selectedTime = t;
      document.getElementById("confirm").disabled = false;
      document.getElementById("result").textContent = `Hora seleccionada: ${t}`;
    };
    timesDiv.appendChild(btn);
  });
}

async function confirmBooking() {
  const name = document.getElementById("name").value.trim();
  const phoneE164 = document.getElementById("phone").value.trim();
  const serviceId = document.getElementById("service").value;
  const stylistPreference = document.getElementById("stylist").value;
  const dateISO = document.getElementById("date").value;

  if (!name || !phoneE164 || !selectedTime) {
    alert("Completa nombre, teléfono y selecciona hora.");
    return;
  }

  const payload = {
    name,
    phoneE164,
    serviceId,
    stylistPreference: stylistPreference === "ANY" ? "ANY" : stylistPreference,
    dateISO,
    timeHHmm: selectedTime,
  };

  const res = await fetchJSON(`${API_BASE}/public/bookings`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  // Link para confirmación manual rápida por WhatsApp
  document.getElementById("result").innerHTML =
    `✅ Cita registrada.\n\n` +
    `👉 Confirmar por WhatsApp: <a href="${res.whatsAppConfirmLink}" target="_blank">Abrir WhatsApp</a>`;
}

document.getElementById("load").addEventListener("click", loadAvailability);
document.getElementById("confirm").addEventListener("click", confirmBooking);

loadCatalog().catch(err => alert("Error cargando catálogo: " + err.message));
