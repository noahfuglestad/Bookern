(function () {
  const script = document.currentScript;
  const business = script?.dataset.bookernBusiness ?? "";
  const baseUrl = new URL(script?.src ?? window.location.href).origin;
  const height = script?.dataset.bookernHeight ?? "760";

  const iframe = document.createElement("iframe");
  iframe.src = `${baseUrl}/?embed=1${business ? `&company=${encodeURIComponent(business)}` : ""}`;
  iframe.title = "Bookern booking";
  iframe.loading = "lazy";
  iframe.style.width = "100%";
  iframe.style.minHeight = `${height}px`;
  iframe.style.border = "0";
  iframe.style.borderRadius = "8px";
  iframe.style.background = "#ffffff";

  script.parentNode.insertBefore(iframe, script);
})();
