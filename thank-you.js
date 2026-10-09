const params = new URLSearchParams(window.location.search);
const name = params.get("name");
const message = document.getElementById("thankYouMessage");

if (name) {
    message.textContent = "Thank you, " + name + ". Your birthday registration has been received and will be shared in our weekly bulletin.";
}

const shareLink = document.getElementById("shareWhatsApp");
const siteUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, "");
const shareText = "Good day! University Baptist Church, Ogbomoso now has an online birthday registry. " +
    "Add your birthday here so the church can celebrate you in the weekly bulletin: " + siteUrl;

shareLink.href = "https://wa.me/?text=" + encodeURIComponent(shareText);