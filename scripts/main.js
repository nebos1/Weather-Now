// swap from celsium to farenheit and vice versa
const temperatureScaleChange = document.getElementById("celsium-farenheit-button");

// search elements
const searchButton = document.getElementById("search-button");
const searchBar = document.getElementById("search-bar");
const cityDropdown = document.getElementById("city-dropdown");
const searchSection = document.getElementById("search-section")

// use current location button
const useLocationButton = document.getElementById("use-loaction-button");

// hourly forecast elements
const hourlyLabelElement = document.getElementById("hourly-label");
const hourCards = document.querySelectorAll("#hourly-indicator .hour");

// current location and last update time elements
const placeElement = document.getElementById("place");
const updatedElement = document.getElementById("updated");

// in div id=temperature
const iconElement = document.getElementById("icon");
const tempElement = document.getElementById("temp");

// in div id=additional-information
const weatherConditionElement = document.getElementById("weather-condition");
const feelsLikeElement = document.getElementById("feels-like");

// in div id=more-info
const humidityElement = document.getElementById("humidity");
const windElement = document.getElementById("wind");
const pressureElement = document.getElementById("pressure");
const precipElement = document.getElementById("precip");

// in div id=footer-info
const lastUpdateElement = document.getElementById("last-update");
const coordsElement = document.getElementById("coords");

// 7-day forecast elements
const dayNameAndDateElements = document.querySelectorAll(".day-name-and-date");
const dayWeatherSunriseSunsetElements = document.querySelectorAll(".day-weather-sunrise-sunset");
const minMaxTemperatureElements = document.querySelectorAll(".min-max-temperature");


// API used from Open-Meteo
// https://open-meteo.com/
// ALL RIGHTS RESERVED!
// USED FOR NON-COMMERCIAL PURPOSES ONLY!


const storageKey = "weather_now_last_location";
const refreshMS = 120000; // 2 min

const defaultLocation = {
    name: "Sofia",
    country: "BG",
    latitude: 42.6977,
    longitude: 23.3219
};

const weatherCodeMap = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositioniting rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm", // *
    96: "Thunderstorm with slight hail", // *
    99: "Thunderstorm with heavy hail" // *
};
// (*) Thunderstorm forecast with hail is only available in Central Europe

function iconFromCode(code) { 
    if (code === 0) return "./img/weather/sunny.png"; 
    if (code === 1 || code === 2) return "./img/weather/sunny_cloudly.png"; 
    if (code === 3) return "./img/weather/cloudy.png";
    if (code === 45 || code === 48) return "./img/weather/foggy.png";
    if (code === 51 || code === 53 || code === 55 || code === 61 || code === 63 || code === 65 || code === 80 || code === 81 || code === 82) return "./img/weather/light_rainy.png";
    if (code === 56 || code === 57 || code === 66 || code === 67) return "./img/weather/light_rainy.png";
    if (code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86) return "./img/weather/snowy.png";
    if (code === 95 || code === 96 || code === 99) return "./img/weather/thunderstorm.png";
    return "?????"; // default unkown value
}

function isFarenheit() {
    return temperatureScaleChange.innerText.trim() === "°F";
}

function switchUnitFromCelsiumToFarenheit() {
    hourlyLabelElement.innerText = isFarenheit() ? "Imperial (°F, mph)" : "Metric (°C, km/h)";
}

function saveLastLocation(location) {
    try {
        localStorage.setItem(storageKey, JSON.stringify(location));
        const saved = localStorage.getItem(storageKey);
        if(saved) {
            return true;
        }
        else if(!saved) {
            throw new Error("An unexpected error occured! Location not saved!");
        }
    }
    catch (e) {
        return false;
    }
}

function loadLastLocation() {
    try {
        const dataStorage = localStorage.getItem(storageKey);
        if (!dataStorage) {
            return defaultLocation;
        }
        const obj = JSON.parse(dataStorage);
        if (!obj || typeof obj.latitude !== "number" || typeof obj.longitude !== "number") {
            return defaultLocation;
        }   
        return obj;
    } catch (e) {
        return defaultLocation;
    }
}

// Because Open-Meteo has no reverse from coords -> city
// Using Nominatim API
// https://nominatim.org/release-docs/develop/api/Reverse/    (function used)
// ALL RIGHTS RESERVED!


async function getCityLocationFromCoords(lat, lon) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
        const response = await fetch(url);
        const data = await response.json();

        const addr = data.address || {};
        return addr.city || addr.town || addr.village || addr.municipality || addr.county || "Unknown";
    } catch (e) {
        return "Unknown";
    }
}

// HH:MM 24-hour format
function formatTime(iso) {
    if(!iso || typeof iso !== "string") {
        return "";
    }
    const dateTime = new Date(iso);
    if(isNaN(dateTime.getTime())) {
        return "";
    } else {
        return dateTime.toLocaleTimeString("en-GB", {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }
}

// DD/MM/YYYY format
function formatDate(iso) {
    if(!iso || typeof iso !== "string") {
        return "";
    }
    const dateTime = new Date(iso);
    if(isNaN(dateTime.getTime())) {
        return "";
    } else {
        return dateTime.toLocaleDateString("en-GB", {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
}

function formatDayNameAndMonthDay(DateString) {
    const dt = new Date(DateString + "T00:00:00");

    const weekday = dt.toLocaleDateString("en-GB", { 
        weekday: "long" 
    });
    const dayMonth = dt.toLocaleDateString("en-GB", { 
        day: "2-digit", 
        month: "short" 
    });

    return weekday + ", " + dayMonth;
}


function formatSunrise(sunriseIso) {
    return formatTime(sunriseIso);
}

function formatSunset(sunsetIso) {
    return formatTime(sunsetIso);
}

function returnSunriseAndSunsetText (sunriseIso, sunsetIso) {
    const sunrise = formatSunrise(sunriseIso);
    const sunset = formatSunset(sunsetIso);
    return `Sunrise: ${sunrise} | Sunset: ${sunset}`;
}

async function buildWeatherURL(location) {
    let celsiusFahrenheit;
    let kmhMPH;

    if (isFarenheit()) {
        celsiusFahrenheit = "fahrenheit";
        kmhMPH = "mph";
    } else {
        celsiusFahrenheit = "celsius";
        kmhMPH = "kmh";
    }

    return  `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${location.latitude}` +
            `&longitude=${location.longitude}` +
            `&timezone=auto` +
            `&forecast_days=7` +
            `&temperature_unit=${celsiusFahrenheit}` +
            `&windspeed_unit=${kmhMPH}` +
            `&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,pressure_msl,wind_speed_10m` +
            `&hourly=temperature_2m,precipitation_probability,wind_speed_10m` +
            `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset`;
}

// get hourly data for next 24 hours
function getHourlyData(data) {
    const times = data.hourly.time;
    const temps = data.hourly.temperature_2m;
    const precips = data.hourly.precipitation_probability;
    const winds = data.hourly.wind_speed_10m;
    const units = data.hourly_units.wind_speed_10m;
    const currentTime = data.current.time;
    let currentIndex = times.indexOf(currentTime);

    if(currentIndex === -1) {
        currentIndex = 0;
    }


    const cards = document.querySelectorAll(".hour");
    // for 24 hours ahead
    for(let i = 0; i < 24; i++) {
        const card = cards[i];

        let index = currentIndex + i;

        if(index >= times.length) { 
            break;
        }

        // elements inside every div card
        const timeEl = card.querySelector(".time");
        const degEl = card.querySelector(".degrees");
        const precipEl = card.querySelector(".precipitation");
        const windEl = card.querySelector(".windy");

        // format visualisation -> HH"h" - DD/MM/YYYY   -> example -> 12h - 21/12/2024
        const hour = formatTime(times[index]);
        const date = formatDate(times[index]);
        const hourOnly = hour.slice(0, 2);
        timeEl.innerText = `${hourOnly}h - ${date}`;

        let variable;
        if (isFarenheit()) {
            variable = "°F";
        } else {
            variable = "°C";
        }
        degEl.innerText = Math.round(temps[index]) + variable;
        if (precips[index] === null || precips[index] === undefined) {
            precipEl.innerText = "Precip: --";
        } else {
            precipEl.innerText = "Precip: " + precips[index] + "%";
        }
        windEl.innerText = Math.round(winds[index]) + " " + units;
    }
}

function dailyVisualisation(data) {
    const daily = data.daily;
    const days = daily.time;
    const sunrise = daily.sunrise;
    const sunset = daily.sunset;
    const minTemp = daily.temperature_2m_min;
    const maxTemp = daily.temperature_2m_max;
    const codes = daily.weather_code;

    for (let i = 0; i < dayNameAndDateElements.length; i++) {
        if(i >= days.length) {
            dayNameAndDateElements[i].innerText = ""; 

            dayWeatherSunriseSunsetElements[i].innerText = ""; 
            minMaxTemperatureElements[i].innerText = ""; 
            continue;
        }
        dayNameAndDateElements[i].innerText = formatDayNameAndMonthDay(days[i]);
        const codeNum = Number(codes[i]);
        const weatherText = weatherCodeMap[codeNum] || "";
        dayWeatherSunriseSunsetElements[i].innerText = weatherText + " | " + returnSunriseAndSunsetText(sunrise[i], sunset[i]);
        let unit;
        if (isFarenheit()) {
            unit = "°F";
        } else {
            unit = "°C";
        }
        minMaxTemperatureElements[i].innerText = `${Math.round(minTemp[i])}${unit} / ${Math.round(maxTemp[i])}${unit}`;
    }
}

let selectedLocation = loadLastLocation() || defaultLocation;

async function fetchAndDisplayWeather(location) {
    const weatherURL = await buildWeatherURL(location);
    try {
        const response = await fetch(weatherURL);
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        const data = await response.json();
        showAllInformation(data, location);
        getHourlyData(data);
        dailyVisualisation(data);
        saveLastLocation(location);
    } catch (error) {
        console.error("There has been a problem with your fetch operation:", error);
    }
}

async function searchCity(query) {
    const geoURL = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;

    try {
        const response = await fetch(geoURL);
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        const data = await response.json();
        return data.results;
    } catch (error) {
        console.error("There has been a problem with your fetch operation:", error);
    }
}

function clearCity() {
    cityDropdown.innerHTML = "";
    cityDropdown.hidden = true;
}

function selectCityLocationFromResults(r) {
    selectedLocation = {
        name: r.name || "Unknown",
        country: r.country_code || "",
        latitude: Number(r.latitude),
        longitude: Number(r.longitude)
    };
}

function showCityDropdown(resultsss) {
    clearCity(); // for last input

    if(!resultsss || !resultsss.length) {
        return;
    }

    cityDropdown.hidden = false; // now show the results if something written

    for(let i = 0; i < resultsss.length; i++) {
        const r = resultsss[i];

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "city-option";

        let country; 
        if (r.country_code) {
            country = ", " + r.country_code;
        } else {
            country = ""; 
        }

        let region; 
        if (r.admin1) {
            region = " • " + r.admin1;
        } else {
            region = ""; 
        }

        btn.innerHTML = "";
        const nameDiv = document.createElement("div");
        nameDiv.textContent = r.name || "Unknown";
        const subDiv = document.createElement("div");
        let countryCode = "";
        if (r.country_code) {
            countryCode = r.country_code;
        }

        let adminRegion = "";
        if (r.admin1) {
            adminRegion = " • " + r.admin1;
        }

        subDiv.textContent = countryCode + adminRegion;
        
        btn.appendChild(nameDiv);
        btn.appendChild(subDiv);

        btn.addEventListener("click", function () {
            selectCityLocationFromResults(r);

            let countryText;
            if (selectedLocation.country) {
                countryText = ", " + selectedLocation.country;
            } else {
                countryText = "";
            }
            searchBar.value = selectedLocation.name + countryText;

            clearCity();
            fetchAndDisplayWeather(selectedLocation);
        });

        cityDropdown.appendChild(btn);
    }
}


async function showWhileTyping() {
    if(searchBar.value.trim().length < 1) {
        clearCity();
        return;
    }
    const resultate = await searchCity(searchBar.value.trim());
    showCityDropdown(resultate);
}

function showAllInformation(data, location) {
    const current = data.current;
    const currentUnits = data.current_units;
    const weatherCodeMapNumber = Number(current.weather_code);

    iconElement.src = iconFromCode(weatherCodeMapNumber);
    iconElement.alt = weatherCodeMap[weatherCodeMapNumber] || "weather";

    // section current-location-weather-card > place-wrap
    placeElement.innerText = location.name + (location.country ? (", " + location.country) : " ");
    updatedElement.innerText = "Updated " + formatTime(current.time) + " " + formatDate(current.time);

    // section current-location-weather-card > place-information
    let unit;
    if (isFarenheit()) {
        unit = "°F";
    } else {
        unit = "°C";
    }
    tempElement.innerText = Math.round(Number(current.temperature_2m)) + unit;
    feelsLikeElement.innerText = "Feels like " + Math.round(Number(current.apparent_temperature)) + unit;

    // section current-location-weather-card > additional-information
    weatherConditionElement.innerText = weatherCodeMap[weatherCodeMapNumber];
    feelsLikeElement.innerText = "Feels like " + Math.round(Number(current.apparent_temperature)) + "°";

    // section current-location-weather-card > more-info
    humidityElement.innerText = Math.round(Number(current.relative_humidity_2m)) + (currentUnits.relative_humidity_2m);
    windElement.innerText = Math.round(Number(current.wind_speed_10m)) + " " + (currentUnits.wind_speed_10m);
    pressureElement.innerText = Math.round(Number(current.pressure_msl)) + " " + (currentUnits.pressure_msl);
    if (isNaN(Number(current.precipitation))) {
        precipElement.innerText = "- " + currentUnits.precipitation;
    } else {
        precipElement.innerText = Number(current.precipitation).toFixed(1) + " " + currentUnits.precipitation;
    }

    // section footer-info
    lastUpdateElement.innerText = "Last update: " + formatTime(current.time) + " " + formatDate(current.time);
    coordsElement.innerText = `Lat: ${location.latitude.toFixed(3)}, Lon: ${location.longitude.toFixed(3)}`;
}

temperatureScaleChange.addEventListener("click", function () {
    if (temperatureScaleChange.innerText.trim() === "°C") {
        temperatureScaleChange.innerText = "°F";
    } else {
        temperatureScaleChange.innerText = "°C";
    }
    switchUnitFromCelsiumToFarenheit();    
    fetchAndDisplayWeather(selectedLocation); 
});
fetchAndDisplayWeather(selectedLocation);

searchButton.addEventListener("click", function() {
    showWhileTyping();
});

searchBar.addEventListener("keydown", function(event) {
    if(event.key === "Enter") {
        showWhileTyping();
    }
});

let typingTimer;
searchBar.addEventListener("input", function() {
    clearTimeout(typingTimer); 
    typingTimer = setTimeout(function() {
        showWhileTyping();
    }, 500);
});

document.addEventListener("click", function(event) {
    if(!cityDropdown.hidden) {
        if(searchSection && !searchSection.contains(event.target)) {
            clearCity();
        }
    }
});

useLocationButton.addEventListener("click", function() {
    if(!navigator.geolocation) {
        console.log("Error finding your geolocation!");
        return;
    }

    useLocationButton.disabled = true;

    navigator.geolocation.getCurrentPosition(
        async function (position) {
            const cityName = await getCityLocationFromCoords(position.coords.latitude, position.coords.longitude);

            selectedLocation = {
                name: cityName,
                country: "",
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };

            clearCity();
            fetchAndDisplayWeather(selectedLocation);

            useLocationButton.disabled = false;
        },
        function () {
            useLocationButton.disabled = false;
            console.log("Location permission denied.");
        },
        {enableHighAccuracy: true, timeout: 100000, maximumAge: 300000}
    );
});



setInterval(function () {
    fetchAndDisplayWeather(selectedLocation);
}, refreshMS);




const infoToggle = document.getElementById("info-toggle");
const infoFooter = document.getElementById("information-people");

if (infoToggle && infoFooter) {
    infoToggle.addEventListener("click", function () {
        const isOpen = infoFooter.classList.toggle("is-open");
        infoFooter.classList.toggle("collapsed", !isOpen);

        infoToggle.classList.toggle("is-open", isOpen);
        infoToggle.setAttribute("aria-expanded", String(isOpen));
    });
}