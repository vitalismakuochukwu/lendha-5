const contentDisplay = document.getElementById('content-display');
const searchForm = document.getElementById('search-form');
const compareForm = document.getElementById('compare-form');
const countrySelect = document.getElementById('country-select');
const compareSelect1 = document.getElementById('compare-select-1');
const compareSelect2 = document.getElementById('compare-select-2');
const tabExplore = document.getElementById('tab-explore');
const tabCompare = document.getElementById('tab-compare');

let choicesExplore = null;
let choicesCompare1 = null;
let choicesCompare2 = null;
let currentMode = 'explore';

const API_BASE_URL = 'https://restcountries.com/v3.1/';


window.addEventListener('DOMContentLoaded', initializeApp);

// Form Submit Listeners (Handles keyboard "Enter" events)
searchForm.addEventListener('submit', handleSearchSubmit);
compareForm.addEventListener('submit', handleCompareSubmit);

// Dropdown Change Listeners (Handles mouse click selection events)
countrySelect.addEventListener('change', handleExploreChange);
compareSelect1.addEventListener('change', handleCompareChange);
compareSelect2.addEventListener('change', handleCompareChange);

// Tab Navigation Listeners
tabExplore.addEventListener('click', () => switchMode('explore'));
tabCompare.addEventListener('click', () => switchMode('compare'));

function initializeApp() {
    populateAllDropdowns();
}

// ==========================================
// 3. UI State Management (Tab Switcher)
// ==========================================

/**
 * Switches the interface between 'explore' (single) and 'compare' (dual) modes.
 * @param {string} mode - The mode to switch to ('explore' or 'compare').
 */
function switchMode(mode) {
    currentMode = mode;
    
    const emptyMessage = mode === 'explore' 
        ? 'Search for a country to begin.' 
        : 'Select two countries to compare side-by-side.';
    
    contentDisplay.innerHTML = `
        <div class="state-message empty-state">
            <p>${emptyMessage}</p>
        </div>
    `;
    
    const isExplore = mode === 'explore';
    tabExplore.classList.toggle('active', isExplore);
    tabCompare.classList.toggle('active', !isExplore);
    searchForm.classList.toggle('hidden', !isExplore);
    compareForm.classList.toggle('hidden', isExplore);
}

// ==========================================
// 4. Form & Dropdown Action Handlers
// ==========================================

// --- Explore Mode Handlers ---
function handleSearchSubmit(event) {
    event.preventDefault();
    const selectedCountry = choicesExplore ? choicesExplore.getValue(true) : countrySelect.value;
    if (selectedCountry) {
        renderSingleCountryView(selectedCountry);
    }
}

function handleExploreChange(event) {
    const selectedCountry = event.detail?.value || event.target.value;
    if (selectedCountry) {
        renderSingleCountryView(selectedCountry);
    }
}

// --- Compare Mode Handlers ---
function handleCompareSubmit(event) {
    event.preventDefault();
    triggerCompareIfReady(true);
}

function handleCompareChange() {
    triggerCompareIfReady(false);
}

/**
 * Evaluates the compare selections and triggers view compilation if both parameters are met.
 * @param {boolean} showValidationError - Whether to output user-facing alert states.
 */
function triggerCompareIfReady(showValidationError) {
    const countryA = choicesCompare1 ? choicesCompare1.getValue(true) : compareSelect1.value;
    const countryB = choicesCompare2 ? choicesCompare2.getValue(true) : compareSelect2.value;

    if (!countryA || !countryB) {
        if (showValidationError) {
            renderError("Please select both countries to start the comparison.");
        }
        return; 
    }
    renderComparisonView(countryA, countryB);
}

// ==========================================
// 5. CORS Fallback API Request Layer
// ==========================================

/**
 * Performs a fetch request with an automatic public CORS proxy fallback.
 * Prevents "No 'Access-Control-Allow-Origin'" blocks from breaking the app.
 * @param {string} targetUrl 
 * @returns {Promise<Response>}
 */
async function fetchWithCORSFallback(targetUrl) {
    try {
        // Try the normal direct request first
        const directResponse = await fetch(targetUrl);
        if (directResponse.ok) {
            return directResponse;
        }
    } catch (networkError) {
        // If it throws a browser network error (often caused by CORS blocks), 
        // silently route through a reliable public CORS-unblocking proxy
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        const proxyResponse = await fetch(proxyUrl);
        if (proxyResponse.ok) {
            return proxyResponse;
        }
    }
    throw new Error("Unable to complete request. Server may be down.");
}

/**
 * Reusable network layer abstraction to grab specific country JSON datasets.
 * @param {string} countryName 
 * @returns {Promise<Object>} 
 */
async function fetchCountryFromAPI(countryName) {
    const targetUrl = `${API_BASE_URL}name/${encodeURIComponent(countryName)}?fullText=true`;
    const response = await fetchWithCORSFallback(targetUrl);
    const data = await response.json();
    return data[0];
}

async function populateAllDropdowns() {
    try {
        const targetUrl = `${API_BASE_URL}all?fields=name`;
        const response = await fetchWithCORSFallback(targetUrl);
        const countries = await response.json();
        
        countries.sort((a, b) => a.name.common.localeCompare(b.name.common));

        const setupSelect = (element, placeholderText) => {
            element.innerHTML = `<option value="">${placeholderText}</option>`;
            countries.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.name.common;
                opt.textContent = c.name.common;
                element.appendChild(opt);
            });
            return new Choices(element, {
                searchEnabled: true,
                itemSelectText: '',
                shouldSort: false,
                placeholder: true,
                placeholderValue: placeholderText
            });
        };

        choicesExplore = setupSelect(countrySelect, 'Select a country...');
        choicesCompare1 = setupSelect(compareSelect1, 'Select first country...');
        choicesCompare2 = setupSelect(compareSelect2, 'Select second country...');

    } catch (error) {
        renderError("Could not initialize setup dropdown controls. Please refresh the window.");
    }
}

// ==========================================
// 6. View Controllers (DOM Render Engines)
// ==========================================

async function renderSingleCountryView(countryName) {
    renderLoading();
    try {
        const countryData = await fetchCountryFromAPI(countryName);
        contentDisplay.innerHTML = `
            <div class="single-display-layout">
                ${getCountryCardMarkup(countryData)}
            </div>
        `;
    } catch (error) {
        renderError(error.message);
    }
}

async function renderComparisonView(nameA, nameB) {
    renderLoading();
    try {
        const [dataA, dataB] = await Promise.all([
            fetchCountryFromAPI(nameA),
            fetchCountryFromAPI(nameB)
        ]);

        contentDisplay.innerHTML = `
            <div class="compare-grid">
                ${getCountryCardMarkup(dataA)}
                ${getCountryCardMarkup(dataB)}
            </div>
        `;
    } catch (error) {
        renderError("Could not compile comparative statistics. Please verify selections.");
    }
}

// ==========================================
// 7. HTML Presentation Templates
// ==========================================

/**
 * Assembles template structures including secure map rendering nodes.
 * @param {Object} country 
 * @returns {string} Fully structured element markup block.
 */
function getCountryCardMarkup(country) {
    const flagUrl = country.flags?.svg || country.flags?.png || '';
    const flagAlt = country.flags?.alt || `Official flag representation for ${country.name?.common}`;
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

    const mapQuery = encodeURIComponent(name);
    const mapEmbedUrl = `https://maps.google.com/maps?q=${mapQuery}&t=&z=5&ie=UTF8&iwloc=&output=embed`;

    return `
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
            <div class="map-container">
                <iframe 
                    width="100%" 
                    height="250" 
                    frameborder="0" 
                    style="border:0;" 
                    src="${mapEmbedUrl}" 
                    allowfullscreen="" 
                    loading="lazy">
                </iframe>
            </div>
        </article>
    `;
}

function renderLoading() {
    contentDisplay.innerHTML = `
        <div class="state-message">
            <div class="spinner"></div>
            <p>Fetching and mapping regional profiles...</p>
        </div>
    `;
}

function renderError(errorMessage) {
    contentDisplay.innerHTML = `
        <div class="state-message error-state">
            <p><strong>Operational Error:</strong> ${errorMessage}</p>
        </div>
    `;
}
