var icons = {  
    'Park': L.icon({  
        iconUrl: 'park.png',  
        iconSize: [30, 30]  
    }),  
    'Zoo': L.icon({  
        iconUrl: 'zoo.png',  
        iconSize: [30, 30]  
    }),  
    'Nature reserve': L.icon({  
        iconUrl: 'nature.png',  
        iconSize: [30, 30]  
    }),  
    'Historical place': L.icon({  
        iconUrl: 'history.png',  
        iconSize: [30, 30]  
    }),  
    'Museum': L.icon({  
        iconUrl: 'museum.png',  
        iconSize: [30, 30]  
    }),  
    'Church': L.icon({  
        iconUrl: 'church.png',  
        iconSize: [30, 30]  
    }),  
    'Gallery': L.icon({  
        iconUrl: 'gallery.png',  
        iconSize: [30, 30]  
    }),  
    'user': L.icon({  
        iconUrl: 'pin.png',  
        iconSize: [35, 35]   
    })  
};  

// Global variables  
var allMarkers = [];  
var currentLocationMarker = null;  
var map = null;  
var layers = {};  
var userLocationActive = false;
var routeControl = null;
var routeLayer = null;

function initialize() {   
    map = L.map('mapdiv');  
    map.setView([53.799335, -1.545177], 12);  

    L.tileLayer('http://tile.openstreetmap.org/{z}/{x}/{y}.png', {  
        attribution:'Map data ©OpenStreetMap contributors, CC-BY-SA, Imagery ©CloudMade',  
        maxZoom: 18	  
    }).addTo(map);  

    layers = {  
        'all': L.layerGroup(),  
        'Park': L.layerGroup(),  
        'Zoo': L.layerGroup(),  
        'Nature reserve': L.layerGroup(),  
        'Historical place': L.layerGroup(),  
        'Museum': L.layerGroup(),  
        'Church': L.layerGroup(),  
        'Gallery': L.layerGroup()  
    };   

    for (id in os_markers) {  
        var imageUrl = `images/${id}.jpg`;  
        
        var info = `  
            <div class="infowindow">  
                <div class="image-container">  
                    <img src="${imageUrl}" alt="${os_markers[id].Name}" class="image"   
                         onerror="this.onerror=null; this.src='images/default.jpg';">  
                </div>  
                <div class="info-content">  
                <h1>${os_markers[id].Name}</h1>  
                <p><strong>Type:</strong> ${os_markers[id].Type || 'N/A'}</p>  
                <p><strong>Location:</strong> ${os_markers[id].Location || 'N/A'}</p>  
                <p><strong>Website:</strong> ${os_markers[id].website || 'N/A'}</p>  
                </div>   

                <div class="route-actions">  
                    <button class="get-route-btn" onclick="getRouteTo(${os_markers[id].lat}, ${os_markers[id].lng}, '${os_markers[id].Name.replace(/'/g, "\\'")}')">  
                        <i class="route-icon">➡️</i> Get Route to Here  
                    </button>  
                </div>  

            </div>`;   

        var markerLocation = new L.LatLng(os_markers[id].lat, os_markers[id].lng);  
        
        var category = os_markers[id].Type || 'Gallery';  
        if (!layers[category]) {  
            category = 'Gallery';  
        }  

        var marker = new L.Marker(markerLocation, {icon: icons[category] || icons['other']}).bindPopup(info);  
        
        layers[category].addLayer(marker);  
        layers['all'].addLayer(marker);  
        allMarkers.push(marker);  
    }  

    // Initial state: only show "all" layer  
    layers['all'].addTo(map);  

    // Set up filter events  
    setupFilterEvents();  
    
    // Set up location button  
    setupLocationButton();  
    
    //ensure user location marker is always visible  
    map.on('popupopen', function(e) {  
        if (userLocationActive && (!currentLocationMarker || !map.hasLayer(currentLocationMarker))) {  
            restoreUserLocationMarker();  
        }  
    });  
}  

// Set up filter event handlers  
function setupFilterEvents() {  
    var selectElement = document.getElementById('place-filter');  
    
    if (selectElement) {  
        selectElement.addEventListener('change', function() {  
            var selectedValue = this.value;  
            
            for (var key in layers) {  
                map.removeLayer(layers[key]);  
            }  
            
            layers[selectedValue].addTo(map);  
            
            // Ensure location marker is still visible after switching layers  
            if (userLocationActive && currentLocationMarker) {  
                // Ensure marker is still on the map  
                if (!map.hasLayer(currentLocationMarker)) {  
                    currentLocationMarker.addTo(map);  
                }  
            }  
            
            console.log('Switched to layer: ' + selectedValue);  
        });  
    }  
}  

// Set up location button  
function setupLocationButton() {  
    var locateButton = document.getElementById('locate-me');  
    
    if (locateButton) {  
        locateButton.addEventListener('click', function() {  
            locateUser();  
        });  
    }  
}  

// Locate user position  
function locateUser() {  
    if (navigator.geolocation) {  
        // Use browser geolocation API  
        navigator.geolocation.getCurrentPosition(  
            function(position) {  
                // Successfully got position  
                var userLat = position.coords.latitude;  
                var userLng = position.coords.longitude;  
                 
                userLocationActive = true;  
                
                localStorage.setItem('userLat', userLat);  
                localStorage.setItem('userLng', userLng);  
                
                showUserLocation(userLat, userLng);  
                
                if (window.pendingRouteRequest) {  
                    var request = window.pendingRouteRequest;  
                    getRouteTo(request.lat, request.lng, request.name);  
                    window.pendingRouteRequest = null; // Clear request  
                }  
            },  
            function(error) {  
                // Failed to get position  
                var errorMessage;  
                
                switch(error.code) {  
                    case error.PERMISSION_DENIED:  
                        errorMessage = "User denied the location request.";  
                        break;  
                    case error.POSITION_UNAVAILABLE:  
                        errorMessage = "Location information is unavailable.";  
                        break;  
                    case error.TIMEOUT:  
                        errorMessage = "Request for user location timed out.";  
                        break;  
                    case error.UNKNOWN_ERROR:  
                        errorMessage = "An unknown error occurred.";  
                        break;  
                }  
                
                alert("Unable to get your location: " + errorMessage);  
                // Set location status to inactive  
                userLocationActive = false;  
                window.pendingRouteRequest = null;
            },  
            {  
                enableHighAccuracy: true,  
                timeout: 10000,  
                maximumAge: 0  
            }  
        );  
    } else {  
        alert("Your browser does not support geolocation.");  
        // Set location status to inactive  
        userLocationActive = false;  
    }  
}  

// Show user location  
function showUserLocation(lat, lng) {  
    var userLatLng = new L.LatLng(lat, lng);  
     
    if (currentLocationMarker && map.hasLayer(currentLocationMarker)) {  
        map.removeLayer(currentLocationMarker);  
    }  
    
    currentLocationMarker = new L.Marker(userLatLng, {  
        icon: icons.user,  
        zIndexOffset: 1000, 
        interactive: false  
    }).addTo(map);   

    // Add a location circle showing "My Location" text  
    var locationCircle = L.circle(userLatLng, {  
        color: '#4a89dc',  
        fillColor: '#4a89dc',  
        fillOpacity: 0.1,  
        radius: 200,  
        interactive: true  
    }).addTo(map);  
    
    locationCircle.bindPopup("<b>My Location</b>");  
    
    map.setView(userLatLng, 14);  
}  

// Try to restore user location marker when map loads/refreshes  
function restoreUserLocationMarker() {  
    var lat = localStorage.getItem('userLat');  
    var lng = localStorage.getItem('userLng');  
    
    if (lat && lng) {  
        showUserLocation(parseFloat(lat), parseFloat(lng));  
    } else {   
        userLocationActive = false;  
    }  
}  
   
// Get route from current location to destination  
function getRouteTo(destLat, destLng, destName) {  
    // Check if user location is available  
    if (!userLocationActive || !currentLocationMarker) {  
        if (confirm("Your location is needed to plan a route. Would you like to share your location?")) {  
            locateUser();  
            
            // Save destination info  
            window.pendingRouteRequest = {  
                lat: destLat,  
                lng: destLng,  
                name: destName  
            };  
            
            return;  
        } else {  
            return; 
        }  
    }  
    
    // Get user's current position  
    var userPosition = currentLocationMarker.getLatLng();  
    
    // Create destination position directly using WGS84 coordinates  
    var destPosition = new L.LatLng(destLat, destLng);  
    
    // Clear existing route  
    clearExistingRoute();  
    
    // Show loading indicator  
    showRouteLoading(true);  
    
    // Get route  
    calculateRoute(userPosition, destPosition, destName);  
}  

// Clear existing route  
function clearExistingRoute() {  
    if (routeControl) {  
        map.removeControl(routeControl);  
        routeControl = null;  
    }  
    
    if (routeLayer) {  
        map.removeLayer(routeLayer);  
        routeLayer = null;  
    }  
    
    hideRouteInfo();  
}  

// Show/hide route loading indicator  
function showRouteLoading(show) {  
    var loadingElement = document.getElementById('route-loading');  
    if (!loadingElement && show) {  
        loadingElement = document.createElement('div');  
        loadingElement.id = 'route-loading';  
        loadingElement.className = 'route-loading';  
        loadingElement.innerHTML = 'Calculating route...';  
        document.body.appendChild(loadingElement);  
    }  
    
    if (loadingElement) {  
        loadingElement.style.display = show ? 'block' : 'none';  
    }  
}  

// Calculate route  
function calculateRoute(start, end, destinationName) {  
    // OpenRouteService API key  
    var apiKey = '5b3ce3597851110001cf62483669c214f6564dcf9f2c3cf71aac34fb';  
    
    // OpenRouteService API endpoint  
    var apiUrl = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';  
    
    // Prepare request body  
    var requestBody = {  
        coordinates: [  
            [start.lng, start.lat],  
            [end.lng, end.lat]  
        ],  
        instructions: false, // No navigation instructions needed  
        preference: "recommended",  
        units: "km",  
        language: "en-US"  
    };  
    
    // Make API request  
    fetch(apiUrl, {  
        method: 'POST',  
        headers: {  
            'Authorization': apiKey,  
            'Content-Type': 'application/json; charset=utf-8'  
        },  
        body: JSON.stringify(requestBody)  
    })  
    .then(response => {  
        if (!response.ok) {  
            throw new Error('Route service response error: ' + response.status);  
        }  
        return response.json();  
    })  
    .then(data => {  
        // Process route data  
        displayRoute(data, destinationName);  
    })  
    .catch(error => {  
        console.error('Failed to get route:', error);  
        alert('Unable to get route information, using simple route estimation instead.');  
        
        // If API call fails, fall back to simple direct line route  
        calculateSimpleRoute(start, end, destinationName);  
    });  
}  

// Display route and route information  
function displayRoute(routeData, destinationName) {  
    showRouteLoading(false);  
    
    try {  
        var coordinates = routeData.features[0].geometry.coordinates;  
        var routePoints = coordinates.map(coord => L.latLng(coord[1], coord[0]));  
         
        routeLayer = L.polyline(routePoints, {  
            color: '#3388ff',  
            weight: 6,  
            opacity: 0.7  
        }).addTo(map);  

        var properties = routeData.features[0].properties;  
        var summary = properties.summary;  
        var distance = (summary.distance / 1000).toFixed(1); // kilometers  
        var duration = Math.round(summary.duration / 60); // minutes  
        
        showRouteInfo({  
            destination: destinationName,  
            distance: distance,  
            duration: duration  
        });  

        map.fitBounds(routeLayer.getBounds(), {  
            padding: [50, 50]  
        });  
    } catch (error) {  
        console.error('Failed to parse route data:', error);  
        alert('Error parsing route data, using simple route estimation instead.');  
        
        // If parsing fails, fall back to simple route  
        var start = currentLocationMarker.getLatLng();  
        
        // Extract end coordinates from routeData  
        try {  
            var endCoord = routeData.features[0].geometry.coordinates[  
                routeData.features[0].geometry.coordinates.length - 1  
            ];  
            var end = L.latLng(endCoord[1], endCoord[0]);  
            calculateSimpleRoute(start, end, destinationName);  
        } catch (e) {  
            // If unable to get coordinates from response, show error  
            alert('Unable to get destination coordinates.');  
            clearExistingRoute();  
        }  
    }  
}

// Simple route calculation (straight line distance)  
function calculateSimpleRoute(start, end, destinationName) {  
    var distance = start.distanceTo(end) / 1000; // Convert meters to kilometers  
    
    routeLayer = L.polyline([start, end], {  
        color: '#3388ff',  
        weight: 6,  
        opacity: 0.7,  
        dashArray: '10, 10' 
    }).addTo(map);  
     
      var drivingDuration = Math.round((distance / 30) * 60);  

      showRouteInfo({  
          destination: destinationName,  
          distance: distance.toFixed(1),  
          duration: drivingDuration,  
          isSimpleRoute: true  
      }); 

    map.fitBounds(routeLayer.getBounds(), {  
        padding: [50, 50]  
    });  
    
    showRouteLoading(false);  
}  

// Show route info panel  
function showRouteInfo(routeInfo) {  
    var infoPanel = document.getElementById('route-info-panel');  
    if (!infoPanel) {  
        infoPanel = document.createElement('div');  
        infoPanel.id = 'route-info-panel';  
        infoPanel.className = 'route-info-panel';  
        document.body.appendChild(infoPanel);  
    }  
    var titleText = routeInfo.isSimpleRoute ? "Route Information (Estimated)" : "Route Information";  
    
    infoPanel.innerHTML = `  
        <div class="route-info-header">  
            <h3>${titleText}</h3>  
            <button class="close-btn" onclick="clearExistingRoute()">×</button>  
        </div>  
        <div class="route-info-content">  
            <p><i class="destination-icon">📍</i> <strong>Destination:</strong> ${routeInfo.destination}</p>   
            <p><i class="time-icon">⏱️</i> <strong>Estimated Time:</strong> ${routeInfo.duration} minutes</p>  
        </div>  
        <div class="route-info-footer">  
            <button class="clear-route-btn" onclick="clearExistingRoute()">Clear Route</button>  
        </div>  
    `;  
    
    infoPanel.style.display = 'block';  
}  

function hideRouteInfo() {  
    var infoPanel = document.getElementById('route-info-panel');  
    if (infoPanel) {  
        infoPanel.style.display = 'none';  
    }  
}  