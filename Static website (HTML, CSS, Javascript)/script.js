document.getElementById("visionLink").onclick = e => {
  e.preventDefault();
  document
    .getElementById("vision")
    .scrollIntoView({behavior:"smooth"});
};
