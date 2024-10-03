import { currencies } from "./currencies.js"

// DOM Elements to be used by script
const DOM = {
  chart: document.getElementById("chart"),
  mainForm: document.querySelector(".main-form"),
  resultText: document.getElementById("result"),
  searchSelect: document.getElementById("search-select"),
  create: (tag, props) => Object.assign(document.createElement(tag), props),
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

const getHistoricData = async ({ base }) => {
  try {
    const res = await fetch(`https://mindicador.cl/api/${base}`, { method: "GET" })
    // If successful
    if (res.ok) return await res.json()
    // If an error is returned from server
    const message = {
      400: "Solicitud no exitosa",
      403: "Sin autorización para consultar",
      404: "No se encontró el servidor",
      500: "El servidor no pudo procesar la solicitud",
    }
    throw {
      name: `Error ${res.status}`,
      message: message[res.status] || res.statusText,
    }
  } catch (error) {
    return { error }
  }
}

const convertCurrency = async (base) => {
  // Define sequence of conversions needed
  const conversions = getCurrencySequence(base)
  // Fetch data for each conversion step
  const data = await Promise.all(conversions.map(getHistoricData))
  // Check for an error and forwards it if occurred
  const err = data.find(({ error }) => error)
  if (err) return err
  // Process data from last 10 days
  const historic = Array(10)
    .fill()
    .map((_, i) => ({
      x: data[0].serie[i].fecha.split("T")[0], // Get dates from first step
      y: data.reduce((acc, el) => acc * el.serie[i].valor, 1), // Multiply rates for all steps
    }))
    .reverse()
  return {
    historic, // Last 10 days
    todayRate: historic.at(-1).y, // Rate for today
    ...conversions.at(-1), // The rest of the last step currency object data
  }
}

// Modify DOM

const populateSelect = () =>
  DOM.searchSelect.append(
    ...currencies.map(({ base, text }) => DOM.create("option", { value: base, textContent: text }))
  )

const renderResult = ({ title, content }) =>
  DOM.resultText.replaceChildren(
    DOM.create("span", {
      className: title.includes("Error") ? "failure" : "success",
      textContent: `${title}: `,
    }),
    content
  )

let chart

const randomColor = () => `hsl(${Math.random() * 360}, 100%, 40%)`

const renderGraph = ({ historic, asset }) => {
  const config = {
    type: "line",
    data: {
      datasets: [
        {
          label: `Precio ${asset}`,
          borderColor: randomColor(),
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

const performSearch = async (e) => {
  e.preventDefault()
  // Get values
  const { clpAmount, base } = Object.fromEntries(new FormData(e.target))
  const conversion = await convertCurrency(base)
  if (conversion.error) {
    // Deconstruct and set default values in case either name
    // or message are undefined in the error Object
    const { name = "Error", message = "Algo salió mal :(" } = conversion.error
    renderResult({ title: name, content: message })
    return
  }
  const { todayRate, symbol, suffixSymbol, decimals } = conversion
  const convertedAmount = (Number(clpAmount) / todayRate).toLocaleString(undefined, {
    maximumFractionDigits: decimals,
  })
  renderResult({ title: "Resultado", content: `${symbol || ""} ${convertedAmount} ${suffixSymbol || ""}` })
  renderGraph(conversion)
}

DOM.mainForm.addEventListener("submit", performSearch)
document.addEventListener("DOMContentLoaded", populateSelect)
