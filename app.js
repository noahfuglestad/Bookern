const demoServices = [
  { id: "klipp", name: "Konsultasjon", duration: 30, price: "490 kr" },
  { id: "service", name: "Standard time", duration: 45, price: "690 kr" },
  { id: "oppfolging", name: "Oppfølging", duration: 30, price: "390 kr" },
];

const demoCompanies = [
  {
    id: "nord-frisor",
    dbId: null,
    name: "Nord Frisør",
    category: "Frisør",
    place: "Oslo sentrum",
    description: "Klipp, styling og raske konsultasjoner for hverdagen.",
  },
  {
    id: "luna-velvaere",
    dbId: null,
    name: "Luna Velvære",
    category: "Velvære",
    place: "Bergen",
    description: "Rolige behandlinger, oppfølging og personlig pleie.",
  },
  {
    id: "fjord-fysio",
    dbId: null,
    name: "Fjord Fysio",
    category: "Helse",
    place: "Trondheim",
    description: "Fysioterapi, vurdering og korte oppfølgingstimer.",
  },
];

let services = [...demoServices];
let companies = [...demoCompanies];

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
const demoVersion = "4";
const urlParams = new URLSearchParams(window.location.search);
const isEmbed = urlParams.get("embed") === "1";
const initialCompanySlug = urlParams.get("company");
const supabaseConfig = window.BookernConfig ?? {};
const supabaseClient = window.supabase && supabaseConfig.supabaseUrl && supabaseConfig.supabaseAnonKey
  ? window.supabase.createClient(supabaseConfig.supabaseUrl, supabaseConfig.supabaseAnonKey)
  : null;
const usingSupabase = Boolean(supabaseClient);
const intro = document.querySelector("[data-context='booking']");
const introEyebrow = document.querySelector("#introEyebrow");
const introTitle = document.querySelector("#introTitle");
const businessSearch = document.querySelector("#businessSearch");
const companyResults = document.querySelector("#companyResults");
const bookingShell = document.querySelector("[data-booking-shell]");
const serviceList = document.querySelector("#serviceList");
const serviceTitle = document.querySelector("#serviceTitle");
const calendarGrid = document.querySelector("#calendarGrid");
const weekLabel = document.querySelector("#weekLabel");
const selectedSlotEl = document.querySelector("#selectedSlot");
const bookingTitle = document.querySelector("#bookingTitle");
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
let selectedCompany = null;
let selectedSlot = null;
let weekOffset = 0;
let bookings = usingSupabase ? [] : loadDemoBookings();

if (isEmbed) {
  document.body.classList.add("is-embed");
}

function loadDemoBookings() {
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
  if (usingSupabase) return;
  localStorage.setItem(storageKey, JSON.stringify(bookings));
}

function makeBooking(date, time, service, name, contact, note) {
  return {
    id: `${toDateKey(date)}-${time}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: toDateKey(date),
    time,
    serviceId: service.id,
    serviceName: service.name,
    companyId: selectedCompany?.id ?? companies[0].id,
    companyName: selectedCompany?.name ?? companies[0].name,
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
  const companyId = selectedCompany?.id ?? companies[0].id;
  return bookings.some((booking) => {
    const bookingCompanyId = booking.companyId ?? companies[0].id;
    return bookingCompanyId === companyId && booking.date === dateKey && booking.time === time;
  });
}

function normalizeCompany(company) {
  return {
    id: company.slug ?? company.id,
    dbId: company.id,
    name: company.name,
    category: company.category ?? "Bedrift",
    place: company.city ?? company.place ?? "",
    description: company.description ?? "Book ledig tid direkte i Bookern.",
  };
}

function normalizeService(service) {
  return {
    id: service.id,
    name: service.name,
    duration: service.duration_minutes ?? service.duration ?? 30,
    price: service.price_text ?? service.price ?? "",
  };
}

function normalizeBooking(booking) {
  return {
    id: booking.id,
    date: booking.booking_date,
    time: booking.start_time?.slice(0, 5) ?? booking.time,
    serviceId: booking.service_id,
    serviceName: booking.services?.name ?? booking.serviceName ?? "Time",
    companyId: booking.company_id,
    companyName: booking.companies?.name ?? booking.companyName ?? selectedCompany?.name ?? "Bedrift",
    duration: booking.services?.duration_minutes ?? booking.duration ?? 30,
    name: booking.customer_name,
    contact: booking.customer_contact,
    note: booking.note ?? "",
  };
}

async function loadCompaniesFromSupabase() {
  if (!usingSupabase) return;
  const { data, error } = await supabaseClient
    .from("companies")
    .select("id, slug, name, category, city, description")
    .eq("is_published", true)
    .order("name");

  if (error) {
    console.warn("Kunne ikke hente bedrifter fra Supabase", error);
    return;
  }

  companies = data.map(normalizeCompany);
}

async function loadCompanyServices(company) {
  if (!usingSupabase || !company?.dbId) {
    services = [...demoServices];
    selectedService = services[0];
    return;
  }

  const { data, error } = await supabaseClient
    .from("services")
    .select("id, name, duration_minutes, price_text")
    .eq("company_id", company.dbId)
    .eq("is_active", true)
    .order("sort_order");

  if (error || !data?.length) {
    console.warn("Kunne ikke hente tjenester fra Supabase", error);
    services = [...demoServices];
  } else {
    services = data.map(normalizeService);
  }
  selectedService = services[0];
}

async function loadCompanyBookings(company) {
  if (!usingSupabase || !company?.dbId) return;

  const { data, error } = await supabaseClient.rpc("get_booked_slots", {
    target_company_id: company.dbId,
  });

  if (error) {
    console.warn("Kunne ikke hente bookinger fra Supabase", error);
    return;
  }

  bookings = data.map((slot) => ({
    id: `${slot.company_id}-${slot.booking_date}-${slot.start_time}`,
    date: slot.booking_date,
    time: slot.start_time?.slice(0, 5),
    companyId: slot.company_id,
    companyName: company.name,
    serviceName: "Opptatt",
    duration: 30,
    name: "Opptatt",
    contact: "",
    note: "",
  }));
}

async function createSupabaseBooking(booking) {
  const { data, error } = await supabaseClient
    .from("appointments")
    .insert({
      company_id: selectedCompany.dbId,
      service_id: selectedService.id,
      booking_date: booking.date,
      start_time: booking.time,
      customer_name: booking.name,
      customer_contact: booking.contact,
      note: booking.note,
      status: "booked",
    })
    .select("id, booking_date, start_time, customer_name, customer_contact, note, service_id, company_id, services(name, duration_minutes)")
    .single();

  if (error) throw error;
  return normalizeBooking(data);
}

function renderCompanies() {
  const query = businessSearch.value.trim().toLowerCase();
  const results = companies.filter((company) => {
    const haystack = `${company.name} ${company.category} ${company.place}`.toLowerCase();
    return haystack.includes(query);
  });

  companyResults.innerHTML = results.length
    ? results.map((company) => `
        <button class="company-card ${selectedCompany?.id === company.id ? "is-active" : ""}" type="button" data-company="${company.id}">
          <span>${company.category}</span>
          <strong>${company.name}</strong>
          <div class="company-meta">${company.place}</div>
          <p>${company.description}</p>
        </button>
      `).join("")
    : `<div class="empty-state">Ingen bedrifter funnet. Prøv et annet navn, sted eller kategori.</div>`;
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
    selectedSlotEl.textContent = selectedCompany
      ? `Velg en ledig tid hos ${selectedCompany.name}.`
      : "Velg en bedrift før du booker.";
    return;
  }
  selectedSlotEl.textContent = `${selectedCompany.name}: ${selectedService.name}, ${formatFullDate(selectedSlot.date)} kl. ${selectedSlot.time}`;
}

function renderBusinessView() {
  const todayKey = toDateKey(new Date());
  const visibleDayKeys = getVisibleDays().map(toDateKey);
  const companyId = companies[0].id;
  const visibleBookings = bookings
    .filter((booking) => (booking.companyId ?? companyId) === companyId && visibleDayKeys.includes(booking.date))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  todayBookings.textContent = bookings.filter((booking) => (booking.companyId ?? companyId) === companyId && booking.date === todayKey).length;
  weekBookings.textContent = visibleBookings.length;
  weekCapacity.textContent = `${Math.round((visibleBookings.length / (visibleDayKeys.length * times.length)) * 100)}%`;
  businessDayLabel.textContent = formatFullDate(todayKey);

  bookingList.innerHTML = visibleBookings.length
    ? visibleBookings.map(renderBookingItem).join("")
    : `<div class="empty-state">Ingen bookinger i denne uken.</div>`;

  const todayItems = bookings
    .filter((booking) => (booking.companyId ?? companyId) === companyId && booking.date === todayKey)
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
  renderCompanies();
  renderServices();
  renderCalendar();
  renderSelectedSlot();
  renderBusinessView();
  updateBookingCopy();
}

function updateBookingCopy() {
  if (!selectedCompany) {
    introEyebrow.textContent = "Kunde";
    introTitle.textContent = "Søk opp bedriften du vil booke hos.";
    serviceTitle.textContent = "Velg en bedrift først";
    bookingTitle.textContent = "Book valgt time";
    bookingShell.hidden = true;
    return;
  }

  introEyebrow.textContent = `Booking hos ${selectedCompany.name}`;
  introTitle.textContent = `Finn en ledig time hos ${selectedCompany.name}.`;
  serviceTitle.textContent = `Hva vil du booke hos ${selectedCompany.name}?`;
  bookingTitle.textContent = `Book hos ${selectedCompany.name}`;
  bookingShell.hidden = false;
}

function setView(view) {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });

  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== view;
  });

  intro.hidden = view === "home" || view === "business";
  if (view === "customer") {
    updateBookingCopy();
  }
}

async function selectCompany(company) {
  selectedCompany = company;
  await loadCompanyServices(selectedCompany);
  await loadCompanyBookings(selectedCompany);
  selectedSlot = null;
  weekOffset = 0;
  formMessage.textContent = "";
  renderAll();
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

businessSearch.addEventListener("input", renderCompanies);

companyResults.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-company]");
  if (!button) return;
  const company = companies.find((item) => item.id === button.dataset.company);
  await selectCompany(company);
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

bookingForm.addEventListener("submit", async (event) => {
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

  try {
    const storedBooking = usingSupabase && selectedCompany?.dbId
      ? await createSupabaseBooking(booking)
      : booking;
    bookings = [...bookings, storedBooking];
    saveBookings();
  } catch (error) {
    console.error("Kunne ikke lagre booking", error);
    formMessage.textContent = "Kunne ikke lagre timen akkurat nå. Prøv igjen.";
    return;
  }
  bookingForm.reset();
  selectedSlot = null;
  formMessage.textContent = "Timen er booket og lagt inn i bedriftsoversikten.";
  renderAll();
});

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

document.querySelectorAll("[data-view-target]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.viewTarget));
});

document.querySelector("#resetDemo").addEventListener("click", () => {
  if (usingSupabase) {
    formMessage.textContent = "Demo-nullstilling er bare tilgjengelig uten database.";
    return;
  }
  localStorage.removeItem(storageKey);
  localStorage.removeItem(storageVersionKey);
  bookings = loadDemoBookings();
  selectedSlot = null;
  formMessage.textContent = "Demoen er nullstilt.";
  renderAll();
});

async function initialize() {
  await loadCompaniesFromSupabase();
  renderAll();
  if (initialCompanySlug) {
    const company = companies.find((item) => item.id === initialCompanySlug);
    if (company) {
      await selectCompany(company);
    }
  }
  setView(isEmbed ? "customer" : "home");
}

initialize();
