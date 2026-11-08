const STORAGE_KEY = "spendwise-expenses-v1";
const categories = ["Food", "Transport", "Shopping", "Bills", "Education", "Health", "Other"];
const categoryColors = {
  Food: "#8b7be2", Transport: "#62b99a", Shopping: "#e8a46c",
  Bills: "#6e9bd7", Education: "#d77fa5", Health: "#78b9c5", Other: "#aaa4bd"
};

let expenses = loadExpenses();

const form = document.getElementById("expense-form");
const titleInput = document.getElementById("expense-title");
const amountInput = document.getElementById("expense-amount");
const dateInput = document.getElementById("expense-date");
const categoryInput = document.getElementById("expense-category");
const expenseList = document.getElementById("expense-list");
const categoryFilter = document.getElementById("category-filter");

function loadExpenses() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveExpenses() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function formatMoney(value) {
  return "Rs " + Number(value).toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatDate(dateString) {
  return new Date(dateString + "T00:00:00").toLocaleDateString("en-PK", {
    day: "numeric", month: "short", year: "numeric"
  });
}

function setToday() {
  const now = new Date();
  dateInput.value = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
  document.getElementById("today-date").textContent = now.toLocaleDateString("en-PK", {
    weekday: "short", day: "numeric", month: "short"
  });
}

function renderStats() {
  const total = expenses.reduce((sum, item) => sum + Number(item.amount), 0);
  const now = new Date();
  const monthTotal = expenses
    .filter(item => {
      const date = new Date(item.date + "T00:00:00");
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, item) => sum + Number(item.amount), 0);

  document.getElementById("total-expenses").textContent = formatMoney(total);
  document.getElementById("month-expenses").textContent = formatMoney(monthTotal);
  document.getElementById("transaction-count").textContent = expenses.length;
}

function renderTransactions() {
  const selectedCategory = categoryFilter.value;
  const filtered = expenses
    .filter(item => selectedCategory === "All" || item.category === selectedCategory)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);

  if (filtered.length === 0) {
    expenseList.innerHTML = `<tr><td colspan="5" class="empty-row">${expenses.length ? "No expenses in this category." : "No expenses yet. Add your first expense above."}</td></tr>`;
  } else {
    expenseList.innerHTML = filtered.map(item => `
      <tr>
        <td>${escapeHTML(item.title)}</td>
        <td><span class="category-pill">${escapeHTML(item.category)}</span></td>
        <td>${formatDate(item.date)}</td>
        <td class="amount-cell">${formatMoney(item.amount)}</td>
        <td><button class="delete-button" type="button" data-delete="${item.id}" aria-label="Delete ${escapeHTML(item.title)}" title="Delete expense">×</button></td>
      </tr>
    `).join("");
  }
  document.getElementById("showing-count").textContent =
    `Showing ${filtered.length} transaction${filtered.length === 1 ? "" : "s"}`;
}

function renderChart() {
  const totals = {};
  categories.forEach(category => totals[category] = 0);
  expenses.forEach(item => totals[item.category] = (totals[item.category] || 0) + Number(item.amount));
  const used = categories.filter(category => totals[category] > 0);
  const chart = document.getElementById("category-chart");
  const legend = document.getElementById("category-legend");

  if (used.length === 0) {
    chart.innerHTML = '<div class="empty-chart">Add an expense to see your spending breakdown.</div>';
    legend.innerHTML = "";
    return;
  }

  const maxValue = Math.max(...used.map(category => totals[category]));
  chart.innerHTML = used.map(category => {
    const height = Math.max(8, (totals[category] / maxValue) * 105);
    return `<div class="bar-group" title="${category}: ${formatMoney(totals[category])}">
      <div class="bar" style="height:${height}px;background:linear-gradient(180deg,${categoryColors[category]}aa,${categoryColors[category]})"></div>
      <span class="bar-label">${category}</span>
    </div>`;
  }).join("");

  legend.innerHTML = used.map(category => `
    <span class="legend-item">
      <span class="legend-dot" style="background:${categoryColors[category]}"></span>
      ${category}: ${formatMoney(totals[category])}
    </span>
  `).join("");
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

function renderApp() {
  renderStats();
  renderTransactions();
  renderChart();
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const title = titleInput.value.trim();
  const amount = Number(amountInput.value);
  const date = dateInput.value;

  if (!title || !Number.isFinite(amount) || amount <= 0 || !date) {
    document.getElementById("form-message").textContent = "Please enter a name, a valid amount and a date.";
    return;
  }

  expenses.push({
    id: Date.now(),
    title,
    amount: Math.round(amount * 100) / 100,
    date,
    category: categoryInput.value
  });

  saveExpenses();
  renderApp();
  form.reset();
  setToday();
  document.getElementById("form-message").textContent = "Expense added successfully!";
  titleInput.focus();
});

expenseList.addEventListener("click", event => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;
  const id = Number(button.dataset.delete);
  expenses = expenses.filter(item => item.id !== id);
  saveExpenses();
  renderApp();
});

categoryFilter.addEventListener("change", renderTransactions);

document.getElementById("export-button").addEventListener("click", () => {
  if (expenses.length === 0) {
    alert("Add at least one expense before exporting.");
    return;
  }
  const rows = [
    ["Expense", "Amount (PKR)", "Category", "Date"],
    ...expenses.map(item => [item.title, item.amount, item.category, item.date])
  ];
  const csv = rows.map(row => row.map(value =>
    `"${String(value).replace(/"/g, '""')}"`
  ).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "spendwise-expenses.csv";
  link.click();
  URL.revokeObjectURL(url);
});

setToday();
renderApp();
