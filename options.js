// Saves options to chrome.storage
function save_options() {
  var libURL = document.getElementById("libURL").value;
  var gr_user_id = document.getElementById("grID").value;
  var gr_key = document.getElementById("grKey").value;

  console.log("libURL", libURL);
  console.log("grID", gr_user_id);
  console.log("grKey", gr_key);

  chrome.storage.sync.set(
    {
      libURL: libURL,
      gr_user_id: gr_user_id,
      gr_key: gr_key,
    },
    function () {
      // Update status to let user know options were saved.
      var status = document.getElementById("status");
      status.textContent = "Options saved, you're good to go.";
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
      gr_key: "",
    },
    function (items) {
      document.getElementById("libURL").value = items.libURL;
      document.getElementById("grID").value = items.gr_user_id;
      document.getElementById("grKey").value = items.gr_key;
    }
  );
}
document.addEventListener("DOMContentLoaded", restore_options);
document.getElementById("save").addEventListener("click", save_options);
