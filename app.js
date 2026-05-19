const demoServices = [
  { id: "demo-1", name: "Konsultasjon", duration: 30, price: "490 kr" },
  { id: "demo-2", name: "Standard time", duration: 45, price: "690 kr" },
  { id: "demo-3", name: "Oppfølging", duration: 30, price: "390 kr" },
];

const demoCompanies = [
  {
    id: "demo-bedrift",
    dbId: null,
    name: "Demo Bedrift",
    category: "Tjenester",
    place: "Oslo",
    description: "Eksempel på hvordan widgeten kan se ut på en bedrifts nettside.",
    availableDays: [1, 2, 3, 4, 5],
    availableTimes: ["09:00", "10:00", "11:00", "12:30", "13:30", "14:30", "15:30"],
  },
];

const defaultTimes = ["09:00", "10:00", "11:00", "12:30", "13:30", "14:30", "15:30"];
const defaultDays = [1, 2, 3, 4, 5];
const editableDays = [
  { value: 1, label: "Mandag" },
  { value: 2, label: "Tirsdag" },
  { value: 3, label: "Onsdag" },
  { value: 4, label: "Torsdag" },
  { value: 5, label: "Fredag" },
  { value: 6, label: "Lørdag" },
  { value: 0, label: "Søndag" },
];
const dayNames = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];
const monthNames = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"];

const params = new URLSearchParams(window.location.search);
const isEmbed = params.get("embed") === "1";
const initialCompanySlug = params.get("company");
const initialView = params.get("view");
const supabaseConfig = window.BookernConfig ?? {};
const supabaseClient = window.supabase && supabaseConfig.supabaseUrl && supabaseConfig.supabaseAnonKey
  ? window.supabase.createClient(supabaseConfig.supabaseUrl, supabaseConfig.supabaseAnonKey)
  : null;
const usingSupabase = Boolean(supabaseClient);

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const els = {
  intro: $("[data-context='booking']"),
  introEyebrow: $("#introEyebrow"),
  introTitle: $("#introTitle"),
  businessSearch: $("#businessSearch"),
  companyResults: $("#companyResults"),
  bookingShell: $("[data-booking-shell]"),
  serviceList: $("#serviceList"),
  serviceTitle: $("#serviceTitle"),
  calendarGrid: $("#calendarGrid"),
  weekLabel: $("#weekLabel"),
  selectedSlot: $("#selectedSlot"),
  bookingTitle: $("#bookingTitle"),
  bookingForm: $("#bookingForm"),
  formMessage: $("#formMessage"),
  openSlotsCount: $("#openSlotsCount"),
  bookingList: $("#bookingList"),
  timeline: $("#timeline"),
  bookingDetail: $("#bookingDetail"),
  todayBookings: $("#todayBookings"),
  weekBookings: $("#weekBookings"),
  weekCapacity: $("#weekCapacity"),
  businessDayLabel: $("#businessDayLabel"),
  businessSetupForm: $("#businessSetupForm"),
  businessSetupMessage: $("#businessSetupMessage"),
  embedCompanyName: $("#embedCompanyName"),
  embedCode: $("#embedCode"),
  copyEmbedCode: $("#copyEmbedCode"),
  overviewCompanyName: $("#overviewCompanyName"),
  overviewCompanyMeta: $("#overviewCompanyMeta"),
  ownedCompanySelect: $("#ownedCompanySelect"),
  availabilityDays: $("#availabilityDays"),
  availabilityTimes: $("#availabilityTimes"),
  availabilityMessage: $("#availabilityMessage"),
  availableSlotsCount: $("#availableSlotsCount"),
  authForm: $("#authForm"),
  authEmail: $("#authEmail"),
  authPassword: $("#authPassword"),
  authMessage: $("#authMessage"),
  passwordLengthCheck: $("#passwordLengthCheck"),
  passwordSpecialCheck: $("#passwordSpecialCheck"),
  signupButton: $("#signupButton"),
  loginButton: $("#loginButton"),
  logoutButton: $("#logoutButton"),
  authRequired: $$("[data-auth-required]"),
};

let companies = [...demoCompanies];
let ownedCompanies = [];
let services = [...demoServices];
let bookings = [];
let currentUser = null;
let selectedCompany = null;
let selectedService = services[0];
let selectedSlot = null;
let selectedBookingId = null;
let weekOffset = 0;

if (isEmbed) document.body.classList.add("is-embed");

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function normalizeCompany(company) {
  return {
    id: company.slug ?? company.id,
    dbId: company.id,
    name: company.name,
    category: company.category ?? "Bedrift",
    place: company.city ?? company.place ?? "",
    description: company.description ?? "Book ledig tid direkte i widgeten.",
    availableDays: Array.isArray(company.available_days) && company.available_days.length
      ? company.available_days.map(Number)
      : [...defaultDays],
    availableTimes: Array.isArray(company.available_times) && company.available_times.length
      ? company.available_times
      : [...defaultTimes],
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

function normalizeBooking(booking, company = selectedCompany) {
  return {
    id: booking.id,
    date: booking.booking_date ?? booking.date,
    time: booking.start_time?.slice(0, 5) ?? booking.time,
    serviceId: booking.service_id ?? booking.serviceId,
    serviceName: booking.services?.name ?? booking.serviceName ?? "Time",
    companyId: company?.id ?? booking.companyId,
    companyName: company?.name ?? booking.companyName ?? "Bedrift",
    duration: booking.services?.duration_minutes ?? booking.duration ?? 30,
    name: booking.customer_name ?? booking.name,
    contact: booking.customer_contact ?? booking.contact,
    note: booking.note ?? "",
  };
}

function parseSetupServices(value) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const [name = "", duration = "30 min", price = ""] = line.split(",").map((part) => part.trim());
    return {
      id: `${slugify(name) || "tjeneste"}-${index + 1}`,
      name: name || `Tjeneste ${index + 1}`,
      duration: Number.parseInt(duration, 10) || 30,
      price,
      sortOrder: index + 1,
    };
  });
}

function getWeekStart(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() + (copy.getDay() === 0 ? -6 : 1 - copy.getDay()));
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

function getVisibleDays(company = selectedCompany) {
  const start = addDays(getWeekStart(new Date()), weekOffset * 7);
  const availableDays = company?.availableDays?.length ? company.availableDays : defaultDays;
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
    .filter((date) => availableDays.includes(date.getDay()));
}

function getSupabaseText(error) {
  return [error?.code, error?.message, error?.details, error?.hint].filter(Boolean).join(" ");
}

function friendlySaveError(error) {
  const text = getSupabaseText(error).toLowerCase();
  if (text.includes("row-level security") || text.includes("rls")) {
    return "Supabase stopper lagringen med tilgangsregler. Kjør siste SQL fra supabase/schema.sql, logg ut og inn igjen, og prøv på nytt.";
  }
  if (text.includes("duplicate") || text.includes("unique")) {
    return "Dette bedriftsnavnet finnes allerede. Prøv et litt annet navn, for eksempel med sted eller avdeling.";
  }
  if (text.includes("jwt") || text.includes("auth")) {
    return "Innloggingen er utløpt. Logg ut, logg inn igjen, og prøv å lagre på nytt.";
  }
  return getSupabaseText(error) ? `Kunne ikke lagre bedriften. Supabase sier: ${getSupabaseText(error)}` : "Kunne ikke lagre bedriften akkurat nå.";
}

function authError(error, mode) {
  const text = getSupabaseText(error).toLowerCase();
  if (text.includes("invalid login") || text.includes("invalid_credentials")) return "Feil e-post eller passord.";
  if (text.includes("email not confirmed")) return "E-posten er ikke bekreftet ennå. Sjekk innboksen.";
  if (text.includes("already") || text.includes("registered")) return "Denne e-posten finnes allerede. Prøv å logge inn.";
  if (text.includes("password")) return "Passordet må ha minst 6 tegn og minst 1 spesialtegn.";
  return mode === "login" ? "Kunne ikke logge inn. Prøv igjen." : "Kunne ikke opprette konto. Prøv igjen.";
}

function passwordChecks() {
  const value = els.authPassword.value;
  const hasLength = value.length >= 6;
  const hasSpecial = /[^A-Za-z0-9]/.test(value);
  els.passwordLengthCheck.classList.toggle("is-valid", hasLength);
  els.passwordSpecialCheck.classList.toggle("is-valid", hasSpecial);
  els.passwordLengthCheck.textContent = `${hasLength ? "✓" : "✕"} Minst 6 tegn`;
  els.passwordSpecialCheck.textContent = `${hasSpecial ? "✓" : "✕"} Minst 1 spesialtegn`;
  return hasLength && hasSpecial;
}

async function selectWithDays(table, queryBuilder) {
  const withDays = await queryBuilder(table).select("id, owner_id, slug, name, category, city, description, available_days, available_times");
  if (!withDays.error) return withDays;
  const text = getSupabaseText(withDays.error).toLowerCase();
  if (!text.includes("available_days")) return withDays;
  return queryBuilder(table).select("id, owner_id, slug, name, category, city, description, available_times");
}

async function loadPublicCompanies() {
  if (!usingSupabase) return;
  const { data, error } = await selectWithDays("companies", (table) => supabaseClient
    .from(table)
    .eq("is_published", true)
    .not("owner_id", "is", null)
    .order("name"));
  if (error) {
    console.warn("Kunne ikke hente bedrifter", error);
    return;
  }
  companies = data.map(normalizeCompany);
}

async function loadOwnedCompanies() {
  ownedCompanies = [];
  if (!usingSupabase || !currentUser) return;
  const { data, error } = await selectWithDays("companies", (table) => supabaseClient
    .from(table)
    .eq("owner_id", currentUser.id)
    .order("name"));
  if (error) {
    console.warn("Kunne ikke hente dine bedrifter", error);
    return;
  }
  ownedCompanies = data.map(normalizeCompany);
  companies = [...companies.filter((company) => !ownedCompanies.some((owned) => owned.id === company.id)), ...ownedCompanies]
    .sort((a, b) => a.name.localeCompare(b.name));
  if (!selectedCompany && ownedCompanies.length) await selectCompany(ownedCompanies[0], false);
}

async function loadServices(company) {
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
  services = error || !data?.length ? [...demoServices] : data.map(normalizeService);
  selectedService = services[0];
}

async function loadBookings(company) {
  bookings = [];
  if (!usingSupabase || !company?.dbId) return;
  const isOwner = ownedCompanies.some((owned) => owned.dbId === company.dbId);
  const query = isOwner
    ? supabaseClient
      .from("appointments")
      .select("id, booking_date, start_time, customer_name, customer_contact, note, service_id, services(name, duration_minutes)")
      .eq("company_id", company.dbId)
      .in("status", ["booked", "confirmed"])
      .order("booking_date")
      .order("start_time")
    : supabaseClient.rpc("get_booked_slots", { target_company_id: company.dbId });
  const { data, error } = await query;
  if (error) {
    console.warn("Kunne ikke hente bookinger", error);
    return;
  }
  bookings = isOwner
    ? data.map((booking) => normalizeBooking(booking, company))
    : data.map((slot) => normalizeBooking({
      id: `${slot.company_id}-${slot.booking_date}-${slot.start_time}`,
      booking_date: slot.booking_date,
      start_time: slot.start_time,
      customer_name: "Opptatt",
      customer_contact: "",
      serviceName: "Opptatt",
    }, company));
}

async function selectCompany(company, shouldRender = true) {
  selectedCompany = company;
  selectedSlot = null;
  selectedBookingId = null;
  weekOffset = 0;
  await loadServices(company);
  await loadBookings(company);
  if (shouldRender) renderAll();
}

async function saveCompany(profile, profileServices) {
  const slug = slugify(profile.name);
  if (!slug) throw new Error("Bedriften trenger et navn.");
  if (!usingSupabase) {
    const company = normalizeCompany({ id: slug, slug, ...profile, city: profile.place });
    companies = [company];
    ownedCompanies = [company];
    return company;
  }
  const basePayload = {
    owner_id: currentUser.id,
    slug,
    name: profile.name,
    category: profile.category,
    city: profile.city,
    description: profile.description,
    is_published: true,
    available_days: defaultDays,
    available_times: defaultTimes,
  };
  let companyResult = await supabaseClient
    .from("companies")
    .insert(basePayload)
    .select("id, slug, name, category, city, description, available_days, available_times")
    .single();
  if (companyResult.error && getSupabaseText(companyResult.error).toLowerCase().includes("available_days")) {
    const { available_days: _days, ...fallbackPayload } = basePayload;
    companyResult = await supabaseClient
      .from("companies")
      .insert(fallbackPayload)
      .select("id, slug, name, category, city, description, available_times")
      .single();
  }
  if (companyResult.error) throw companyResult.error;
  const serviceRows = profileServices.map((service) => ({
    company_id: companyResult.data.id,
    name: service.name,
    duration_minutes: service.duration,
    price_text: service.price,
    sort_order: service.sortOrder,
    is_active: true,
  }));
  const { error: servicesError } = await supabaseClient.from("services").insert(serviceRows);
  if (servicesError) throw servicesError;
  const company = normalizeCompany(companyResult.data);
  companies = [...companies.filter((item) => item.id !== company.id), company].sort((a, b) => a.name.localeCompare(b.name));
  ownedCompanies = [...ownedCompanies.filter((item) => item.id !== company.id), company].sort((a, b) => a.name.localeCompare(b.name));
  return company;
}

async function saveAvailability() {
  const company = selectedCompany ?? ownedCompanies[0];
  if (!company) return;
  const availableDays = [...els.availabilityDays.querySelectorAll("input:checked")].map((input) => Number(input.value));
  const availableTimes = [...els.availabilityTimes.querySelectorAll("input:checked")].map((input) => input.value);
  const nextDays = availableDays.length ? availableDays : [...defaultDays];
  const nextTimes = availableTimes.length ? availableTimes : [...defaultTimes];
  els.availabilityMessage.textContent = "Lagrer dager og tider...";
  if (usingSupabase && company.dbId) {
    const { data, error } = await supabaseClient
      .from("companies")
      .update({ available_days: nextDays, available_times: nextTimes })
      .eq("id", company.dbId)
      .select("id, slug, name, category, city, description, available_days, available_times")
      .single();
    if (error) {
      els.availabilityMessage.textContent = "Kunne ikke lagre dagene. Kjør siste SQL i Supabase og prøv igjen.";
      return;
    }
    const updated = normalizeCompany(data);
    selectedCompany = updated;
    ownedCompanies = ownedCompanies.map((item) => item.id === updated.id ? updated : item);
    companies = companies.map((item) => item.id === updated.id ? updated : item);
  } else {
    company.availableDays = nextDays;
    company.availableTimes = nextTimes;
  }
  renderAll();
  els.availabilityMessage.textContent = "Dager og tider er lagret.";
}

function isBooked(date, time) {
  return bookings.some((booking) => booking.date === date && booking.time === time);
}

function embedSnippet(company) {
  if (!company) return "";
  return `<script src="${window.location.origin}/embed.js" data-bookern-business="${company.id}" data-bookern-height="820"></script>`;
}

function renderCompanies() {
  const query = els.businessSearch.value.trim().toLowerCase();
  const results = companies.filter((company) => `${company.name} ${company.category} ${company.place}`.toLowerCase().includes(query));
  els.companyResults.innerHTML = results.length
    ? results.map((company) => `
      <button class="company-card ${selectedCompany?.id === company.id ? "is-active" : ""}" type="button" data-company="${company.id}">
        <span>${company.category}</span>
        <strong>${company.name}</strong>
        <div class="company-meta">${company.place}</div>
        <p>${company.description}</p>
      </button>
    `).join("")
    : `<div class="empty-state">Ingen bedrifter funnet. Dette er helt greit: kundene skal vanligvis bruke widgeten på bedriftens egen nettside.</div>`;
}

function renderServices() {
  els.serviceList.innerHTML = services.map((service) => `
    <button class="service-option ${service.id === selectedService?.id ? "is-active" : ""}" type="button" data-service="${service.id}">
      <strong>${service.name}</strong>
      <span>${service.duration} min · ${service.price}</span>
    </button>
  `).join("");
}

function renderCalendar() {
  const days = getVisibleDays();
  const times = selectedCompany?.availableTimes?.length ? selectedCompany.availableTimes : defaultTimes;
  els.weekLabel.textContent = days.length ? `${formatDate(days[0])} - ${formatDate(days[days.length - 1])}` : "Ingen dager valgt";
  els.calendarGrid.innerHTML = days.map((day) => {
    const date = toDateKey(day);
    return `
      <div class="day-column">
        <div class="day-header">
          <strong>${dayNames[day.getDay()]}</strong>
          <span>${formatDate(day)}</span>
        </div>
        ${times.map((time) => {
          const booked = isBooked(date, time);
          const active = selectedSlot?.date === date && selectedSlot?.time === time;
          return `
            <button class="slot-button ${booked ? "is-booked" : ""} ${active ? "is-selected" : ""}" type="button" data-date="${date}" data-time="${time}" ${booked ? "disabled" : ""}>
              <strong>${time}</strong>
              <span>${booked ? "Opptatt" : `${selectedService?.duration ?? 30} min ledig`}</span>
            </button>
          `;
        }).join("")}
      </div>
    `;
  }).join("");
  els.openSlotsCount.textContent = days.reduce((sum, day) => {
    const date = toDateKey(day);
    return sum + times.filter((time) => !isBooked(date, time)).length;
  }, 0);
}

function renderBookingCopy() {
  if (!selectedCompany) {
    els.introEyebrow.textContent = "Widget-demo";
    els.introTitle.textContent = "Velg en bedrift for å forhåndsvise widgeten.";
    els.serviceTitle.textContent = "Velg bedrift for widgeten";
    els.bookingTitle.textContent = "Book valgt time";
    els.bookingShell.hidden = true;
    els.selectedSlot.textContent = "Velg en bedrift før du booker.";
    return;
  }
  els.introEyebrow.textContent = `Booking hos ${selectedCompany.name}`;
  els.introTitle.textContent = `Finn en ledig time hos ${selectedCompany.name}.`;
  els.serviceTitle.textContent = `Hva vil kunden booke hos ${selectedCompany.name}?`;
  els.bookingTitle.textContent = `Book hos ${selectedCompany.name}`;
  els.bookingShell.hidden = false;
  els.selectedSlot.textContent = selectedSlot
    ? `${selectedService.name}, ${formatFullDate(selectedSlot.date)} kl. ${selectedSlot.time}`
    : `Velg en ledig tid hos ${selectedCompany.name}.`;
}

function renderOverview() {
  const company = selectedCompany ?? ownedCompanies[0] ?? null;
  els.overviewCompanyName.textContent = company?.name ?? "Ingen bedrift valgt";
  els.overviewCompanyMeta.textContent = company ? `${company.category} · ${company.place || "Uten sted"}` : "Logg inn og lagre en bedriftsprofil for å åpne oversikten.";
  els.ownedCompanySelect.innerHTML = ownedCompanies.length
    ? ownedCompanies.map((item) => `<option value="${item.id}" ${company?.id === item.id ? "selected" : ""}>${item.name}</option>`).join("")
    : `<option value="">Ingen bedrift ennå</option>`;
  const days = company?.availableDays?.length ? company.availableDays : defaultDays;
  const times = company?.availableTimes?.length ? company.availableTimes : defaultTimes;
  els.availabilityDays.innerHTML = editableDays.map((day) => `
    <label class="time-toggle day-toggle">
      <input type="checkbox" value="${day.value}" ${days.includes(day.value) ? "checked" : ""} ${company ? "" : "disabled"}>
      <span>${day.label}</span>
    </label>
  `).join("");
  els.availabilityTimes.innerHTML = defaultTimes.map((time) => `
    <label class="time-toggle">
      <input type="checkbox" value="${time}" ${times.includes(time) ? "checked" : ""} ${company ? "" : "disabled"}>
      <span>${time}</span>
    </label>
  `).join("");
  els.embedCompanyName.textContent = company ? `Widget-kode for ${company.name}` : "Velg eller opprett en bedrift for å lage embed-kode.";
  els.embedCode.value = embedSnippet(company);
}

function renderBusinessStats() {
  const company = selectedCompany ?? ownedCompanies[0] ?? companies[0];
  const days = getVisibleDays(company);
  const dayKeys = days.map(toDateKey);
  const today = toDateKey(new Date());
  const times = company?.availableTimes?.length ? company.availableTimes : defaultTimes;
  const visibleBookings = bookings.filter((booking) => dayKeys.includes(booking.date)).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  els.todayBookings.textContent = bookings.filter((booking) => booking.date === today).length;
  els.weekBookings.textContent = visibleBookings.length;
  els.weekCapacity.textContent = `${Math.round((visibleBookings.length / Math.max(1, dayKeys.length * times.length)) * 100)}%`;
  els.availableSlotsCount.textContent = times.length;
  els.businessDayLabel.textContent = formatFullDate(today);
  els.bookingList.innerHTML = visibleBookings.length
    ? visibleBookings.map(renderBookingItem).join("")
    : `<div class="empty-state">Ingen bookinger i denne uken.</div>`;
  const todayItems = bookings.filter((booking) => booking.date === today).sort((a, b) => a.time.localeCompare(b.time));
  els.timeline.innerHTML = todayItems.length
    ? todayItems.map(renderTimelineItem).join("")
    : `<div class="empty-state">Ingen bookinger i dag.</div>`;
  renderBookingDetail();
}

function renderBookingItem(booking) {
  return `
    <button class="booking-item ${selectedBookingId === booking.id ? "is-active" : ""}" type="button" data-booking="${booking.id}">
      <strong>${booking.time} · ${booking.serviceName}</strong>
      <span class="booking-meta">${formatFullDate(booking.date)} · ${booking.name} · ${booking.contact}</span>
      ${booking.note ? `<p class="booking-note">${booking.note}</p>` : ""}
    </button>
  `;
}

function renderTimelineItem(booking) {
  return `
    <button class="timeline-item ${selectedBookingId === booking.id ? "is-active" : ""}" type="button" data-booking="${booking.id}">
      <strong>${booking.time} - ${booking.name}</strong>
      <span class="booking-meta">${booking.serviceName}, ${booking.duration} min</span>
    </button>
  `;
}

function renderBookingDetail() {
  const booking = bookings.find((item) => item.id === selectedBookingId);
  els.bookingDetail.innerHTML = booking ? `
    <div class="detail-row"><span>Kunde</span><strong>${booking.name}</strong></div>
    <div class="detail-row"><span>Tid</span><strong>${formatFullDate(booking.date)} kl. ${booking.time}</strong></div>
    <div class="detail-row"><span>Tjeneste</span><strong>${booking.serviceName}, ${booking.duration} min</strong></div>
    <div class="detail-row"><span>Kontakt</span><strong>${booking.contact || "Ikke lagt inn"}</strong></div>
    <div class="detail-note"><span>Notat</span><p>${booking.note || "Ingen notat på denne bestillingen."}</p></div>
  ` : `<div class="empty-state">Klikk på en bestilling for å se detaljer.</div>`;
}

function renderAuth() {
  const authed = Boolean(currentUser);
  els.authRequired.forEach((section) => {
    section.hidden = usingSupabase && !authed;
  });
  els.authForm.classList.toggle("is-authenticated", authed || !usingSupabase);
  els.logoutButton.hidden = !authed;
  els.loginButton.hidden = authed;
  els.signupButton.hidden = authed;
  els.authEmail.disabled = authed;
  els.authPassword.disabled = authed;
  els.authMessage.textContent = usingSupabase
    ? authed ? `Logget inn som ${currentUser.email}.` : "Logg inn eller opprett konto for å styre dashboardet."
    : "Lokal demo uten innlogging.";
}

function renderAll() {
  renderCompanies();
  renderServices();
  renderCalendar();
  renderBookingCopy();
  renderOverview();
  renderBusinessStats();
  renderAuth();
}

function setView(view) {
  $$("[data-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
  $$("[data-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== view;
  });
  els.intro.hidden = view === "home" || view === "business" || view === "overview";
  if (view === "customer") renderBookingCopy();
}

els.businessSearch.addEventListener("input", renderCompanies);
els.authPassword.addEventListener("input", passwordChecks);
els.companyResults.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-company]");
  if (!button) return;
  await selectCompany(companies.find((company) => company.id === button.dataset.company));
});
els.serviceList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-service]");
  if (!button) return;
  selectedService = services.find((service) => service.id === button.dataset.service);
  selectedSlot = null;
  renderAll();
});
els.calendarGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-date]");
  if (!button || button.disabled) return;
  selectedSlot = { date: button.dataset.date, time: button.dataset.time };
  renderAll();
});
$("#prevWeek").addEventListener("click", () => {
  weekOffset -= 1;
  selectedSlot = null;
  renderAll();
});
$("#nextWeek").addEventListener("click", () => {
  weekOffset += 1;
  selectedSlot = null;
  renderAll();
});
els.ownedCompanySelect.addEventListener("change", async () => {
  const company = ownedCompanies.find((item) => item.id === els.ownedCompanySelect.value);
  if (company) await selectCompany(company);
});
els.availabilityDays.addEventListener("change", saveAvailability);
els.availabilityTimes.addEventListener("change", saveAvailability);
els.bookingList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-booking]");
  if (!button) return;
  selectedBookingId = button.dataset.booking;
  renderBusinessStats();
});
els.timeline.addEventListener("click", (event) => {
  const button = event.target.closest("[data-booking]");
  if (!button) return;
  selectedBookingId = button.dataset.booking;
  renderBusinessStats();
});
$$("[data-scroll-target]").forEach((button) => {
  button.addEventListener("click", () => {
    $(`[data-dashboard-section="${button.dataset.scrollTarget}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
$$("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
$$("[data-view-target]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.viewTarget)));

els.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!usingSupabase) return;
  els.authMessage.textContent = "Logger inn...";
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: els.authEmail.value.trim(),
    password: els.authPassword.value,
  });
  if (error) {
    els.authMessage.textContent = authError(error, "login");
    return;
  }
  currentUser = data.user;
  await loadOwnedCompanies();
  renderAll();
  setView(ownedCompanies.length ? "overview" : "business");
});

els.signupButton.addEventListener("click", async () => {
  if (!usingSupabase) return;
  if (!els.authEmail.value.trim() || !els.authPassword.value) {
    els.authMessage.textContent = "Skriv e-post og passord først.";
    return;
  }
  if (!passwordChecks()) {
    els.authMessage.textContent = "Passordet må ha minst 6 tegn og minst 1 spesialtegn.";
    return;
  }
  els.authMessage.textContent = "Oppretter konto...";
  const { data, error } = await supabaseClient.auth.signUp({
    email: els.authEmail.value.trim(),
    password: els.authPassword.value,
    options: { emailRedirectTo: `${window.location.origin}/?view=overview` },
  });
  if (error) {
    els.authMessage.textContent = authError(error, "signup");
    return;
  }
  currentUser = data.user ?? currentUser;
  await loadOwnedCompanies();
  renderAll();
  setView(ownedCompanies.length ? "overview" : "business");
});

els.logoutButton.addEventListener("click", async () => {
  if (!usingSupabase) return;
  await supabaseClient.auth.signOut();
  currentUser = null;
  ownedCompanies = [];
  selectedCompany = null;
  bookings = [];
  renderAll();
  setView("home");
});

els.businessSetupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (usingSupabase && !currentUser) {
    els.businessSetupMessage.textContent = "Logg inn før du lagrer en bedriftsprofil.";
    return;
  }
  const form = new FormData(els.businessSetupForm);
  const profile = {
    name: form.get("businessName").trim(),
    category: form.get("businessCategory").trim(),
    city: form.get("businessCity").trim(),
    description: form.get("businessDescription").trim(),
  };
  const profileServices = parseSetupServices(form.get("businessServices"));
  if (!profileServices.length) {
    els.businessSetupMessage.textContent = "Legg inn minst én tjeneste.";
    return;
  }
  els.businessSetupMessage.textContent = "Lagrer profilen...";
  try {
    const company = await saveCompany(profile, profileServices);
    await loadOwnedCompanies();
    await selectCompany(company, false);
    els.businessSetupForm.reset();
    els.businessSetupMessage.textContent = `${company.name} er lagret. Widget-koden er klar i oversikten.`;
    renderAll();
    setView("overview");
  } catch (error) {
    console.error("Kunne ikke lagre bedrift", error);
    els.businessSetupMessage.textContent = friendlySaveError(error);
  }
});

els.bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedCompany || !selectedSlot) {
    els.formMessage.textContent = "Velg bedrift og ledig tid først.";
    return;
  }
  const form = new FormData(els.bookingForm);
  const draft = {
    id: `${selectedSlot.date}-${selectedSlot.time}-${Date.now()}`,
    date: selectedSlot.date,
    time: selectedSlot.time,
    serviceId: selectedService.id,
    serviceName: selectedService.name,
    companyId: selectedCompany.id,
    companyName: selectedCompany.name,
    duration: selectedService.duration,
    name: form.get("customerName").trim(),
    contact: form.get("customerContact").trim(),
    note: form.get("customerNote").trim(),
  };
  try {
    if (usingSupabase && selectedCompany.dbId) {
      const { data, error } = await supabaseClient
        .from("appointments")
        .insert({
          company_id: selectedCompany.dbId,
          service_id: selectedService.id,
          booking_date: draft.date,
          start_time: draft.time,
          customer_name: draft.name,
          customer_contact: draft.contact,
          note: draft.note,
          status: "booked",
        })
        .select("id, booking_date, start_time, customer_name, customer_contact, note, service_id, services(name, duration_minutes)")
        .single();
      if (error) throw error;
      bookings = [...bookings, normalizeBooking(data, selectedCompany)];
    } else {
      bookings = [...bookings, draft];
    }
    els.bookingForm.reset();
    selectedSlot = null;
    els.formMessage.textContent = "Timen er booket og ligger i dashboardet.";
    renderAll();
  } catch (error) {
    console.error("Kunne ikke lagre booking", error);
    els.formMessage.textContent = "Kunne ikke lagre timen akkurat nå.";
  }
});

els.copyEmbedCode.addEventListener("click", async () => {
  if (!els.embedCode.value) return;
  try {
    await navigator.clipboard.writeText(els.embedCode.value);
    els.availabilityMessage.textContent = "Embed-koden er kopiert.";
  } catch {
    els.embedCode.select();
    els.availabilityMessage.textContent = "Marker koden og kopier den manuelt.";
  }
});

async function initialize() {
  await loadPublicCompanies();
  if (usingSupabase) {
    const { data } = await supabaseClient.auth.getSession();
    currentUser = data.session?.user ?? null;
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      currentUser = session?.user ?? null;
      await loadOwnedCompanies();
      renderAll();
    });
    await loadOwnedCompanies();
  }
  if (initialCompanySlug) {
    const company = companies.find((item) => item.id === initialCompanySlug);
    if (company) await selectCompany(company, false);
  }
  passwordChecks();
  renderAll();
  const startupView = ["business", "overview", "customer"].includes(initialView) ? initialView : "home";
  setView(isEmbed ? "customer" : startupView);
}

initialize();
