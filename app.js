// --- DOM Selectors ---
const contentDisplay = document.getElementById('content-display');
const countrySelect = document.getElementById('country-select');
const searchForm = document.getElementById('search-form');

// --- Global Variables ---
let countryChoicesInstance = null; // Stores the Choices.js instance

// --- Constants ---
const API_BASE_URL = 'https://restcountries.com/v3.1/';

// --- Event Listeners ---
countrySelect.addEventListener('change', handleCountrySelectChange);
searchForm.addEventListener('submit', handleSearchSubmit);
window.addEventListener('DOMContentLoaded', populateCountryDropdown);

function handleSearchSubmit(event) {
    event.preventDefault();
    // Safely extract value from Choices.js instance if available, fallback to native element
    const selectedCountry = countryChoicesInstance ? countryChoicesInstance.getValue(true) : countrySelect.value;
    if (selectedCountry) {
        fetchCountryData(selectedCountry);
    }
}

function handleCountrySelectChange(event) {
    const selectedCountry = countryChoicesInstance ? countryChoicesInstance.getValue(true) : event.target.value;
    if (selectedCountry) {
        fetchCountryData(selectedCountry);
    }
}

async function fetchCountryData(countryName) {
    if (!countryName) return; 

    renderLoading();

    try {
        const response = await fetch(`${API_BASE_URL}name/${encodeURIComponent(countryName)}?fullText=true`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("Country not found. Try checking your spelling!");
            }
            throw new Error("Something went wrong on our end. Please try again later.");
        }

        const data = await response.json();
        const country = data[0];
        renderCountryCard(country);

    } catch (error) {
        renderError(error.message);
    }
}

// --- UI Rendering Functions ---

async function populateCountryDropdown() {
    try {
        const response = await fetch(`${API_BASE_URL}all?fields=name`);
        if (!response.ok) throw new Error('Failed to fetch country list');
        
        const countries = await response.json();
        
        // Sort alphabetically
        countries.sort((a, b) => a.name.common.localeCompare(b.name.common));

        // Clear placeholder and build list
        countrySelect.innerHTML = '<option value="">Select a country...</option>';
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.name.common;
            option.textContent = country.name.common;
            countrySelect.appendChild(option);
        });

        // Initialize Choices.js custom interface after DOM options are generated
        countryChoicesInstance = new Choices(countrySelect, {
            searchEnabled: true,
            itemSelectText: '',
            shouldSort: false, // Keeping our custom API sorting order
            placeholder: true,
            placeholderValue: 'Select a country...'
        });

    } catch (error) {
        renderError("Could not load country list. Please refresh the page.");
    }
}

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
    const flagUrl = country.flags?.svg || country.flags?.png || '';
    const flagAlt = country.flags?.alt || `Flag of ${country.name?.common}`;
    const name = country.name?.common || 'N/A';
    const capital = country.capital ? country.capital.join(', ') : 'N/A';
    const population = country.population ? country.population.toLocaleString() : '0';
    const region = country.region || 'N/A';
    
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