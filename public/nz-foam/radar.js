const buttons = [...document.querySelectorAll(".radar-filter")];
const opportunities = [...document.querySelectorAll(".opportunity")];
const search = document.querySelector("#projectSearch");
let category = "all";

function applyFilters() {
  const q = (search.value || "").trim().toLowerCase();
  opportunities.forEach((item) => {
    const categoryMatch = category === "all" || item.dataset.category === category;
    const searchMatch = !q || (item.dataset.search || "").includes(q) || item.textContent.toLowerCase().includes(q);
    item.hidden = !(categoryMatch && searchMatch);
  });
}

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    buttons.forEach((b) => b.classList.remove("active"));
    button.classList.add("active");
    category = button.dataset.filter;
    applyFilters();
  });
});

search.addEventListener("input", applyFilters);
