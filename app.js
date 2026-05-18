const services = [
  { id: "klipp", name: "Konsultasjon", duration: 30, price: "490 kr" },
  { id: "service", name: "Standard time", duration: 45, price: "690 kr" },
  { id: "oppfolging", name: "Oppfølging", duration: 30, price: "390 kr" },
];

const times = ["09:00", "10:00", "11:00", "12:30", "13:30", "14:30", "15:30"];
const dayNames = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];
const monthNames = [
  "januar",
  "februar",
  "mars",
  "april",
  "mai",
  "juni",
  "juli",
  "august",
  "september",
  "oktober",
  "november",
  "desember",
];

const storageKey = "bookern-bookings";
const storageVersionKey = "bookern-demo-version";
const demoVersion = "2";
const serviceList = document.querySelector("#serviceList");
const calendarGrid = document.querySelector("#calendarGrid");
const weekLabel = document.querySelector("#weekLabel");
const selectedSlotEl = document.querySelector("#selectedSlot");
const bookingForm = document.querySelector("#bookingForm");
const formMessage = document.querySelector("#formMessage");
const openSlotsCount = document.querySelector("#openSlotsCount");
const bookingList = document.querySelector("#bookingList");
const timeline = document.querySelector("#timeline");
const todayBookings = document.querySelector("#todayBookings");
const weekBookings = document.querySelector("#weekBookings");
const weekCapacity = document.querySelector("#weekCapacity");
const businessDayLabel = document.querySelector("#businessDayLabel");

let selectedService = services[0];
let selectedSlot = null;
let weekOffset = 0;
let bookings = loadBookings();

function loadBookings() {
  const saved = localStorage.getItem(storageKey);
  const savedVersion = localStorage.getItem(storageVersionKey);
  if (saved && savedVersion === demoVersion) {
    return JSON.parse(saved);
  }

  const start = getWeekStart(new Date());
  const demo = [
    makeBooking(addDays(start, 1), "10:00", services[1], "Sara Nilsen", "sara@example.no", "Første møte"),
    makeBooking(addDays(start, 2), "13:30", services[0], "Jonas Berg", "jonas@example.no", ""),
    makeBooking(addDays(start, 4), "09:00", services[2], "Mina Holm", "mina@example.no", "Ring ved ankomst"),
  ];
  localStorage.setItem(storageKey, JSON.stringify(demo));
  localStorage.setItem(storageVersionKey, demoVersion);
  return demo;
}

function saveBookings() {
  localStorage.setItem(storageKey, JSON.stringify(bookings));
}

function makeBooking(date, time, service, name, contact, note) {
  return {
    id: `${toDateKey(date)}-${time}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: toDateKey(date),
    time,
    serviceId: service.id,
    serviceName: service.name,
    duration: service.duration,
    name,
    contact,
    note,
  };
}

function getWeekStart(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(date) {
  return `${date.getDate()}. ${monthNames[date.getMonth()]}`;
}

function formatFullDate(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`);
  return `${dayNames[date.getDay()]} ${formatDate(date)}`;
}

function getVisibleDays() {
  const start = addDays(getWeekStart(new Date()), weekOffset * 7);
  return Array.from({ length: 5 }, (_, index) => addDays(start, index));
}

function isBooked(dateKey, time) {
  return bookings.some((booking) => booking.date === dateKey && booking.time === time);
}

function renderServices() {
  serviceList.innerHTML = services
    .map((service) => `
      <button class="service-option ${service.id === selectedService.id ? "is-active" : ""}" type="button" data-service="${service.id}">
        <strong>${service.name}</strong>
        <span>${service.duration} min · ${service.price}</span>
      </button>
    `)
    .join("");
}

function renderCalendar() {
  const days = getVisibleDays();
  weekLabel.textContent = `${formatDate(days[0])} - ${formatDate(days[4])}`;

  calendarGrid.innerHTML = days
    .map((day) => {
      const dateKey = toDateKey(day);
      const slotButtons = times
        .map((time) => {
          const booked = isBooked(dateKey, time);
          const selected = selectedSlot?.date === dateKey && selectedSlot?.time === time;
          return `
            <button class="slot-button ${booked ? "is-booked" : ""} ${selected ? "is-selected" : ""}" type="button" data-date="${dateKey}" data-time="${time}" onclick="selectSlot('${dateKey}', '${time}')" ${booked ? "disabled" : ""}>
              <strong>${time}</strong>
              <span>${booked ? "Opptatt" : `${selectedService.duration} min ledig`}</span>
            </button>
          `;
        })
        .join("");

      return `
        <div class="day-column">
          <div class="day-header">
            <strong>${dayNames[day.getDay()]}</strong>
            <span>${formatDate(day)}</span>
          </div>
          ${slotButtons}
        </div>
      `;
    })
    .join("");

  const openSlots = days.reduce((total, day) => {
    const dateKey = toDateKey(day);
    return total + times.filter((time) => !isBooked(dateKey, time)).length;
  }, 0);
  openSlotsCount.textContent = openSlots;

}

function renderSelectedSlot() {
  if (!selectedSlot) {
    selectedSlotEl.textContent = "Velg en ledig tid i kalenderen.";
    return;
  }
  selectedSlotEl.textContent = `${selectedService.name}, ${formatFullDate(selectedSlot.date)} kl. ${selectedSlot.time}`;
}

function renderBusinessView() {
  const todayKey = toDateKey(new Date());
  const visibleDayKeys = getVisibleDays().map(toDateKey);
  const visibleBookings = bookings
    .filter((booking) => visibleDayKeys.includes(booking.date))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  todayBookings.textContent = bookings.filter((booking) => booking.date === todayKey).length;
  weekBookings.textContent = visibleBookings.length;
  weekCapacity.textContent = `${Math.round((visibleBookings.length / (visibleDayKeys.length * times.length)) * 100)}%`;
  businessDayLabel.textContent = formatFullDate(todayKey);

  bookingList.innerHTML = visibleBookings.length
    ? visibleBookings.map(renderBookingItem).join("")
    : `<div class="empty-state">Ingen bookinger i denne uken.</div>`;

  const todayItems = bookings
    .filter((booking) => booking.date === todayKey)
    .sort((a, b) => a.time.localeCompare(b.time));

  timeline.innerHTML = todayItems.length
    ? todayItems.map(renderTimelineItem).join("")
    : `<div class="empty-state">Ingen bookinger i dag.</div>`;
}

function renderBookingItem(booking) {
  return `
    <article class="booking-item">
      <strong>${booking.time} · ${booking.serviceName}</strong>
      <span class="booking-meta">${formatFullDate(booking.date)} · ${booking.name} · ${booking.contact}</span>
      ${booking.note ? `<p class="booking-note">${booking.note}</p>` : ""}
    </article>
  `;
}

function renderTimelineItem(booking) {
  return `
    <article class="timeline-item">
      <strong>${booking.time} - ${booking.name}</strong>
      <span class="booking-meta">${booking.serviceName}, ${booking.duration} min</span>
    </article>
  `;
}

function renderAll() {
  renderServices();
  renderCalendar();
  renderSelectedSlot();
  renderBusinessView();
}

window.selectSlot = function selectSlot(date, time) {
  selectedSlot = { date, time };
  formMessage.textContent = "";
  renderAll();
};

serviceList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-service]");
  if (!button) return;
  selectedService = services.find((service) => service.id === button.dataset.service);
  selectedSlot = null;
  formMessage.textContent = "";
  renderAll();
});

document.querySelector("#prevWeek").addEventListener("click", () => {
  weekOffset -= 1;
  selectedSlot = null;
  renderAll();
});

document.querySelector("#nextWeek").addEventListener("click", () => {
  weekOffset += 1;
  selectedSlot = null;
  renderAll();
});

bookingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!selectedSlot) {
    formMessage.textContent = "Velg en ledig tid først.";
    return;
  }

  const formData = new FormData(bookingForm);
  const booking = makeBooking(
    new Date(`${selectedSlot.date}T12:00:00`),
    selectedSlot.time,
    selectedService,
    formData.get("customerName").trim(),
    formData.get("customerContact").trim(),
    formData.get("customerNote").trim(),
  );

  bookings = [...bookings, booking];
  saveBookings();
  bookingForm.reset();
  selectedSlot = null;
  formMessage.textContent = "Timen er booket og lagt inn i bedriftsoversikten.";
  renderAll();
});

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-view]").forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    document.querySelectorAll("[data-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== button.dataset.view;
    });
  });
});

document.querySelector("#resetDemo").addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  localStorage.removeItem(storageVersionKey);
  bookings = loadBookings();
  selectedSlot = null;
  formMessage.textContent = "Demoen er nullstilt.";
  renderAll();
});

renderAll();
