document.addEventListener("DOMContentLoaded", function () {
  // ------------------ PHONE INPUT ------------------
  const phoneInput = document.querySelector("#phone");
  const fullPhone = document.querySelector("#fullPhone");

  const iti = window.intlTelInput(phoneInput, {
    initialCountry: "ae",
    preferredCountries: ["ae", "in", "pk", "us", "gb"],
    separateDialCode: true,
  });

  // Save formatted number
  phoneInput.addEventListener("blur", () => {
    if (iti.isValidNumber()) {
      fullPhone.value = iti.getNumber();
    } else {
      alert("Please enter a valid phone number");
      phoneInput.focus();
    }
  });

  // Recalculate price when country changes
  iti.promise.then(() => {
    phoneInput.addEventListener("countrychange", updateTotal);
  });

  // ------------------ FILE UPLOAD PREVIEW ------------------
  function previewFile(inputId) {
    const input = document.querySelector(inputId);
    input.addEventListener("change", function () {
      if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
          let preview = document.createElement("img");
          preview.src = e.target.result;
          preview.classList.add("img-thumbnail", "mt-2");
          preview.style.maxWidth = "150px";

          if (input.nextElementSibling?.tagName === "IMG") {
            input.nextElementSibling.remove();
          }
          input.parentNode.appendChild(preview);
        };
        reader.readAsDataURL(this.files[0]);
      }
    });
  }
  previewFile("#drivingLicense");
  previewFile("#idDocument");

  // ------------------ DATE INPUT AUTO OPEN ------------------
  document.querySelectorAll("input[type='date']").forEach((input) => {
    input.addEventListener("focus", () => input.showPicker && input.showPicker());
  });

  // ------------------ PICKUP / DELIVERY OPTION ------------------
  const selfPickupRadio = document.getElementById("selfPickup");
  const deliveryRadio = document.getElementById("deliveryOption");
  const selfPickupCard = document.getElementById("selfPickupCard");
  const deliveryCard = document.getElementById("deliveryCard");
  const selfPickupSection = document.getElementById("selfPickupSection");
  const deliverySection = document.getElementById("deliverySection");

  let deliveryCharge = 0;

  function togglePickupOption() {
    if (selfPickupRadio.checked) {
      selfPickupCard.classList.add("selected");
      deliveryCard.classList.remove("selected");
      selfPickupSection.classList.remove("d-none");
      deliverySection.classList.add("d-none");
      deliveryCharge = 0;
    } else if (deliveryRadio.checked) {
      deliveryCard.classList.add("selected");
      selfPickupCard.classList.remove("selected");
      deliverySection.classList.remove("d-none");
      selfPickupSection.classList.add("d-none");
      deliveryCharge = 30;
    }
    updateTotal();
  }

  [selfPickupCard, deliveryCard].forEach((card) => {
    card.addEventListener("click", () => {
      card.querySelector("input").checked = true;
      togglePickupOption();
    });
  });

  // ------------------ MAP PICKER WIRING ------------------
  function wireMapPicker(triggerBtnId, clearBtnId, displayId, textId, hiddenLocationId, hiddenLatId, hiddenLngId) {
    const triggerBtn  = document.getElementById(triggerBtnId);
    const clearBtn    = document.getElementById(clearBtnId);
    const display     = document.getElementById(displayId);
    const textEl      = document.getElementById(textId);
    const locationEl  = document.getElementById(hiddenLocationId);
    const latEl       = document.getElementById(hiddenLatId);
    const lngEl       = document.getElementById(hiddenLngId);

    if (!triggerBtn) return;

    triggerBtn.addEventListener('click', () => {
      window.MapPicker.open((lat, lng, address) => {
        latEl.value = lat;
        lngEl.value = lng;
        locationEl.value = address;
        textEl.textContent = address;
        display.classList.add('visible');
        triggerBtn.innerHTML = '<i class="bi bi-pencil-map"></i> Change Location';
      });
    });

    clearBtn.addEventListener('click', () => {
      latEl.value = '';
      lngEl.value = '';
      locationEl.value = '';
      textEl.textContent = 'No location chosen';
      display.classList.remove('visible');
      triggerBtn.innerHTML = '<i class="bi bi-map"></i> Pick on Map';
    });
  }

  wireMapPicker('pickDeliveryBtn', 'clearDeliveryLoc', 'deliveryLocDisplay', 'deliveryLocText',
                'deliveryLocation', 'deliveryLat', 'deliveryLng');
  wireMapPicker('pickDropBtn', 'clearDropLoc', 'dropLocDisplay', 'dropLocText',
                'dropLocation', 'dropLat', 'dropLng');

  // ------------------ PRICE CALCULATION ------------------
  const subtotalEl = document.getElementById("subtotal");
  const vatEl = document.getElementById("vat");
  const totalEl = document.getElementById("total");
  const pickupDate = document.getElementById("pickupDate");
  const returnDate = document.getElementById("returnDate");
  const carId = document.getElementById("dailyPrice")?.dataset.carId;

  function updateTotal() {
    let subtotal = 0;

    if (pickupDate.value && returnDate.value) {
      const start = new Date(pickupDate.value);
      const end = new Date(returnDate.value);

      if (end > start) {
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const dailyRate = parseFloat(document.getElementById("dailyPrice")?.dataset.daily) || 0;
        const weeklyRate = parseFloat(document.getElementById("weeklyPrice")?.dataset.weekly) || 0;
        const monthlyRate = parseFloat(document.getElementById("monthlyPrice")?.dataset.monthly) || 0;

        let baseCost = 0;
        if (days <= 6) baseCost = days * dailyRate;
        else if (days >= 7 && days <= 29) baseCost = Math.ceil(days / 7) * weeklyRate;
        else baseCost = Math.ceil(days / 30) * monthlyRate;

        let countryCode = "ae";
        try {
          if (typeof iti !== "undefined" && iti.getSelectedCountryData) {
            countryCode = iti.getSelectedCountryData().iso2;
          }
        } catch (err) {
          console.warn("iti not initialized yet:", err);
        }

        if (countryCode === "in" || countryCode === "pk") baseCost *= 0.9;
        else if (countryCode !== "ae") baseCost *= 1.2;

        subtotal = baseCost;
      }
    }

    subtotal += deliveryCharge;
    const vat = subtotal * 0.05;
    const total = subtotal + vat;

    subtotalEl.textContent = subtotal.toFixed(2);
    vatEl.textContent = vat.toFixed(2);
    totalEl.textContent = total.toFixed(2);
  }

  pickupDate.addEventListener("change", updateTotal);
  returnDate.addEventListener("change", updateTotal);

  // Initialize
  togglePickupOption();
  updateTotal();

  // ------------------ STRIPE CHECKOUT ------------------
  if (document.getElementById("checkout-button")) {
    // Access the global key defined in rent-now.hbs
    const publishableKey = window.stripePublishableKey;
    if (!publishableKey) {
        console.error("Stripe Publishable Key is missing!");
    }
    const stripe = typeof Stripe !== 'undefined' ? Stripe(publishableKey) : null;

    document.getElementById("checkout-button").addEventListener("click", (e) => {
      e.preventDefault();

      const total = parseFloat(document.getElementById("total").textContent) || 0;
      const pickup = document.getElementById("pickupDate").value;
      const drop = document.getElementById("returnDate").value;
      
      // Correct carId retrieval from data attribute
      const carId = document.getElementById("dailyPrice")?.dataset.carId;

      if (!pickup || !drop) {
        alert("Please select pickup and return dates.");
        return;
      }
      
      if (!carId) {
        alert("Car information missing. Please try refreshing the page.");
        return;
      }

      if (!stripe) {
        alert("Payment system is not initialized. Please try again later.");
        return;
      }

      // Fix endpoint from /users/create-checkout-session to /create-checkout-session
      fetch("/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total, carId, pickupDate: pickup, returnDate: drop }),
      })
        .then(res => {
            if (!res.ok) throw new Error("Server returned " + res.status);
            return res.json();
        })
        .then(data => {
          if (data.url) window.location = data.url;
          else alert("Failed to create Stripe checkout session: " + (data.error || "Unknown error"));
        })
        .catch(err => {
          console.error("Stripe Fetch Error:", err);
          alert("Error creating Stripe session: " + err.message);
        });
    });
  }
});
