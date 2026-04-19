document.addEventListener("DOMContentLoaded", function () {
  const phoneInput = document.querySelector("#phoneNumber");

  const iti = window.intlTelInput(phoneInput, {
    initialCountry: "ae",
    separateDialCode: true,
    showFlags: true,
    utilsScript:
      "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.js",
  });

  const form = document.querySelector("#getInTouch");

  form.addEventListener("submit", function (e) {
    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();

    if (firstName.length < 3 || lastName.length < 3) {
      e.preventDefault();
      alert("First Name and Last Name must be at least 3 characters.");
      return;
    }

    if (iti.isValidNumber()) {
      phoneInput.value = iti.getNumber(); // overwrite with full number
    } else {
      e.preventDefault();
      alert("Please enter a valid phone number.");
      phoneInput.focus();
    }
  });

  // Auto-hide messages
  const successMsg = document.getElementById("success-msg");
  const errorMsg = document.getElementById("error-msg");

  if (successMsg) {
    setTimeout(() => {
      successMsg.innerHTML += "<br><small>Redirecting to fleet...</small>";
      setTimeout(() => {
        window.location.href = "/fleet";
      }, 3000);
    }, 1000);
  }

  if (errorMsg) {
    setTimeout(() => errorMsg.remove(), 5000);
  }
});
