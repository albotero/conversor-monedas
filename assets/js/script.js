import { currencies } from "./currencies.js"

// DOM Elements to be used by script
const DOM = {
  chart: document.getElementById("chart"),
  clpInput: document.getElementById("clp-amount"),
  mainForm: document.querySelector(".main-form"),
  resultText: document.getElementById("result"),
  searchButton: document.getElementById("search-button"),
  searchSelect: document.getElementById("search-select"),
}

const getCurrencySequence = (base) => {
  /* Get the sequence of conversions
    - If direct conversion is available: CLP -> Base
    - If direct conversion is not available: CLP -> USD -> Base */
  const sequence = [currencies.find((el) => el.base === base)]
  // If no direct conversion, add CLP to USD at the start of the sequence
  if (sequence[0].quote !== "clp") sequence.unshift(currencies[0])
  // Return sequence
  return sequence
}

const getHistoricData = async (base) => {
  try {
    const res = await fetch(`https://mindicador.cl/api/${base}`, { method: "GET" })
    // If successful
    if (res.ok) return await res.json()
    // If an error code is returned from server
    return { error: `${res.status} - ${res.statusText}` }
  } catch (error) {
    // If an error ocurred within the script
    return { error: error.message }
  }
}

const convertCurrency = async () => {
  // Define sequence of conversions needed
  const conversions = getCurrencySequence(DOM.searchSelect.value)
  // Fetch data for each conversion step
  const data = await Promise.all(conversions.map(({ base }) => getHistoricData(base)))
  if (data[0].error) return data[0] // Forwards the error
  // Process data from last 10 days
  const historic = Array(10)
    .fill()
    .map((_, i) => ({
      x: data[0].serie[i].fecha.split("T")[0], // Get dates from first step
      y: data.reduce((acc, el) => acc * el.serie[i].valor, 1), // Multiply rates for all steps
    }))
  return {
    historic, // Last 10 days
    todayRate: historic[0].y, // Rate for today
    ...conversions.at(-1), // The rest of the last step currency object data
  }
}

// Modify DOM

DOM.searchSelect.innerHTML = `<option value="" disabled selected>Seleccione una opción</option>`
currencies.forEach(({ base, text }) => (DOM.searchSelect.innerHTML += `<option value="${base}">${text}</option>`))

let chart

const renderGraph = ({ historic, asset, color }) => {
  const config = {
    type: "line",
    data: {
      datasets: [
        {
          label: `Precio ${asset}`,
          borderColor: `#${color}`,
          data: historic,
        },
      ],
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${Math.round(context.parsed.y).toLocaleString()} CLP`,
          },
        },
      },
      scales: {
        x: { title: { text: "Fecha", display: true } },
        y: { title: { text: "Valor (CLP)", display: true } },
      },
    },
  }
  if (chart) chart.destroy()
  chart = new Chart(DOM.chart, config)
  DOM.chart.style.display = "block"
}

const performSearch = async () => {
  // Check if form is valid
  if (!DOM.mainForm.checkValidity()) {
    DOM.resultText.innerHTML = `<strong style="color: #a00">Error:</strong>
      Debe ingresar todos los datos para realizar el cálculo`
    return
  }
  // Get values
  const conversion = await convertCurrency()
  if (conversion.error) {
    DOM.resultText.innerHTML = `<strong style="color: #a00">Error:</strong>
      ${conversion.error}`
  } else {
    const { todayRate, symbol, suffixSymbol, decimals } = conversion
    const clpAmount = Number(DOM.clpInput.value)
    const convertedAmount = (clpAmount / todayRate).toLocaleString(undefined, {
      maximumFractionDigits: decimals,
    })
    DOM.resultText.innerHTML = `<strong style="color: #0f6700">Resultado:</strong>
      ${symbol || ""} ${convertedAmount} ${suffixSymbol || ""}`
    renderGraph(conversion)
  }
}

DOM.searchButton.addEventListener("click", performSearch)
