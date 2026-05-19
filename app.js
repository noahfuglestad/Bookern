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
const initialView = urlParams.get("view");
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
const businessSetupForm = document.querySelector("#businessSetupForm");
const businessSetupMessage = document.querySelector("#businessSetupMessage");
const embedCompanyName = document.querySelector("#embedCompanyName");
const embedCode = document.querySelector("#embedCode");
const copyEmbedCode = document.querySelector("#copyEmbedCode");
const authForm = document.querySelector("#authForm");
const authEmail = document.querySelector("#authEmail");
const authPassword = document.querySelector("#authPassword");
const authMessage = document.querySelector("#authMessage");
const passwordLengthCheck = document.querySelector("#passwordLengthCheck");
const passwordSpecialCheck = document.querySelector("#passwordSpecialCheck");
const signupButton = document.querySelector("#signupButton");
const loginButton = document.querySelector("#loginButton");
const logoutButton = document.querySelector("#logoutButton");
const authRequiredSections = document.querySelectorAll("[data-auth-required]");

let selectedService = services[0];
let selectedCompany = null;
let selectedSlot = null;
let weekOffset = 0;
let bookings = usingSupabase ? [] : loadDemoBookings();
let currentUser = null;
let ownedCompanies = [];
const localBusinessServices = {};

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

function parseSetupServices(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [name = "", duration = "30 min", price = ""] = line.split(",").map((part) => part.trim());
      const durationMinutes = Number.parseInt(duration, 10) || 30;
      return {
        id: `${slugify(name) || "tjeneste"}-${index + 1}`,
        name: name || `Tjeneste ${index + 1}`,
        duration: durationMinutes,
        price,
        sortOrder: index + 1,
      };
    });
}

function getEmbedSnippet(company) {
  if (!company) return "";
  return `<script src="${window.location.origin}/embed.js" data-bookern-business="${company.id}" data-bookern-height="820"></script>`;
}

function normalizeBooking(booking) {
  return {
    id: booking.id,
    date: booking.booking_date,
    time: booking.start_time?.slice(0, 5) ?? booking.time,
    serviceId: booking.service_id,
    serviceName: booking.services?.name ?? booking.serviceName ?? "Time",
    companyId: selectedCompany?.id ?? booking.companyId ?? booking.company_id,
    companyName: booking.companies?.name ?? booking.companyName ?? selectedCompany?.name ?? "Bedrift",
    duration: booking.services?.duration_minutes ?? booking.duration ?? 30,
    name: booking.customer_name,
    contact: booking.customer_contact,
    note: booking.note ?? "",
  };
}

function updateAuthView() {
  const isAuthed = Boolean(currentUser);
  authRequiredSections.forEach((section) => {
    section.hidden = usingSupabase && !isAuthed;
  });

  if (!usingSupabase) {
    authForm.classList.add("is-authenticated");
    authMessage.textContent = "Lokal demo uten innlogging. Koble Supabase for privat bedriftsdashboard.";
    logoutButton.hidden = true;
    return;
  }

  authForm.classList.toggle("is-authenticated", isAuthed);
  logoutButton.hidden = !isAuthed;
  loginButton.hidden = isAuthed;
  signupButton.hidden = isAuthed;
  authEmail.required = !isAuthed;
  authPassword.required = !isAuthed;
  authEmail.disabled = isAuthed;
  authPassword.disabled = isAuthed;
  authMessage.textContent = isAuthed
    ? `Logget inn som ${currentUser.email}.`
    : "Logg inn eller opprett konto for å åpne bedriftsdashboardet.";
}

function getAuthErrorMessage(error, mode) {
  const code = error?.code ?? "";
  const message = error?.message ?? "";
  const normalized = `${code} ${message}`.toLowerCase();

  if (normalized.includes("invalid login") || normalized.includes("invalid_credentials")) {
    return "Feil e-post eller passord. Sjekk at kontoen er opprettet, og prøv å skrive passordet på nytt.";
  }

  if (normalized.includes("email not confirmed")) {
    return "E-posten er ikke bekreftet ennå. Sjekk innboksen eller slå av e-postbekreftelse i Supabase mens du tester.";
  }

  if (normalized.includes("already") || normalized.includes("registered") || normalized.includes("exists")) {
    return "Denne e-posten ser allerede ut til å være registrert. Prøv å logge inn i stedet.";
  }

  if (normalized.includes("weak_password") || normalized.includes("password")) {
    return "Passordet er ikke godkjent. Bruk minst 6 tegn og minst 1 spesialtegn, for eksempel !, ? eller #.";
  }

  if (normalized.includes("email") || normalized.includes("invalid")) {
    return "E-postadressen ser ikke gyldig ut. Bruk en vanlig adresse, for eksempel navn@bedrift.no.";
  }

  if (normalized.includes("rate") || normalized.includes("too many")) {
    return "Det er gjort for mange forsøk på kort tid. Vent litt og prøv igjen.";
  }

  return mode === "login"
    ? `Kunne ikke logge inn: ${message || "ukjent feil"}. Prøv igjen, eller opprett konto hvis du ikke har en.`
    : `Kunne ikke opprette konto: ${message || "ukjent feil"}. Prøv en gyldig e-post og et passord på minst 6 tegn.`;
}

function getSupabaseErrorText(error) {
  return [error?.code, error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getBusinessPublishErrorMessage(error) {
  const errorText = getSupabaseErrorText(error);
  const normalized = errorText.toLowerCase();

  if (normalized.includes("row-level security") || normalized.includes("rls")) {
    return "Supabase stopper publisering med tilgangsregler. Kjør siste SQL fra supabase/schema.sql i Supabase SQL Editor, logg ut og inn igjen, og prøv på nytt.";
  }

  if (normalized.includes("duplicate") || normalized.includes("unique") || normalized.includes("companies_slug_key")) {
    return "Dette bedriftsnavnet finnes allerede. Prøv et litt annet navn, for eksempel med sted eller avdeling.";
  }

  if (normalized.includes("jwt") || normalized.includes("auth") || normalized.includes("logget inn")) {
    return "Innloggingen er utløpt. Logg ut, logg inn igjen, og prøv å publisere på nytt.";
  }

  if (normalized.includes("function") || normalized.includes("schema cache")) {
    return "Supabase mangler siste database-oppsett. Kjør siste SQL fra supabase/schema.sql i Supabase SQL Editor, og prøv igjen.";
  }

  return errorText
    ? `Kunne ikke publisere bedriften. Supabase sier: ${errorText}`
    : "Kunne ikke publisere bedriften akkurat nå. Prøv igjen.";
}

function getPasswordChecks(password) {
  return {
    hasLength: password.length >= 6,
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };
}

function renderPasswordChecks() {
  const checks = getPasswordChecks(authPassword.value);
  passwordLengthCheck.classList.toggle("is-valid", checks.hasLength);
  passwordSpecialCheck.classList.toggle("is-valid", checks.hasSpecial);
  passwordLengthCheck.textContent = `${checks.hasLength ? "✓" : "✕"} Minst 6 tegn`;
  passwordSpecialCheck.textContent = `${checks.hasSpecial ? "✓" : "✕"} Minst 1 spesialtegn`;
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

async function loadOwnedCompanies() {
  ownedCompanies = [];
  if (!usingSupabase || !currentUser) return;

  const { data, error } = await supabaseClient
    .from("companies")
    .select("id, slug, name, category, city, description")
    .eq("owner_id", currentUser.id)
    .order("name");

  if (error) {
    console.warn("Kunne ikke hente dine bedrifter fra Supabase", error);
    return;
  }

  ownedCompanies = data.map(normalizeCompany);
  companies = [
    ...companies.filter((company) => !ownedCompanies.some((owned) => owned.id === company.id)),
    ...ownedCompanies,
  ].sort((a, b) => a.name.localeCompare(b.name));

  if (!isEmbed && !initialCompanySlug && !selectedCompany && ownedCompanies.length) {
    await selectCompany(ownedCompanies[0]);
  }
}

async function loadCompanyServices(company) {
  if (!usingSupabase || !company?.dbId) {
    services = localBusinessServices[company?.id] ?? [...demoServices];
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

  const canReadDetails = currentUser && ownedCompanies.some((ownedCompany) => ownedCompany.dbId === company.dbId);
  if (canReadDetails) {
    const { data, error } = await supabaseClient
      .from("appointments")
      .select("id, booking_date, start_time, customer_name, customer_contact, note, service_id, company_id, services(name, duration_minutes)")
      .eq("company_id", company.dbId)
      .in("status", ["booked", "confirmed"])
      .order("booking_date")
      .order("start_time");

    if (error) {
      console.warn("Kunne ikke hente bookinger fra Supabase", error);
      return;
    }

    bookings = data.map((booking) => normalizeBooking({ ...booking, companyId: company.id, companyName: company.name }));
    return;
  }

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
    companyId: company.id,
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

async function createBusinessProfile(profile, profileServices) {
  const slug = slugify(profile.name);
  if (!slug) throw new Error("Bedriften trenger et navn.");

  if (!usingSupabase) {
    const company = normalizeCompany({
      id: slug,
      slug,
      name: profile.name,
      category: profile.category,
      city: profile.city,
      description: profile.description,
    });
    companies = [...companies.filter((item) => item.id !== company.id), company];
    localBusinessServices[company.id] = profileServices;
    return company;
  }

  if (!currentUser) {
    throw new Error("Du må være logget inn for å opprette en bedrift.");
  }

  const serviceRows = profileServices.map((service) => ({
    name: service.name,
    duration_minutes: service.duration,
    price_text: service.price,
    sort_order: service.sortOrder,
  }));

  const { data: rpcCompanyData, error: rpcError } = await supabaseClient
    .rpc("create_bookern_business", {
      business_slug: slug,
      business_name: profile.name,
      business_category: profile.category,
      business_city: profile.city,
      business_description: profile.description,
      business_services: serviceRows,
    })
    .single();

  if (!rpcError) {
    const company = normalizeCompany(rpcCompanyData);
    companies = [...companies.filter((item) => item.id !== company.id), company].sort((a, b) => a.name.localeCompare(b.name));
    ownedCompanies = [...ownedCompanies.filter((item) => item.id !== company.id), company].sort((a, b) => a.name.localeCompare(b.name));
    return company;
  }

  const canUseDirectInsertFallback = ["42883", "PGRST202"].includes(rpcError.code)
    || rpcError.message?.toLowerCase().includes("function");
  if (!canUseDirectInsertFallback) throw rpcError;

  const { data: companyData, error: companyError } = await supabaseClient
    .from("companies")
    .insert({
      owner_id: currentUser.id,
      slug,
      name: profile.name,
      category: profile.category,
      city: profile.city,
      description: profile.description,
      is_published: true,
    })
    .select("id, slug, name, category, city, description")
    .single();

  if (companyError) throw companyError;

  const directServiceRows = profileServices.map((service) => ({
    company_id: companyData.id,
    name: service.name,
    duration_minutes: service.duration,
    price_text: service.price,
    sort_order: service.sortOrder,
    is_active: true,
  }));

  const { error: servicesError } = await supabaseClient
    .from("services")
    .insert(directServiceRows);

  if (servicesError) throw servicesError;

  const company = normalizeCompany(companyData);
  companies = [...companies.filter((item) => item.id !== company.id), company].sort((a, b) => a.name.localeCompare(b.name));
  ownedCompanies = [...ownedCompanies.filter((item) => item.id !== company.id), company].sort((a, b) => a.name.localeCompare(b.name));
  return company;
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
  const companyId = selectedCompany?.id ?? ownedCompanies[0]?.id ?? companies[0]?.id;
  if (!companyId) return;
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

function renderEmbedPanel() {
  const company = selectedCompany ?? ownedCompanies[0] ?? companies[0];
  if (!company) {
    embedCompanyName.textContent = "Velg eller opprett en bedrift for å lage embed-kode.";
    embedCode.value = "";
    return;
  }

  embedCompanyName.textContent = `Widget-kode for ${company.name}`;
  embedCode.value = getEmbedSnippet(company);
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
  renderEmbedPanel();
  updateBookingCopy();
}

function updateBookingCopy() {
  if (!selectedCompany) {
    introEyebrow.textContent = "Widget-demo";
    introTitle.textContent = "Velg en bedrift for å forhåndsvise booking-widgeten.";
    serviceTitle.textContent = "Velg bedrift for widgeten";
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
authPassword.addEventListener("input", renderPasswordChecks);

companyResults.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-company]");
  if (!button) return;
  const company = companies.find((item) => item.id === button.dataset.company);
  await selectCompany(company);
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!usingSupabase) {
    authMessage.textContent = "Supabase er ikke koblet til ennå.";
    return;
  }

  authMessage.textContent = "Logger inn...";
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: authEmail.value.trim(),
    password: authPassword.value,
  });

  if (error) {
    authMessage.textContent = getAuthErrorMessage(error, "login");
    return;
  }

  currentUser = data.user;
  await loadOwnedCompanies();
  updateAuthView();
  renderAll();
});

signupButton.addEventListener("click", async () => {
  if (!usingSupabase) {
    authMessage.textContent = "Supabase er ikke koblet til ennå.";
    return;
  }

  if (!authEmail.value.trim() || !authPassword.value) {
    authMessage.textContent = "Skriv e-post og passord først.";
    return;
  }

  const passwordChecks = getPasswordChecks(authPassword.value);
  if (!passwordChecks.hasLength || !passwordChecks.hasSpecial) {
    authMessage.textContent = "Passordet må ha minst 6 tegn og minst 1 spesialtegn, for eksempel !, ? eller #.";
    renderPasswordChecks();
    return;
  }

  authMessage.textContent = "Oppretter konto...";
  const { data, error } = await supabaseClient.auth.signUp({
    email: authEmail.value.trim(),
    password: authPassword.value,
    options: {
      emailRedirectTo: `${window.location.origin}/?view=business`,
    },
  });

  if (error) {
    authMessage.textContent = getAuthErrorMessage(error, "signup");
    return;
  }

  currentUser = data.user ?? currentUser;
  await loadOwnedCompanies();
  updateAuthView();
  renderAll();
  authMessage.textContent = currentUser
    ? `Kontoen er klar. Logget inn som ${currentUser.email}.`
    : "Kontoen er opprettet. Sjekk e-posten din for bekreftelse før du logger inn.";
});

logoutButton.addEventListener("click", async () => {
  if (!usingSupabase) return;
  await supabaseClient.auth.signOut();
  currentUser = null;
  ownedCompanies = [];
  selectedCompany = null;
  bookings = [];
  updateAuthView();
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

businessSetupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (usingSupabase && !currentUser) {
    businessSetupMessage.textContent = "Logg inn før du oppretter en bedrift.";
    return;
  }

  const formData = new FormData(businessSetupForm);
  const profile = {
    name: formData.get("businessName").trim(),
    category: formData.get("businessCategory").trim(),
    city: formData.get("businessCity").trim(),
    description: formData.get("businessDescription").trim(),
  };
  const profileServices = parseSetupServices(formData.get("businessServices"));

  if (!profileServices.length) {
    businessSetupMessage.textContent = "Legg inn minst én tjeneste.";
    return;
  }

  businessSetupMessage.textContent = "Publiserer bedriften...";
  try {
    const company = await createBusinessProfile(profile, profileServices);
    await loadOwnedCompanies();
    await selectCompany(company);
    businessSetupForm.reset();
    businessSetupMessage.textContent = `${company.name} er publisert. Kundene kan nå finne bedriften i søket.`;
  } catch (error) {
    console.error("Kunne ikke publisere bedrift", error);
    businessSetupMessage.textContent = getBusinessPublishErrorMessage(error);
  }
});

copyEmbedCode.addEventListener("click", async () => {
  if (!embedCode.value) return;
  try {
    await navigator.clipboard.writeText(embedCode.value);
    businessSetupMessage.textContent = "Embed-koden er kopiert.";
  } catch (error) {
    console.warn("Kunne ikke kopiere embed-kode", error);
    embedCode.select();
    businessSetupMessage.textContent = "Marker koden og kopier den manuelt.";
  }
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
  if (usingSupabase) {
    const { data } = await supabaseClient.auth.getSession();
    currentUser = data.session?.user ?? null;
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      currentUser = session?.user ?? null;
      ownedCompanies = [];
      await loadOwnedCompanies();
      updateAuthView();
      renderAll();
    });
    await loadOwnedCompanies();
  }
  updateAuthView();
  renderPasswordChecks();
  renderAll();
  if (initialCompanySlug) {
    const company = companies.find((item) => item.id === initialCompanySlug);
    if (company) {
      await selectCompany(company);
    }
  }
  const startupView = initialView === "business" ? "business" : "home";
  setView(isEmbed ? "customer" : startupView);
}

initialize();
