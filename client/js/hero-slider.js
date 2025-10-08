// HERO SLIDER LOGIC
document.addEventListener("DOMContentLoaded", function () {
  // Only initialize slider if hero-slider element exists (on main page)
  const slider = document.getElementById("hero-slider");
  if (!slider) {
    // Hero slider not found, skip initialization
    return;
  }

  // Add your slide image URLs here (relative to /assets/ or use your own images)
  const slides = [
    "../assets/hero.png",
    "../assets/bannerTwo.png",
    "../assets/bannerThree.png",
    "../assets/bannerFour.png",
    // Add more images if available, e.g. "../assets/profile-pictures/yourimg.png"
  ];
  let currentSlide = 0;

  function renderSlides() {
    if (!slider) return; // Safety check

    slider.innerHTML = slides
      .map(
        (slide, index) => `
        <div class="hero-slide${
          index === currentSlide ? " active" : ""
        }" style="position:absolute;top:0;left:0;width:100%;height:100%;transition:opacity 1s;opacity:${
          index === currentSlide ? 1 : 0
        };z-index:${index === currentSlide ? 10 : 0};pointer-events:${
          index === currentSlide ? "auto" : "none"
        };">
          <div style='position:relative;width:100%;height:100%'>
            <img src="${slide}" alt="Banner ${
          index + 1
        }" style="width:100%;height:100%;object-fit:cover;margin-top:20px;border-radius:10px;" />
          </div>
        </div>
      `
      )
      .join("");
  }

  // --- Auto-slide logic ---
  let autoSlideInterval = setInterval(showNextSlide, 1000);
  function resetAutoSlide() {
    clearInterval(autoSlideInterval);
    autoSlideInterval = setInterval(showNextSlide, 10000);
  }

  function showPrevSlide() {
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    renderSlides();
    resetAutoSlide();
  }
  function showNextSlide() {
    currentSlide = (currentSlide + 1) % slides.length;
    renderSlides();
    resetAutoSlide();
  }

  // Initial render
  renderSlides();

  // Button listeners - only add if elements exist
  const prevBtn = document.getElementById("hero-prev");
  const nextBtn = document.getElementById("hero-next");

  if (prevBtn) {
    prevBtn.addEventListener("click", showPrevSlide);
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", showNextSlide);
  }

  // Optional: auto-slide every 7 seconds
  // setInterval(showNextSlide, 7000);
});