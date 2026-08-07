const button = document.getElementById("testButton");

button.addEventListener("click", () => {
    alert("It works!");
});

if ("serviceWorker" in navigator) {

    navigator.serviceWorker.register("./sw.js");

}