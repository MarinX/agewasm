import "./bootstrap-custom.scss";

import "bootstrap";

import "../vendor/wasm_exec.js";
import ageWasmUrl from "../vendor/age.wasm?url";
const go = new Go();

WebAssembly.instantiateStreaming(fetch(ageWasmUrl), go.importObject).then(
  (result) => {
    go.run(result.instance);
    // restore buttons after module is done loading
    document.querySelectorAll(".wasm-init").forEach((el) => {
      el.removeAttribute("disabled");
      el.classList.remove("wasm-init");
    });
  },
);

const alert = (alertPlaceholder, message, type) => {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = [
    `<div class="alert alert-${type} alert-dismissible" role="alert">`,
    `   <div>${message}</div>`,
    '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
    "</div>",
  ].join("");

  alertPlaceholder.append(wrapper);
};

const downloadURL = (data, fileName) => {
  const a = document.createElement("a");
  a.href = data;
  a.download = fileName;
  document.body.appendChild(a);
  a.style.display = "none";
  a.click();
  a.remove();
};

const downloadBlob = (data, fileName) => {
  const blob = new Blob([data], {
    type: "application/octet-stream",
  });
  const url = window.URL.createObjectURL(blob);
  downloadURL(url, fileName);
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

const showWorking = (element) => {
  element.classList.add("disabled");
  if (element.firstElementChild) {
    element.firstElementChild.removeAttribute("hidden");
  }
};

const hideWorking = (element) => {
  element.classList.remove("disabled");
  if (element.firstElementChild) {
    element.firstElementChild.setAttribute("hidden", true);
  }
};

// age's scrypt (password) recipient stanza can't be mixed with other
// recipients, so a "-> scrypt " stanza means the file was encrypted with -p.
const hasScryptStanza = (text) =>
  text.split("\n").some((line) => line.startsWith("-> scrypt "));

const looksPasswordEncrypted = (text) => {
  const t = text.trim();
  if (!t) return false;
  if (t.startsWith("-----BEGIN AGE ENCRYPTED FILE-----")) {
    let body = t.split("\n").slice(1, 4).join("");
    body = body.slice(0, Math.floor(body.length / 4) * 4);
    if (!body) return false;
    try {
      return hasScryptStanza(atob(body));
    } catch {
      return false;
    }
  }
  return hasScryptStanza(t);
};

const looksPasswordEncryptedBytes = (bytes) =>
  looksPasswordEncrypted(new TextDecoder().decode(bytes));

const wireEncryptModeToggle = (
  keyRadio,
  passwordRadio,
  recipients,
  passwordWrap,
  password,
  passwordConfirm,
) => {
  const update = () => {
    const usePassword = passwordRadio.checked;
    recipients.hidden = usePassword;
    recipients.required = !usePassword;
    passwordWrap.hidden = !usePassword;
    password.required = usePassword;
    passwordConfirm.required = usePassword;
  };
  keyRadio.addEventListener("change", update);
  passwordRadio.addEventListener("change", update);
  update();
};

document
  .getElementById("generateKeysForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();
    let pubkey = document.getElementById("pubkey");
    let privkey = document.getElementById("privkey");
    let pubshare = document.getElementById("pubkey-share");
    const keys = generateX25519Identity();
    pubkey.value = keys.publicKey;
    privkey.value = keys.privateKey;
    pubshare.removeAttribute("hidden");
    pubshare.setAttribute("href", `/?pubkey=${keys.publicKey}`);
  });

wireEncryptModeToggle(
  document.getElementById("encModeKey"),
  document.getElementById("encModePassword"),
  document.getElementById("recipients"),
  document.getElementById("passwordWrap"),
  document.getElementById("password"),
  document.getElementById("passwordConfirm"),
);

document.getElementById("encryptForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const message = document.getElementById("message").value;
  let output = document.getElementById("encryptedOutput");
  output.value = "";
  const errorBox = document.getElementById("errorEncrypt");

  let result;
  if (document.getElementById("encModePassword").checked) {
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("passwordConfirm").value;
    if (password !== confirm) {
      alert(errorBox, "Passwords do not match", "danger");
      return;
    }
    result = encryptWithPassword(password, message);
  } else {
    const recipients = document.getElementById("recipients").value;
    result = encrypt(recipients, message);
  }

  if (result.error) {
    alert(errorBox, result.error, "danger");
  } else {
    output.value = result.output;
  }
});

wireEncryptModeToggle(
  document.getElementById("encModeKeyBinary"),
  document.getElementById("encModePasswordBinary"),
  document.getElementById("recipients-binary"),
  document.getElementById("passwordWrapBinary"),
  document.getElementById("password-binary"),
  document.getElementById("passwordConfirm-binary"),
);

document
  .getElementById("encryptBinaryForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();
    const errorBox = document.getElementById("errorEncryptBinary");
    const usePassword = document.getElementById(
      "encModePasswordBinary",
    ).checked;
    let recipients, password;
    if (usePassword) {
      password = document.getElementById("password-binary").value;
      const confirm = document.getElementById("passwordConfirm-binary").value;
      if (password !== confirm) {
        alert(errorBox, "Passwords do not match", "danger");
        return;
      }
    } else {
      recipients = document.getElementById("recipients-binary").value;
    }
    const file = document.getElementById("filesEncrypt");
    if (file.files.length == 0) {
      alert(errorBox, "Please select a file", "danger");
      return;
    }
    for (const f of file.files) {
      console.log(`Processing ${f.name}...`);
      showWorking(e.submitter);
      const reader = new FileReader();
      reader.onload = function () {
        const buffer = new Uint8Array(reader.result);
        const result = usePassword
          ? encryptBinaryWithPassword(password, buffer)
          : encryptBinary(recipients, buffer);
        if (typeof result === "string") {
          alert(errorBox, result, "danger");
        } else {
          const fileName = f.name + ".age";
          console.log(`Encrypted ${fileName}`);
          downloadBlob(result, `${fileName}`);
        }
        hideWorking(e.submitter);
      };
      reader.readAsArrayBuffer(f);
    }
  });

const identitiesField = document.getElementById("identities");
const decPasswordField = document.getElementById("decPassword");
const decryptSecretLabel = document.getElementById("decryptSecretLabel");
const decryptModeNote = document.getElementById("decryptModeNote");
const encryptedTextField = document.getElementById("encryptedText");

const updateDecryptMode = () => {
  const text = encryptedTextField.value.trim();
  if (!text) {
    decryptModeNote.hidden = false;
    identitiesField.hidden = true;
    identitiesField.required = false;
    decPasswordField.hidden = true;
    decPasswordField.required = false;
    decryptSecretLabel.textContent = "Decryption secret";
    return;
  }
  decryptModeNote.hidden = true;
  const usePassword = looksPasswordEncrypted(text);
  identitiesField.hidden = usePassword;
  identitiesField.required = !usePassword;
  decPasswordField.hidden = !usePassword;
  decPasswordField.required = usePassword;
  decryptSecretLabel.textContent = usePassword ? "Password" : "Private keys";
};
encryptedTextField.addEventListener("input", updateDecryptMode);
updateDecryptMode();

document.getElementById("decryptForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const encryptedText = encryptedTextField.value;
  let output = document.getElementById("decryptedOutput");
  output.value = "";
  const errorBox = document.getElementById("errorDecrypt");

  const result = decPasswordField.hidden
    ? decrypt(identitiesField.value, encryptedText)
    : decryptWithPassword(decPasswordField.value, encryptedText);

  if (result.error) {
    alert(errorBox, result.error, "danger");
  } else {
    output.value = result.output;
  }
});

const identitiesBinaryField = document.getElementById("identities-binary");
const decPasswordBinaryField = document.getElementById("decPassword-binary");
const decryptBinarySecretLabel = document.getElementById(
  "decryptBinarySecretLabel",
);
const decryptBinaryModeNote = document.getElementById("decryptBinaryModeNote");
const filesDecryptField = document.getElementById("filesDecrypt");

const setDecryptBinaryMode = (usePassword) => {
  decryptBinaryModeNote.hidden = usePassword !== null;
  identitiesBinaryField.hidden = usePassword !== false;
  identitiesBinaryField.required = usePassword === false;
  decPasswordBinaryField.hidden = usePassword !== true;
  decPasswordBinaryField.required = usePassword === true;
  decryptBinarySecretLabel.textContent =
    usePassword === true
      ? "Password"
      : usePassword === false
        ? "Private keys"
        : "Decryption secret";
};

filesDecryptField.addEventListener("change", function () {
  if (filesDecryptField.files.length === 0) {
    setDecryptBinaryMode(null);
    return;
  }
  filesDecryptField.files[0]
    .slice(0, 256)
    .arrayBuffer()
    .then((buf) => {
      setDecryptBinaryMode(looksPasswordEncryptedBytes(new Uint8Array(buf)));
    });
});
setDecryptBinaryMode(null);

document
  .getElementById("decryptBinaryForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();
    const usePassword = !decPasswordBinaryField.hidden;
    const identities = identitiesBinaryField.value;
    const password = decPasswordBinaryField.value;
    const file = filesDecryptField;
    if (file.files.length == 0) {
      alert(
        document.getElementById("errorDecryptBinary"),
        "Please select a file",
        "danger",
      );
      return;
    }
    for (const f of file.files) {
      console.log(`Processing ${f.name}...`);
      const reader = new FileReader();
      reader.onload = function () {
        showWorking(e.submitter);

        const buffer = new Uint8Array(reader.result);
        const result = usePassword
          ? decryptBinaryWithPassword(password, buffer)
          : decryptBinary(identities, buffer);
        if (typeof result === "string") {
          alert(
            document.getElementById("errorDecryptBinary"),
            result,
            "danger",
          );
          return;
        } else {
          const fileName = f.name.replace(".age", "");
          console.log(`Decrypted ${fileName}`);
          downloadBlob(result, `${fileName}`);
        }
        hideWorking(e.submitter);
      };
      reader.readAsArrayBuffer(f);
    }
  });

document.addEventListener("DOMContentLoaded", function () {
  const params = new URLSearchParams(window.location.search);
  const pubkey = params.get("pubkey");
  if (pubkey) {
    const encTab = document.getElementById("encrypt-tab");
    const reciText = document.getElementById("recipients");
    const reciBin = document.getElementById("recipients-binary");
    const message = document.getElementById("message");
    encTab.click();
    reciText.value = pubkey.replaceAll(",", "\n");
    reciBin.value = pubkey.replaceAll(",", "\n");
    message.focus();
  }
});
