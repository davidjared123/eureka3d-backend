import Link from 'next/link';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🖨️</span>
          <span className={styles.logoText}>Eureka3D</span>
        </div>
        <nav className={styles.nav}>
          <Link href="/login" className="btn btn-ghost">
            Iniciar Sesión
          </Link>
          <Link href="/registro" className="btn btn-primary">
            Comenzar Gratis
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.badge}>✨ Automatización inteligente</span>
          <h1 className={styles.title}>
            Gestiona tus pedidos de
            <span className={styles.gradient}> impresión 3D</span>
            <br />desde WhatsApp
          </h1>
          <p className={styles.subtitle}>
            Convierte mensajes de WhatsApp en tarjetas de Trello automáticamente.
            Sin código, sin complicaciones.
          </p>
          <div className={styles.cta}>
            <Link href="/registro" className="btn btn-primary btn-lg">
              Comenzar Ahora →
            </Link>
            <Link href="#como-funciona" className="btn btn-secondary btn-lg">
              Ver cómo funciona
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.mockup}>
            <div className={styles.mockupHeader}>
              <span className={styles.dot}></span>
              <span className={styles.dot}></span>
              <span className={styles.dot}></span>
            </div>
            <div className={styles.mockupContent}>
              <div className={styles.mockupMessage}>
                <span className={styles.messageIcon}>💬</span>
                <div>
                  <strong>WhatsApp</strong>
                  <p>Nuevo pedido: Soporte para celular</p>
                </div>
              </div>
              <div className={styles.mockupArrow}>↓</div>
              <div className={styles.mockupCard}>
                <span className={styles.cardIcon}>📋</span>
                <div>
                  <strong>Trello</strong>
                  <p>Tarjeta creada automáticamente</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features */}
      <section id="como-funciona" className={styles.features}>
        <h2 className={styles.featuresTitle}>¿Cómo funciona?</h2>
        <div className={styles.featureGrid}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>1️⃣</div>
            <h3>Conecta WhatsApp</h3>
            <p>Escanea el código QR para vincular tu número de WhatsApp</p>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>2️⃣</div>
            <h3>Configura Trello</h3>
            <p>Conecta tu tablero de Trello donde llegarán los pedidos</p>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>3️⃣</div>
            <h3>Recibe Pedidos</h3>
            <p>Los mensajes se convierten en tarjetas automáticamente</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>© 2026 Eureka3D. Hecho con ❤️ en Venezuela</p>
      </footer>
    </div>
  );
}
