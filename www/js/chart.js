let chart;

function renderChart(data) {
  const ctx = document.getElementById("salesChart");

  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(data),
      datasets: [{
        label: "Daily Sales",
        data: Object.values(data)
      }]
    }
  });
}