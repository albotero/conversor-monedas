const generateGraphConfig = ({ historic, asset }) => ({
  type: "line",
  data: {
    datasets: [
      {
        label: `Precio ${asset}`,
        borderColor: `hsl(${Math.random() * 360}, 100%, 40%)`, // Random color
        data: historic,
      },
    ],
  },
  options: {
    plugins: {
      tooltip: {
        callbacks: {
          label: ({ dataset: { label }, parsed: { y } }) => {
            const clp = Math.round(y).toLocaleString()
            return `${label}:  ${clp} CLP`
          },
        },
      },
    },
    scales: {
      x: { title: { text: "Fecha", display: true } },
      y: { title: { text: "Valor (CLP)", display: true } },
    },
  },
})

let chart

export const renderGraph = (DOM, data) => {
  if (chart) chart.destroy()
  chart = new Chart(DOM.chart, generateGraphConfig(data))
  DOM.chart.style.display = "block"
}
