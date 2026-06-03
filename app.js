// --- DOM Selectors ---
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const contentDisplay = document.getElementById('content-display');

// --- Event Listeners ---
searchForm.addEventListener('submit', handleSearchSubmit);

/**
 * Handles the submit event of the search form.
 * @param {Event} event 
 */
function handleSearchSubmit(event) {
    event.preventDefault();
    
    const query = searchInput.value.trim();
    if (!query) return;

    fetchCountryData(query);
}

/**
 * Orchestrates fetching data from the API and controlling layout states.
 * @param {string} countryName 
 */
async function fetchCountryData(countryName) {
    renderLoading();

    try {
        const response = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}`);
        
        // Handle 404 and other bad HTTP statuses
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("Country not found. Try checking your spelling!");
            }
            throw new Error("Something went wrong on our end. Please try again later.");
        }

        const data = await response.json();
        
        // Extract the target match (we pick the first result returned by the API)
        const country = data[0];
        renderCountryCard(country);

    } catch (error) {
        renderError(error.message);
    }
}

// --- UI Rendering Functions ---

function renderLoading() {
    contentDisplay.innerHTML = `
        <div class="state-message">
            <div class="spinner"></div>
            <p>Searching for country...</p>
        </div>
    `;
}

function renderError(errorMessage) {
    contentDisplay.innerHTML = `
        <div class="state-message error-state">
            <p><strong>Error:</strong> ${errorMessage}</p>
        </div>
    `;
}

function renderCountryCard(country) {
    // Graceful data extraction matching schema requirements
    const flagUrl = country.flags?.svg || country.flags?.png || '';
    const flagAlt = country.flags?.alt || `Flag of ${country.name?.common}`;
    const name = country.name?.common || 'N/A';
    const capital = country.capital ? country.capital.join(', ') : 'N/A';
    const population = country.population ? country.population.toLocaleString() : '0';
    const region = country.region || 'N/A';
    
    // Currencies object parser (extracts values out of unique dynamic keys e.g. { NGN: { name: "..." } })
    let currencies = 'N/A';
    if (country.currencies) {
        currencies = Object.values(country.currencies)
            .map(c => `${c.name} (${c.symbol || ''})`)
            .join(', ');
    }

    contentDisplay.innerHTML = `
        <article class="country-card">
            <div class="flag-container">
                <img src="${flagUrl}" alt="${flagAlt}">
            </div>
            <div class="country-details">
                <h2>${name}</h2>
                <p class="info-item"><strong>Capital:</strong> ${capital}</p>
                <p class="info-item"><strong>Population:</strong> ${population}</p>
                <p class="info-item"><strong>Region:</strong> ${region}</p>
                <p class="info-item"><strong>Currency:</strong> ${currencies}</p>
            </div>
        </article>
    `;
}