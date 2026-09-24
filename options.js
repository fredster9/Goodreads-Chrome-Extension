// Saves options to chrome.storage
function save_options() {
  var libURL = document.getElementById("libURL").value;
  var gr_user_id = document.getElementById("grID").value;
  var hooplaLibraryId = document.getElementById("hooplaLibraryId").value;
  var spotifyClientId = document.getElementById("spotifyClientId").value;
  var spotifyClientSecret = document.getElementById("spotifyClientSecret").value;

  console.log("libURL", libURL);
  console.log("grID", gr_user_id);
  console.log("hooplaLibraryId", hooplaLibraryId);
  console.log("spotifyClientId", spotifyClientId);
  console.log("spotifyClientSecret", spotifyClientSecret ? "(set)" : "(not set)");

  chrome.storage.sync.set(
    {
      libURL: libURL,
      gr_user_id: gr_user_id,
      hooplaLibraryId: hooplaLibraryId,
      spotifyClientId: spotifyClientId,
      spotifyClientSecret: spotifyClientSecret,
    },
    function () {
      // Update status to let user know options were saved.
      var status = document.getElementById("status");
      status.textContent = "Options saved, you're good to go.";
      console.log("vals:", libURL, gr_user_id);
      setTimeout(function () {
        status.textContent = "";
      }, 1500);
    }
  );
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get(
    {
      libURL: "nypl.overdrive.com",
      gr_user_id: "",
      hooplaLibraryId: "",
      spotifyClientId: "",
      spotifyClientSecret: "",
    },
    function (items) {
      document.getElementById("libURL").value = items.libURL;
      document.getElementById("grID").value = items.gr_user_id;
      document.getElementById("hooplaLibraryId").value = items.hooplaLibraryId || "";
      document.getElementById("spotifyClientId").value = items.spotifyClientId || "";
      document.getElementById("spotifyClientSecret").value = items.spotifyClientSecret || "";
    }
  );
}
document.addEventListener("DOMContentLoaded", restore_options);
document.getElementById("save").addEventListener("click", save_options);
