const clpAmountInput = document.getElementById("clp-amount")
const mainForm = document.querySelector(".main-form")
const searchButton = document.getElementById("search-button")
const searchSelect = document.getElementById("search-select")
const resultText = document.getElementById("result")

const currencies = [
  { quote: "clp", base: "dolar", symbol: "$", decimals: 2 },
  { quote: "clp", base: "euro", symbol: "€", decimals: 2 },
  { quote: "dolar", base: "bitcoin", symbol: "₿", decimals: 8 },
  { quote: "dolar", base: "libra_cobre", suffixSymbol: "lbs.", decimals: 1 },
]

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
  const base = searchSelect.value
  const conversions = getCurrencySequence(base)
  const { symbol = "", suffixSymbol = "", decimals } = conversions[conversions.length - 1]
  // Fetch data
  const data = await Promise.all(conversions.map(({ base }) => getHistoricData(base)))
  if (data[0].error) return data[0] // Forwards the error
  // Process data
  const rates = []
  for (let i = 0; i < data[0].serie.length; i++) {
    const date = data.map((el) => el.serie[i].fecha)[0]
    const rate = data.map((el) => el.serie[i].valor).reduce((acc, el) => acc * el, 1)
    rates.push({ date, rate })
  }
  return { rates, symbol, suffixSymbol, decimals }
}

const performSearch = async () => {
  // Check if form is valid
  if (!mainForm.checkValidity()) {
    resultText.innerHTML = `<strong style="color: #a00">Error:</strong>
      Debe ingresar todos los datos para realizar el cálculo`
    return
  }
  // Get values
  const conversion = await convertCurrency()
  if (conversion.error) {
    resultText.innerHTML = `<strong style="color: #a00">Error:</strong>
      ${conversion.error}`
  } else {
    const { rates, symbol, suffixSymbol, decimals } = conversion
    const clpAmount = Number(clpAmountInput.value)
    const rate = rates[0].rate // Use [0] for the first retrieved item (today)
    const convertedAmount = (clpAmount / rate).toLocaleString(undefined, {
      maximumFractionDigits: decimals,
    })
    resultText.innerHTML = `<strong style="color: #0f6700">Resultado:</strong>
      ${symbol} ${convertedAmount} ${suffixSymbol}`
  }
}

searchButton.addEventListener("click", performSearch)
