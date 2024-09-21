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
  /* Gets the sequence of conversions if not direct conversion available
    (convert first to USD and then to base)*/
  const sequence = []
  // Add base element
  sequence.push(currencies.find((el) => el.base === base))
  // If not direct conversion, add CLP to USD
  if (sequence[0].quote !== "clp") sequence.unshift(currencies[0])
  // Return sequence
  return sequence
}

const getHistoricData = async (base) => {
  try {
    const res = await fetch(`https://165.227.94.139/api/${base}`, { method: "GET" })
    if (res.ok) return await res.json()
    return { error: `${res.status} - ${res.statusText}` }
  } catch (error) {
    return { error: error.message }
  }
}

const convertCurrency = async () => {
  // Define sequence of conversions needed
  const base = DOM.searchSelect.value
  const conversions = getCurrencySequence(base)
  const assetData = conversions[conversions.length - 1]
  // Fetch data
  const data = await Promise.all(conversions.map(({ base }) => getHistoricData(base)))
  if (data[0].error) return data[0] // Forwards the error
  // Process data
  const dates = []
  const rates = []
  for (let i = 0; i < data[0].serie.length; i++) {
    dates.push(data.map((el) => el.serie[i].fecha)[0])
    rates.push(data.map((el) => el.serie[i].valor).reduce((acc, el) => acc * el, 1))
  }
  // Only use last 10 days
  dates.splice(10)
  rates.splice(10)
  return { dates, rates, ...assetData }
}

// Modify DOM

DOM.searchSelect.innerHTML = `<option value="" disabled selected>Seleccione una opción</option>`
currencies.forEach(({ base, text }) => {
  const option = document.createElement("option")
  option.value = base
  option.innerText = text
  DOM.searchSelect.appendChild(option)
})

let chart

const renderGraph = ({ dates, rates, asset, color }) => {
  const config = {
    type: "line",
    data: {
      labels: dates.map((d) => d.split("T")[0]),
      datasets: [
        {
          label: `Precio ${asset}`,
          borderColor: `#${color}`,
          data: rates,
        },
      ],
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${context.parsed.y.toLocaleString()} CLP`,
          },
        },
      },
      scales: {
        y: {
          title: {
            text: "CLP",
            display: true,
          },
        },
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
    const { rates, symbol, suffixSymbol, decimals } = conversion
    const clpAmount = Number(DOM.clpInput.value)
    // Use rates[0] for the first retrieved item => today
    const convertedAmount = (clpAmount / rates[0]).toLocaleString(undefined, {
      maximumFractionDigits: decimals,
    })
    DOM.resultText.innerHTML = `<strong style="color: #0f6700">Resultado:</strong>
      ${symbol || ""} ${convertedAmount} ${suffixSymbol || ""}`
    renderGraph(conversion)
  }
}

DOM.searchButton.addEventListener("click", performSearch)
