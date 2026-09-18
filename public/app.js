const filters = document.querySelectorAll(".filter");
const records = document.querySelectorAll(".record");

filters.forEach((button) => {
  button.addEventListener("click", () => {
    filters.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    const filter = button.dataset.filter;

    records.forEach((record) => {
      record.hidden = filter !== "all" && record.dataset.month !== filter;
    });
  });
});
