const details = document.querySelector('textarea[name="details"]');
const counter = document.getElementById("details-count");
if (details && counter) {
  const update = () => { counter.textContent = `${details.value.length} / ${details.maxLength} characters`; };
  details.addEventListener("input", update);
  update();
}
