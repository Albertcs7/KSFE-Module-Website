<script setup lang="ts"></script>

<template>
  <section class="home-page">
    <div class="home-hero">
      <img src="/KSFE TOP LOGO.png" alt="KSFE Top Logo" class="home-logo" />
      <p class="eyebrow">KSFE internal workspace</p>
      <h1>Welcome to the KSFE dashboard</h1>
      <div class="hero-actions">
        <RouterLink to="/insurance" class="primary-action">Insurance</RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-page {
  width: 100%;
  min-height: calc(100vh - 7rem);
  display: flex;
  align-items: stretch;
  justify-content: center;
}

.home-hero {
  position: relative;
  overflow: hidden;
  width: min(100%, 100%);
  min-height: 100%;
  padding: clamp(1.75rem, 4vw, 3rem);
  border-radius: 1.5rem;
  background: linear-gradient(135deg, #ffffff 0%, #edf7e8 100%);
  border: 1px solid rgba(91, 183, 0, 0.12);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100%;
  text-align: center;
}

.home-hero::after {
  content: "";
  position: absolute;
  inset: auto -4rem -4rem auto;
  width: 14rem;
  height: 14rem;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(91, 183, 0, 0.18), transparent 70%);
}

.home-logo {
  width: min(100%, 25rem);
  height: auto;
  margin-bottom: 1rem;
  object-fit: contain;
}

.eyebrow {
  margin: 0 0 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.8rem;
  color: #4a9500;
  font-weight: 700;
}

.home-hero h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3.4rem);
  line-height: 1.05;
  color: #10233f;
  max-width: 15ch;
}

.lead {
  margin: 1rem 0 0;
  max-width: 52rem;
  color: #475569;
  font-size: 1.05rem;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.5rem;
  justify-content: center;
}

.primary-action,
.secondary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.9rem;
  padding: 0 1.2rem;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 700;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.primary-action {
  background: linear-gradient(135deg, #4a9500, #6dbd16);
  color: #fff;
  box-shadow: 0 14px 28px rgba(91, 183, 0, 0.22);
}

.secondary-action {
  background: rgba(255, 255, 255, 0.92);
  color: #10233f;
  border: 1px solid rgba(16, 35, 63, 0.12);
}

.primary-action:hover,
.secondary-action:hover {
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .home-page {
    min-height: auto;
  }

  .home-hero {
    padding: 1.4rem;
  }

  .home-logo {
    width: min(100%, 14rem);
  }
}
</style>
